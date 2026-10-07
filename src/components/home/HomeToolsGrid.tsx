import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import { getHomepageToolGridTools } from "@/lib/home/homepage-tools";

export function HomeToolsGrid({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const tools = getHomepageToolGridTools(capabilities);

  return (
    <section
      id="pdf-tools"
      className="home-section scroll-mt-24 border-b border-[var(--home-border)] py-12 sm:py-16"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-eyebrow">Start with a popular task</p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Most-used PDF tools
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Open one of the 15 tools people use most, or browse the complete
              PDFMantra tool directory.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex min-h-11 shrink-0 items-center gap-2 text-sm font-bold text-violet-700"
          >
            View all PDF tools
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex min-h-[122px] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--home-border)] bg-white px-3 py-5 text-center outline-none transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[var(--home-subtle)] hover:shadow-[0_16px_38px_rgba(83,56,168,0.09)] focus-visible:ring-4 focus-visible:ring-violet-100"
                aria-label={`Open ${tool.title}`}
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700 transition group-hover:bg-violet-100">
                  <Icon size={21} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="line-clamp-2 text-[15px] font-bold leading-5 text-slate-900">
                  {tool.title}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
