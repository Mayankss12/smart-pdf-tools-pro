import Link from "next/link";

import type { ToolGuide } from "@/lib/tool-guides";

const SITE_URL = "https://pdfmantra.in";

export function ToolSeoGuide({ guide }: { readonly guide: ToolGuide }) {
  const pageUrl = new URL(guide.href, SITE_URL).toString();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "PDF Tools",
            item: `${SITE_URL}/tools`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: guide.toolName,
            item: pageUrl,
          },
        ],
      },
      {
        "@type": "WebApplication",
        name: guide.toolName,
        url: pageUrl,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires a modern web browser",
        description: guide.introduction,
      },
      {
        "@type": "HowTo",
        name: guide.title,
        description: guide.introduction,
        step: guide.steps.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: `Step ${index + 1}`,
          text: step,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: guide.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <section
      aria-labelledby={`${guide.eyebrow.toLowerCase().replaceAll(" ", "-")}-heading`}
      className="mx-auto max-w-6xl px-4 pb-14 pt-5 sm:px-6 lg:px-8"
    >
      <nav aria-label="Breadcrumb" className="mb-4 text-sm font-semibold text-slate-500">
        <ol className="flex flex-wrap items-center gap-2">
          <li><Link href="/" className="transition hover:text-violet-700">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/tools" className="transition hover:text-violet-700">PDF tools</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-slate-700">{guide.toolName}</li>
        </ol>
      </nav>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <p className="text-xs font-bold tracking-[0.16em] text-violet-600">
          {guide.eyebrow}
        </p>
        <h2
          id={`${guide.eyebrow.toLowerCase().replaceAll(" ", "-")}-heading`}
          className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl"
        >
          {guide.title}
        </h2>
        <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
          {guide.introduction}
        </p>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <h3 className="text-lg font-bold text-slate-900">How to use this tool</h3>
            <ol className="mt-3 space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <p className="mt-5 rounded-2xl bg-violet-50 p-4 text-sm font-medium leading-6 text-violet-900">
              {guide.example}
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">What to check</h3>
            <ul className="mt-3 space-y-3">
              {guide.limitations.map((limitation) => (
                <li key={limitation} className="flex gap-3 text-sm leading-6 text-slate-600">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                  <span>{limitation}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-900">Frequently asked questions</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {guide.faqs.map((faq) => (
              <details key={faq.question} className="group rounded-2xl border border-slate-200 p-4">
                <summary className="cursor-pointer list-none pr-5 text-sm font-bold text-slate-900 marker:hidden">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6">
          <h3 className="text-lg font-bold text-slate-900">Continue your PDF workflow</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {guide.relatedTools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800 transition hover:border-violet-300 hover:bg-violet-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200"
              >
                {tool.label}
              </Link>
            ))}
          </div>
          <p className="mt-5 text-xs font-medium leading-5 text-slate-500">
            Product guidance reflects the current PDFMantra workflow. Review sensitive or business-critical output before distributing it.
          </p>
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
    </section>
  );
}
