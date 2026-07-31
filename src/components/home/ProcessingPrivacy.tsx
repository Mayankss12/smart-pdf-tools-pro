import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function ProcessingPrivacy() {
  return (
    <section className="home-section py-12 sm:py-16">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 rounded-2xl border border-[var(--home-border)] bg-[var(--home-subtle)] px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                Your document stays with you
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                The tools shown on this page process documents locally in your
                browser. There is no software to install, and each workflow
                explains its limits before you export.
              </p>
            </div>
          </div>
          <Link
            href="/security"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-violet-700"
          >
            Learn about privacy
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
