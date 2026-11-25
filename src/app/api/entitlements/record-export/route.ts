import { NextResponse } from "next/server";

import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameSiteStateChangingRequest,
  isVerifiedAnonymousIdentity,
} from "@/lib/api-security";
import {
  getCleanExportLimit,
  getEntitlementPlan,
  isUnlimitedPlan,
  normalizeTier,
  type UserTier,
} from "@/lib/entitlements";
import {
  ACCOUNT_EXPORT_ALLOWANCE,
  EXPORT_BURST,
  GUEST_EXPORT_ALLOWANCE,
  type ExportAllowance,
} from "@/lib/export-limits";
import {
  toExportStatusFields,
  unlimitedExportStatusFields,
  type ExportStatusFields,
} from "@/lib/export-status";
import {
  getNetworkIdentity,
  getNetworkIdentitySecret,
} from "@/lib/network-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  consumeExport,
  consumeGuestExport,
  type ExportKind,
  type UsageWindowRow,
} from "@/lib/usage-windows";
import { createSupabaseUsageWindowStore } from "@/lib/usage-windows-supabase";

type DailyUsageRow = {
  id: string;
  clean_exports_used: number;
  watermarked_exports_used: number;
  blocked_exports_count: number;
};

function isAnonymousId(value: unknown) {
  return typeof value === "string" && /^anon_[a-zA-Z0-9._-]+$/.test(value);
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
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
  // profiles.daily_export_limit is the per-user override: clean exports per 24 hours.
  const cleanExportLimit =
    typeof profile?.daily_export_limit === "number"
      ? profile.daily_export_limit
      : getCleanExportLimit(tier);

  return {
    tier,
    cleanExportLimit,
    allowance: {
      burst: EXPORT_BURST,
      daily: {
        limit: cleanExportLimit,
        windowHours: ACCOUNT_EXPORT_ALLOWANCE.daily.windowHours,
      },
    } satisfies ExportAllowance,
  };
}

// usage_daily keeps feeding the admin overview. It no longer decides anything,
// so a failure here must not turn an allowed export into an error.
async function recordDailyUsage({
  userId,
  anonymousId,
  toolKey,
  exportKind,
}: {
  userId: string | null;
  anonymousId: string | null;
  toolKey: string;
  exportKind: ExportKind;
}) {
  try {
    const adminClient = createAdminClient();
    const usageDate = getTodayDateKey();
    const column = userId ? "user_id" : "anonymous_id";
    const identity = (userId ?? anonymousId) as string;

    const { data: existing, error: readError } = await adminClient
      .from("usage_daily")
      .select("id, clean_exports_used, watermarked_exports_used, blocked_exports_count")
      .eq("usage_date", usageDate)
      .eq(column, identity)
      .maybeSingle();

    if (readError) throw readError;

    const counts = {
      clean_exports_used: exportKind === "clean" ? 1 : 0,
      watermarked_exports_used: exportKind === "watermarked" ? 1 : 0,
      blocked_exports_count: exportKind === "blocked" ? 1 : 0,
    };
    const stamp = {
      last_tool_key: toolKey,
      last_export_at: new Date().toISOString(),
    };

    if (existing) {
      const row = existing as DailyUsageRow;
      const { error } = await adminClient
        .from("usage_daily")
        .update({
          clean_exports_used: row.clean_exports_used + counts.clean_exports_used,
          watermarked_exports_used:
            row.watermarked_exports_used + counts.watermarked_exports_used,
          blocked_exports_count: row.blocked_exports_count + counts.blocked_exports_count,
          ...stamp,
        })
        .eq("id", row.id);

      if (error) throw error;
      return;
    }

    const { error } = await adminClient.from("usage_daily").insert({
      user_id: userId,
      anonymous_id: userId ? null : anonymousId,
      usage_date: usageDate,
      ...counts,
      ...stamp,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Unable to update daily usage analytics.", error);
  }
}

function createUsageResponse({
  request,
  allowed,
  identityType,
  tier,
  fields,
  row,
  unlimited,
  exportKind,
}: {
  request: Request;
  allowed: boolean;
  identityType: "guest" | "user";
  tier: UserTier;
  fields: ExportStatusFields;
  row: UsageWindowRow | null;
  unlimited: boolean;
  exportKind: ExportKind;
}) {
  const plan = getEntitlementPlan(tier);

  return NextResponse.json(
    {
      allowed,
      identityType,
      tier,
      planLabel: plan.label,
      exportKind,
      ...fields,
      watermarkedExportsUsed: row?.watermarked_exports_used ?? 0,
      blockedExportsCount: row?.blocked_exports_count ?? 0,
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
  if (!isSameSiteStateChangingRequest(request)) {
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
          cleanExportLimit: GUEST_EXPORT_ALLOWANCE.daily.limit,
          allowance: GUEST_EXPORT_ALLOWANCE,
        };

    const unlimited = isUnlimitedPlan(entitlement.tier);

    if (unlimited) {
      await recordDailyUsage({
        userId,
        anonymousId,
        toolKey,
        exportKind: requestedExportKind,
      });

      return createUsageResponse({
        request,
        allowed: requestedExportKind !== "blocked",
        identityType,
        tier: entitlement.tier,
        fields: unlimitedExportStatusFields(entitlement.cleanExportLimit),
        row: null,
        unlimited: true,
        exportKind: requestedExportKind,
      });
    }

    const store = createSupabaseUsageWindowStore();
    const networkId = userId
      ? null
      : getNetworkIdentity(request, getNetworkIdentitySecret());
    const result = userId
      ? await consumeExport({
          store,
          identity: { userId, anonymousId: null },
          requestedKind: requestedExportKind,
          toolKey,
          allowance: entitlement.allowance,
        })
      : await consumeGuestExport({
          store,
          guest: { userId: null, anonymousId },
          network: networkId ? { userId: null, anonymousId: networkId } : null,
          requestedKind: requestedExportKind,
          toolKey,
          allowance: entitlement.allowance,
        });

    await recordDailyUsage({
      userId,
      anonymousId,
      toolKey,
      exportKind: result.exportKind,
    });

    return createUsageResponse({
      request,
      allowed: result.allowed,
      identityType,
      tier: entitlement.tier,
      fields: toExportStatusFields(result.status),
      row: result.row,
      unlimited: false,
      exportKind: result.exportKind,
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
