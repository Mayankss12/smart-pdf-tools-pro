import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { BrandMark } from "@/components/BrandMark";

interface AuthPageShellProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
  readonly size?: "default" | "wide";
}

export function AuthPageShell({
  title,
  subtitle,
  children,
  size = "default",
}: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f6f4f8] text-[var(--text-primary)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(118,92,206,0.09),transparent_34rem)]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 opacity-[0.018] [transform:translate(-50%,-50%)_scale(7)]">
        <BrandMark className="h-24 w-24" title="" />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-7 sm:px-6 sm:py-10">
        <div
          className={`w-full ${
            size === "wide" ? "max-w-[470px]" : "max-w-[440px]"
          }`}
        >
          <Link
            href="/"
            className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-slate-600 outline-none transition hover:text-violet-700 focus-visible:ring-4 focus-visible:ring-violet-200 motion-reduce:transition-none"
          >
            <ArrowLeft aria-hidden="true" size={17} strokeWidth={2.2} />
            Back to site
          </Link>

          <section className="rounded-[26px] border border-white/80 bg-white p-5 shadow-[0_24px_75px_rgba(49,38,74,0.11),0_2px_12px_rgba(49,38,74,0.05)] sm:p-7">
            <div className="mb-6 text-center">
              <Link
                href="/"
                aria-label="PDFMantra home"
                className="group mx-auto inline-flex items-center justify-center gap-2.5 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              >
                <BrandMark className="h-10 w-10 shrink-0 transition-transform group-hover:-translate-y-0.5 motion-reduce:transition-none" />
                <span className="display-font text-xl font-bold tracking-[-0.045em] text-slate-950">
                  PDFMantra
                </span>
              </Link>
              <h1 className="display-font mt-5 text-[1.65rem] font-bold leading-tight tracking-[-0.045em] text-slate-950 sm:text-[1.8rem]">
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                {subtitle}
              </p>
            </div>
            {children}
          </section>
        </div>
      </main>
    </div>
  );
}
