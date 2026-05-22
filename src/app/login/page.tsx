import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Sign In — PDFMantra",
};

export default function LoginPage() {
  return (
    <AuthPageShell
      title="Sign in to PDFMantra"
      subtitle="Enter your email and password. We will then send a verification code to your email."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-[var(--violet-600)] hover:underline">
          Create one free
        </Link>
      </p>
    </AuthPageShell>
  );
}
