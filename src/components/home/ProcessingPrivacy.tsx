import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";

export function ProcessingPrivacy() {
  return (
    <section className="home-section py-12 sm:py-14">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 border-y border-[var(--home-border)] py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <ShieldCheck size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-950 sm:text-2xl">
                Clear, private document handling
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Supported tools process documents locally in your browser. Some
                future document formats may use secure processing when
                available.
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
