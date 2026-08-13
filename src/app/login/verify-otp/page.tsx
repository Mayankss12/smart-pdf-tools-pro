import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { OtpVerifyForm } from "@/components/auth/OtpVerifyForm";
import {
  getSafeAuthRedirectPath,
  normalizeAuthEmail,
} from "@/lib/auth/otp-flow";

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

export default async function VerifyOtpPage({ searchParams }: VerifyOtpPageProps) {
  const params = await searchParams;
  const email = normalizeAuthEmail(params.email || "");
  const redirectTo = getSafeAuthRedirectPath(params.redirectTo ?? params.next);

  if (!email) {
    return (
      <AuthPageShell
        title="Verification error"
        subtitle="Please start the login process from the beginning."
      >
        <Link
          href="/login"
          className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-[#5f4bc6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(74,55,168,0.2)] outline-none transition hover:bg-[#503db5] focus-visible:ring-4 focus-visible:ring-violet-200 motion-reduce:transition-none"
        >
          Back to login
        </Link>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell
      title="Verify your sign-in"
      subtitle="Enter the six-digit code to continue."
    >
      <OtpVerifyForm email={email} redirectTo={redirectTo} />
    </AuthPageShell>
  );
}
