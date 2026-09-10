import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  createNoStoreHeaders,
  isSameOriginRequest,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import { getBackendEnvironment } from "@/lib/backend/env";
import {
  isPng,
  isSavedSignatureType,
  MAX_SAVED_SIGNATURE_BYTES,
  MAX_SAVED_SIGNATURES,
  normalizeSignatureDimension,
  sanitizeSignatureLabel,
  SAVED_SIGNATURE_URL_TTL_SECONDS,
  type SavedSignatureView,
} from "@/lib/saved-signatures";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SignatureRow = {
  id: string;
  label: string;
  signature_type: "typed" | "drawn" | "uploaded" | "initials";
  payload: Record<string, unknown> | null;
  storage_bucket: string | null;
  storage_path: string | null;
  created_at: string;
};

function respond(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: createNoStoreHeaders(request) });
}

async function getContext(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { response: respond(request, { ok: false, error: "Signature storage is not configured." }, 503) };

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { response: respond(request, { ok: false, error: "Sign in to save and reuse signatures." }, 401) };

  return { supabase, user };
}

async function toView(
  supabase: NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>,
  row: SignatureRow,
): Promise<SavedSignatureView> {
  let previewUrl: string | null = null;
  if (row.storage_bucket && row.storage_path) {
    const signed = await supabase.storage
      .from(row.storage_bucket)
      .createSignedUrl(row.storage_path, SAVED_SIGNATURE_URL_TTL_SECONDS);
    previewUrl = signed.data?.signedUrl ?? null;
  }

  return {
    id: row.id,
    label: row.label,
    signatureType: row.signature_type,
    text: typeof row.payload?.text === "string" ? row.payload.text : null,
    previewUrl,
    width: normalizeSignatureDimension(row.payload?.width),
    height: normalizeSignatureDimension(row.payload?.height),
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) return respond(request, { ok: false, error: "Request origin is not allowed." }, 403);
  const context = await getContext(request);
  if ("response" in context) return context.response;

  const { data, error } = await context.supabase
    .from("saved_signatures")
    .select("id,label,signature_type,payload,storage_bucket,storage_path,created_at")
    .eq("owner_id", context.user.id)
    .order("updated_at", { ascending: false })
    .limit(MAX_SAVED_SIGNATURES);

  if (error) return respond(request, { ok: false, error: "Unable to load saved signatures." }, 500);
  const signatures = await Promise.all(((data ?? []) as SignatureRow[]).map((row) => toView(context.supabase, row)));
  return respond(request, { ok: true, signatures, limit: MAX_SAVED_SIGNATURES });
}

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) return respond(request, { ok: false, error: "Request origin is not allowed." }, 403);
  const context = await getContext(request);
  if ("response" in context) return context.response;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respond(request, { ok: false, error: "Invalid signature data." }, 400);
  }

  const signatureType = form.get("signatureType");
  if (!isSavedSignatureType(signatureType) || signatureType === "initials") {
    return respond(request, { ok: false, error: "Choose a typed, drawn, or uploaded signature." }, 400);
  }

  const { count, error: countError } = await context.supabase
    .from("saved_signatures")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", context.user.id);
  if (countError) return respond(request, { ok: false, error: "Unable to verify signature storage." }, 500);
  if ((count ?? 0) >= MAX_SAVED_SIGNATURES) {
    return respond(request, { ok: false, error: `You can save up to ${MAX_SAVED_SIGNATURES} signatures. Remove one before saving another.` }, 409);
  }

  const id = randomUUID();
  const label = sanitizeSignatureLabel(form.get("label"));
  const bucket = getBackendEnvironment().signaturesBucket;
  let storagePath: string | null = null;
  let payload: Record<string, unknown>;

  if (signatureType === "typed") {
    const text = typeof form.get("text") === "string" ? String(form.get("text")).trim().slice(0, 120) : "";
    if (!text) return respond(request, { ok: false, error: "Enter a typed signature before saving." }, 400);
    payload = { text, style: "italic" };
  } else {
    const image = form.get("image");
    if (!(image instanceof File) || image.size === 0 || image.size > MAX_SAVED_SIGNATURE_BYTES) {
      return respond(request, { ok: false, error: "Upload a PNG signature smaller than 2 MB." }, 400);
    }
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (image.type !== "image/png" || !isPng(bytes)) {
      return respond(request, { ok: false, error: "Saved signatures must be valid PNG images." }, 400);
    }
    storagePath = `${context.user.id}/${id}.png`;
    const upload = await context.supabase.storage.from(bucket).upload(storagePath, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upload.error) return respond(request, { ok: false, error: "Unable to store this signature image." }, 500);
    payload = {
      width: normalizeSignatureDimension(form.get("width")),
      height: normalizeSignatureDimension(form.get("height")),
    };
  }

  const inserted = await context.supabase
    .from("saved_signatures")
    .insert({
      id,
      owner_id: context.user.id,
      label,
      signature_type: signatureType,
      payload,
      storage_bucket: storagePath ? bucket : null,
      storage_path: storagePath,
    })
    .select("id,label,signature_type,payload,storage_bucket,storage_path,created_at")
    .single();

  if (inserted.error || !inserted.data) {
    if (storagePath) await context.supabase.storage.from(bucket).remove([storagePath]);
    return respond(request, { ok: false, error: "Unable to save this signature." }, 500);
  }

  return respond(request, { ok: true, signature: await toView(context.supabase, inserted.data as SignatureRow) }, 201);
}
