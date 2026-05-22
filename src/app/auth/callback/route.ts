import { NextRequest, NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type");

  if (error) {
    const params = new URLSearchParams({
      error: errorDescription || error,
    });

    return NextResponse.redirect(`${origin}/auth/error?${params}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/error?error=Invalid+authentication+link`);
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    return NextResponse.redirect(`${origin}/auth/error?error=Authentication+service+is+not+configured`);
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    const params = new URLSearchParams({
      error: "Authentication failed. Please try again.",
    });

    return NextResponse.redirect(`${origin}/auth/error?${params}`);
  }

  if (type === "recovery") {
    return NextResponse.redirect(`${origin}/reset-password`);
  }

  return NextResponse.redirect(`${origin}${next.startsWith("/") ? next : "/dashboard"}`);
}
