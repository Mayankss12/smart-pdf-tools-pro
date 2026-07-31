import Link from "next/link";

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
      className="home-section scroll-mt-24 border-b border-[var(--home-border)] py-8 sm:py-10"
    >
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <h2 className="mb-4 text-xl font-black tracking-[-0.025em] text-slate-950 sm:text-2xl">
          PDF tools
        </h2>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link
                key={tool.id}
                href={tool.href}
                className="group flex min-h-[108px] min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--home-border)] bg-white px-3 py-4 text-center outline-none transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-[var(--home-subtle)] focus-visible:ring-4 focus-visible:ring-violet-100"
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
