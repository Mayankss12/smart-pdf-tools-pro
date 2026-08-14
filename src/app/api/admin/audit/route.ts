import { NextResponse } from "next/server";

import { ADMIN_PROFILE_UPDATE_TOOL_KEY } from "@/lib/admin/audit";
import {
  createCorsPreflightResponse,
  createNoStoreHeaders,
  isSameOriginRequest,
} from "@/lib/api-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function respond(request: Request, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: createNoStoreHeaders(request),
  });
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
    const { data: adminProfile, error: profileError } = await admin
      .from("profiles")
      .select("tier,tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) throw profileError;

    const expired =
      adminProfile?.tier_expires_at &&
      new Date(adminProfile.tier_expires_at).getTime() <= Date.now();

    if (adminProfile?.tier !== "admin" || expired) {
      return respond(
        request,
        { ok: false, error: "Administrator access is required." },
        403,
      );
    }

    const { data: records, error } = await admin
      .from("tool_runs")
      .select(
        "id,owner_id,tool_key,status,execution_mode,input_summary,result_summary,duration_ms,created_at",
      )
      .eq("tool_key", ADMIN_PROFILE_UPDATE_TOOL_KEY)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    return respond(request, {
      ok: true,
      generatedAt: new Date().toISOString(),
      records: records ?? [],
    });
  } catch (error) {
    console.error("Administrator audit retrieval failed", error);
    return respond(
      request,
      { ok: false, error: "Unable to load administrator audit records." },
      500,
    );
  }
}
