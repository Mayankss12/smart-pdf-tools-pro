import { NextRequest, NextResponse } from "next/server";

import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_VALUE,
  PASSWORD_RECOVERY_MAX_AGE_SECONDS,
} from "@/lib/auth/password-recovery";
import { getSafeAuthRedirectPath } from "@/lib/auth/otp-flow";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/dashboard";
  const type = searchParams.get("type");
  const flow = searchParams.get("flow");

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

  if (
    type === "recovery" ||
    flow === "password-recovery" ||
    next === "/reset-password"
  ) {
    const response = NextResponse.redirect(`${origin}/reset-password`);
    response.cookies.set(
      PASSWORD_RECOVERY_COOKIE,
      PASSWORD_RECOVERY_COOKIE_VALUE,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: PASSWORD_RECOVERY_MAX_AGE_SECONDS,
      },
    );
    return response;
  }

  return NextResponse.redirect(`${origin}${getSafeAuthRedirectPath(next)}`);
}
