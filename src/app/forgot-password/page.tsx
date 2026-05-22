import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password — PDFMantra",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Reset your password"
      subtitle="Enter your account email and we will send a reset link if an account exists."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Remember your password?{" "}
        <Link href="/login" className="font-semibold text-[var(--violet-600)] hover:underline">
          Back to login
        </Link>
      </p>
    </AuthPageShell>
  );
}
