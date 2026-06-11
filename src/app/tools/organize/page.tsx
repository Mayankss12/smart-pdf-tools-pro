import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  Combine,
  Copy,
  FileStack,
  Layers,
  MousePointer2,
  RotateCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Header } from "@/components/Header";

const ORGANIZE_TOOLS = [
  {
    title: "Merge PDF",
    description: "Combine multiple PDF files into one ordered document.",
    href: "/tools/merge",
    icon: Combine,
    status: "Live",
    accent: "from-indigo-500 to-violet-600",
    badgeClass: "border-indigo-100 bg-indigo-50 text-indigo-700",
    highlights: ["Multi-file queue", "Drag reorder", "Clean export"],
  },
  {
    title: "Split PDF",
    description: "Split one PDF into custom groups, ranges, or ZIP outputs.",
    href: "/tools/split",
    icon: Scissors,
    status: "Live",
    accent: "from-rose-500 to-orange-500",
    badgeClass: "border-rose-100 bg-rose-50 text-rose-700",
    highlights: ["Custom groups", "Every N pages", "ZIP export"],
  },
  {
    title: "Delete Pages",
    description: "Remove unwanted pages while keeping the original upload unchanged.",
    href: "/tools/delete-pages",
    icon: Trash2,
    status: "Live",
    accent: "from-red-500 to-rose-600",
    badgeClass: "border-red-100 bg-red-50 text-red-700",
    highlights: ["Visual grid", "Range input", "Undo selection"],
  },
  {
    title: "Extract Pages",
    description: "Pull selected pages into a clean new PDF file.",
    href: "/tools/extract",
    icon: Copy,
    status: "Live",
    accent: "from-emerald-500 to-teal-600",
    badgeClass: "border-emerald-100 bg-emerald-50 text-emerald-700",
    highlights: ["Page picker", "Odd/even presets", "New PDF output"],
  },
  {
    title: "Reorder Pages",
    description: "Move, reverse, and arrange pages before exporting a reordered copy.",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    status: "Live",
    accent: "from-violet-500 to-purple-600",
    badgeClass: "border-violet-100 bg-violet-50 text-violet-700",
    highlights: ["Drag pages", "Batch move", "Undo/redo"],
  },
  {
    title: "Rotate PDF",
    description: "Fix page orientation with browser-side rotation export.",
    href: "/tools/rotate",
    icon: RotateCw,
    status: "Live",
    accent: "from-blue-500 to-cyan-600",
    badgeClass: "border-blue-100 bg-blue-50 text-blue-700",
    highlights: ["Rotate selected", "Multi-select", "Page preview"],
  },
];

const WORKFLOW_STEPS = [
  {
    title: "Upload",
    description: "Choose the PDF tool that matches your page task.",
    icon: FileStack,
  },
  {
    title: "Arrange",
    description: "Use visual grids, selections, ranges, and tool-specific controls.",
    icon: MousePointer2,
  },
  {
    title: "Export",
    description: "Download a clean browser-side output without changing the original file.",
    icon: ShieldCheck,
  },
];

export default function OrganizePdfPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2.25rem] border border-violet-100 bg-white shadow-[0_24px_70px_rgba(91,63,193,0.10)]">
            <section className="relative overflow-hidden bg-slate-950 px-6 py-10 text-white sm:px-8 lg:px-12 lg:py-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.45),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.26),transparent_32%)]" />
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-50 shadow-sm backdrop-blur">
                    <Layers size={14} />
                    PDFMantra Page Workspace
                  </div>

                  <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl lg:text-6xl">
                    Organize PDF pages with focused master tools.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-slate-200 sm:text-lg">
                    Merge, split, delete, extract, reorder, and rotate PDFs through clean browser-side workflows built for fast page-level control.
                  </p>

                  <div className="mt-7 flex flex-wrap gap-3">
                    <Link
                      href="/tools/merge"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-black/20 transition hover:-translate-y-0.5 hover:bg-violet-50"
                    >
                      Start with Merge PDF
                      <ArrowRight size={16} />
                    </Link>

                    <Link
                      href="/tools/reorder"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
                    >
                      Open Reorder Pages
                      <ArrowUpDown size={16} />
                    </Link>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-700">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="text-sm font-black text-white">Workspace status</div>
                      <div className="text-xs font-semibold text-slate-300">
                        6 browser-side organize tools
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-white/10 p-3">
                      <div className="text-2xl font-black tracking-[-0.04em]">6</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                        Tools
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <div className="text-2xl font-black tracking-[-0.04em]">Live</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                        Status
                      </div>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <div className="text-2xl font-black tracking-[-0.04em]">PDF</div>
                      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-300">
                        Output
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm font-semibold leading-6 text-emerald-50">
                    <div className="flex items-center gap-2 font-black">
                      <CheckCircle2 size={16} />
                      Original files stay unchanged
                    </div>
                    <p className="mt-1 text-emerald-50/85">
                      Each tool exports a new processed file from the browser workflow.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border-b border-violet-100 bg-white px-5 py-5 sm:px-6 lg:px-8">
              <div className="grid gap-4 md:grid-cols-3">
                {WORKFLOW_STEPS.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                          <Icon size={20} />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                            Step {index + 1}
                          </div>
                          <h2 className="mt-1 text-lg font-black tracking-[-0.03em] text-slate-950">
                            {step.title}
                          </h2>
                          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="bg-slate-50/80 p-5 sm:p-6 lg:p-8">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-violet-600">
                    Choose a tool
                  </div>
                  <h2 className="mt-2 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
                    Page organization tools
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                    Pick a dedicated workflow instead of using one overloaded screen. Each tool is optimized for one page-level job.
                  </p>
                </div>

                <div className="rounded-full border border-violet-100 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-violet-700 shadow-sm">
                  Browser-side tools
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {ORGANIZE_TOOLS.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link
                      key={tool.href}
                      href={tool.href}
                      className="group flex min-h-[260px] flex-col justify-between rounded-[1.75rem] border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-[0_18px_50px_rgba(91,63,193,0.12)]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div
                            className={`flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br ${tool.accent} text-white shadow-lg shadow-violet-100`}
                          >
                            <Icon size={23} />
                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${tool.badgeClass}`}
                          >
                            {tool.status}
                          </span>
                        </div>

                        <h3 className="mt-5 text-xl font-black tracking-[-0.035em] text-slate-950">
                          {tool.title}
                        </h3>

                        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                          {tool.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2">
                          {tool.highlights.map((highlight) => (
                            <span
                              key={highlight}
                              className="rounded-full border border-slate-100 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600"
                            >
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
                        <span className="text-sm font-black text-violet-700">
                          Open workspace
                        </span>
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700 transition group-hover:translate-x-1 group-hover:bg-violet-700 group-hover:text-white">
                          <ArrowRight size={17} />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
