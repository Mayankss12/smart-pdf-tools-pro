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
        <Link
          href="/login"
          className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] bg-[#5f4bc6] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(74,55,168,0.2)] outline-none transition hover:bg-[#503db5] focus-visible:ring-4 focus-visible:ring-violet-200 motion-reduce:transition-none"
        >
          Back to login
        </Link>
        <Link
          href="/forgot-password"
          className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[14px] border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 outline-none transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200 motion-reduce:transition-none"
        >
          Reset password
        </Link>
      </div>
    </AuthPageShell>
  );
}
