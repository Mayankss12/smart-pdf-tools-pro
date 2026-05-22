import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = {
  title: "Create Account — PDFMantra",
};

export default function SignupPage() {
  return (
    <AuthPageShell
      title="Create your account"
      subtitle="Start using PDFMantra for free. No credit card required."
    >
      <SignupForm />
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--violet-600)] hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
