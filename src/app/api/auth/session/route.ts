import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json(
      { isSignedIn: false, email: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return NextResponse.json(
    {
      isSignedIn: Boolean(user),
      email: user?.email ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
