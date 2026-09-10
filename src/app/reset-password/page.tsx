import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import {
  isPasswordRecoveryMarker,
  PASSWORD_RECOVERY_COOKIE,
} from "@/lib/auth/password-recovery";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Set New Password — PDFMantra",
};

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const cookieStore = await cookies();
  const recoveryMarked = isPasswordRecoveryMarker(
    cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value,
  );
  const supabase = await createSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  if (!recoveryMarked || !user) {
    return (
      <AuthPageShell
        title="Reset link expired"
        subtitle="Request a new password reset link to continue securely."
      >
        <Link
          href="/forgot-password"
          className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-[#5f4bc6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(74,55,168,0.2)] outline-none transition hover:bg-[#503db5] focus-visible:ring-4 focus-visible:ring-violet-200 motion-reduce:transition-none"
        >
          Request a new reset link
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Set your new password"
      subtitle="Choose a strong password with at least eight characters."
    >
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
