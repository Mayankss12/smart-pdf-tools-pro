import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  Brain,
  Combine,
  FileArchive,
  FileText,
  Highlighter,
  Image,
  Layers,
  PenLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const liveTools = [
  {
    title: "PDF Editor",
    description: "Edit, add text, insert images, highlight, sign, and export PDFs.",
    href: "/editor",
    icon: FileText,
  },
  {
    title: "Sign PDF",
    description: "Add typed signatures or signature images to your documents.",
    href: "/editor",
    icon: PenLine,
  },
  {
    title: "Highlight PDF",
    description: "Select real PDF text and apply marker-style highlights.",
    href: "/editor",
    icon: Highlighter,
  },
  {
    title: "Add Image",
    description: "Place logos, stamps, screenshots, or signatures on PDF pages.",
    href: "/editor",
    icon: Image,
  },
];

const upcomingTools = [
  {
    title: "Compress PDF",
    description: "Reduce PDF size with backend compression.",
    icon: FileArchive,
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document.",
    icon: Combine,
  },
  {
    title: "Split PDF",
    description: "Extract selected pages or split PDFs by range.",
    icon: Scissors,
  },
  {
    title: "Organize PDF",
    description: "Reorder, rotate, and manage PDF pages visually.",
    icon: Layers,
  },
  {
    title: "OCR PDF",
    description: "Make scanned PDFs searchable and selectable.",
    icon: Brain,
  },
  {
    title: "PDF to Word",
    description: "Convert PDFs into editable Word documents.",
    icon: Wand2,
  },
];

const benefits = [
  "Fast browser-side PDF editing",
  "Clean professional workspace",
  "Backend-ready premium roadmap",
  "Built for OCR, compression, conversion, and payments later",
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14 lg:py-16">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Sparkles size={14} />
                    PDFMantra Smart PDF Tools
                  </div>

                  <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.55rem]">
                    Professional PDF tools for modern document workflows.
                  </h1>

                  <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-50/95 sm:text-lg">
                    Edit, sign, highlight, and visually update PDFs in the browser.
                    Backend OCR, compression, conversion, and premium processing
                    can be added later.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link href="/editor" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-amber-300">
                      Open PDF Editor
                      <ArrowRight size={18} />
                    </Link>

                    <a href="#tools" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20">
                      View Tools
                    </a>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="rounded-[1.35rem] bg-white p-5 text-slate-950 shadow-xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Live editor
                        </div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                          PDF workspace
                        </div>
                      </div>

                      <div className="status-live">Browser-side</div>
                    </div>

                    <div className="space-y-3">
                      {[
                        "Upload PDF",
                        "Add text, image, signature",
                        "Highlight real PDF text",
                        "Visual replace selected text",
                        "Export edited PDF",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                        >
                          <BadgeCheck size={17} className="text-emerald-600" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="tools" className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-7 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Current tools</div>
                  <h2 className="mt-2 section-title">Live PDF editing tools</h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  These tools are focused on the current browser-side phase and
                  are suitable for demo.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {liveTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link key={tool.title} href={tool.href} className="tool-card group">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                          <Icon size={21} />
                        </div>

                        <span className="status-live">Live</span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {tool.description}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        Open tool
                        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            <section className="border-t border-slate-100 bg-slate-50 px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-7 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                    Backend-ready roadmap
                  </div>
                  <h2 className="mt-2 section-title">Premium tools coming later</h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  These tools can be connected to Supabase, Cloudflare storage,
                  server-side processing, and payment gating later.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <div key={tool.title} className="premium-card">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                          <Icon size={20} />
                        </div>

                        <span className="status-soon">Coming soon</span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="grid gap-7 border-t border-slate-100 px-6 py-10 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:px-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  <ShieldCheck size={15} />
                  Product direction
                </div>

                <h2 className="mt-4 section-title">
                  Built for free tools now, premium tools later.
                </h2>

                <p className="section-description mt-3">
                  PDFMantra can start as a fast browser-side PDF tool and grow
                  into a complete document platform with backend processing,
                  storage, accounts, and payments.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-700"
                  >
                    <Zap size={17} className="mt-0.5 text-indigo-600" />
                    {benefit}
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
