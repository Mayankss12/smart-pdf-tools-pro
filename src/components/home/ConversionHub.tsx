import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { HomepageCapabilitySnapshot } from "@/lib/home/homepage-capabilities";
import {
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
} from "@/lib/home/homepage-tools";
import type { ConversionDefinition } from "@/lib/conversions/registry";
import { getToolById } from "@/lib/tools";

type ConversionItem = {
  readonly conversion: ConversionDefinition;
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
      className="group grid min-h-14 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl px-3 py-2 text-slate-900 outline-none transition hover:bg-violet-50 focus-visible:ring-4 focus-visible:ring-violet-100"
      aria-label={`${item.conversion.title}. Open conversion.`}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
        <Icon size={16} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold">
          {item.conversion.title}
        </span>
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
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly conversions: readonly ConversionDefinition[];
}) {
  const items = conversions.map((conversion) => {
    const tool = getToolById(conversion.id);
    if (!tool) {
      throw new Error(
        `[homepage] Conversion "${conversion.id}" has no canonical tool.`,
      );
    }
    return { conversion };
  });

  return (
    <article>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950">
        {title}
      </h3>

      <div className="mt-5 grid gap-1 sm:grid-cols-2">
        {items.map((item) => (
          <ConversionLink key={item.conversion.id} item={item} />
        ))}
      </div>
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
            conversions={getHomepageConversionsFromPdf(capabilities)}
          />
          <ConversionGroup
            eyebrow="Build a new PDF"
            title="Convert to PDF"
            conversions={getHomepageConversionsToPdf(capabilities)}
          />
        </div>

        <Link href="/tools?category=convert" className="btn-secondary mt-6">
          View all conversions
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
