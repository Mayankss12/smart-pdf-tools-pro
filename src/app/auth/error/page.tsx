import type { Metadata } from "next";
import Link from "next/link";

import { AuthPageShell } from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Authentication Error — PDFMantra",
};

interface AuthErrorPageProps {
  readonly searchParams: Promise<{ error?: string }>;
}

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const params = await searchParams;
  const error = params.error || "An authentication error occurred.";

  return (
    <AuthPageShell title="Authentication error" subtitle={decodeURIComponent(error)}>
      <div className="space-y-3">
        <Link href="/login" className="btn-primary w-full">
          Back to Login
        </Link>
        <Link href="/forgot-password" className="btn-secondary w-full">
          Reset Password
        </Link>
      </div>
    </AuthPageShell>
  );
}
