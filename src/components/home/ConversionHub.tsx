import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  getHomepageToolCapability,
  type HomepageCapabilitySnapshot,
} from "@/lib/home/homepage-capabilities";
import {
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
} from "@/lib/home/homepage-tools";
import type { ConversionDefinition } from "@/lib/conversions/registry";
import { getToolById } from "@/lib/tools";

type ConversionItem = {
  readonly conversion: ConversionDefinition;
  readonly available: boolean;
};

function ConversionLink({ item }: { readonly item: ConversionItem }) {
  const tool = getToolById(item.conversion.id);
  if (!tool) {
    throw new Error(
      `[homepage] Conversion "${item.conversion.id}" has no canonical tool.`,
    );
  }
  const Icon = tool.icon;

  return (
    <Link
      href={item.conversion.route}
      className={`group grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-100 ${
        item.available ? "text-slate-900" : "text-slate-500"
      }`}
      aria-label={`${item.conversion.title}. ${
        item.available ? "Open conversion." : "Coming soon."
      }`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">
          {item.conversion.title}
        </span>
        {!item.available ? (
          <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-slate-400">
            Coming soon
          </span>
        ) : null}
      </span>
      <ArrowRight
        size={14}
        className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-violet-600"
      />
    </Link>
  );
}

function ConversionGroup({
  eyebrow,
  title,
  conversions,
  capabilities,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly conversions: readonly ConversionDefinition[];
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const items = conversions.map((conversion) => {
    const tool = getToolById(conversion.id);
    if (!tool) {
      throw new Error(
        `[homepage] Conversion "${conversion.id}" has no canonical tool.`,
      );
    }
    return {
      conversion,
      available: getHomepageToolCapability(tool, capabilities).enabled,
    };
  });
  const availableItems = items.filter((item) => item.available);
  const advancedItems = items.filter((item) => !item.available);

  return (
    <article>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950">
        {title}
      </h3>

      <div className="mt-5 grid gap-1 sm:grid-cols-2">
        {availableItems.map((item) => (
          <ConversionLink key={item.conversion.id} item={item} />
        ))}
      </div>

      {advancedItems.length ? (
        <div className="mt-5 border-t border-[var(--home-border)] pt-4">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
            Advanced conversions
          </p>
          <div className="mt-2 grid gap-1 sm:grid-cols-2">
            {advancedItems.map((item) => (
              <ConversionLink key={item.conversion.id} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function ConversionHub({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  return (
    <section className="home-section py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Conversion hub</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Convert PDFs in either direction.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Choose a format and go directly to the conversion workspace.
          </p>
        </div>

        <div className="mt-9 grid gap-10 border-y border-[var(--home-border)] py-8 lg:grid-cols-2 lg:gap-14">
          <ConversionGroup
            eyebrow="Export useful formats"
            title="Convert from PDF"
            conversions={getHomepageConversionsFromPdf()}
            capabilities={capabilities}
          />
          <ConversionGroup
            eyebrow="Build a new PDF"
            title="Convert to PDF"
            conversions={getHomepageConversionsToPdf()}
            capabilities={capabilities}
          />
        </div>

        <p className="mt-5 max-w-2xl text-xs leading-6 text-slate-500">
          Some advanced Office conversions require configured secure
          processing.
        </p>
        <Link href="/tools?category=convert" className="btn-secondary mt-6">
          View all conversions
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
