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

interface SpotlightTool {
  readonly title: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly tone: ToolGlyphTone;
  readonly badge?: string;
}

interface ToolCategoryGroup {
  readonly eyebrow: string;
  readonly title: string;
  readonly icon: LucideIcon;
  readonly tone: ToolGlyphTone;
  readonly items: readonly SpotlightTool[];
}

const spotlightTools: readonly SpotlightTool[] = [
  { title: "Edit PDF", href: "/editor", icon: FileText, tone: "violet", badge: "Beta" },
  { title: "Highlight PDF", href: "/tools/highlight-pdf", icon: Highlighter, tone: "violet", badge: "Live Beta" },
  { title: "Merge PDF", href: "/tools/merge", icon: Combine, tone: "indigo" },
  { title: "Split PDF", href: "/tools/split", icon: Scissors, tone: "violet" },
  { title: "Compress PDF", href: "/tools/compress", icon: FileArchive, tone: "mint" },
  { title: "Protect PDF", href: "/tools/protect", icon: ShieldCheck, tone: "violet" },
  { title: "Images to PDF", href: "/tools/images-to-pdf", icon: FileImage, tone: "indigo" },
  { title: "Sign PDF", href: "/editor", icon: PenLine, tone: "violet" },
] as const;

const toolCategories: readonly ToolCategoryGroup[] = [
  {
    eyebrow: "Edit",
    title: "Write, place, sign",
    icon: FileText,
    tone: "violet",
    items: [
      { title: "PDF Editor", href: "/editor", icon: FileText, tone: "violet" },
      { title: "Add Text", href: "/editor", icon: PenLine, tone: "violet" },
      { title: "Add Images", href: "/editor", icon: Image, tone: "violet" },
      { title: "Sign PDF", href: "/editor", icon: BadgeCheck, tone: "violet" },
      { title: "Fill Form", href: "/editor", icon: BookOpenCheck, tone: "violet" },
      { title: "Whiteout", href: "/editor", icon: XCircle, tone: "violet" },
      { title: "Crop PDF", href: "/tools", icon: Crop, tone: "violet" },
    ],
  },
  {
    eyebrow: "Merge & Organize",
    title: "Combine and arrange",
    icon: Layers,
    tone: "indigo",
    items: [
      { title: "Merge PDF", href: "/tools/merge", icon: Combine, tone: "indigo" },
      { title: "Organize PDF", href: "/tools/organize", icon: Layers, tone: "indigo" },
      { title: "Reorder Pages", href: "/tools/reorder", icon: MousePointer2, tone: "indigo" },
      { title: "Rotate Pages", href: "/tools/rotate", icon: RotateCw, tone: "indigo" },
      { title: "Delete Pages", href: "/tools/delete-pages", icon: Trash2, tone: "indigo" },
      { title: "Extract Pages", href: "/tools/extract", icon: Copy, tone: "indigo" },
      { title: "Insert Pages", href: "/tools", icon: Layers, tone: "indigo" },
    ],
  },
  {
    eyebrow: "Split",
    title: "Divide and isolate",
    icon: Scissors,
    tone: "violet",
    items: [
      { title: "Split PDF", href: "/tools/split", icon: Scissors, tone: "violet" },
      { title: "Split by Range", href: "/tools/split", icon: Scissors, tone: "violet" },
      { title: "Split Every Page", href: "/tools/split", icon: Copy, tone: "violet" },
      { title: "Extract Range", href: "/tools/extract", icon: Copy, tone: "violet" },
      { title: "Remove Blank", href: "/tools", icon: Trash2, tone: "violet" },
      { title: "Page Preview", href: "/tools/organize", icon: Eye, tone: "violet" },
    ],
  },
  {
    eyebrow: "Compress & Convert",
    title: "Shrink and transform",
    icon: FileArchive,
    tone: "mint",
    items: [
      { title: "Compress PDF", href: "/tools/compress", icon: FileArchive, tone: "mint" },
      { title: "OCR PDF", href: "/tools/ocr", icon: Search, tone: "mint" },
      { title: "PDF to Word", href: "/tools/pdf-to-word", icon: Wand2, tone: "mint" },
      { title: "PDF to Images", href: "/tools/pdf-to-images", icon: Image, tone: "mint" },
      { title: "Images to PDF", href: "/tools/images-to-pdf", icon: FileImage, tone: "mint" },
      { title: "Repair PDF", href: "/tools", icon: Wand2, tone: "mint" },
      { title: "Flatten PDF", href: "/tools", icon: Minimize2, tone: "mint" },
    ],
  },
  {
    eyebrow: "Annotate",
    title: "Review in detail",
    icon: Highlighter,
    tone: "violet",
    items: [
      { title: "Highlight", href: "/tools/highlight-pdf", icon: Highlighter, tone: "violet" },
      { title: "Underline", href: "/tools/highlight-pdf", icon: Underline, tone: "violet" },
      { title: "Strikeout", href: "/tools/highlight-pdf", icon: XCircle, tone: "violet" },
      { title: "Freehand Draw", href: "/editor", icon: PenLine, tone: "violet" },
      { title: "Shapes", href: "/editor", icon: PencilRuler, tone: "violet" },
      { title: "Comments", href: "/editor", icon: BookOpenCheck, tone: "violet" },
      { title: "Stamp", href: "/tools", icon: Stamp, tone: "violet" },
    ],
  },
  {
    eyebrow: "Watermark & Protect",
    title: "Brand and secure",
    icon: Lock,
    tone: "indigo",
    items: [
      { title: "Add Watermark", href: "/tools/watermark", icon: Stamp, tone: "indigo" },
      { title: "Remove Watermark", href: "/tools", icon: XCircle, tone: "indigo" },
      { title: "Page Numbers", href: "/tools/page-numbers", icon: Hash, tone: "indigo" },
      { title: "Protect PDF", href: "/tools/protect", icon: Lock, tone: "indigo" },
      { title: "Unlock PDF", href: "/tools/unlock", icon: ShieldOff, tone: "indigo" },
      { title: "Redact PDF", href: "/tools/redact", icon: Eye, tone: "indigo" },
      { title: "Secure Share", href: "/tools", icon: ShieldCheck, tone: "indigo" },
    ],
  },
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

function SpotlightToolCell({ tool }: { tool: SpotlightTool }) {
  return (
    <Link
      href={tool.href}
      className="group flex min-h-[104px] items-center justify-between gap-4 border-b border-r border-[var(--cream-border)] bg-[var(--cream-base)] px-4 py-4 transition duration-200 hover:bg-[var(--cream-secondary)] sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="md" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
              {tool.title}
            </span>
            {tool.badge ? <span className="status-beta">{tool.badge}</span> : null}
          </div>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-[var(--text-caption)] transition group-hover:translate-x-1 group-hover:text-[var(--violet-600)]" />
    </Link>
  );
}

function CompactToolLink({ tool }: { tool: SpotlightTool }) {
  return (
    <Link
      href={tool.href}
      className="group flex min-h-[62px] items-center justify-between gap-3 border-b border-r border-[var(--cream-border)] bg-[var(--cream-base)] px-3.5 py-3 transition duration-200 hover:bg-[var(--cream-secondary)] sm:px-4"
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

      <main className="min-h-screen bg-[var(--cream-base)] text-[var(--text-primary)]">
        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-14 text-center sm:px-6 lg:px-8 lg:py-20">
            <div className="eyebrow-chip mx-auto">
              <Sparkles size={13} />
              PDFMantra Smart PDF Workspace
            </div>

            <h1 className="display-font mx-auto mt-6 max-w-5xl text-[2.85rem] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--text-primary)] sm:text-[3.8rem] lg:text-[4.6rem]">
              Every PDF task,
              <span className="block text-[var(--violet-600)]">one cleaner workspace.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
              Edit, merge, split, compress, annotate, watermark, and protect PDFs through a calm,
              utility-first workspace built for clearer document handling.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/editor" className="btn-primary">
                Start Editing
                <ArrowRight size={16} />
              </Link>
              <Link href="/tools" className="btn-secondary">
                Browse Tool Grid
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mx-auto mt-9 grid max-w-4xl gap-3 border-t border-[var(--cream-border)] pt-6 text-left sm:grid-cols-3">
              {["Fast task entry", "Category-led tools", "Backend-ready roadmap"].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-[13px] font-medium leading-6 text-[var(--text-secondary)]">
                  <BadgeCheck size={15} className="mt-1 shrink-0 text-[var(--violet-600)]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-secondary)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="section-eyebrow">Start here</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Most-used PDF workflows
                </h2>
              </div>
              <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                View all tools
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-7 overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--cream-border)] md:grid-cols-2 xl:grid-cols-4">
                {spotlightTools.map((tool) => (
                  <SpotlightToolCell key={tool.title} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-base)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="section-eyebrow">Explore tools</p>
                <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  Short labels. Clear categories.
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
                The homepage shows the breadth of PDFMantra without explaining every tool twice.
                Details stay on each individual tool page.
              </p>
            </div>

            <div className="mt-7 grid gap-5 lg:grid-cols-2">
              {toolCategories.map((category) => {
                const Icon = category.icon;

                return (
                  <section
                    key={category.eyebrow}
                    className="overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)] transition duration-200 hover:border-[var(--violet-border)] hover:bg-[var(--cream-secondary)]"
                  >
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--cream-border)] px-5 py-5 sm:px-6">
                      <div className="flex min-w-0 items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                          <Icon size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="section-eyebrow !text-[11px]">{category.eyebrow}</p>
                          <h3 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[1.5rem]">
                            {category.title}
                          </h3>
                        </div>
                      </div>
                      <span className="status-soon shrink-0">{category.items.length} tools</span>
                    </div>

                    <div className="grid border-l border-t border-[var(--cream-border)] sm:grid-cols-2">
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

        <section className="border-b border-[var(--cream-border)] bg-[var(--cream-secondary)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-16">
            <div>
              <p className="section-eyebrow">Editing depth target</p>
              <h2 className="display-font mt-3 text-[2rem] font-semibold leading-[1.15] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Annotation should feel rich, not basic.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                The next editor phase treats annotation as a proper tool family: marker tools,
                review tools, freehand drawing, shape controls, and clean visibility states.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[var(--cream-border)] bg-[var(--cream-base)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--cream-border)] sm:grid-cols-2 lg:grid-cols-4">
                {annotationDepth.map((item, index) => (
                  <div
                    key={item}
                    className="min-h-[104px] border-b border-r border-[var(--cream-border)] px-4 py-4 transition hover:bg-[var(--cream-secondary)]"
                  >
                    <div className="text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-caption)]">
                      0{index + 1}
                    </div>
                    <div className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[var(--cream-base)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16">
            <div>
              <div className="eyebrow-chip">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="display-font mt-5 max-w-4xl text-[2.15rem] font-semibold leading-[1.12] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[2.7rem] lg:text-[3.3rem]">
                Friendly first. Powerful next.
              </h2>
              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-8 text-[var(--text-secondary)]">
                PDFMantra is moving toward cleaner tool discovery, richer editor depth, and backend-ready
                PDF processing without visual noise.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/editor" className="btn-primary">
                Open Editor
                <ArrowRight size={16} />
              </Link>
              <Link href="/tools" className="btn-secondary">
                Explore Tools
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
