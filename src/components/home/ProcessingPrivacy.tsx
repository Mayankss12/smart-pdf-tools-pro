import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CloudCog,
  Laptop,
  LockKeyhole,
} from "lucide-react";

import {
  getHomepageToolCapability,
  type HomepageCapabilitySnapshot,
} from "@/lib/home/homepage-capabilities";
import {
  getHomepageConversionsFromPdf,
  getHomepageConversionsToPdf,
  resolveHomepageTools,
} from "@/lib/home/homepage-tools";
import { getToolById } from "@/lib/tools";

const BROWSER_PROCESSING_IDS = [
  "pdf-editor",
  "reorder-pages",
  "compress-pdf",
  "images-to-pdf",
  "txt-to-pdf",
  "pdf-to-searchable-pdf",
] as const;

export function ProcessingPrivacy({
  capabilities,
}: {
  readonly capabilities: HomepageCapabilitySnapshot;
}) {
  const browserTools = resolveHomepageTools(
    BROWSER_PROCESSING_IDS,
    "BROWSER_PROCESSING_IDS",
  );
  const providerConversions = [
    ...getHomepageConversionsFromPdf(),
    ...getHomepageConversionsToPdf(),
  ].filter(
    (conversion, index, conversions) =>
      conversion.processingMode === "provider" &&
      conversions.findIndex((item) => item.id === conversion.id) === index,
  );
  const enabledProviderCount = providerConversions.filter((conversion) => {
    const tool = getToolById(conversion.id);
    return tool
      ? getHomepageToolCapability(tool, capabilities).enabled
      : false;
  }).length;

  return (
    <section className="bg-[#f3f1ea] py-16 sm:py-20">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.4rem] border border-emerald-200 bg-[#edf8f1] p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-white">
              <Laptop size={22} />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              Processed in your browser
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950">
              Local where the workflow supports it.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              These tools use browser-side engines and do not need a document
              provider for their core workflow.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {browserTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="flex min-h-11 items-center gap-2 text-sm font-bold text-slate-800 transition hover:text-emerald-800"
                >
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-700" />
                  {tool.shortTitle ?? tool.title}
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[1.4rem] border border-blue-200 bg-[#eef4fb] p-6 sm:p-8">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white">
              <CloudCog size={22} />
            </span>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em] text-blue-800">
              Secure provider processing
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-[-0.045em] text-slate-950">
              Gated when a backend is required.
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Office conversions, webpage rendering and advanced document
              output require authenticated provider capacity. Unavailable
              providers remain disabled.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-white/65 px-4 py-3">
              <LockKeyhole size={18} className="shrink-0 text-blue-700" />
              <p className="text-sm font-semibold !text-slate-700">
                {enabledProviderCount} of {providerConversions.length} curated
                provider workflows are currently configured.
              </p>
            </div>
            <Link
              href="/security"
              className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-blue-800"
            >
              Read how processing is labelled
              <ArrowRight size={15} />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}

