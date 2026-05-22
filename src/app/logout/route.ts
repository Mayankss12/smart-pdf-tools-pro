import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";
}

export async function POST() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  return NextResponse.redirect(new URL("/login", getSiteUrl()));
}

export async function GET() {
  return POST();
}
