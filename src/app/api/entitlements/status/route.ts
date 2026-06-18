import { NextResponse } from "next/server";

import {
  getDailyCleanExportLimit,
  getEntitlementPlan,
  normalizeTier,
  type UserTier,
} from "@/lib/entitlements";
import {
  createAnonymousIdentityCookie,
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameOriginRequest,
} from "@/lib/api-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type UsageRow = {
  clean_exports_used: number;
  watermarked_exports_used: number;
  blocked_exports_count: number;
};

const GUEST_DAILY_CLEAN_EXPORT_LIMIT = 1;
const ALLOWED_METHODS = "GET, OPTIONS";

function isAnonymousId(value: string | null) {
  return typeof value === "string" && /^anon_[a-zA-Z0-9._-]+$/.test(value);
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function emptyUsage(): UsageRow {
  return {
    clean_exports_used: 0,
    watermarked_exports_used: 0,
    blocked_exports_count: 0,
  };
}

function createResponse(
  request: Request,
  payload: {
    identityType: "guest" | "user";
    tier: UserTier;
    dailyCleanExportLimit: number;
    cleanExportsUsed: number;
    cleanExportsRemaining: number;
    watermarkedExportsUsed: number;
    blockedExportsCount: number;
    canExportClean: boolean;
    isUnlimited: boolean;
    planLabel: string;
  },
  options?: {
    setAnonymousIdentity?: string;
  },
) {
  const headers = createNoStoreHeaders(request);

  if (options?.setAnonymousIdentity) {
    headers.append("Set-Cookie", createAnonymousIdentityCookie(options.setAnonymousIdentity));
  }

  return NextResponse.json(payload, {
    headers,
  });
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, ALLOWED_METHODS);
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      {
        error: "Request origin is not allowed.",
      },
      {
        status: 403,
        headers: createNoStoreHeaders(request),
      },
    );
  }

  const url = new URL(request.url);
  const anonymousId = url.searchParams.get("anonymousId");
  const usageDate = getTodayDateKey();

  const supabase = await createSupabaseServerClient();

  let userId: string | null = null;
  let userTier: UserTier = "guest";

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  }

  const adminClient = createAdminClient();

  if (userId) {
    const { data: profile } = await adminClient
      .from("profiles")
      .select("tier, tier_expires_at, daily_export_limit")
      .eq("id", userId)
      .maybeSingle();

    const normalizedTier = normalizeTier(profile?.tier ?? "free");
    const tierExpired =
      profile?.tier_expires_at &&
      new Date(profile.tier_expires_at).getTime() <= Date.now();

    userTier = tierExpired ? "free" : normalizedTier;

    const plan = getEntitlementPlan(userTier);
    const dailyLimit =
      typeof profile?.daily_export_limit === "number"
        ? profile.daily_export_limit
        : getDailyCleanExportLimit(userTier);

    const { data: usage } = await adminClient
      .from("usage_daily")
      .select("clean_exports_used, watermarked_exports_used, blocked_exports_count")
      .eq("user_id", userId)
      .eq("usage_date", usageDate)
      .maybeSingle();

    const usageRow = (usage as UsageRow | null) ?? emptyUsage();
    const isUnlimited =
      userTier === "plus" || userTier === "pro" || userTier === "admin";
    const remaining = isUnlimited
      ? dailyLimit
      : Math.max(0, dailyLimit - usageRow.clean_exports_used);

    return createResponse(request, {
      identityType: "user",
      tier: userTier,
      dailyCleanExportLimit: dailyLimit,
      cleanExportsUsed: usageRow.clean_exports_used,
      cleanExportsRemaining: remaining,
      watermarkedExportsUsed: usageRow.watermarked_exports_used,
      blockedExportsCount: usageRow.blocked_exports_count,
      canExportClean: isUnlimited || remaining > 0,
      isUnlimited,
      planLabel: plan.label,
    });
  }

  if (!isAnonymousId(anonymousId)) {
    const plan = getEntitlementPlan("guest");

    return createResponse(request, {
      identityType: "guest",
      tier: "guest",
      dailyCleanExportLimit: GUEST_DAILY_CLEAN_EXPORT_LIMIT,
      cleanExportsUsed: 0,
      cleanExportsRemaining: GUEST_DAILY_CLEAN_EXPORT_LIMIT,
      watermarkedExportsUsed: 0,
      blockedExportsCount: 0,
      canExportClean: true,
      isUnlimited: false,
      planLabel: plan.label,
    });
  }

  const { data: usage } = await adminClient
    .from("usage_daily")
    .select("clean_exports_used, watermarked_exports_used, blocked_exports_count")
    .eq("anonymous_id", anonymousId)
    .eq("usage_date", usageDate)
    .maybeSingle();

  const usageRow = (usage as UsageRow | null) ?? emptyUsage();
  const remaining = Math.max(
    0,
    GUEST_DAILY_CLEAN_EXPORT_LIMIT - usageRow.clean_exports_used,
  );
  const plan = getEntitlementPlan("guest");

  return createResponse(
    request,
    {
      identityType: "guest",
      tier: "guest",
      dailyCleanExportLimit: GUEST_DAILY_CLEAN_EXPORT_LIMIT,
      cleanExportsUsed: usageRow.clean_exports_used,
      cleanExportsRemaining: remaining,
      watermarkedExportsUsed: usageRow.watermarked_exports_used,
      blockedExportsCount: usageRow.blocked_exports_count,
      canExportClean: remaining > 0,
      isUnlimited: false,
      planLabel: plan.label,
    },
    {
      setAnonymousIdentity: anonymousId,
    },
  );
}
