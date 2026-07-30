import Link from "next/link";
import { ArrowRight, CheckCircle2, CloudCog, Laptop } from "lucide-react";

import {
  resolveHomepageTools,
} from "@/lib/home/homepage-tools";

const BROWSER_PROCESSING_IDS = [
  "pdf-editor",
  "reorder-pages",
  "compress-pdf",
  "images-to-pdf",
  "txt-to-pdf",
  "pdf-to-searchable-pdf",
] as const;

export function ProcessingPrivacy() {
  const browserTools = resolveHomepageTools(
    BROWSER_PROCESSING_IDS,
    "BROWSER_PROCESSING_IDS",
  );

  return (
    <section className="home-section py-16 sm:py-20">
      <div className="mx-auto max-w-[1120px] px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="section-eyebrow">Clear file handling</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            How PDFMantra handles your files
          </h2>
        </div>

        <div className="mt-9 grid border-y border-[var(--home-border)] md:grid-cols-2 md:divide-x md:divide-[var(--home-border)]">
          <article className="py-7 md:pr-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <Laptop size={20} />
            </span>
            <h3 className="mt-5 text-2xl font-bold tracking-[-0.035em] text-slate-950">
              Runs locally
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Supported tools use browser-side engines for their core workflow,
              so you can work without a document-processing provider.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {browserTools.map((tool) => (
                <Link
                  key={tool.id}
                  href={tool.href}
                  className="flex min-h-10 items-center gap-2 text-sm font-bold text-slate-700 transition hover:text-violet-700"
                >
                  <CheckCircle2 size={15} className="shrink-0 text-violet-600" />
                  {tool.shortTitle ?? tool.title}
                </Link>
              ))}
            </div>
          </article>

          <article className="border-t border-[var(--home-border)] py-7 md:border-t-0 md:pl-10">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
              <CloudCog size={20} />
            </span>
            <h3 className="mt-5 text-2xl font-bold tracking-[-0.035em] text-slate-950">
              Requires secure processing
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Office conversions, webpage rendering and other advanced outputs
              need configured provider capacity. Those workflows remain gated
              until secure processing is available.
            </p>
            <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">
              Availability is shown before you begin a provider workflow.
            </p>
            <Link
              href="/security"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-700"
            >
              Read about file processing
              <ArrowRight size={15} />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
