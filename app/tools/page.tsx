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

function isLiveStatus(status: string) {
  return status === "Live" || status === "Available";
}

export default function ToolsPage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                  <Sparkles size={14} />
                  PDFMantra Tools
                </div>

                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.4rem]">
                  All PDF tools in one clean workspace.
                </h1>

                <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-50/95 sm:text-lg">
                  Use live browser-side tools now, and keep backend-heavy OCR,
                  compression, conversion, and premium workflows ready for later.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/editor"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-amber-300"
                  >
                    Open PDF Editor
                    <ArrowRight size={18} />
                  </Link>

                  <Link
                    href="/"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            </section>

            <section className="space-y-10 px-6 py-10 sm:px-10 lg:px-14">
              {toolGroups.map((group) => (
                <section key={group.title}>
                  <div className="mb-7 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                    <div>
                      <div className="section-eyebrow">{group.title}</div>
                      <h2 className="mt-2 section-title">{group.title}</h2>
                    </div>

                    <p className="section-description max-w-2xl lg:justify-self-end">
                      {group.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {group.tools.map((tool) => {
                      const Icon = tool.icon;
                      const isLive = isLiveStatus(tool.status);

                      return (
                        <Link
                          key={tool.title}
                          href={tool.href}
                          className="tool-card group"
                        >
                          <div className="mb-5 flex items-center justify-between">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                              <Icon size={21} />
                            </div>

                            <span className={isLive ? "status-live" : "status-soon"}>
                              {tool.status}
                            </span>
                          </div>

                          <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                            {tool.title}
                          </h3>

                          <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                            {tool.description}
                          </p>

                          <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
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
            </section>

            <section className="border-t border-slate-100 bg-slate-50 px-6 py-10 sm:px-10 lg:px-14">
              <div className="flex flex-col gap-4 rounded-[1.75rem] border border-indigo-100 bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                    <ShieldCheck size={15} />
                    Backend-ready roadmap
                  </div>

                  <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-slate-500">
                    OCR, PDF to Word, high-quality compression, repair, redact,
                    and payment-gated premium tools can be added after the frontend
                    demo phase.
                  </p>
                </div>

                <Link href="/editor" className="btn-primary">
                  Try Live Editor
                  <Wand2 size={17} />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
