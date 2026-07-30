import Link from "next/link";
import { ArrowRight, BadgeCheck, Sparkles } from "lucide-react";

import { Header } from "@/components/Header";

const includedFeatures = [
  "Edit, annotate, fill, and visually sign PDFs",
  "Merge, split, rotate, reorder, and extract pages",
  "Compress PDFs and make scanned pages searchable",
  "Convert supported text, image, and structured files",
  "Download your finished documents",
] as const;

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-5xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
            <div className="eyebrow-chip">
              <Sparkles size={13} />
              PDFMantra Pricing
            </div>
            <h1 className="display-font mt-5 text-[2.45rem] font-bold leading-[1.12] tracking-[-0.035em] sm:text-[3.2rem]">
              Available PDFMantra tools
              <span className="brand-gradient-text block">are free to use.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
              Open a focused tool, complete your document, and download the
              result. No payment is required for the tools shown on the site.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-white shadow-[var(--shadow-card)]">
            <div className="border-b border-[var(--border-light)] bg-[var(--violet-50)] p-6 sm:p-8">
              <p className="section-eyebrow">Free access</p>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="display-font text-3xl font-bold">PDFMantra</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    Everyday PDF work in one clear workspace.
                  </p>
                </div>
                <div className="text-4xl font-bold tracking-[-0.04em]">₹0</div>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="space-y-4">
                {includedFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-secondary)]"
                  >
                    <BadgeCheck
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--violet-600)]"
                    />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/tools" className="btn-primary mt-8 w-full">
                Browse available tools
                <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        </section>
      </main>
    </>
  );
}
