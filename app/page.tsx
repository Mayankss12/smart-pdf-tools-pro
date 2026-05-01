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
  Lock,
  PenLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const mainTools = [
  {
    title: "PDF Editor",
    description:
      "Edit, highlight, add text, insert images, sign, and export PDFs directly in your browser.",
    href: "/editor",
    icon: FileText,
    status: "Live",
    featured: true,
  },
  {
    title: "Sign PDF",
    description:
      "Add typed signatures or upload signature images for fast document signing.",
    href: "/editor",
    icon: PenLine,
    status: "Live",
    featured: false,
  },
  {
    title: "Highlight PDF",
    description:
      "Select real PDF text and apply marker-style highlights for review workflows.",
    href: "/editor",
    icon: Highlighter,
    status: "Live",
    featured: false,
  },
  {
    title: "Add Image to PDF",
    description:
      "Place logos, stamps, screenshots, or signature images on PDF pages.",
    href: "/editor",
    icon: Image,
    status: "Live",
    featured: false,
  },
];

const upcomingTools = [
  {
    title: "Compress PDF",
    description: "Reduce PDF file size with quality-focused backend compression.",
    icon: FileArchive,
  },
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one clean document.",
    icon: Combine,
  },
  {
    title: "Split PDF",
    description: "Extract selected pages or split PDFs into multiple files.",
    icon: Scissors,
  },
  {
    title: "Organize PDF",
    description: "Reorder, rotate, delete, and manage pages visually.",
    icon: Layers,
  },
  {
    title: "OCR PDF",
    description: "Make scanned PDFs searchable and selectable using backend OCR.",
    icon: Brain,
  },
  {
    title: "PDF to Word",
    description: "Convert PDFs into editable Word documents with layout preservation.",
    icon: Wand2,
  },
];

const benefits = [
  "Browser-side editing for fast free tools",
  "Backend-ready structure for premium tools",
  "Professional PDF workflow for documents, forms, and signatures",
  "Designed for OCR, compression, conversion, and payment upgrade later",
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white/90 shadow-xl shadow-indigo-100/70 backdrop-blur">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-800 via-violet-800 to-fuchsia-700 px-5 py-12 text-white sm:px-8 lg:px-12 lg:py-16">
              <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-100px] h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Sparkles size={15} />
                    PDFMantra Smart PDF Tools
                  </div>

                  <h1 className="max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl lg:text-6xl">
                    Professional PDF tools for editing, signing, highlighting,
                    and document workflows.
                  </h1>

                  <p className="mt-6 max-w-2xl text-base font-semibold leading-8 text-indigo-50 sm:text-lg">
                    Start with fast browser-side PDF editing today. Backend OCR,
                    compression, PDF conversion, repair, and premium processing
                    can be added later without changing the product direction.
                  </p>

                  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                    <Link
                      href="/editor"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-300"
                    >
                      Open PDF Editor
                      <ArrowRight size={18} />
                    </Link>

                    <a
                      href="#tools"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/20"
                    >
                      View Tools
                    </a>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
                  <div className="rounded-2xl bg-white p-4 text-slate-950 shadow-xl">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-black uppercase text-indigo-600">
                          Live Editor
                        </div>
                        <div className="text-lg font-black">PDF workspace</div>
                      </div>
                      <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        Browser-side
                      </div>
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
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700"
                        >
                          <BadgeCheck size={18} className="text-emerald-600" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div id="tools" className="px-5 py-8 sm:px-8 lg:px-12">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-indigo-600">
                    Current tools
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                    Live PDF editing tools
                  </h2>
                </div>
                <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  These tools are focused on the current frontend/browser-side
                  phase and are suitable for demo.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {mainTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link
                      key={tool.title}
                      href={tool.href}
                      className={`group rounded-[1.5rem] border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${
                        tool.featured
                          ? "border-indigo-200 shadow-indigo-100"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                          <Icon size={22} />
                        </div>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                          {tool.status}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-slate-950">
                        {tool.title}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        {tool.description}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-indigo-700">
                        Open tool
                        <ArrowRight
                          size={16}
                          className="transition group-hover:translate-x-1"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-8 sm:px-8 lg:px-12">
              <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <div className="text-sm font-black uppercase tracking-wide text-amber-600">
                    Backend-ready roadmap
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
                    Premium tools coming later
                  </h2>
                </div>
                <p className="max-w-xl text-sm font-semibold leading-6 text-slate-500">
                  These tools can be connected to Supabase, Cloudflare storage,
                  server-side processing, and payment gating later.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {upcomingTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <div
                      key={tool.title}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                          <Icon size={21} />
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                          Coming soon
                        </span>
                      </div>
                      <h3 className="text-lg font-black text-slate-950">
                        {tool.title}
                      </h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-6 border-t border-slate-100 px-5 py-8 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-12">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-indigo-700">
                  <ShieldCheck size={15} />
                  Product direction
                </div>
                <h2 className="mt-4 text-3xl font-black tracking-[-0.04em] text-slate-950">
                  Built for free tools now, premium tools later.
                </h2>
                <p className="mt-3 text-sm font-semibold leading-7 text-slate-500">
                  PDFMantra can start as a fast browser-side PDF tool and grow
                  into a complete document platform with backend processing,
                  storage, accounts, and payments.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-700"
                  >
                    <Zap size={18} className="mt-0.5 text-indigo-600" />
                    {benefit}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
