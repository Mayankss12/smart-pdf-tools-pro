import Link from "next/link";
import { Header } from "@/components/Header";
import {
  getFeaturedTools,
  getPopularTools,
  getToolMenuGroups,
  getToolsNeedingBackend,
  getWorkingTools,
  STATUS_CONFIG,
  type Tool,
} from "@/lib/tools";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  FileText,
  Layers,
  MousePointer2,
  ScanSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";

const workingTools = getWorkingTools();
const featuredTools = getFeaturedTools(8);
const popularTools = getPopularTools(8);
const menuGroups = getToolMenuGroups();
const backendTools = getToolsNeedingBackend().slice(0, 6);

const trustPillars = [
  "Clear tool discovery",
  "Honest editor beta",
  "Backend-grade roadmap",
  "Web now, desktop later",
];

const experienceCards = [
  {
    title: "Find the right tool fast",
    description:
      "PDFMantra should guide users by task, not make them decode technical categories.",
    icon: Search,
  },
  {
    title: "Work visually where it matters",
    description:
      "Editing, signing, highlighting, and organizing should feel direct and understandable.",
    icon: MousePointer2,
  },
  {
    title: "Use serious processing when needed",
    description:
      "Compression, OCR, conversion, and security tools belong on reliable backend workflows.",
    icon: Zap,
  },
];

const ecosystemCards = [
  {
    title: "Editor Workspace",
    description:
      "A browser-side visual editor for text overlays, highlights, images, signatures, and export.",
    icon: FileText,
    href: "/editor",
    badge: "Beta",
  },
  {
    title: "Organize Pages",
    description:
      "A future workspace for merging, splitting, rotating, extracting, and reordering PDFs visually.",
    icon: Layers,
    href: "/tools",
    badge: "Next",
  },
  {
    title: "Processing Engine",
    description:
      "Backend-powered OCR, compression, Word conversion, protection, redaction, and repairs.",
    icon: ScanSearch,
    href: "/tools",
    badge: "Roadmap",
  },
];

function StatusBadge({ tool }: { tool: Tool }) {
  const status = STATUS_CONFIG[tool.status];

  return <span className={status.className}>{status.label}</span>;
}

function ToolCard({
  tool,
  compact = false,
}: {
  tool: Tool;
  compact?: boolean;
}) {
  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className={[
        "group relative flex h-full flex-col overflow-hidden border border-slate-200 bg-white transition duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_24px_70px_rgba(30,41,59,0.14)]",
        compact
          ? "rounded-[1.5rem] p-4"
          : "rounded-[1.75rem] p-5",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-indigo-50/80 to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={[
            "flex shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition duration-200 group-hover:border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white",
            compact ? "h-11 w-11" : "h-12 w-12",
          ].join(" ")}
        >
          <Icon size={compact ? 19 : 20} />
        </div>

        <StatusBadge tool={tool} />
      </div>

      <h3
        className={[
          "relative font-semibold tracking-[-0.03em] text-slate-950",
          compact ? "mt-4 text-base" : "mt-5 text-lg",
        ].join(" ")}
      >
        {tool.title}
      </h3>

      <p
        className={[
          "relative font-medium text-slate-600",
          compact
            ? "mt-2 line-clamp-3 text-sm leading-6"
            : "mt-2 text-sm leading-6",
        ].join(" ")}
      >
        {tool.description}
      </p>

      <div className="relative mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-indigo-700">
        {tool.status === "coming-soon" ? "Preview tool" : "Open tool"}
        <ArrowRight
          size={15}
          className="transition duration-200 group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f7f9fe] text-slate-950">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-slate-200/80 bg-[#f7f9fe]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-12rem] top-[-9rem] h-[32rem] w-[32rem] rounded-full bg-indigo-200/45 blur-3xl" />
            <div className="absolute right-[-10rem] top-[-7rem] h-[30rem] w-[30rem] rounded-full bg-cyan-100/70 blur-3xl" />
            <div className="absolute bottom-[-18rem] left-1/3 h-[34rem] w-[34rem] rounded-full bg-violet-100/60 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-14">
            <div className="grid gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
              {/* Left Hero */}
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
                  <Sparkles size={14} />
                  Premium Tool-Rich PDF Workspace
                </div>

                <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.06em] text-slate-950 sm:text-5xl lg:text-[4.5rem]">
                  PDF tools that feel
                  <span className="block bg-gradient-to-r from-indigo-700 via-blue-700 to-slate-950 bg-clip-text text-transparent">
                    powerful, clear, and effortless.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                  PDFMantra is being built as a serious PDF platform for editing,
                  signing, organizing, converting, and securing documents — with
                  beautiful discovery, honest tool status, and reliable processing
                  where it matters.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/editor"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700"
                  >
                    Open PDF Editor
                    <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/tools"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-900 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 hover:shadow-lg"
                  >
                    Explore all tools
                    <ArrowRight size={17} />
                  </Link>
                </div>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  {trustPillars.map((pillar) => (
                    <div
                      key={pillar}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm"
                    >
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      {pillar}
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Hero Product Panel */}
              <div className="relative">
                <div className="overflow-hidden rounded-[2.3rem] border border-slate-200 bg-white p-4 shadow-[0_38px_120px_rgba(15,23,42,0.16)] sm:p-5">
                  <div className="rounded-[1.9rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 text-white sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
                          PDFMantra Workspace
                        </div>
                        <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-white">
                          Start with the right tool
                        </div>
                      </div>

                      <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        Live Beta + Roadmap
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                      <div className="rounded-[1.45rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-white">
                            Open now
                          </span>
                          <span className="rounded-full bg-emerald-300/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                            Editor Beta
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {workingTools.slice(0, 3).map((tool) => {
                            const Icon = tool.icon;

                            return (
                              <Link
                                key={tool.id}
                                href={tool.href}
                                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 transition hover:border-white/20 hover:bg-white/15"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-indigo-700">
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-white">
                                    {tool.title}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs font-medium text-indigo-100">
                                    Ready inside the editor
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-[1.45rem] border border-white/10 bg-white/95 p-4 text-slate-950">
                        <div className="absolute right-[-2rem] top-[-2rem] h-24 w-24 rounded-full bg-indigo-100 blur-2xl" />

                        <div className="relative">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                                Popular discovery
                              </div>
                              <div className="mt-1 text-base font-semibold tracking-[-0.03em] text-slate-950">
                                Tools users expect first
                              </div>
                            </div>

                            <Search size={18} className="text-indigo-600" />
                          </div>

                          <div className="mt-4 grid gap-2">
                            {popularTools.slice(0, 5).map((tool) => {
                              const Icon = tool.icon;
                              const status = STATUS_CONFIG[tool.status];

                              return (
                                <Link
                                  key={tool.id}
                                  href={tool.href}
                                  className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 transition hover:border-indigo-200 hover:bg-indigo-50"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                                      <Icon size={16} />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-slate-950">
                                        {tool.title}
                                      </div>
                                      <div className="mt-0.5 text-xs font-medium text-slate-500">
                                        {status.label}
                                      </div>
                                    </div>
                                  </div>

                                  <ArrowRight
                                    size={15}
                                    className="shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                                  />
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* QUICK TOOL DISCOVERY */}
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Start with a tool
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  PDFMantra should feel useful in seconds
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                The homepage should not force users to read a product essay.
                It should help them find an action quickly, while still making the
                full platform feel substantial.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        {/* PLATFORM CATEGORIES */}
        <section className="border-b border-slate-200/80 bg-[#f7f9fe]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Tool universe
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  A real PDF platform, organized around tasks
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                These categories should shape the header menu, the tools dashboard,
                individual tool pages, and the future desktop experience.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {menuGroups.map((group) => (
                <div
                  key={group.category}
                  className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm"
                >
                  <div className="border-b border-slate-200 bg-slate-50 px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
                      {group.label}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {group.description}
                    </h3>
                  </div>

                  <div className="grid gap-0 divide-y divide-slate-100">
                    {group.tools.slice(0, 4).map((tool) => {
                      const Icon = tool.icon;

                      return (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-indigo-50/70"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                              <Icon size={18} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-slate-950">
                                  {tool.title}
                                </span>
                                <StatusBadge tool={tool} />
                              </div>

                              <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-600">
                                {tool.menuDescription}
                              </p>
                            </div>
                          </div>

                          <ArrowRight
                            size={16}
                            className="shrink-0 text-slate-300 transition group-hover:translate-x-1 group-hover:text-indigo-600"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link
                href="/tools"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-300/70 transition duration-200 hover:-translate-y-0.5 hover:bg-indigo-700"
              >
                View complete tools dashboard
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        {/* WHY THE PRODUCT FEELS STRONGER */}
        <section className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Experience standard
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Beautiful design only matters when the product becomes easier
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                PDFMantra should not become flashy UI around weak workflows.
                Every major design decision should improve tool understanding,
                task completion, or confidence.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {experienceCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Icon size={22} />
                      </div>

                      <span className="text-sm font-semibold tracking-[0.18em] text-slate-400">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section className="border-b border-slate-200/80 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 text-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-200">
                  PDFMantra ecosystem
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                  Web now. Processing engine next. Desktop later.
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-indigo-100 sm:text-base lg:justify-self-end">
                The product should feel like one coherent PDF workspace — not a
                disconnected set of pages built at different quality levels.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {ecosystemCards.map((card) => {
                const Icon = card.icon;

                return (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="group rounded-[2rem] border border-white/10 bg-white/10 p-6 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/15"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700">
                        <Icon size={23} />
                      </div>

                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-indigo-100">
                      {card.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white">
                      Learn more
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
        </section>

        {/* BACKEND ROADMAP */}
        <section className="border-b border-slate-200/80 bg-[#f7f9fe]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Backend roadmap
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-4xl">
                  Heavy PDF tools deserve serious architecture
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                OCR, compression, true conversion, password tools, and redaction
                should be built through PDFMantra’s own backend processing flow —
                not fragile browser-only shortcuts.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {backendTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} compact />
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <footer className="bg-white">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
            <div className="overflow-hidden rounded-[2.4rem] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_30px_100px_rgba(15,23,42,0.22)] sm:px-8 lg:px-10 lg:py-10">
              <div className="grid gap-8 lg:grid-cols-[1.16fr_0.84fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-100">
                    <BadgeCheck size={14} />
                    PDFMantra direction
                  </div>

                  <h2 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
                    Build the PDF platform people understand instantly.
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
                    The editor, tools dashboard, backend processing pages, and future
                    desktop app should all carry one premium, discoverable, trustworthy
                    product system.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    href="/editor"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 transition duration-200 hover:-translate-y-0.5 hover:bg-amber-300"
                  >
                    Open Editor Beta
                    <ArrowRight size={17} />
                  </Link>

                  <Link
                    href="/tools"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/20"
                  >
                    Explore tools
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </>
  );
}
