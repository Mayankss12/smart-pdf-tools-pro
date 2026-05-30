import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { OtpVerifyForm } from "@/components/auth/OtpVerifyForm";

export const metadata: Metadata = {
  title: "Verify Login — PDFMantra",
};

interface VerifyOtpPageProps {
  readonly searchParams: Promise<{
    email?: string;
    redirectTo?: string;
    next?: string;
  }>;
}

function getSafeRedirectPath(value: string | undefined): string {
  const rawValue = value?.trim() ?? "";

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/dashboard";
  }

  const blockedPrefixes = ["/login", "/signup", "/logout", "/auth"];

  if (blockedPrefixes.some((prefix) => rawValue === prefix || rawValue.startsWith(`${prefix}/`))) {
    return "/dashboard";
  }

  return rawValue;
}

export default async function VerifyOtpPage({ searchParams }: VerifyOtpPageProps) {
  const params = await searchParams;
  const email = params.email || "";
  const redirectTo = getSafeRedirectPath(params.redirectTo ?? params.next);

  if (!email) {
    return (
      <AuthPageShell
        title="Verification error"
        subtitle="Please start the login process from the beginning."
      >
        <Link href="/login" className="btn-primary w-full">
          Back to Login
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Check your email"
      subtitle={`We sent a 6-digit verification code to ${email}. Enter it below to sign in.`}
    >
      <OtpVerifyForm email={email} redirectTo={redirectTo} />
    </AuthPageShell>
  );
}