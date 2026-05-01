import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  Brain,
  Combine,
  FileArchive,
  FileText,
  FileType,
  Highlighter,
  ImageUp,
  Layers,
  PenLine,
  Scissors,
  ShieldCheck,
  Sparkles,
  Stamp,
  Wand2,
} from "lucide-react";

const toolGroups = [
  {
    title: "Edit & Sign",
    description: "Browser-side PDF editing tools available now.",
    tools: [
      {
        title: "PDF Editor",
        description: "Add text, images, signatures, highlights, and export edited PDFs.",
        href: "/editor",
        icon: FileText,
        status: "Live",
      },
      {
        title: "Sign PDF",
        description: "Add typed signatures or signature images inside the editor.",
        href: "/editor",
        icon: PenLine,
        status: "Live",
      },
      {
        title: "Highlight PDF",
        description: "Select and highlight PDF text for review workflows.",
        href: "/editor",
        icon: Highlighter,
        status: "Live",
      },
      {
        title: "Watermark PDF",
        description: "Add text or image watermarks to PDF pages.",
        href: "/tools/watermark",
        icon: Stamp,
        status: "Available",
      },
    ],
  },
  {
    title: "Organize",
    description: "Page management tools for arranging documents.",
    tools: [
      {
        title: "Merge PDF",
        description: "Combine multiple PDFs into one file.",
        href: "/tools/merge",
        icon: Combine,
        status: "Available",
      },
      {
        title: "Split PDF",
        description: "Split PDF pages by range or selected groups.",
        href: "/tools/split",
        icon: Scissors,
        status: "Available",
      },
      {
        title: "Organize PDF",
        description: "Reorder, rotate, and delete PDF pages visually.",
        href: "/tools",
        icon: Layers,
        status: "Coming soon",
      },
    ],
  },
  {
    title: "Convert & Optimize",
    description: "Backend-ready tools for premium processing later.",
    tools: [
      {
        title: "Compress PDF",
        description: "Reduce PDF file size with quality-focused processing.",
        href: "/tools/compress",
        icon: FileArchive,
        status: "Available",
      },
      {
        title: "Image to PDF",
        description: "Convert JPG, PNG, or WebP images into PDF documents.",
        href: "/tools/images-to-pdf",
        icon: ImageUp,
        status: "Available",
      },
      {
        title: "PDF to Word",
        description: "Convert PDF documents into editable Word files.",
        href: "/tools",
        icon: FileType,
        status: "Coming soon",
      },
      {
        title: "OCR PDF",
        description: "Make scanned PDFs searchable and selectable.",
        href: "/tools",
        icon: Brain,
        status: "Backend later",
      },
    ],
  },
];

export default function ToolsPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white/90 shadow-xl shadow-indigo-100/60">
            <div className="bg-gradient-to-br from-indigo-800 via-violet-800 to-fuchsia-700 px-5 py-12 text-white sm:px-8 lg:px-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-wide ring-1 ring-white/20">
                <Sparkles size={15} />
                PDFMantra Tools
              </div>

              <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                All PDF tools in one professional workspace.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-semibold leading-8 text-indigo-50">
                Use live browser-side tools now, and keep backend-heavy tools ready for OCR,
                conversion, compression, and premium workflows later.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-300"
                >
                  Open PDF Editor
                  <ArrowRight size={18} />
                </Link>

                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/15 px-6 py-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/20"
                >
                  Back to Home
                </Link>
              </div>
            </div>

            <div className="space-y-8 px-5 py-8 sm:px-8 lg:px-12">
              {toolGroups.map((group) => (
                <section key={group.title}>
                  <div className="mb-5 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                    <div>
                      <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">
                        {group.title}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {group.tools.map((tool) => {
                      const Icon = tool.icon;
                      const isLive =
                        tool.status === "Live" || tool.status === "Available";

                      return (
                        <Link
                          key={tool.title}
                          href={tool.href}
                          className="group rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                              <Icon size={22} />
                            </div>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                isLive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
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
                            {isLive ? "Open tool" : "View details"}
                            <ArrowRight
                              size={16}
                              className="transition group-hover:translate-x-1"
                            />
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-8 sm:px-8 lg:px-12">
              <div className="flex flex-col gap-4 rounded-[1.5rem] border border-indigo-100 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-indigo-700">
                    <ShieldCheck size={16} />
                    Backend-ready roadmap
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                    OCR, PDF to Word, high-quality compression, repair, redact, and payment-gated
                    premium tools can be added after the frontend demo phase.
                  </p>
                </div>

                <Link
                  href="/editor"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-800"
                >
                  Try Live Editor
                  <Wand2 size={17} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
