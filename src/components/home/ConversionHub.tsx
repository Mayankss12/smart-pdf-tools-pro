import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CloudCog,
  Laptop,
} from "lucide-react";

import {
  getHomepageToolCapability,
  type HomepageCapabilitySnapshot,
} from "@/lib/home/homepage-capabilities";
import {
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
} from "@/lib/home/homepage-tools";
import { getToolById } from "@/lib/tools";
import type { ConversionDefinition } from "@/lib/conversions/registry";

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
  return (
    <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-[#f8f7fd] px-5 py-5 sm:px-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">
          {eyebrow}
        </p>
        <h3 className="mt-1 text-2xl font-bold tracking-[-0.035em] text-slate-950">
          {title}
        </h3>
      </div>

      <div className="divide-y divide-slate-100">
        {conversions.map((conversion) => {
          const tool = getToolById(conversion.id);
          if (!tool) {
            throw new Error(
              `[homepage] Conversion "${conversion.id}" has no canonical tool.`,
            );
          }
          const Icon = tool.icon;
          const capability = getHomepageToolCapability(tool, capabilities);
          const unavailable =
            capability.processingMode === "provider" && !capability.enabled;

          return (
            <Link
              key={conversion.id}
              href={conversion.route}
              className="group grid min-h-[82px] grid-cols-[40px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 outline-none transition hover:bg-violet-50/55 focus-visible:bg-violet-50 focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-violet-100 sm:px-6"
              aria-label={`${conversion.title}. ${capability.label}. ${
                unavailable ? "Currently unavailable." : "Open conversion."
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-900">
                  {conversion.title}
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.07em] ${
                      capability.processingMode === "browser"
                        ? "text-emerald-700"
                        : "text-blue-700"
                    }`}
                  >
                    {capability.processingMode === "browser" ? (
                      <Laptop size={11} />
                    ) : (
                      <CloudCog size={11} />
                    )}
                    {capability.label}
                  </span>
                  {unavailable ? (
                    <span className="text-[10px] font-bold uppercase tracking-[0.07em] text-amber-800">
                      Backend required
                    </span>
                  ) : null}
                </span>
              </span>
              <ArrowUpRight
                size={16}
                className="text-slate-300 transition group-hover:text-violet-700"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ConversionHub({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  return (
    <section className="bg-[#fbfaf7] py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Conversion hub</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Convert in either direction—with the processing mode visible.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Browser conversions start locally. Secure-provider workflows remain
            visible but never pretend to work when their backend is unavailable.
          </p>
        </div>

        <div className="mt-9 grid gap-6 lg:grid-cols-2">
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

        <Link
          href="/tools?category=convert"
          className="btn-secondary mt-8"
        >
          View all conversions
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

