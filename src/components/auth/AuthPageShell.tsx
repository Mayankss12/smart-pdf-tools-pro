import Link from "next/link";
import type { ReactNode } from "react";

import { BrandMark } from "@/components/BrandMark";

interface AuthPageShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}

const TRUST_POINTS = [
  "Password-first login",
  "Email code verification",
  "Private document workspace",
] as const;

export function AuthPageShell({ title, subtitle, children }: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[var(--bg-base)] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute left-[-12rem] top-[-14rem] h-[28rem] w-[28rem] rounded-full bg-violet-200/35 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-16rem] right-[-12rem] h-[30rem] w-[30rem] rounded-full bg-indigo-200/30 blur-3xl" />

      <header className="relative z-10 border-b border-violet-100 bg-white/82 px-5 py-4 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="group flex min-w-0 items-center gap-3">
            <BrandMark className="h-9 w-9 shrink-0 transition group-hover:-translate-y-0.5" />
            <div className="min-w-0">
              <div className="display-font truncate text-xl font-semibold tracking-[-0.035em] text-slate-950 transition group-hover:text-violet-700">
                PDFMantra
              </div>
              <div className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500 sm:block">
                Secure workspace
              </div>
            </div>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-violet-100 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_1px_3px_rgba(24,21,46,0.05)] transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
          >
            Back to site
          </Link>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
          <section className="hidden lg:block">
            <p className="section-eyebrow">PDFMantra account</p>
            <h1 className="display-font mt-5 max-w-2xl text-5xl font-bold tracking-[-0.05em] text-slate-950">
              Secure access for your smart PDF workspace.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
              Sign in to manage your dashboard, future saved documents, signatures, and premium PDF workflows as PDFMantra grows.
            </p>

            <div className="mt-8 grid max-w-xl gap-3">
              {TRUST_POINTS.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-violet-100 bg-white/72 px-4 py-3 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(101,80,232,0.06)] backdrop-blur"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
                    ✓
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          <section className="w-full">
            <div className="rounded-[2rem] border border-violet-100 bg-white/92 p-6 shadow-[0_24px_70px_rgba(76,47,209,0.12)] backdrop-blur sm:p-8">
              <div className="mb-6">
                <p className="section-eyebrow">Secure account</p>
                <h2 className="display-font mt-3 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {subtitle}
                </p>
              </div>
              {children}
            </div>

            <p className="mx-auto mt-5 max-w-sm text-center text-xs leading-5 text-slate-500">
              Protected by PDFMantra auth. Use your own account only and keep verification codes private.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
