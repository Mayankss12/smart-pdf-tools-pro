import { NextResponse } from "next/server";

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
  evaluateExportAllowance,
} from "@/lib/export-limits";
import {
  toExportStatusFields,
  unlimitedExportStatusFields,
  type ExportStatusFields,
} from "@/lib/export-status";
import {
  createAnonymousIdentityCookie,
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameOriginRequest,
} from "@/lib/api-security";
import {
  getNetworkIdentity,
  getNetworkIdentitySecret,
} from "@/lib/network-identity";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  readExportAllowance,
  readGuestExportAllowance,
} from "@/lib/usage-windows";
import { createSupabaseUsageWindowStore } from "@/lib/usage-windows-supabase";

const ALLOWED_METHODS = "GET, OPTIONS";

type StatusPayload = ExportStatusFields & {
  identityType: "guest" | "user";
  tier: UserTier;
  watermarkedExportsUsed: number;
  blockedExportsCount: number;
  isUnlimited: boolean;
  planLabel: string;
};

function isAnonymousId(value: string | null) {
  return typeof value === "string" && /^anon_[a-zA-Z0-9._-]+$/.test(value);
}

function createResponse(
  request: Request,
  payload: StatusPayload,
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

  const supabase = await createSupabaseServerClient();

  let userId: string | null = null;

  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    userId = user?.id ?? null;
  }

  if (userId) {
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

    const userTier: UserTier = tierExpired ? "free" : normalizedTier;
    const plan = getEntitlementPlan(userTier);
    const cleanExportLimit =
      typeof profile?.daily_export_limit === "number"
        ? profile.daily_export_limit
        : getCleanExportLimit(userTier);

    if (isUnlimitedPlan(userTier)) {
      return createResponse(request, {
        identityType: "user",
        tier: userTier,
        ...unlimitedExportStatusFields(cleanExportLimit),
        watermarkedExportsUsed: 0,
        blockedExportsCount: 0,
        isUnlimited: true,
        planLabel: plan.label,
      });
    }

    const { row, status } = await readExportAllowance({
      store: createSupabaseUsageWindowStore(adminClient),
      identity: { userId, anonymousId: null },
      allowance: {
        burst: EXPORT_BURST,
        daily: {
          limit: cleanExportLimit,
          windowHours: ACCOUNT_EXPORT_ALLOWANCE.daily.windowHours,
        },
      },
    });

    return createResponse(request, {
      identityType: "user",
      tier: userTier,
      ...toExportStatusFields(status),
      watermarkedExportsUsed: row?.watermarked_exports_used ?? 0,
      blockedExportsCount: row?.blocked_exports_count ?? 0,
      isUnlimited: false,
      planLabel: plan.label,
    });
  }

  const guestPlan = getEntitlementPlan("guest");

  if (!isAnonymousId(anonymousId)) {
    return createResponse(request, {
      identityType: "guest",
      tier: "guest",
      ...toExportStatusFields(
        evaluateExportAllowance({
          now: Date.now(),
          state: { burst: null, daily: null },
          allowance: GUEST_EXPORT_ALLOWANCE,
        }),
      ),
      watermarkedExportsUsed: 0,
      blockedExportsCount: 0,
      isUnlimited: false,
      planLabel: guestPlan.label,
    });
  }

  const networkId = getNetworkIdentity(request, getNetworkIdentitySecret());
  const { row, status } = await readGuestExportAllowance({
    store: createSupabaseUsageWindowStore(),
    guest: { userId: null, anonymousId },
    network: networkId ? { userId: null, anonymousId: networkId } : null,
    allowance: GUEST_EXPORT_ALLOWANCE,
  });

  return createResponse(
    request,
    {
      identityType: "guest",
      tier: "guest",
      ...toExportStatusFields(status),
      watermarkedExportsUsed: row?.watermarked_exports_used ?? 0,
      blockedExportsCount: row?.blocked_exports_count ?? 0,
      isUnlimited: false,
      planLabel: guestPlan.label,
    },
    {
      setAnonymousIdentity: anonymousId,
    },
  );
}
