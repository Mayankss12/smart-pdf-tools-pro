import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  isPasswordRecoveryMarker,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/password-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const recoveryMode = isPasswordRecoveryMarker(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );
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

  const displayName =
    typeof user?.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim() || null
      : null;

  return NextResponse.json(
    {
      isSignedIn: Boolean(user) && !recoveryMode,
      email: recoveryMode ? null : user?.email ?? null,
      displayName: recoveryMode ? null : displayName,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
