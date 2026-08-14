import { NextResponse } from "next/server";

import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameOriginRequest,
} from "@/lib/api-security";
import { getBackendCapabilityReport } from "@/lib/backend/capabilities";
import { getConversionAdminControls } from "@/lib/conversions/administration";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ManagedTier = "free" | "plus" | "pro" | "admin";

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

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request, "GET, OPTIONS");
}

export async function GET(request: Request) {
  if (!isSameOriginRequest(request)) {
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

  try {
    const admin = createAdminClient();
    const { data: adminProfile, error: adminProfileError } = await admin
      .from("profiles")
      .select("tier, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) throw adminProfileError;

    const tierExpired =
      adminProfile?.tier_expires_at &&
      new Date(adminProfile.tier_expires_at).getTime() <= Date.now();

    if (adminProfile?.tier !== "admin" || tierExpired) {
      return respond(
        request,
        { ok: false, error: "Administrator access is required." },
        403,
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const profilesQuery = await admin
      .from("profiles")
      .select(
        "id,email,display_name,tier,tier_expires_at,daily_export_limit,created_at,updated_at",
      )
      .order("updated_at", { ascending: false })
      .limit(100);
    if (profilesQuery.error) throw profilesQuery.error;

    const usageQuery = await admin
      .from("usage_daily")
      .select(
        "user_id,anonymous_id,clean_exports_used,watermarked_exports_used,blocked_exports_count,last_tool_key,last_export_at",
      )
      .eq("usage_date", today);
    if (usageQuery.error) throw usageQuery.error;

    const subscriptionsQuery = await admin
      .from("subscriptions")
      .select("tier,status,cancel_at_period_end,current_period_end");
    if (subscriptionsQuery.error) throw subscriptionsQuery.error;

    const jobsQuery = await admin
      .from("processing_jobs")
      .select("status,job_type,created_at,completed_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (jobsQuery.error) throw jobsQuery.error;

    const toolRunsQuery = await admin
      .from("tool_runs")
      .select("tool_key,status,execution_mode,duration_ms,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (toolRunsQuery.error) throw toolRunsQuery.error;

    const profiles = profilesQuery.data ?? [];
    const usage = usageQuery.data ?? [];
    const subscriptions = subscriptionsQuery.data ?? [];
    const jobs = jobsQuery.data ?? [];
    const toolRuns = toolRunsQuery.data ?? [];

    const tierCounts: Record<ManagedTier, number> = {
      free: 0,
      plus: 0,
      pro: 0,
      admin: 0,
    };
    for (const profile of profiles) {
      if (isManagedTier(profile.tier)) tierCounts[profile.tier] += 1;
    }

    const usageToday = {
      cleanExports: 0,
      watermarkedExports: 0,
      blockedExports: 0,
    };
    for (const row of usage) {
      usageToday.cleanExports += Number(row.clean_exports_used ?? 0);
      usageToday.watermarkedExports += Number(row.watermarked_exports_used ?? 0);
      usageToday.blockedExports += Number(row.blocked_exports_count ?? 0);
    }

    const activeSubscriptions = subscriptions.filter(
      (item) => item.status === "active" || item.status === "trialing",
    ).length;
    const runningJobs = jobs.filter(
      (item) => item.status === "queued" || item.status === "running",
    ).length;
    const failedJobs = jobs.filter((item) => item.status === "failed").length;
    const recentFailedToolRuns = toolRuns.filter(
      (item) => item.status === "failed",
    ).length;
    const backend = getBackendCapabilityReport();

    return respond(request, {
      ok: true,
      generatedAt: new Date().toISOString(),
      admin: {
        userId: user.id,
        email: user.email ?? null,
      },
      overview: {
        profiles: profiles.length,
        tierCounts,
        activeSubscriptions,
        usageToday,
        activeIdentitiesToday: usage.length,
        runningJobs,
        failedJobs,
        recentFailedToolRuns,
      },
      backend: {
        configured: backend.configured,
        checks: {
          supabasePublicConfigured: backend.supabasePublicConfigured,
          supabaseAdminConfigured: backend.supabaseAdminConfigured,
          processingApiConfigured: backend.processingApiConfigured,
        },
        capabilities: backend.capabilities,
      },
      conversions: getConversionAdminControls(),
      profiles,
      recentJobs: jobs.slice(0, 25),
      recentToolRuns: toolRuns.slice(0, 25),
    });
  } catch (error) {
    console.error("Admin overview failed", error);
    return respond(
      request,
      { ok: false, error: "Unable to load administrator data." },
      500,
    );
  }
}
