import Link from "next/link";
import { Header } from "@/components/Header";
import {
  getComingSoonTools,
  getWorkingTools,
} from "@/lib/tools";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Combine,
  Download,
  FileText,
  Highlighter,
  Image,
  Layers,
  Lock,
  Monitor,
  MousePointer2,
  PenLine,
  RotateCw,
  ScanSearch,
  Scissors,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";

const workingTools = getWorkingTools();
const comingSoonTools = getComingSoonTools();

const quickToolPills = [
  {
    label: "PDF Editor",
    href: "/editor",
    badge: "Beta",
  },
  {
    label: "Highlight PDF",
    href: "/editor",
    badge: "Beta",
  },
  {
    label: "Sign PDF",
    href: "/editor",
    badge: "Beta",
  },
  {
    label: "Merge PDF",
    badge: "Planned",
  },
  {
    label: "Compress PDF",
    badge: "Planned",
  },
  {
    label: "OCR PDF",
    badge: "Planned",
  },
];

const categoryShowcase = [
  {
    title: "Edit & Sign",
    description:
      "Text, highlights, signatures, images, annotations, and visual PDF workspace tools.",
    icon: PenLine,
    tint: "from-indigo-500 to-violet-500",
    tools: ["PDF Editor", "Highlight", "Sign PDF", "Watermark"],
  },
  {
    title: "Organize Pages",
    description:
      "Merge, split, reorder, rotate, extract, and manage long PDF documents.",
    icon: Layers,
    tint: "from-cyan-500 to-blue-500",
    tools: ["Merge", "Split", "Rotate", "Extract Pages"],
  },
  {
    title: "Convert",
    description:
      "Move between PDF, Word, images, text, and document-ready formats.",
    icon: Wand2,
    tint: "from-fuchsia-500 to-pink-500",
    tools: ["PDF to Word", "Images to PDF", "PDF to Images", "Text Export"],
  },
  {
    title: "Optimize & OCR",
    description:
      "Compression, repair, searchable scans, flattening, and processing quality.",
    icon: ScanSearch,
    tint: "from-amber-500 to-orange-500",
    tools: ["Compress", "OCR PDF", "Repair", "Flatten"],
  },
  {
    title: "Security",
    description:
      "Protect, unlock, redact, sanitize, and prepare sensitive PDFs responsibly.",
    icon: ShieldCheck,
    tint: "from-emerald-500 to-teal-500",
    tools: ["Protect", "Unlock", "Redact", "Sanitize"],
  },
  {
    title: "Inspect & Extract",
    description:
      "Metadata, page insight, extracted images, bookmarks, and document analysis.",
    icon: BookOpen,
    tint: "from-slate-700 to-slate-950",
    tools: ["Extract Images", "PDF Info", "Bookmarks", "Metadata"],
  },
];

const workflowSteps = [
  {
    title: "Choose the right tool",
    description:
      "Browse by task, not by technical jargon. PDFMantra should make the next action obvious.",
    icon: MousePointer2,
  },
  {
    title: "Upload and work visually",
    description:
      "Editor tools stay interactive. Processing tools will use guided steps and clear settings.",
    icon: Upload,
  },
  {
    title: "Download a reliable result",
    description:
      "Every tool should end with a clean output flow, clear errors, and no confusing dead ends.",
    icon: Download,
  },
];

const platformCards = [
  {
    title: "PDFMantra Web",
    badge: "Now",
    description:
      "The current online workspace: editing beta, tool discovery, and a fast path to polished workflows.",
    points: [
      "Browser-side visual editor",
      "Premium tools dashboard",
      "Backend-ready processing roadmap",
    ],
    icon: Monitor,
  },
  {
    title: "PDFMantra Desktop",
    badge: "Vision",
    description:
      "A future app experience for offline-style productivity, deeper performance, and heavier PDF workflows.",
    points: [
      "Local-first feel",
      "Power workflows for professionals",
      "Same PDFMantra design language",
    ],
    icon: FileText,
  },
];

const roadmapIds = [
  "merge-pdf",
  "split-pdf",
  "rotate-pdf",
  "compress-pdf",
  "ocr-pdf",
  "pdf-to-word",
  "protect-pdf",
  "unlock-pdf",
];

const roadmapTools = comingSoonTools.filter((tool) =>
  roadmapIds.includes(tool.id)
);

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface">
            {/* HERO */}
            <section className="hero-aurora hero-grid relative overflow-hidden px-5 py-6 text-white sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
                <div className="relative z-10">
                  <div className="eyebrow-chip">
                    <Sparkles size={14} />
                    PDFMantra — Premium PDF Workspace
                  </div>

                  <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-[4.4rem]">
                    A richer PDF platform,
                    <span className="text-gradient"> designed to feel effortless.</span>
                  </h1>

                  <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-100 sm:text-lg">
                    PDFMantra is being built as a beautiful, clear, and powerful
                    workspace for editing, organizing, converting, and securing PDFs —
                    not a plain tool grid, and not a browser-hack experiment.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href="/editor" className="btn-primary bg-amber-400 text-slate-950 shadow-amber-950/20 hover:bg-amber-300">
                      Open PDF Editor
                      <ArrowRight size={17} />
                    </Link>

                    <a href="#tools" className="btn-secondary">
                      Explore the tool universe
                    </a>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-2.5">
                    {quickToolPills.map((tool) =>
                      tool.href ? (
                        <Link
                          key={tool.label}
                          href={tool.href}
                          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
                        >
                          {tool.label}
                          <span className="rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-950">
                            {tool.badge}
                          </span>
                        </Link>
                      ) : (
                        <span
                          key={tool.label}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-medium text-indigo-50"
                        >
                          {tool.label}
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {tool.badge}
                          </span>
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* Hero Workspace Visual */}
                <div className="relative z-10">
                  <div className="glass-surface p-3 shadow-[0_30px_90px_rgba(15,23,42,0.26)] sm:p-4">
                    <div className="overflow-hidden rounded-[1.55rem] border border-white/15 bg-slate-950/80">
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                          <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>

                        <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                          Editor Beta
                        </div>
                      </div>

                      <div className="grid min-h-[430px] grid-cols-[74px_1fr_92px] gap-3 p-3 sm:grid-cols-[88px_1fr_108px]">
                        {/* Left Pages */}
                        <div className="space-y-3">
                          {[1, 2, 3].map((page) => (
                            <div
                              key={page}
                              className={`rounded-2xl border p-2 ${
                                page === 1
                                  ? "border-indigo-300 bg-white/15"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="h-16 rounded-xl bg-white/90 sm:h-20" />
                              <div className="mt-2 text-center text-[10px] font-semibold text-white/80">
                                Page {page}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Main PDF Canvas */}
                        <div className="workspace-grid relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-100 p-4">
                          <div className="absolute inset-x-6 top-6 rounded-[1.1rem] border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.18)]">
                            <div className="flex items-center justify-between">
                              <div className="h-3 w-28 rounded-full bg-slate-900" />
                              <div className="h-3 w-12 rounded-full bg-indigo-200" />
                            </div>

                            <div className="mt-5 space-y-2.5">
                              <div className="h-2.5 w-full rounded-full bg-slate-200" />
                              <div className="relative h-2.5 w-[92%] rounded-full bg-slate-200">
                                <div className="absolute inset-y-[-4px] left-10 right-12 rounded-md bg-amber-300/70" />
                              </div>
                              <div className="h-2.5 w-[88%] rounded-full bg-slate-200" />
                              <div className="h-2.5 w-[96%] rounded-full bg-slate-200" />
                              <div className="h-2.5 w-[70%] rounded-full bg-slate-200" />
                            </div>

                            <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                              Add text, highlight, sign, and export
                            </div>
                          </div>

                          <div className="absolute bottom-5 left-5 rounded-2xl border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 shadow-lg">
                            Text layer selected
                          </div>

                          <div className="absolute bottom-5 right-5 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-lg">
                            Export ready
                          </div>
                        </div>

                        {/* Right Toolbar */}
                        <div className="space-y-3">
                          {[
                            { icon: PenLine, label: "Text" },
                            { icon: Highlighter, label: "Mark" },
                            { icon: Image, label: "Image" },
                            { icon: Lock, label: "Sign" },
                          ].map((item) => {
                            const Icon = item.icon;

                            return (
                              <div
                                key={item.label}
                                className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center backdrop-blur"
                              >
                                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-indigo-700">
                                  <Icon size={18} />
                                </div>
                                <div className="mt-2 text-[11px] font-semibold text-white/90">
                                  {item.label}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-3">
                <div className="dark-card">
                  <div className="text-3xl font-semibold text-white">Simple</div>
                  <p className="mt-2 text-sm font-medium leading-6 text-indigo-100">
                    Tools should be understandable at a glance, even for first-time users.
                  </p>
                </div>

                <div className="dark-card">
                  <div className="text-3xl font-semibold text-white">Powerful</div>
                  <p className="mt-2 text-sm font-medium leading-6 text-indigo-100">
                    Backend-grade roadmap for OCR, compression, conversion, and security.
                  </p>
                </div>

                <div className="dark-card">
                  <div className="text-3xl font-semibold text-white">Beautiful</div>
                  <p className="mt-2 text-sm font-medium leading-6 text-indigo-100">
                    A rich, premium UI system across homepage, tools, editor, and future desktop.
                  </p>
                </div>
              </div>
            </section>

            {/* CURRENT WORKSPACE */}
            <section
              id="workspace"
              className="border-b border-slate-100 bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Already taking shape</div>
                  <h2 className="section-title mt-3">
                    A workspace users can understand instantly
                  </h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  The editor remains a browser-side beta experience for visual PDF work,
                  while PDFMantra’s larger platform is being designed around stability,
                  clarity, and tools that genuinely deserve to be called “ready.”
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
                <div className="rich-card-static bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
                  <div className="flex items-center justify-between">
                    <span className="status-beta">Editor Beta</span>
                    <BadgeCheck size={18} className="text-emerald-600" />
                  </div>

                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
                    Visual PDF editing, not fake text rewriting
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                    Add text boxes, highlights, images, and signatures on top of the PDF.
                    The editor should feel clear, useful, and honest about what it does.
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2.5">
                    {[
                      "Text overlays",
                      "Marker highlights",
                      "Signature layers",
                      "Image placement",
                      "Export PDF",
                    ].map((item) => (
                      <span key={item} className="soft-pill">
                        {item}
                      </span>
                    ))}
                  </div>

                  <Link href="/editor" className="btn-light mt-6">
                    Launch Editor Beta
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {workingTools.map((tool) => {
                    const Icon = tool.icon;

                    return (
                      <Link
                        key={tool.id}
                        href={tool.href}
                        className="rich-card group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-600 group-hover:text-white">
                            <Icon size={20} />
                          </div>
                          <span className="status-beta">Beta</span>
                        </div>

                        <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                          {tool.title}
                        </h3>

                        <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
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
              </div>
            </section>

            {/* TOOL UNIVERSE */}
            <section
              id="tools"
              className="border-b border-slate-100 bg-slate-50/80 px-5 py-12 sm:px-8 lg:px-10 lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Tool universe</div>
                  <h2 className="section-title mt-3">
                    Rich tool discovery, not a boring list
                  </h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  The homepage should immediately communicate that PDFMantra is becoming
                  a full PDF platform. These categories will guide the entire site,
                  tools dashboard, and backend roadmap.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {categoryShowcase.map((category) => {
                  const Icon = category.icon;

                  return (
                    <div key={category.title} className="rich-card-static relative overflow-hidden">
                      <div
                        className={`absolute right-[-30px] top-[-30px] h-28 w-28 rounded-full bg-gradient-to-br ${category.tint} opacity-15 blur-2xl`}
                      />

                      <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${category.tint} text-white shadow-lg`}>
                        <Icon size={23} />
                      </div>

                      <h3 className="relative mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        {category.title}
                      </h3>

                      <p className="relative mt-3 text-sm font-medium leading-7 text-slate-600">
                        {category.description}
                      </p>

                      <div className="relative mt-5 flex flex-wrap gap-2">
                        {category.tools.map((tool) => (
                          <span
                            key={tool}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600"
                          >
                            {tool}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* PROCESS FLOW */}
            <section className="border-b border-slate-100 bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16">
              <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Experience principle</div>
                  <h2 className="section-title mt-3">
                    Every tool should feel easy in three moments
                  </h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  PDFMantra’s UI should make the next step self-evident. Rich design
                  matters, but only when it makes the product easier to use.
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;

                  return (
                    <div key={step.title} className="rich-card-static">
                      <div className="flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Icon size={22} />
                        </div>

                        <span className="text-sm font-semibold tracking-[0.18em] text-slate-400">
                          0{index + 1}
                        </span>
                      </div>

                      <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                        {step.title}
                      </h3>

                      <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                        {step.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* PLATFORM WEB + DESKTOP */}
            <section
              id="platform"
              className="border-b border-slate-100 bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-5 py-12 text-white sm:px-8 lg:px-10 lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200">
                    Product ecosystem
                  </div>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.045em] text-white sm:text-4xl lg:text-5xl">
                    Web now. Desktop later. One PDFMantra experience.
                  </h2>
                </div>

                <p className="max-w-2xl text-sm font-medium leading-7 text-indigo-100 sm:text-base lg:justify-self-end">
                  Like the best mature PDF platforms, PDFMantra should feel bigger than
                  a one-page web utility. The visual system starts here and carries into
                  tools, workspaces, and future desktop experiences.
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-2">
                {platformCards.map((card) => {
                  const Icon = card.icon;

                  return (
                    <div key={card.title} className="dark-card p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-700">
                          <Icon size={23} />
                        </div>

                        <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                          {card.badge}
                        </span>
                      </div>

                      <h3 className="mt-6 text-2xl font-semibold tracking-[-0.04em] text-white">
                        {card.title}
                      </h3>

                      <p className="mt-3 text-sm font-medium leading-7 text-indigo-100">
                        {card.description}
                      </p>

                      <div className="mt-5 space-y-3">
                        {card.points.map((point) => (
                          <div
                            key={point}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white"
                          >
                            <BadgeCheck size={16} className="shrink-0 text-emerald-300" />
                            {point}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ROADMAP */}
            <section
              id="roadmap"
              className="border-b border-slate-100 bg-white px-5 py-12 sm:px-8 lg:px-10 lg:py-16"
            >
              <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Backend roadmap</div>
                  <h2 className="section-title mt-3">
                    Serious PDF tools deserve serious processing
                  </h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  These tools will be built through PDFMantra’s own backend architecture,
                  not forced into unstable browser-only experiments.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {roadmapTools.map((tool) => {
                  const Icon = tool.icon;

                  return (
                    <div key={tool.id} className="rich-card-static bg-gradient-to-br from-white to-slate-50">
                      <div className="flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                          <Icon size={20} />
                        </div>

                        <span className="status-soon">Coming Soon</span>
                      </div>

                      <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                        {tool.title}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* FOOTER CTA */}
            <footer className="bg-slate-950 px-5 py-10 text-white sm:px-8 lg:px-10">
              <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-300">
                    PDFMantra direction locked
                  </div>

                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
                    Beautiful, understandable, and built to become powerful.
                  </h2>

                  <p className="mt-4 max-w-2xl text-sm font-medium leading-7 text-slate-300 sm:text-base">
                    This visual direction will guide the homepage, tools dashboard,
                    editor redesign, backend tool pages, and future desktop product.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                  <Link href="/editor" className="btn-primary bg-amber-400 text-slate-950 shadow-none hover:bg-amber-300">
                    Open Editor Beta
                    <ArrowRight size={17} />
                  </Link>

                  <a href="#tools" className="btn-secondary">
                    Explore categories
                  </a>
                </div>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </>
  );
}
