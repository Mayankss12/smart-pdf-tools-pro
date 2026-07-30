import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ToolCard } from "@/components/home/ToolCard";
import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import { getHomepagePopularTools } from "@/lib/home/homepage-tools";

export function PopularTools({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const popularTools = getHomepagePopularTools();

  return (
    <section className="home-section py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-eyebrow">Start with a proven action</p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
              Popular PDF tools
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
              Eight reliable routes into the PDF work people do most.
            </p>
          </div>
          <Link
            href="/tools"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700"
          >
            View all PDF tools
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="mt-8 grid overflow-hidden rounded-2xl border border-[var(--home-border)] bg-[var(--home-border)] gap-px sm:grid-cols-2 lg:grid-cols-4">
          {popularTools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              capabilities={capabilities}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

