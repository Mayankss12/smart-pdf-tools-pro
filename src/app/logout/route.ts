import { NextRequest, NextResponse } from "next/server";

import { isSameSiteStateChangingRequest } from "@/lib/api-security";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/auth/password-recovery";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function logout(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  const response = NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  response.cookies.delete(PASSWORD_RECOVERY_COOKIE);
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameSiteStateChangingRequest(request)) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  return logout(request);
}

export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}
