import Link from "next/link";
import { Header } from "@/components/Header";
import {
  CATEGORY_LABELS,
  getComingSoonTools,
  getWorkingTools,
  tools,
  type ToolCategory,
} from "@/lib/tools";
import {
  ArrowRight,
  BadgeCheck,
  Clock3,
  FileCheck2,
  Layers,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const workingTools = getWorkingTools();
const comingSoonTools = getComingSoonTools();

const categoryCards: {
  category: ToolCategory;
  description: string;
  icon: typeof PenLine;
}[] = [
  {
    category: "edit",
    description: "Add text, highlights, signatures, and document markings.",
    icon: PenLine,
  },
  {
    category: "organize",
    description: "Merge, split, reorder, extract, and manage PDF pages.",
    icon: Layers,
  },
  {
    category: "convert",
    description: "Move between PDF, images, text, Word, and other formats.",
    icon: Wand2,
  },
  {
    category: "optimize",
    description: "Compress, repair, flatten, and prepare PDFs cleanly.",
    icon: Zap,
  },
  {
    category: "security",
    description: "Protect, unlock, secure, and control PDF access.",
    icon: ShieldCheck,
  },
  {
    category: "convert",
    description: "Advanced extraction and intelligent PDF utilities will expand here.",
    icon: Search,
  },
];

const categoryToolCount = tools.reduce<Record<string, number>>((acc, tool) => {
  acc[tool.category] = (acc[tool.category] ?? 0) + 1;
  return acc;
}, {});

const heroQuickAccess = [
  {
    label: "PDF Editor",
    href: "/editor",
    status: "Beta",
  },
  {
    label: "Highlight PDF",
    href: "/editor",
    status: "Beta",
  },
  {
    label: "Sign PDF",
    href: "/editor",
    status: "Beta",
  },
  {
    label: "Merge PDF",
    status: "Planned",
  },
  {
    label: "Compress PDF",
    status: "Planned",
  },
  {
    label: "OCR PDF",
    status: "Planned",
  },
];

const howItWorks = [
  {
    title: "Choose the right tool",
    description:
      "Start from a clear category, a featured workflow, or the editor workspace.",
    icon: Search,
  },
  {
    title: "Upload and work with confidence",
    description:
      "Each tool should explain exactly what it accepts and what result it creates.",
    icon: FileCheck2,
  },
  {
    title: "Download the final result",
    description:
      "No confusing steps. Every tool should end with a clean, obvious output flow.",
    icon: ArrowRight,
  },
];

const trustPoints = [
  {
    title: "Browser-first where it makes sense",
    description:
      "The editor workspace stays fast and interactive for overlays, highlights, and visual PDF work.",
    icon: Zap,
  },
  {
    title: "Backend-ready for serious tools",
    description:
      "Compression, OCR, conversion, and security tools will use a proper PDFMantra processing backend.",
    icon: ShieldCheck,
  },
  {
    title: "No fake working tools",
    description:
      "Every feature is marked clearly as Beta, Coming Soon, or fully ready once genuinely stable.",
    icon: BadgeCheck,
  },
];

const roadmapToolIds = [
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "ocr-pdf",
  "pdf-to-word",
  "protect-pdf",
];

const roadmapTools = comingSoonTools.filter((tool) =>
  roadmapToolIds.includes(tool.id)
);

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            {/* Hero */}
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14 lg:py-20">
              <div className="pointer-events-none absolute right-[-170px] top-[-170px] h-96 w-96 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-180px] left-[-140px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-12 lg:grid-cols-[1.06fr_0.94fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Sparkles size={13} />
                    PDFMantra — Smart PDF Workspace
                  </div>

                  <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.65rem]">
                    Your PDF workspace. Built to work.
                  </h1>

                  <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-100/95 sm:text-lg">
                    Edit, organize, prepare, and secure PDFs through a cleaner,
                    easier, more reliable workspace. PDFMantra is being built
                    around real usability, not fake tool overload.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/editor"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-300"
                    >
                      Open PDF Editor
                      <ArrowRight size={17} />
                    </Link>

                    <a
                      href="#tools"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
                    >
                      Browse Available Tools
                    </a>
                  </div>

                  <div className="mt-8">
                    <div className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-100/80">
                      Quick access
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {heroQuickAccess.map((item) =>
                        item.href ? (
                          <Link
                            key={item.label}
                            href={item.href}
                            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-white/20"
                          >
                            {item.label}
                            <span className="rounded-full bg-amber-300/95 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-950">
                              {item.status}
                            </span>
                          </Link>
                        ) : (
                          <span
                            key={item.label}
                            className="inline-flex cursor-default items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3.5 py-2 text-sm font-medium text-indigo-50/90"
                          >
                            {item.label}
                            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              {item.status}
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Product card */}
                <div className="rounded-[1.9rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="rounded-[1.45rem] bg-white p-5 text-slate-950 shadow-xl shadow-black/10 sm:p-6">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Editor workspace
                        </div>
                        <div className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          Built for clarity
                        </div>
                      </div>

                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Beta
                      </span>
                    </div>

                    <div className="space-y-3">
                      {[
                        "Upload and preview PDFs",
                        "Add text, image, and signature layers",
                        "Use textbook-style highlights",
                        "Export visual edits cleanly",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                        >
                          <BadgeCheck
                            size={16}
                            className="shrink-0 text-emerald-600"
                          />
                          {item}
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium leading-6 text-indigo-800">
                      Visual editor tools are browser-side today. Advanced
                      processing tools will become backend-powered for reliability.
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Category visibility strip */}
            <section className="border-b border-slate-100 bg-white px-6 py-8 sm:px-10 lg:px-14">
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                <div>
                  <div className="section-eyebrow">Workspace map</div>
                  <h2 className="mt-2 section-title">
                    Tools organized the way users think
                  </h2>
                </div>

                <p className="section-description max-w-xl">
                  PDFMantra is being structured around clear outcomes — edit,
                  organize, convert, optimize, and secure — so users can find
                  the right action quickly.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {categoryCards.map((card, index) => {
                  const Icon = card.icon;
                  const realCategory =
                    index === categoryCards.length - 1 ? "convert" : card.category;
                  const label =
                    index === categoryCards.length - 1
                      ? "Inspect & Extract"
                      : CATEGORY_LABELS[card.category];

                  return (
                    <div
                      key={`${label}-${index}`}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex items-center justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                          <Icon size={20} />
                        </div>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {index === categoryCards.length - 1
                            ? "Growing"
                            : `${categoryToolCount[realCategory] ?? 0} tools`}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {label}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {card.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Working tools */}
            <section id="tools" className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Available now</div>
                  <h2 className="mt-2 section-title">Current working workspace</h2>
                </div>

                <p className="section-description max-w-xl lg:justify-self-end">
                  These tools are available today as part of the PDFMantra
                  Editor Beta. We are stabilizing the larger tool ecosystem
                  around the same quality-first approach.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {workingTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <Link key={tool.id} href={tool.href} className="tool-card group">
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                          <Icon size={20} />
                        </div>

                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Beta
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {tool.description}
                      </p>

                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        Open workspace
                        <ArrowRight
                          size={15}
                          className="transition group-hover:translate-x-1"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* How it works */}
            <section
              id="how-it-works"
              className="border-t border-slate-100 bg-slate-50/70 px-6 py-10 sm:px-10 lg:px-14"
            >
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Simple by design</div>
                  <h2 className="mt-2 section-title">
                    Find the tool. Finish the task.
                  </h2>
                </div>

                <p className="section-description max-w-xl lg:justify-self-end">
                  Every PDFMantra workflow should be understandable in seconds:
                  clear tool choice, simple inputs, obvious output.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {howItWorks.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div
                      key={step.title}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                          <Icon size={20} />
                        </div>

                        <span className="text-sm font-semibold text-slate-400">
                          0{index + 1}
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {step.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Trust */}
            <section className="border-t border-slate-100 px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Built responsibly</div>
                  <h2 className="mt-2 section-title">
                    Reliability before feature inflation
                  </h2>
                </div>

                <p className="section-description max-w-xl lg:justify-self-end">
                  PDFMantra will be expanded carefully: browser-first where it
                  genuinely works, backend-powered where serious processing needs it.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {trustPoints.map((point) => {
                  const Icon = point.icon;

                  return (
                    <div
                      key={point.title}
                      className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                    >
                      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                        <Icon size={20} />
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {point.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {point.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Roadmap */}
            <section
              id="roadmap"
              className="border-t border-slate-100 bg-slate-950 px-6 py-10 text-white sm:px-10 lg:px-14"
            >
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-amber-300">
                    Next major layer
                  </div>

                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">
                    Backend-powered PDFMantra tools
                  </h2>
                </div>

                <p className="max-w-xl text-sm font-medium leading-7 text-slate-300 sm:text-base lg:justify-self-end">
                  These tools are not being rushed as browser hacks. They will
                  be built through PDFMantra’s own proper processing architecture.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {roadmapTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <div
                      key={tool.id}
                      className="rounded-[1.6rem] border border-white/10 bg-white/8 p-5"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <Icon size={20} />
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                          <Clock3 size={12} />
                          Coming Soon
                        </span>
                      </div>

                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-white">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-300">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-slate-100 bg-white px-6 py-8 sm:px-10 lg:px-14">
              <div className="grid gap-8 md:grid-cols-3">
                <div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    PDFMantra
                  </div>

                  <p className="mt-3 max-w-sm text-sm font-medium leading-6 text-slate-500">
                    A premium PDF workspace focused on clarity, trust, and tools
                    that are genuinely useful.
                  </p>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Explore
                  </div>

                  <div className="mt-3 flex flex-col gap-2 text-sm font-medium">
                    <Link href="/editor" className="text-slate-700 transition hover:text-indigo-700">
                      Open PDF Editor
                    </Link>
                    <a href="#tools" className="text-slate-700 transition hover:text-indigo-700">
                      Available tools
                    </a>
                    <a href="#roadmap" className="text-slate-700 transition hover:text-indigo-700">
                      Roadmap tools
                    </a>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Status language
                  </div>

                  <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
                    <div>
                      <span className="font-semibold text-slate-900">Beta:</span>{" "}
                      useful now, still being refined.
                    </div>
                    <div>
                      <span className="font-semibold text-slate-900">
                        Coming Soon:
                      </span>{" "}
                      planned properly, not faked as ready.
                    </div>
                  </div>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
