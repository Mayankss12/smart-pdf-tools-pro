import { NextResponse } from "next/server";

import { createNoStoreHeaders, isSameSiteStateChangingRequest } from "@/lib/api-security";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ signatureId: string }> };

function respond(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: createNoStoreHeaders(request) });
}

export async function DELETE(request: Request, routeContext: Context) {
  if (!isSameSiteStateChangingRequest(request)) return respond(request, { ok: false, error: "Request origin is not allowed." }, 403);
  const { signatureId } = await routeContext.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(signatureId)) {
    return respond(request, { ok: false, error: "Invalid signature ID." }, 400);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return respond(request, { ok: false, error: "Signature storage is not configured." }, 503);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return respond(request, { ok: false, error: "Sign in to manage saved signatures." }, 401);

  const existing = await supabase
    .from("saved_signatures")
    .select("id,storage_bucket,storage_path")
    .eq("id", signatureId)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (existing.error) return respond(request, { ok: false, error: "Unable to read this signature." }, 500);
  if (!existing.data) return respond(request, { ok: false, error: "Saved signature not found." }, 404);

  if (existing.data.storage_bucket && existing.data.storage_path) {
    const removed = await supabase.storage
      .from(existing.data.storage_bucket)
      .remove([existing.data.storage_path]);
    if (removed.error) return respond(request, { ok: false, error: "Unable to remove the stored signature image." }, 500);
  }

  const deleted = await supabase
    .from("saved_signatures")
    .delete()
    .eq("id", signatureId)
    .eq("owner_id", user.id);
  if (deleted.error) return respond(request, { ok: false, error: "Unable to remove this signature." }, 500);
  return respond(request, { ok: true });
}
