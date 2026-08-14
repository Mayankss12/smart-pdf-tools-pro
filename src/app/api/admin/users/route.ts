import { NextResponse } from "next/server";

import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import { getDailyCleanExportLimit } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagedTier = "free" | "plus" | "pro" | "admin";
type UpdateUserBody = {
  userId?: unknown;
  tier?: unknown;
  tierExpiresAt?: unknown;
  dailyExportLimit?: unknown;
};

const MANAGED_TIERS: readonly ManagedTier[] = ["free", "plus", "pro", "admin"];

function respond(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: createNoStoreHeaders(request),
  });
}

function isManagedTier(value: unknown): value is ManagedTier {
  return typeof value === "string" && MANAGED_TIERS.includes(value as ManagedTier);
}

function normalizeDate(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function normalizeLimit(value: unknown): number | null {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < 0 || numeric > 999999) return null;
  return numeric;
}

async function readBody(request: Request): Promise<UpdateUserBody> {
  try {
    const value: unknown = await request.json();
    return value && typeof value === "object" ? (value as UpdateUserBody) : {};
  } catch {
    return {};
  }
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "POST, OPTIONS");
}

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) {
    return respond(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return respond(
      request,
      { ok: false, error: "Authentication service is not configured." },
      503,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return respond(
      request,
      { ok: false, error: "Sign in with an administrator account." },
      401,
    );
  }

  const body = await readBody(request);
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return respond(request, { ok: false, error: "A valid user ID is required." }, 400);
  }

  let tier: ManagedTier | undefined;
  if (body.tier !== undefined) {
    if (!isManagedTier(body.tier)) {
      return respond(request, { ok: false, error: "Invalid entitlement tier." }, 400);
    }
    tier = body.tier;
  }

  const expiry = normalizeDate(body.tierExpiresAt);
  if (body.tierExpiresAt !== undefined && expiry === undefined) {
    return respond(request, { ok: false, error: "Invalid tier expiry date." }, 400);
  }

  const dailyLimit =
    body.dailyExportLimit === undefined
      ? undefined
      : normalizeLimit(body.dailyExportLimit);
  if (body.dailyExportLimit !== undefined && dailyLimit === null) {
    return respond(request, { ok: false, error: "Invalid daily export limit." }, 400);
  }

  try {
    const admin = createAdminClient();
    const { data: actorProfile, error: actorError } = await admin
      .from("profiles")
      .select("tier, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    if (actorError) throw actorError;

    const actorExpired =
      actorProfile?.tier_expires_at &&
      new Date(actorProfile.tier_expires_at).getTime() <= Date.now();
    if (actorProfile?.tier !== "admin" || actorExpired) {
      return respond(
        request,
        { ok: false, error: "Administrator access is required." },
        403,
      );
    }

    if (
      userId === user.id &&
      ((tier !== undefined && tier !== "admin") || body.tierExpiresAt !== undefined)
    ) {
      return respond(
        request,
        {
          ok: false,
          error: "Your own administrator tier or expiry cannot be changed here.",
        },
        400,
      );
    }

    const { data: existing, error: existingError } = await admin
      .from("profiles")
      .select("id,tier,daily_export_limit")
      .eq("id", userId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return respond(request, { ok: false, error: "User profile was not found." }, 404);
    }

    const updates: Record<string, string | number | null> = {};
    if (tier !== undefined) updates.tier = tier;
    if (expiry !== undefined) updates.tier_expires_at = expiry;
    if (dailyLimit !== undefined && dailyLimit !== null) {
      updates.daily_export_limit = dailyLimit;
    } else if (tier !== undefined && tier !== existing.tier) {
      updates.daily_export_limit = getDailyCleanExportLimit(tier);
    }

    if (Object.keys(updates).length === 0) {
      return respond(request, { ok: false, error: "No administrator change supplied." }, 400);
    }

    const { data: profile, error: updateError } = await admin
      .from("profiles")
      .update(updates)
      .eq("id", userId)
      .select(
        "id,email,display_name,tier,tier_expires_at,daily_export_limit,created_at,updated_at",
      )
      .single();
    if (updateError) throw updateError;

    console.info("PDFMantra admin profile update", {
      actorUserId: user.id,
      targetUserId: userId,
      fields: Object.keys(updates),
    });

    return respond(request, { ok: true, profile });
  } catch (error) {
    console.error("Admin profile update failed", error);
    return respond(
      request,
      { ok: false, error: "Unable to update this user profile." },
      500,
    );
  }
}
