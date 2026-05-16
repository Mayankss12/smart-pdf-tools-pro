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
  readonly tone: ToolGlyphTone;
  readonly items: readonly SpotlightTool[];
}

const spotlightTools: readonly SpotlightTool[] = [
  { title: "Edit PDF", href: "/editor", icon: FileText, tone: "violet", badge: "Beta" },
  { title: "Highlight PDF", href: "/tools/highlight-pdf", icon: Highlighter, tone: "blush", badge: "Live Beta" },
  { title: "Merge PDF", href: "/tools/merge", icon: Combine, tone: "indigo" },
  { title: "Split PDF", href: "/tools/split", icon: Scissors, tone: "violet" },
  { title: "Compress PDF", href: "/tools/compress", icon: FileArchive, tone: "blush" },
  { title: "Protect PDF", href: "/tools/protect", icon: ShieldCheck, tone: "mint" },
  { title: "Images to PDF", href: "/tools/images-to-pdf", icon: FileImage, tone: "indigo" },
  { title: "Sign PDF", href: "/editor", icon: PenLine, tone: "violet" },
] as const;

const toolCategories: readonly ToolCategoryGroup[] = [
  {
    eyebrow: "Edit",
    title: "Write, place, sign",
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
    tone: "blush",
    items: [
      { title: "Split PDF", href: "/tools/split", icon: Scissors, tone: "blush" },
      { title: "Split by Range", href: "/tools/split", icon: Scissors, tone: "blush" },
      { title: "Split Every Page", href: "/tools/split", icon: Copy, tone: "blush" },
      { title: "Extract Range", href: "/tools/extract", icon: Copy, tone: "blush" },
      { title: "Remove Blank", href: "/tools", icon: Trash2, tone: "blush" },
      { title: "Page Preview", href: "/tools/organize", icon: Eye, tone: "blush" },
    ],
  },
  {
    eyebrow: "Compress & Convert",
    title: "Shrink and transform",
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
    tone: "blush",
    items: [
      { title: "Add Watermark", href: "/tools/watermark", icon: Stamp, tone: "blush" },
      { title: "Remove Watermark", href: "/tools", icon: XCircle, tone: "blush" },
      { title: "Page Numbers", href: "/tools/page-numbers", icon: Hash, tone: "blush" },
      { title: "Protect PDF", href: "/tools/protect", icon: Lock, tone: "blush" },
      { title: "Unlock PDF", href: "/tools/unlock", icon: ShieldOff, tone: "blush" },
      { title: "Redact PDF", href: "/tools/redact", icon: Eye, tone: "blush" },
      { title: "Secure Share", href: "/tools", icon: ShieldCheck, tone: "blush" },
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
  "Show / hide",
] as const;

function SpotlightToolCell({ tool }: { tool: SpotlightTool }) {
  return (
    <Link
      href={tool.href}
      className="group flex min-h-[108px] items-center justify-between gap-4 border-b border-r border-violet-100 bg-white/68 px-4 py-4 transition duration-200 hover:bg-white sm:px-5"
    >
      <div className="flex min-w-0 items-center gap-4">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="md" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950 transition group-hover:text-violet-700">
              {tool.title}
            </span>
            {tool.badge ? (
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-rose-500">
                {tool.badge}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <ArrowRight size={16} className="shrink-0 text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-700" />
    </Link>
  );
}

function CompactToolLink({ tool }: { tool: SpotlightTool }) {
  return (
    <Link
      href={tool.href}
      className="group flex min-h-[68px] items-center justify-between gap-3 border-b border-r border-violet-100 bg-white/58 px-3.5 py-3 transition duration-200 hover:bg-white sm:px-4"
    >
      <div className="flex min-w-0 items-center gap-3">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="sm" />
        <span className="truncate text-[13px] font-semibold tracking-[-0.01em] text-slate-800 transition group-hover:text-violet-700">
          {tool.title}
        </span>
      </div>
      <ArrowRight size={14} className="shrink-0 text-violet-200 transition group-hover:translate-x-0.5 group-hover:text-violet-600" />
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf8ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-14rem] top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-200/70 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-8rem] h-[38rem] w-[38rem] rounded-full bg-rose-200/65 blur-3xl" />
            <div className="absolute bottom-[-20rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-fuchsia-100/80 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-11 text-center sm:px-6 lg:px-8 lg:pb-16 lg:pt-14">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/86 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
              <Sparkles size={13} />
              PDFMantra Smart PDF Workspace
            </div>

            <h1 className="display-font mx-auto mt-6 max-w-5xl text-[2.8rem] font-medium leading-[1.04] tracking-[-0.05em] text-slate-950 sm:text-[3.7rem] lg:text-[4.6rem]">
              Every PDF task,
              <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                one cleaner workspace.
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
              Edit, merge, split, compress, annotate, watermark, and protect PDFs
              through a layout that stays simple on the surface and serious underneath.
            </p>

            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/editor"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(91,63,193,0.32)]"
              >
                Start Editing
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/92 px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
              >
                Browse Tool Grid
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mx-auto mt-7 grid max-w-4xl gap-3 border-t border-violet-100 pt-5 text-left sm:grid-cols-3">
              {["Fast task entry", "Category-led tools", "Backend-ready roadmap"].map((item) => (
                <div key={item} className="flex items-start gap-2.5 text-[13px] font-semibold leading-6 text-slate-600">
                  <BadgeCheck size={15} className="mt-1 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/78">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                  Start here
                </p>
                <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                  Most-used PDF workflows
                </h2>
              </div>
              <Link href="/tools" className="inline-flex items-center gap-2 text-sm font-semibold text-violet-700 transition hover:text-violet-900">
                View all tools
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-7 overflow-hidden rounded-[2rem] border border-violet-100 bg-white/72 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
              <div className="grid border-l border-t border-violet-100 md:grid-cols-2 xl:grid-cols-4">
                {spotlightTools.map((tool) => (
                  <SpotlightToolCell key={tool.title} tool={tool} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-[#faf8ff]">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-[0.78fr_1.22fr] lg:items-end">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                  40+ tools by category
                </p>
                <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                  Short labels. Clear categories.
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-[15px] lg:justify-self-end">
                The homepage now shows the breadth of PDFMantra without explaining every tool twice.
                Details belong on each tool page, not in the discovery grid.
              </p>
            </div>

            <div className="mt-7 grid gap-6 lg:grid-cols-2">
              {toolCategories.map((category) => (
                <section
                  key={category.eyebrow}
                  className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white/76 shadow-[0_18px_46px_rgba(91,63,193,0.08)]"
                >
                  <div className="flex items-end justify-between gap-4 border-b border-violet-100 bg-gradient-to-r from-violet-50/90 via-white to-rose-50/70 px-5 py-5 sm:px-6">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-violet-600">
                        {category.eyebrow}
                      </p>
                      <h3 className="display-font mt-2 text-[1.7rem] font-medium tracking-[-0.035em] text-slate-950">
                        {category.title}
                      </h3>
                    </div>
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-500 shadow-sm">
                      {category.items.length} tools
                    </span>
                  </div>

                  <div className="grid border-l border-t border-violet-100 sm:grid-cols-2">
                    {category.items.map((tool) => (
                      <CompactToolLink key={`${category.eyebrow}-${tool.title}`} tool={tool} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/82">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-11 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-14">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                Editing depth target
              </p>
              <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                Annotation should feel rich, not basic.
              </h2>
              <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 sm:text-[15px]">
                The next editor phase will treat annotation as a proper tool family:
                marker tools, text review tools, drawing, shapes, toggles, and color control.
              </p>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-rose-50/70 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
              <div className="grid border-l border-t border-violet-100 sm:grid-cols-2 lg:grid-cols-4">
                {annotationDepth.map((item, index) => (
                  <div
                    key={item}
                    className="min-h-[104px] border-b border-r border-violet-100 px-4 py-4"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">
                      0{index + 1}
                    </div>
                    <div className="mt-4 text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                      {item}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-600 to-rose-500 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl" />
            <div className="absolute right-[-12rem] bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-13 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="display-font mt-5 max-w-4xl text-[2.15rem] font-medium leading-[1.08] tracking-[-0.045em] text-white sm:text-[2.7rem] lg:text-[3.3rem]">
                Friendly first. Powerful next.
              </h2>
              <p className="mt-4 max-w-3xl text-[15px] font-medium leading-8 text-violet-50">
                The site now shifts toward cleaner tool discovery, richer editor depth,
                and backend-ready PDF processing — without becoming visually noisy.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/editor"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow-[0_18px_44px_rgba(43,25,122,0.22)] transition hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Open Editor
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
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
