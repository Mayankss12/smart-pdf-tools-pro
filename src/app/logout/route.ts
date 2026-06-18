import { NextRequest, NextResponse } from "next/server";

import { isSameSiteStateChangingRequest } from "@/lib/api-security";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function logout(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
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
