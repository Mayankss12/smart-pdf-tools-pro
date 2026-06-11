import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Combine,
  Copy,
  FileStack,
  Layers,
  RotateCw,
  Scissors,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import { Header } from "@/components/Header";

const ORGANIZE_TOOLS = [
  {
    name: "Merge PDF",
    description: "Combine multiple PDF files into one ordered document.",
    href: "/tools/merge",
    icon: Combine,
    isLive: true,
    features: ["Multi-file queue", "Drag reorder", "Clean export"],
  },
  {
    name: "Split PDF",
    description: "Split one PDF into custom groups, ranges, or ZIP outputs.",
    href: "/tools/split",
    icon: Scissors,
    isLive: true,
    features: ["Custom groups", "Every N pages", "ZIP export"],
  },
  {
    name: "Delete Pages",
    description: "Remove unwanted pages while keeping the original upload unchanged.",
    href: "/tools/delete-pages",
    icon: Trash2,
    isLive: true,
    features: ["Visual grid", "Range input", "Undo selection"],
  },
  {
    name: "Extract Pages",
    description: "Pull selected pages into a clean new PDF file.",
    href: "/tools/extract",
    icon: Copy,
    isLive: true,
    features: ["Page picker", "Odd/even presets", "New PDF output"],
  },
  {
    name: "Reorder Pages",
    description: "Move, reverse, and arrange pages before exporting a reordered copy.",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    isLive: true,
    features: ["Drag pages", "Batch move", "Undo/redo"],
  },
  {
    name: "Rotate PDF",
    description: "Fix page orientation with browser-side rotation export.",
    href: "/tools/rotate",
    icon: RotateCw,
    isLive: true,
    features: ["Rotate selected", "Multi-select", "Page preview"],
  },
];

const WORKFLOW_STEPS = [
  {
    title: "Upload",
    description: "Pick a focused tool",
  },
  {
    title: "Arrange",
    description: "Use grids and ranges",
  },
  {
    title: "Export",
    description: "Download clean output",
  },
];

export default function OrganizePdfPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-900">
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-10">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
              <Layers size={22} />
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Page Organization Tools
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
              Six focused tools for organizing PDF pages. Each tool exports a fresh file — your original upload stays unchanged.
            </p>
          </div>

          <div className="mb-12 grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3">
            {WORKFLOW_STEPS.map((step, index) => (
              <div key={step.title} className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-600">
                  {index + 1}
                </div>

                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {step.title}
                  </div>
                  <div className="text-xs text-slate-500">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mb-5 flex items-center gap-2">
            <ShieldCheck size={18} className="text-violet-600" />
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Choose your workspace
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Use the exact tool for the job instead of a cluttered all-in-one screen.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ORGANIZE_TOOLS.map((tool) => {
              const ToolIcon = tool.icon;

              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-violet-300 hover:shadow-lg"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                      <ToolIcon size={20} />
                    </div>

                    {tool.isLive ? (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                        Live
                      </span>
                    ) : null}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 transition group-hover:text-violet-700">
                    {tool.name}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    {tool.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {tool.features.map((feature) => (
                      <span
                        key={feature}
                        className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center gap-2 text-sm font-bold text-violet-600 transition-all group-hover:gap-3">
                    Open workspace
                    <ArrowRight size={15} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
