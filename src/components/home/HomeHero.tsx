import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";

import { SmartFileEntry } from "@/components/home/SmartFileEntry";
import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import { getHomepageQuickActions } from "@/lib/home/homepage-tools";

export function HomeHero({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const quickActions = getHomepageQuickActions();

  return (
    <section className="home-hero relative overflow-hidden border-b border-violet-100 bg-[#f4f1e9]">
      <div className="home-grid-pattern absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-[1320px] gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,7fr)_minmax(390px,5fr)] lg:items-center lg:px-8 lg:py-20">
        <div className="max-w-[760px]">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
            <ShieldCheck size={14} />
            Private, fast & built for real PDF work
          </div>

          <h1 className="mt-6 max-w-[720px] text-[2.65rem] font-bold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-[3.8rem] lg:text-[4.45rem]">
            Every PDF tool you need.
            <span className="mt-1 block text-violet-700">
              One powerful workspace.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
            Edit, organize, compress, sign, OCR and convert documents without
            installing complicated software. Start with a file or choose a
            focused tool.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href="#start-with-file" className="btn-primary">
              Choose a file
              <ArrowRight size={16} />
            </a>
            <Link href="/editor" className="btn-secondary">
              <Sparkles size={16} />
              Open PDF Editor
            </Link>
            <Link href="/tools" className="btn-light">
              Browse all tools
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-900/10 pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              Jump straight to
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
              {quickActions.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="group inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-slate-700 transition hover:text-violet-700"
                >
                  {tool.shortTitle ?? tool.title}
                  <ArrowRight
                    size={13}
                    className="transition group-hover:translate-x-0.5"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <SmartFileEntry capabilities={capabilities} />
      </div>
    </section>
  );
}

