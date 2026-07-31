import { ChevronDown } from "lucide-react";

import {
  getHomepageFaqStructuredData,
  HOMEPAGE_FAQS,
} from "@/lib/home/homepage-tools";

export function HomeFaq() {
  const faqStructuredData = getHomepageFaqStructuredData();

  return (
    <section className="home-section border-t border-[var(--home-border)] py-14 sm:py-16">
      <div className="mx-auto grid max-w-[1120px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.6fr_1.4fr] lg:px-8">
        <div>
          <p className="section-eyebrow">Clear answers</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.045em] text-slate-950 sm:text-4xl">
            Before you open a file.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Practical details about editing, privacy, signing, scanned files,
            and mobile use.
          </p>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {HOMEPAGE_FAQS.map((faq, index) => (
            <details key={faq.question} className="group py-1" open={index === 0}>
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-5 py-4 text-base font-bold text-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-violet-100 [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  size={18}
                  className="shrink-0 text-violet-700 transition group-open:rotate-180"
                />
              </summary>
              <p className="max-w-3xl pb-6 pr-8 text-sm leading-7 text-slate-600">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqStructuredData).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
