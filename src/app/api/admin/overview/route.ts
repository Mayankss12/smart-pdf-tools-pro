import { NextResponse } from "next/server";

import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameSiteStateChangingRequest,
} from "@/lib/api-security";
import { requireAdminIdentity } from "@/lib/admin/access";
import { getBackendCapabilityReport } from "@/lib/backend/capabilities";
import { getConversionAdminControls } from "@/lib/conversions/administration";
import {
  getDailyCleanExportLimit,
  normalizeTier,
  type UserTier,
} from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADMIN_TIERS: readonly UserTier[] = ["free", "plus", "pro", "admin"];

function json(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: createNoStoreHeaders(request),
  });
}

function getTodayDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function safeInteger(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return Math.max(min, Math.min(max, parsed));
}

function normalizeExpiry(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

async function readBody(request: Request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "GET, PATCH, OPTIONS");
}

export async function GET(request: Request) {
  const access = await requireAdminIdentity();
  if (!access.allowed) {
    return json(request, { ok: false, error: access.message }, access.status);
  }

  try {
    const adminClient = createAdminClient();
    const today = getTodayDateKey();

    const [
      profilesResult,
      usageResult,
      subscriptionsResult,
      jobsResult,
      toolRunsResult,
    ] = await Promise.all([
      adminClient
        .from("profiles")
        .select(
          "id,email,display_name,tier,tier_expires_at,daily_export_limit,created_at,updated_at",
        )
        .order("updated_at", { ascending: false })
        .limit(100),
      adminClient
        .from("usage_daily")
        .select(
          "user_id,anonymous_id,clean_exports_used,watermarked_exports_used,blocked_exports_count,last_tool_key,last_export_at",
        )
        .eq("usage_date", today),
      adminClient
        .from("subscriptions")
        .select("tier,status,cancel_at_period_end,current_period_end"),
      adminClient
        .from("processing_jobs")
        .select("status,job_type,created_at,completed_at")
        .order("created_at", { ascending: false })
        .limit(100),
      adminClient
        .from("tool_runs")
        .select("tool_key,status,execution_mode,duration_ms,created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const firstError = [
      profilesResult.error,
      usageResult.error,
      subscriptionsResult.error,
      jobsResult.error,
      toolRunsResult.error,
    ].find(Boolean);

    if (firstError) {
      throw firstError;
    }

    const profiles = profilesResult.data ?? [];
    const usage = usageResult.data ?? [];
    const subscriptions = subscriptionsResult.data ?? [];
    const jobs = jobsResult.data ?? [];
    const toolRuns = toolRunsResult.data ?? [];

    const tierCounts = Object.fromEntries(
      ADMIN_TIERS.map((tier) => [
        tier,
        profiles.filter((profile) => normalizeTier(profile.tier) === tier).length,
      ]),
    );

    const usageTotals = usage.reduce(
      (totals, row) => ({
        cleanExports:
          totals.cleanExports + Number(row.clean_exports_used ?? 0),
        watermarkedExports:
          totals.watermarkedExports + Number(row.watermarked_exports_used ?? 0),
        blockedExports:
          totals.blockedExports + Number(row.blocked_exports_count ?? 0),
      }),
      { cleanExports: 0, watermarkedExports: 0, blockedExports: 0 },
    );

    const activeSubscriptions = subscriptions.filter(
      (subscription) =>
        subscription.status === "active" || subscription.status === "trialing",
    ).length;
    const failedJobs = jobs.filter((job) => job.status === "failed").length;
    const runningJobs = jobs.filter(
      (job) => job.status === "queued" || job.status === "running",
    ).length;
    const failedToolRuns = toolRuns.filter((run) => run.status === "failed").length;
    const backend = getBackendCapabilityReport();
    const conversionControls = getConversionAdminControls();

    return json(request, {
      ok: true,
      generatedAt: new Date().toISOString(),
      admin: access.identity,
      overview: {
        profiles: profiles.length,
        tierCounts,
        activeSubscriptions,
        usageToday: usageTotals,
        activeIdentitiesToday: usage.length,
        runningJobs,
        failedJobs,
        recentFailedToolRuns: failedToolRuns,
      },
      backend: {
        configured: backend.configured,
        checks: {
          supabasePublicConfigured: backend.supabasePublicConfigured,
          supabaseAdminConfigured: backend.supabaseAdminConfigured,
          processingApiConfigured: backend.processingApiConfigured,
        },
        capabilities: backend.capabilities,
        storageBuckets: backend.storageBuckets,
      },
      conversions: conversionControls,
      profiles,
      recentUsage: usage
        .sort((left, right) =>
          String(right.last_export_at ?? "").localeCompare(
            String(left.last_export_at ?? ""),
          ),
        )
        .slice(0, 25),
      recentJobs: jobs.slice(0, 25),
      recentToolRuns: toolRuns.slice(0, 25),
    });
  } catch (error) {
    console.error("Admin overview failed", error);
    return json(
      request,
      { ok: false, error: "Unable to load administrator data." },
      500,
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) {
    return json(request, { ok: false, error: "Request origin is not allowed." }, 403);
  }

  const access = await requireAdminIdentity();
  if (!access.allowed) {
    return json(request, { ok: false, error: access.message }, access.status);
  }

  const body = await readBody(request);
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return json(request, { ok: false, error: "A valid user ID is required." }, 400);
  }

  const requestedTier =
    typeof body.tier === "string" &&
    ADMIN_TIERS.includes(body.tier as UserTier)
      ? (body.tier as UserTier)
      : undefined;
  const expiry = normalizeExpiry(body.tierExpiresAt);
  const limit =
    body.dailyExportLimit === undefined
      ? undefined
      : safeInteger(body.dailyExportLimit, 0, 999999);

  if (body.tier !== undefined && !requestedTier) {
    return json(request, { ok: false, error: "Invalid entitlement tier." }, 400);
  }
  if (body.tierExpiresAt !== undefined && expiry === undefined) {
    return json(request, { ok: false, error: "Invalid tier expiry date." }, 400);
  }
  if (body.dailyExportLimit !== undefined && limit === null) {
    return json(request, { ok: false, error: "Invalid daily export limit." }, 400);
  }
  if (
    userId === access.identity.userId &&
    ((requestedTier && requestedTier !== "admin") || expiry !== undefined)
  ) {
    return json(
      request,
      {
        ok: false,
        error: "Your own administrator tier or expiry cannot be changed here.",
      },
      400,
    );
  }

  try {
    const adminClient = createAdminClient();
    const { data: existing, error: existingError } = await adminClient
      .from("profiles")
      .select("id,tier,daily_export_limit")
      .eq("id", userId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return json(request, { ok: false, error: "User profile was not found." }, 404);
    }

    const nextTier = requestedTier ?? normalizeTier(existing.tier);
    const updatePayload: Record<string, unknown> = {};

    if (requestedTier) updatePayload.tier = requestedTier;
    if (expiry !== undefined) updatePayload.tier_expires_at = expiry;
    if (limit !== undefined && limit !== null) {
      updatePayload.daily_export_limit = limit;
    } else if (requestedTier && requestedTier !== normalizeTier(existing.tier)) {
      updatePayload.daily_export_limit = getDailyCleanExportLimit(nextTier);
    }

    if (Object.keys(updatePayload).length === 0) {
      return json(request, { ok: false, error: "No administrator change supplied." }, 400);
    }

    const { data: profile, error } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", userId)
      .select(
        "id,email,display_name,tier,tier_expires_at,daily_export_limit,created_at,updated_at",
      )
      .single();

    if (error) throw error;

    console.info("PDFMantra admin profile update", {
      actorUserId: access.identity.userId,
      targetUserId: userId,
      fields: Object.keys(updatePayload),
    });

    return json(request, { ok: true, profile });
  } catch (error) {
    console.error("Admin profile update failed", error);
    return json(
      request,
      { ok: false, error: "Unable to update this user profile." },
      500,
    );
  }
}
