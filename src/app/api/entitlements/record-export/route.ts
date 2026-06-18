import { NextResponse } from "next/server";

import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameOriginRequest,
  isVerifiedAnonymousIdentity,
} from "@/lib/api-security";
import {
  getDailyCleanExportLimit,
  getEntitlementPlan,
  normalizeTier,
  type UserTier,
} from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ExportKind = "clean" | "watermarked" | "blocked";

type UsageRow = {
  id: string;
  clean_exports_used: number;
  watermarked_exports_used: number;
  blocked_exports_count: number;
};

const GUEST_DAILY_CLEAN_EXPORT_LIMIT = 1;

function isAnonymousId(value: unknown) {
  return typeof value === "string" && /^anon_[a-zA-Z0-9._-]+$/.test(value);
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function isUnlimitedTier(tier: UserTier) {
  return tier === "plus" || tier === "pro" || tier === "admin";
}

function normalizeExportKind(value: unknown): ExportKind {
  if (value === "clean" || value === "watermarked" || value === "blocked") {
    return value;
  }

  return "clean";
}

function normalizeToolKey(value: unknown) {
  if (typeof value !== "string") {
    return "unknown";
  }

  const cleaned = value.trim().toLowerCase();

  return cleaned || "unknown";
}

async function readRequestBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function getCurrentUserId() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function getUserTierAndLimit(userId: string) {
  const adminClient = createAdminClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("tier, tier_expires_at, daily_export_limit")
    .eq("id", userId)
    .maybeSingle();

  const normalizedTier = normalizeTier(profile?.tier ?? "free");
  const tierExpired =
    profile?.tier_expires_at &&
    new Date(profile.tier_expires_at).getTime() <= Date.now();

  const tier = tierExpired ? "free" : normalizedTier;
  const dailyLimit =
    typeof profile?.daily_export_limit === "number"
      ? profile.daily_export_limit
      : getDailyCleanExportLimit(tier);

  return {
    tier,
    dailyLimit,
  };
}

async function getUsageRow({
  userId,
  anonymousId,
  usageDate,
}: {
  userId: string | null;
  anonymousId: string | null;
  usageDate: string;
}) {
  const adminClient = createAdminClient();

  let query = adminClient
    .from("usage_daily")
    .select("id, clean_exports_used, watermarked_exports_used, blocked_exports_count")
    .eq("usage_date", usageDate);

  if (userId) {
    query = query.eq("user_id", userId);
  } else {
    query = query.eq("anonymous_id", anonymousId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  return (data as UsageRow | null) ?? null;
}

async function createUsageRow({
  userId,
  anonymousId,
  usageDate,
  toolKey,
  exportKind,
}: {
  userId: string | null;
  anonymousId: string | null;
  usageDate: string;
  toolKey: string;
  exportKind: ExportKind;
}) {
  const adminClient = createAdminClient();

  const insertPayload = {
    user_id: userId,
    anonymous_id: userId ? null : anonymousId,
    usage_date: usageDate,
    clean_exports_used: exportKind === "clean" ? 1 : 0,
    watermarked_exports_used: exportKind === "watermarked" ? 1 : 0,
    blocked_exports_count: exportKind === "blocked" ? 1 : 0,
    last_tool_key: toolKey,
    last_export_at: new Date().toISOString(),
  };

  const { data, error } = await adminClient
    .from("usage_daily")
    .insert(insertPayload)
    .select("id, clean_exports_used, watermarked_exports_used, blocked_exports_count")
    .single();

  if (error) {
    throw error;
  }

  return data as UsageRow;
}

async function updateUsageRow({
  usageRow,
  toolKey,
  exportKind,
}: {
  usageRow: UsageRow;
  toolKey: string;
  exportKind: ExportKind;
}) {
  const adminClient = createAdminClient();

  const nextCleanExportsUsed =
    usageRow.clean_exports_used + (exportKind === "clean" ? 1 : 0);
  const nextWatermarkedExportsUsed =
    usageRow.watermarked_exports_used + (exportKind === "watermarked" ? 1 : 0);
  const nextBlockedExportsCount =
    usageRow.blocked_exports_count + (exportKind === "blocked" ? 1 : 0);

  const { data, error } = await adminClient
    .from("usage_daily")
    .update({
      clean_exports_used: nextCleanExportsUsed,
      watermarked_exports_used: nextWatermarkedExportsUsed,
      blocked_exports_count: nextBlockedExportsCount,
      last_tool_key: toolKey,
      last_export_at: new Date().toISOString(),
    })
    .eq("id", usageRow.id)
    .select("id, clean_exports_used, watermarked_exports_used, blocked_exports_count")
    .single();

  if (error) {
    throw error;
  }

  return data as UsageRow;
}

function createUsageResponse({
  request,
  allowed,
  identityType,
  tier,
  dailyLimit,
  usageRow,
  exportKind,
}: {
  request: Request;
  allowed: boolean;
  identityType: "guest" | "user";
  tier: UserTier;
  dailyLimit: number;
  usageRow: UsageRow;
  exportKind: ExportKind;
}) {
  const plan = getEntitlementPlan(tier);
  const unlimited = isUnlimitedTier(tier);
  const remaining = unlimited
    ? dailyLimit
    : Math.max(0, dailyLimit - usageRow.clean_exports_used);

  return NextResponse.json(
    {
      allowed,
      identityType,
      tier,
      planLabel: plan.label,
      exportKind,
      dailyCleanExportLimit: dailyLimit,
      cleanExportsUsed: usageRow.clean_exports_used,
      cleanExportsRemaining: remaining,
      watermarkedExportsUsed: usageRow.watermarked_exports_used,
      blockedExportsCount: usageRow.blocked_exports_count,
      canExportClean: unlimited || remaining > 0,
      isUnlimited: unlimited,
    },
    {
      status: allowed ? 200 : 402,
      headers: createNoStoreHeaders(request),
    },
  );
}

function createErrorResponse({
  request,
  status,
  error,
}: {
  request: Request;
  status: number;
  error: string;
}) {
  return NextResponse.json(
    {
      allowed: false,
      error,
    },
    {
      status,
      headers: createNoStoreHeaders(request),
    },
  );
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "POST, OPTIONS");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return createErrorResponse({
      request,
      status: 403,
      error: "Request origin is not allowed.",
    });
  }

  const body = await readRequestBody(request);

  const userId = await getCurrentUserId();
  const anonymousId = isAnonymousId(body.anonymousId) ? body.anonymousId : null;
  const toolKey = normalizeToolKey(body.toolKey);
  const requestedExportKind = normalizeExportKind(body.exportKind);
  const usageDate = getTodayDateKey();

  if (!userId && !isVerifiedAnonymousIdentity(request, anonymousId)) {
    return createErrorResponse({
      request,
      status: 401,
      error: "Anonymous usage identity could not be verified.",
    });
  }

  try {
    const identityType = userId ? "user" : "guest";

    const entitlement = userId
      ? await getUserTierAndLimit(userId)
      : {
          tier: "guest" as UserTier,
          dailyLimit: GUEST_DAILY_CLEAN_EXPORT_LIMIT,
        };

    const existingUsageRow = await getUsageRow({
      userId,
      anonymousId,
      usageDate,
    });

    const currentCleanExportsUsed = existingUsageRow?.clean_exports_used ?? 0;
    const unlimited = isUnlimitedTier(entitlement.tier);
    const cleanExportAllowed =
      unlimited || currentCleanExportsUsed < entitlement.dailyLimit;

    const finalExportKind: ExportKind =
      requestedExportKind === "clean" && !cleanExportAllowed
        ? "blocked"
        : requestedExportKind;

    const finalAllowed = finalExportKind !== "blocked";

    const nextUsageRow = existingUsageRow
      ? await updateUsageRow({
          usageRow: existingUsageRow,
          toolKey,
          exportKind: finalExportKind,
        })
      : await createUsageRow({
          userId,
          anonymousId,
          usageDate,
          toolKey,
          exportKind: finalExportKind,
        });

    return createUsageResponse({
      request,
      allowed: finalAllowed,
      identityType,
      tier: entitlement.tier,
      dailyLimit: entitlement.dailyLimit,
      usageRow: nextUsageRow,
      exportKind: finalExportKind,
    });
  } catch (error) {
    console.error(error);

    return createErrorResponse({
      request,
      status: 500,
      error: "Unable to record usage right now.",
    });
  }
}
