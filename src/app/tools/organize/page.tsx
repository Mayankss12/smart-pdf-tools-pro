import Link from "next/link";
import {
  ArrowRight,
  ArrowUpDown,
  Combine,
  Copy,
  Layers,
  RotateCw,
  Scissors,
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
  },
  {
    title: "Split PDF",
    description: "Split one PDF into controlled page groups with ZIP output for multiple files.",
    href: "/tools/split",
    icon: Scissors,
    status: "Live",
  },
  {
    title: "Delete Pages",
    description: "Remove unwanted pages while keeping the original upload unchanged.",
    href: "/tools/delete-pages",
    icon: Trash2,
    status: "Live",
  },
  {
    title: "Extract Pages",
    description: "Pull selected pages into a clean new PDF file.",
    href: "/tools/extract",
    icon: Copy,
    status: "Live",
  },
  {
    title: "Reorder Pages",
    description: "Move pages up or down, reverse the sequence, and export a reordered copy.",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    status: "Live",
  },
  {
    title: "Rotate PDF",
    description: "Fix page orientation with browser-side rotation export.",
    href: "/tools/rotate",
    icon: RotateCw,
    status: "Live",
  },
];

export default function OrganizePdfPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Layers size={14} />
                PDFMantra Page Workspace
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Organize PDF pages with the right tool for each job.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Merge, split, delete, extract, reorder, and rotate PDFs through focused browser-side tools using the PDFMantra engine flow.
              </p>
            </section>

            <section className="grid gap-5 bg-slate-50/70 p-5 sm:p-6 lg:grid-cols-2 xl:grid-cols-3">
              {ORGANIZE_TOOLS.map((tool) => {
                const Icon = tool.icon;

                return (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-700 group-hover:text-white">
                        <Icon size={22} />
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {tool.status}
                      </span>
                    </div>

                    <h2 className="mt-5 text-xl font-semibold tracking-[-0.03em] text-slate-950">
                      {tool.title}
                    </h2>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      {tool.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
                      Open tool
                      <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                    </div>
                  </Link>
                );
              })}
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
