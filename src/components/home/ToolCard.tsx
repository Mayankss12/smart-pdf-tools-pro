import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getHomepageToolCapability,
  type HomepageCapabilitySnapshot,
} from "@/lib/home/homepage-capabilities";
import type { Tool } from "@/lib/tools";

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
      className={`group relative grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 bg-white outline-none transition hover:bg-[var(--home-subtle)] focus-visible:z-10 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-100 ${
        compact ? "min-h-[112px] p-4" : "min-h-[132px] p-5 sm:p-6"
      }`}
      aria-label={`${tool.title}. ${
        providerUnavailable ? "Coming soon." : "Open tool."
      }`}
    >
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ${
          compact ? "h-10 w-10" : "h-11 w-11"
        }`}
      >
        <Icon size={compact ? 18 : 19} strokeWidth={2} />
      </span>

      <span className="min-w-0">
        <span
          className={`block font-bold tracking-[-0.025em] text-slate-950 ${
            compact ? "text-[15px]" : "text-base"
          }`}
        >
          {tool.title}
        </span>
        <span
          className={`mt-1.5 block line-clamp-2 leading-6 text-slate-500 ${
            compact ? "text-xs" : "text-sm"
          }`}
        >
          {tool.description}
        </span>
        {providerUnavailable ? (
          <span className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
            Coming soon
          </span>
        ) : null}
      </span>

      <ArrowRight
        size={16}
        className="mt-1 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
      />
    </Link>
  );
}

