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
      "PDFMantra guides users by task, not by confusing technical jargon.",
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
      "Compression, OCR, conversion, and security workflows belong on reliable backend architecture.",
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
        "group relative flex h-full flex-col overflow-hidden border border-[#ddcfbf] bg-[#fffaf3] transition duration-200 hover:-translate-y-1 hover:border-[#cfbea9] hover:shadow-[0_28px_70px_rgba(84,69,51,0.16)]",
        compact
          ? "rounded-[1.55rem] p-4"
          : "rounded-[1.85rem] p-5",
      ].join(" ")}
    >
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#f0f3eb] to-transparent opacity-0 transition duration-200 group-hover:opacity-100" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={[
            "flex shrink-0 items-center justify-center rounded-2xl border border-[#d9cbb9] bg-[#f0f3eb] text-[#526047] transition duration-200 group-hover:border-[#cfbea9] group-hover:bg-[#526047] group-hover:text-[#fffaf3]",
            compact ? "h-11 w-11" : "h-12 w-12",
          ].join(" ")}
        >
          <Icon size={compact ? 19 : 20} />
        </div>

        <StatusBadge tool={tool} />
      </div>

      <h3
        className={[
          "relative font-semibold tracking-[-0.03em] text-[#2f271f]",
          compact ? "mt-4 text-base" : "mt-5 text-lg",
        ].join(" ")}
      >
        {tool.title}
      </h3>

      <p
        className={[
          "relative font-medium text-[#78695b]",
          compact
            ? "mt-2 line-clamp-3 text-sm leading-6"
            : "mt-2 text-sm leading-6",
        ].join(" ")}
      >
        {tool.description}
      </p>

      <div className="relative mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-[#526047]">
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

      <main className="min-h-screen text-[#2f271f]">
        <section className="relative overflow-hidden border-b border-[#ddcfbf]/80">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-12rem] top-[-9rem] h-[34rem] w-[34rem] rounded-full bg-[#b77b59]/14 blur-3xl" />
            <div className="absolute right-[-10rem] top-[-7rem] h-[32rem] w-[32rem] rounded-full bg-[#526047]/16 blur-3xl" />
            <div className="absolute bottom-[-18rem] left-1/3 h-[36rem] w-[36rem] rounded-full bg-[#c5a467]/12 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 lg:px-8 lg:pb-24 lg:pt-14">
            <div className="grid gap-10 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ddcfbf] bg-[#fffaf3]/94 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#986447] shadow-sm">
                  <Sparkles size={14} />
                  Premium editorial PDF workspace
                </div>

                <h1 className="mt-6 max-w-5xl text-5xl leading-[0.92] text-[#2f271f] sm:text-6xl lg:text-[5.45rem]">
                  PDF tools that feel
                  <span className="brand-gradient-text block">
                    calm, powerful, and unmistakably premium.
                  </span>
                </h1>

                <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-[#78695b] sm:text-lg">
                  PDFMantra is becoming a serious document platform for editing,
                  signing, organizing, converting, and securing PDFs — with a
                  softer premium experience and architecture that can scale.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link href="/editor" className="btn-primary">
                    Open PDF Editor
                    <ArrowRight size={17} />
                  </Link>

                  <Link href="/tools" className="btn-light">
                    Explore all tools
                    <ArrowRight size={17} />
                  </Link>
                </div>

                <div className="mt-7 flex flex-wrap gap-2.5">
                  {trustPillars.map((pillar) => (
                    <div
                      key={pillar}
                      className="inline-flex items-center gap-2 rounded-full border border-[#ddcfbf] bg-[#fffaf3]/92 px-3.5 py-2 text-sm font-semibold text-[#5e5144] shadow-sm"
                    >
                      <CheckCircle2 size={15} className="text-[#6f8666]" />
                      {pillar}
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-[2.5rem] border border-[#ddcfbf] bg-[#fffaf3] p-4 shadow-[0_42px_120px_rgba(54,45,36,0.18)] sm:p-5">
                  <div className="hero-aurora hero-grid rounded-[2.05rem] border border-white/10 p-4 text-[#fffaf3] sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f0e5d6]">
                          PDFMantra Workspace
                        </div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#fffaf3]">
                          Start with the right tool
                        </div>
                      </div>

                      <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#fffaf3]">
                        Live beta + roadmap
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
                      <div className="rounded-[1.55rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-[#fffaf3]">
                            Open now
                          </span>
                          <span className="rounded-full bg-white/12 px-2.5 py-1 text-[11px] font-semibold text-[#f5ead5]">
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
                                className="group flex items-center gap-3 rounded-[1.35rem] border border-white/10 bg-white/10 px-3 py-3 transition hover:border-white/20 hover:bg-white/15"
                              >
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fffaf3] text-[#526047]">
                                  <Icon size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold text-[#fffaf3]">
                                    {tool.title}
                                  </div>
                                  <div className="mt-0.5 truncate text-xs font-medium text-[#eadfce]">
                                    Ready inside the workspace
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>

                      <div className="relative overflow-hidden rounded-[1.55rem] border border-[#ddcfbf] bg-[#fffaf3] p-4 text-[#2f271f]">
                        <div className="absolute right-[-2rem] top-[-2rem] h-24 w-24 rounded-full bg-[#e5eadf] blur-2xl" />

                        <div className="relative">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                                Popular discovery
                              </div>
                              <div className="mt-1 text-base font-semibold tracking-[-0.03em] text-[#2f271f]">
                                Tools users expect first
                              </div>
                            </div>

                            <Search size={18} className="text-[#526047]" />
                          </div>

                          <div className="mt-4 grid gap-2">
                            {popularTools.slice(0, 5).map((tool) => {
                              const Icon = tool.icon;
                              const status = STATUS_CONFIG[tool.status];

                              return (
                                <Link
                                  key={tool.id}
                                  href={tool.href}
                                  className="group flex items-center justify-between gap-3 rounded-[1.3rem] border border-[#ddcfbf] bg-[#fffaf3] px-3 py-3 transition hover:border-[#cfbea9] hover:bg-white"
                                >
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9cbb9] bg-[#f0f3eb] text-[#526047]">
                                      <Icon size={16} />
                                    </div>

                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-[#2f271f]">
                                        {tool.title}
                                      </div>
                                      <div className="mt-0.5 text-xs font-medium text-[#78695b]">
                                        {status.label}
                                      </div>
                                    </div>
                                  </div>

                                  <ArrowRight
                                    size={15}
                                    className="shrink-0 text-[#c7b8a6] transition group-hover:translate-x-0.5 group-hover:text-[#526047]"
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

        <section className="border-b border-[#ddcfbf]/80 bg-[#fffaf3]/74">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Start with a tool</p>
                <h2 className="section-title mt-3 max-w-3xl">
                  PDFMantra should feel useful in seconds
                </h2>
              </div>

              <p className="section-description max-w-2xl lg:justify-self-end">
                The homepage should help users act quickly while still making the
                full platform feel substantial, refined, and trustworthy.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {featuredTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[#ddcfbf]/80">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Tool universe</p>
                <h2 className="section-title mt-3 max-w-3xl">
                  A real PDF platform, organized around tasks
                </h2>
              </div>

              <p className="section-description max-w-2xl lg:justify-self-end">
                These categories shape the header menu, tools dashboard, future
                backend workflows, and the long-term PDFMantra product system.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {menuGroups.map((group) => (
                <div
                  key={group.category}
                  className="overflow-hidden rounded-[2rem] border border-[#ddcfbf] bg-[#fffaf3] shadow-[0_18px_46px_rgba(84,69,51,0.10)]"
                >
                  <div className="border-b border-[#ddcfbf] bg-[#f6f0e7] px-5 py-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#986447]">
                      {group.label}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[#2f271f]">
                      {group.description}
                    </h3>
                  </div>

                  <div className="grid gap-0 divide-y divide-[#efe5d8]">
                    {group.tools.slice(0, 4).map((tool) => {
                      const Icon = tool.icon;

                      return (
                        <Link
                          key={tool.id}
                          href={tool.href}
                          className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#fbf7f0]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#d9cbb9] bg-[#f0f3eb] text-[#526047]">
                              <Icon size={18} />
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold text-[#2f271f]">
                                  {tool.title}
                                </span>
                                <StatusBadge tool={tool} />
                              </div>

                              <p className="mt-1 line-clamp-1 text-sm font-medium text-[#78695b]">
                                {tool.menuDescription}
                              </p>
                            </div>
                          </div>

                          <ArrowRight
                            size={16}
                            className="shrink-0 text-[#c7b8a6] transition group-hover:translate-x-1 group-hover:text-[#526047]"
                          />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              <Link href="/tools" className="btn-primary">
                View complete tools dashboard
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-[#ddcfbf]/80 bg-[#fffaf3]/74">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Experience standard</p>
                <h2 className="section-title mt-3 max-w-4xl">
                  Beautiful design only matters when the workflow becomes easier
                </h2>
              </div>

              <p className="section-description max-w-2xl lg:justify-self-end">
                PDFMantra should not become decorative UI around weak workflows.
                Every major design decision should improve clarity, completion,
                and confidence.
              </p>
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {experienceCards.map((card, index) => {
                const Icon = card.icon;

                return (
                  <div
                    key={card.title}
                    className="rounded-[2rem] border border-[#ddcfbf] bg-[#fffaf3] p-6 shadow-[0_16px_42px_rgba(84,69,51,0.10)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#394432] to-[#526047] text-[#fffaf3]">
                        <Icon size={22} />
                      </div>

                      <span className="text-sm font-semibold tracking-[0.18em] text-[#b4a28d]">
                        0{index + 1}
                      </span>
                    </div>

                    <h3 className="mt-6 text-xl font-semibold tracking-[-0.04em] text-[#2f271f]">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-[#78695b]">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="hero-aurora hero-grid border-b border-white/10 text-[#fffaf3]">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#eadfce]">
                  PDFMantra ecosystem
                </p>
                <h2 className="mt-3 max-w-4xl text-4xl leading-[0.98] text-[#fffaf3] sm:text-5xl lg:text-6xl">
                  Web now. Processing engine next. Desktop later.
                </h2>
              </div>

              <p className="max-w-2xl text-sm font-medium leading-7 text-[#f0e5d6] sm:text-base lg:justify-self-end">
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
                    className="group rounded-[2rem] border border-white/12 bg-white/10 p-6 backdrop-blur-sm transition duration-200 hover:-translate-y-1 hover:border-white/20 hover:bg-white/15"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fffaf3] text-[#526047]">
                        <Icon size={23} />
                      </div>

                      <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#fffaf3]">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-[#fffaf3]">
                      {card.title}
                    </h3>

                    <p className="mt-3 text-sm font-medium leading-7 text-[#f0e5d6]">
                      {card.description}
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#fffaf3]">
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

        <section className="border-b border-[#ddcfbf]/80">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Backend roadmap</p>
                <h2 className="section-title mt-3 max-w-4xl">
                  Heavy PDF tools deserve serious architecture
                </h2>
              </div>

              <p className="section-description max-w-2xl lg:justify-self-end">
                OCR, compression, true conversion, password tools, and redaction
                should be built through PDFMantra’s own backend processing flow.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {backendTools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} compact />
              ))}
            </div>
          </div>
        </section>

        <footer className="bg-[#fffaf3]/82">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="hero-aurora hero-grid overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-8 text-[#fffaf3] shadow-[0_34px_100px_rgba(54,45,36,0.24)] sm:px-8 lg:px-10 lg:py-10">
              <div className="grid gap-8 lg:grid-cols-[1.16fr_0.84fr] lg:items-center">
                <div>
                  <div className="eyebrow-chip">
                    <BadgeCheck size={14} />
                    PDFMantra direction
                  </div>

                  <h2 className="mt-5 max-w-4xl text-4xl leading-[0.98] text-[#fffaf3] sm:text-5xl lg:text-6xl">
                    Build the PDF platform people understand instantly.
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-[#f0e5d6] sm:text-base">
                    The editor, tools dashboard, backend processing pages, and future
                    desktop app should all carry one refined, discoverable, trustworthy
                    product system.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link
                    href="/editor"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#f5ead5] px-6 py-3 text-sm font-semibold text-[#2f271f] transition duration-200 hover:-translate-y-0.5 hover:bg-[#fff0d2]"
                  >
                    Open Editor Beta
                    <ArrowRight size={17} />
                  </Link>

                  <Link href="/tools" className="btn-secondary">
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
