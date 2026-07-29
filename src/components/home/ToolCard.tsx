import Link from "next/link";
import { ArrowUpRight, CloudCog, Laptop } from "lucide-react";

import {
  getHomepageToolCapability,
  type HomepageCapabilitySnapshot,
} from "@/lib/home/homepage-capabilities";
import type { Tool } from "@/lib/tools";

const TONE_STYLES = {
  edit: "bg-violet-50 text-violet-700 border-violet-100",
  organize: "bg-rose-50 text-rose-700 border-rose-100",
  convert: "bg-blue-50 text-blue-700 border-blue-100",
  optimize: "bg-amber-50 text-amber-800 border-amber-100",
  security: "bg-emerald-50 text-emerald-700 border-emerald-100",
} as const;

export function ToolCard({
  tool,
  capabilities,
  compact = false,
}: {
  readonly tool: Tool;
  readonly capabilities: HomepageCapabilitySnapshot;
  readonly compact?: boolean;
}) {
  const Icon = tool.icon;
  const capability = getHomepageToolCapability(tool, capabilities);
  const providerUnavailable =
    capability.processingMode === "provider" && !capability.enabled;

  return (
    <Link
      href={tool.href}
      className={`group relative flex min-w-0 flex-col border border-slate-200 bg-white outline-none transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-[0_22px_50px_rgba(52,38,112,0.12)] focus-visible:ring-4 focus-visible:ring-violet-200 ${
        compact ? "rounded-2xl p-4" : "rounded-[1.2rem] p-5"
      }`}
      aria-label={`${tool.title}. ${capability.label}. ${
        providerUnavailable ? "Backend currently unavailable." : "Open tool."
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`flex shrink-0 items-center justify-center border ${
            compact ? "h-10 w-10 rounded-xl" : "h-12 w-12 rounded-2xl"
          } ${TONE_STYLES[tool.category]}`}
        >
          <Icon size={compact ? 18 : 21} strokeWidth={2} />
        </span>
        <ArrowUpRight
          size={17}
          className="text-slate-300 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-violet-600"
        />
      </div>

      <h3
        className={`font-bold tracking-[-0.025em] text-slate-950 ${
          compact ? "mt-3 text-[15px]" : "mt-5 text-lg"
        }`}
      >
        {tool.title}
      </h3>
      <p
        className={`leading-6 text-slate-500 ${
          compact ? "mt-1.5 line-clamp-2 text-xs" : "mt-2 text-sm"
        }`}
      >
        {providerUnavailable
          ? capability.disabledReason ?? tool.description
          : tool.description}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${
            capability.processingMode === "browser"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          {capability.processingMode === "browser" ? (
            <Laptop size={12} />
          ) : (
            <CloudCog size={12} />
          )}
          {capability.label}
        </span>
        {providerUnavailable ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800">
            Backend required
          </span>
        ) : null}
      </div>
    </Link>
  );
}

