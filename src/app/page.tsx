import Link from "next/link";
import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Combine,
  Copy,
  Crop,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Hash,
  Highlighter,
  Image,
  Layers,
  Lock,
  Minimize2,
  MousePointer2,
  PenLine,
  PencilRuler,
  RotateCw,
  Scissors,
  Search,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Stamp,
  Trash2,
  Underline,
  Wand2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HomeToolCard {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly tone: ToolGlyphTone;
  readonly badge?: "Live" | "Beta" | "Soon";
}

interface ToolCategoryGroup {
  readonly eyebrow: string;
  readonly title: string;
  readonly icon: LucideIcon;
  readonly tone: ToolGlyphTone;
  readonly items: readonly HomeToolCard[];
}

const primaryToolCards: readonly HomeToolCard[] = [
  {
    title: "Merge PDF",
    description: "Combine files into one clean document.",
    href: "/tools/merge",
    icon: Combine,
    tone: "indigo",
    badge: "Live",
  },
  {
    title: "Split PDF",
    description: "Separate pages into organized outputs.",
    href: "/tools/split",
    icon: Scissors,
    tone: "violet",
    badge: "Live",
  },
  {
    title: "Compress PDF",
    description: "Prepare smaller files with backend-ready flow.",
    href: "/tools/compress",
    icon: FileArchive,
    tone: "mint",
    badge: "Soon",
  },
  {
    title: "PDF to Word",
    description: "Conversion entry point for editable docs.",
    href: "/tools/pdf-to-word",
    icon: Wand2,
    tone: "mint",
    badge: "Soon",
  },
  {
    title: "PDF to Images",
    description: "Export pages as image-ready assets.",
    href: "/tools/pdf-to-images",
    icon: Image,
    tone: "mint",
    badge: "Soon",
  },
  {
    title: "Images to PDF",
    description: "Turn uploads into a polished PDF flow.",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    tone: "indigo",
    badge: "Soon",
  },
  {
    title: "Edit PDF",
    description: "Add text, images, signatures, and marks.",
    href: "/editor",
    icon: FileText,
    tone: "violet",
    badge: "Beta",
  },
  {
    title: "Highlight PDF",
    description: "Smart text snapping with clean export.",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
    tone: "violet",
    badge: "Beta",
  },
  {
    title: "Rotate Pages",
    description: "Fix page orientation visually and quickly.",
    href: "/tools/rotate",
    icon: RotateCw,
    tone: "indigo",
    badge: "Live",
  },
  {
    title: "Protect PDF",
    description: "Security workflows prepared for backend phase.",
    href: "/tools/protect",
    icon: ShieldCheck,
    tone: "violet",
    badge: "Soon",
  },
  {
    title: "Watermark PDF",
    description: "Add branded document overlays with ease.",
    href: "/tools/watermark",
    icon: Stamp,
    tone: "indigo",
    badge: "Soon",
  },
  {
    title: "Page Numbers",
    description: "Number long PDFs in a cleaner output flow.",
    href: "/tools/page-numbers",
    icon: Hash,
    tone: "indigo",
    badge: "Soon",
  },
] as const;

const toolCategories: readonly ToolCategoryGroup[] = [
  {
    eyebrow: "Edit",
    title: "Write, place, sign",
    icon: FileText,
    tone: "violet",
    items: [
      { title: "PDF Editor", description: "", href: "/editor", icon: FileText, tone: "violet" },
      { title: "Add Text", description: "", href: "/editor", icon: PenLine, tone: "violet" },
      { title: "Add Images", description: "", href: "/editor", icon: Image, tone: "violet" },
      { title: "Sign PDF", description: "", href: "/editor", icon: BadgeCheck, tone: "violet" },
      { title: "Fill Form", description: "", href: "/editor", icon: BookOpenCheck, tone: "violet" },
      { title: "Whiteout", description: "", href: "/editor", icon: XCircle, tone: "violet" },
      { title: "Crop PDF", description: "", href: "/tools", icon: Crop, tone: "violet" },
    ],
  },
  {
    eyebrow: "Merge & Organize",
    title: "Combine and arrange",
    icon: Layers,
    tone: "indigo",
    items: [
      { title: "Merge PDF", description: "", href: "/tools/merge", icon: Combine, tone: "indigo" },
      { title: "Organize PDF", description: "", href: "/tools/organize", icon: Layers, tone: "indigo" },
      { title: "Reorder Pages", description: "", href: "/tools/reorder", icon: MousePointer2, tone: "indigo" },
      { title: "Rotate Pages", description: "", href: "/tools/rotate", icon: RotateCw, tone: "indigo" },
      { title: "Delete Pages", description: "", href: "/tools/delete-pages", icon: Trash2, tone: "indigo" },
      { title: "Extract Pages", description: "", href: "/tools/extract", icon: Copy, tone: "indigo" },
      { title: "Insert Pages", description: "", href: "/tools", icon: Layers, tone: "indigo" },
    ],
  },
  {
    eyebrow: "Split",
    title: "Divide and isolate",
    icon: Scissors,
    tone: "violet",
    items: [
      { title: "Split PDF", description: "", href: "/tools/split", icon: Scissors, tone: "violet" },
      { title: "Split by Range", description: "", href: "/tools/split", icon: Scissors, tone: "violet" },
      { title: "Split Every Page", description: "", href: "/tools/split", icon: Copy, tone: "violet" },
      { title: "Extract Range", description: "", href: "/tools/extract", icon: Copy, tone: "violet" },
      { title: "Remove Blank", description: "", href: "/tools", icon: Trash2, tone: "violet" },
      { title: "Page Preview", description: "", href: "/tools/organize", icon: Eye, tone: "violet" },
    ],
  },
  {
    eyebrow: "Compress & Convert",
    title: "Shrink and transform",
    icon: FileArchive,
    tone: "mint",
    items: [
      { title: "Compress PDF", description: "", href: "/tools/compress", icon: FileArchive, tone: "mint" },
      { title: "OCR PDF", description: "", href: "/tools/ocr", icon: Search, tone: "mint" },
      { title: "PDF to Word", description: "", href: "/tools/pdf-to-word", icon: Wand2, tone: "mint" },
      { title: "PDF to Images", description: "", href: "/tools/pdf-to-images", icon: Image, tone: "mint" },
      { title: "Images to PDF", description: "", href: "/tools/images-to-pdf", icon: FileImage, tone: "mint" },
      { title: "Repair PDF", description: "", href: "/tools", icon: Wand2, tone: "mint" },
      { title: "Flatten PDF", description: "", href: "/tools", icon: Minimize2, tone: "mint" },
    ],
  },
  {
    eyebrow: "Annotate",
    title: "Review in detail",
    icon: Highlighter,
    tone: "violet",
    items: [
      { title: "Highlight", description: "", href: "/tools/highlight-pdf", icon: Highlighter, tone: "violet" },
      { title: "Underline", description: "", href: "/tools/highlight-pdf", icon: Underline, tone: "violet" },
      { title: "Strikeout", description: "", href: "/tools/highlight-pdf", icon: XCircle, tone: "violet" },
      { title: "Freehand Draw", description: "", href: "/editor", icon: PenLine, tone: "violet" },
      { title: "Shapes", description: "", href: "/editor", icon: PencilRuler, tone: "violet" },
      { title: "Comments", description: "", href: "/editor", icon: BookOpenCheck, tone: "violet" },
      { title: "Stamp", description: "", href: "/tools", icon: Stamp, tone: "violet" },
    ],
  },
  {
    eyebrow: "Watermark & Protect",
    title: "Brand and secure",
    icon: Lock,
    tone: "indigo",
    items: [
      { title: "Add Watermark", description: "", href: "/tools/watermark", icon: Stamp, tone: "indigo" },
      { title: "Remove Watermark", description: "", href: "/tools", icon: XCircle, tone: "indigo" },
      { title: "Page Numbers", description: "", href: "/tools/page-numbers", icon: Hash, tone: "indigo" },
      { title: "Protect PDF", description: "", href: "/tools/protect", icon: Lock, tone: "indigo" },
      { title: "Unlock PDF", description: "", href: "/tools/unlock", icon: ShieldOff, tone: "indigo" },
      { title: "Redact PDF", description: "", href: "/tools/redact", icon: Eye, tone: "indigo" },
      { title: "Secure Share", description: "", href: "/tools", icon: ShieldCheck, tone: "indigo" },
    ],
  },
] as const;

const categoryPills = [
  "All tools",
  "Workflows",
  "Organize PDF",
  "Optimize PDF",
  "Convert PDF",
  "Edit PDF",
  "PDF Security",
  "PDF Intelligence",
] as const;

const annotationDepth = [
  "Highlight",
  "Underline",
  "Strikeout",
  "Freehand",
  "Shapes",
  "Colors",
  "Line weight",
  "Visibility",
] as const;

function badgeClassName(badge?: HomeToolCard["badge"]): string {
  if (badge === "Live") return "status-live";
  if (badge === "Beta") return "status-beta";
  return "status-soon";
}

function PrimaryToolCard({ tool }: { tool: HomeToolCard }) {
  return (
    <Link
      href={tool.href}
      className="group relative flex min-h-[216px] flex-col rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="lg" />
        {tool.badge ? <span className={badgeClassName(tool.badge)}>{tool.badge}</span> : null}
      </div>

      <h3 className="display-font mt-5 text-[1.28rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
        {tool.title}
      </h3>

      <p className="mt-2 max-w-[16rem] text-sm font-normal leading-6 text-[var(--text-secondary)]">
        {tool.description}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-5 text-sm font-semibold text-[var(--violet-600)]">
        Open tool
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function CompactToolLink({ tool }: { tool: HomeToolCard }) {
  return (
    <Link
      href={tool.href}
      className="group flex min-h-[62px] items-center justify-between gap-3 border-b border-r border-[var(--border-light)] bg-[var(--bg-card)] px-3.5 py-3 transition duration-200 hover:bg-[var(--violet-50)] sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="sm" />
        <span className="truncate text-[13px] font-medium tracking-[-0.01em] text-[var(--text-secondary)] transition group-hover:text-[var(--violet-600)]">
          {tool.title}
        </span>
      </div>
      <ArrowRight size={14} className="shrink-0 text-[var(--text-caption)] transition group-hover:translate-x-0.5 group-hover:text-[var(--violet-600)]" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora overflow-hidden border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-[1520px] px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
            <div className="mx-auto max-w-6xl text-center">
              <div className="eyebrow-chip mx-auto">
                <Sparkles size={13} />
                PDFMantra Smart PDF Workspace
              </div>

              <h1 className="display-font mx-auto mt-6 max-w-6xl text-[2.8rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[3.7rem] lg:text-[4.5rem]">
                Every PDF tool you need,
                <span className="brand-gradient-text block">in one clearer workspace.</span>
              </h1>

              <p className="mx-auto mt-5 max-w-4xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-[1.08rem] sm:leading-8">
                Edit, merge, split, compress, convert, annotate, protect, and organize PDFs through a polished workflow-first experience built for PDFMantra.
              </p>

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/editor" className="btn-primary">
                  <span>Start Editing</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/tools" className="btn-secondary">
                  <span>Browse All Tools</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {categoryPills.map((pill, index) => (
                  <Link
                    key={pill}
                    href="/tools"
                    className={[
                      "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-200",
                      index === 0
                        ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)]"
                        : "border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
                    ].join(" ")}
                  >
                    {pill}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
              {primaryToolCards.map((tool) => (
                <PrimaryToolCard key={tool.title} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border-light)] bg-[var(--bg-card)]">
          <div className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8 lg:py-11">
            <div className="grid gap-3 border-y border-[var(--border-light)] py-5 sm:grid-cols-3 sm:divide-x sm:divide-[var(--border-light)]">
              {["Fast task entry", "Category-led tool discovery", "Backend-ready premium roadmap"].map((item) => (
                <div key={item} className="flex items-start gap-2.5 px-1 text-[13px] font-semibold leading-6 text-[var(--text-secondary)] sm:px-5">
                  <BadgeCheck size={16} className="mt-1 shrink-0 text-[var(--violet-600)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border-light)] bg-[var(--bg-base)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Explore tools</p>
                <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Clear categories for bigger workflows.
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
                The first screen helps users act immediately. These grouped sections help them browse the full PDFMantra system without feeling lost.
              </p>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {toolCategories.map((category) => {
                const Icon = category.icon;

                return (
                  <section
                    key={category.eyebrow}
                    className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)] transition duration-200 hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card)]"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-light)] bg-[var(--bg-panel)] px-5 py-5 sm:px-6">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--violet-border)] bg-white text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="section-eyebrow !text-[11px]">{category.eyebrow}</p>
                          <h3 className="mt-2 text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[1.5rem]">
                            {category.title}
                          </h3>
                        </div>
                      </div>
                      <span className="status-beta shrink-0">{category.items.length} tools</span>
                    </div>

                    <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2">
                      {category.items.map((tool) => (
                        <CompactToolLink key={`${category.eyebrow}-${tool.title}`} tool={tool} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border-light)] bg-[var(--bg-panel)]/65">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-16">
            <div>
              <p className="section-eyebrow">Editing depth target</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Annotation should feel rich, not basic.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                PDFMantra is growing beyond simple one-click tools. The editor roadmap includes richer review controls, smart highlights, and clean export behavior.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2 lg:grid-cols-4">
                {annotationDepth.map((item, index) => (
                  <div
                    key={item}
                    className="min-h-[104px] border-b border-r border-[var(--border-light)] px-4 py-4 transition hover:bg-[var(--violet-50)]"
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-caption)]">
                      0{index + 1}
                    </div>
                    <div className="mt-4 text-[15px] font-bold tracking-[-0.01em] text-[var(--text-primary)]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--bg-base)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16">
            <div>
              <div className="eyebrow-chip">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="display-font mt-5 max-w-4xl text-[2.15rem] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.7rem] lg:text-[3.3rem]">
                Eye-catching discovery. Serious PDF workflows.
              </h2>
              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-8 text-[var(--text-secondary)]">
                The homepage now prioritizes faster tool discovery first, then guides users into deeper PDFMantra categories, editor depth, and backend-ready premium workflows.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/editor" className="btn-primary">
                <span>Open Editor</span>
                <ArrowRight size={16} />
              </Link>
              <Link href="/tools" className="btn-secondary">
                <span>Explore Tools</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
