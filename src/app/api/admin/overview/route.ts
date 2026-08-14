import { NextResponse } from "next/server";

import { createNoStoreHeaders } from "@/lib/api-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Authentication service is not configured." },
      { status: 503, headers: createNoStoreHeaders(request) },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in with an administrator account." },
      { status: 401, headers: createNoStoreHeaders(request) },
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tier, tier_expires_at")
    .eq("id", user.id)
    .maybeSingle();
  const expired =
    profile?.tier_expires_at &&
    new Date(profile.tier_expires_at).getTime() <= Date.now();

  if (profile?.tier !== "admin" || expired) {
    return NextResponse.json(
      { ok: false, error: "Administrator access is required." },
      { status: 403, headers: createNoStoreHeaders(request) },
    );
  }

  return NextResponse.json(
    { ok: true, admin: { userId: user.id, email: user.email ?? null } },
    { headers: createNoStoreHeaders(request) },
  );
}
