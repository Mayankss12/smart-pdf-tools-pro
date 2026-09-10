import { NextResponse, type NextRequest } from "next/server";

import {
  isPasswordRecoveryMarker,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/password-recovery";
import { refreshSupabaseSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const recoveryMode = isPasswordRecoveryMarker(
    request.cookies.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );
  const pathname = request.nextUrl.pathname;
  const recoveryAllowed =
    pathname === "/reset-password" ||
    pathname === "/forgot-password" ||
    pathname === "/logout" ||
    pathname.startsWith("/auth/");

  if (recoveryMode && !recoveryAllowed) {
    return NextResponse.redirect(new URL("/reset-password", request.url));
  }

  return refreshSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
