import Link from "next/link";
import { Footer } from "@/components/Footer";
import { GitaWisdomSpotlight } from "@/components/GitaWisdomSpotlight";
import { Header } from "@/components/Header";
import { ToolGlyph, type ToolGlyphTone } from "@/components/ToolGlyph";
import {
  ArrowRight,
  BadgeCheck,
  Combine,
  Copy,
  Crop,
  Download,
  FileArchive,
  FileImage,
  FileText,
  Hash,
  Highlighter,
  Image,
  Layers,
  Lock,
  MoveUpRight,
  PenLine,
  RotateCw,
  Scissors,
  Search,
  ShieldCheck,
  ShieldOff,
  Stamp,
  Trash2,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HomeToolCard {
  readonly title: string;
  readonly description: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly tone: ToolGlyphTone;
}

const heroCategories = [
  "All",
  "Workflows",
  "Organize PDF",
  "Optimize PDF",
  "Convert PDF",
  "Edit PDF",
  "PDF Security",
] as const;

const homeTools: readonly HomeToolCard[] = [
  {
    title: "Merge PDF",
    description: "Combine PDFs into one polished document.",
    href: "/tools/merge",
    icon: Combine,
    tone: "indigo",
  },
  {
    title: "Split PDF",
    description: "Separate pages into cleaner outputs.",
    href: "/tools/split",
    icon: Scissors,
    tone: "violet",
  },
  {
    title: "Compress PDF",
    description: "Reduce file size through a guided flow.",
    href: "/tools/compress",
    icon: FileArchive,
    tone: "mint",
  },
  {
    title: "PDF to Word",
    description: "Turn documents into editable files.",
    href: "/tools/pdf-to-word",
    icon: Wand2,
    tone: "mint",
  },
  {
    title: "PDF to Images",
    description: "Export PDF pages as image files.",
    href: "/tools/pdf-to-images",
    icon: Image,
    tone: "mint",
  },
  {
    title: "Images to PDF",
    description: "Create PDFs from scans and photos.",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    tone: "indigo",
  },
  {
    title: "Edit PDF",
    description: "Add text, images, notes, and signatures.",
    href: "/editor",
    icon: FileText,
    tone: "violet",
  },
  {
    title: "Highlight PDF",
    description: "Mark key content with cleaner precision.",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
    tone: "violet",
  },
  {
    title: "Rotate Pages",
    description: "Fix document orientation in seconds.",
    href: "/tools/rotate",
    icon: RotateCw,
    tone: "indigo",
  },
  {
    title: "Delete Pages",
    description: "Remove pages you no longer need.",
    href: "/tools/delete-pages",
    icon: Trash2,
    tone: "indigo",
  },
  {
    title: "Extract Pages",
    description: "Pull the exact pages you want.",
    href: "/tools/extract",
    icon: Copy,
    tone: "indigo",
  },
  {
    title: "Organize PDF",
    description: "Reorder and manage document pages.",
    href: "/tools/organize",
    icon: Layers,
    tone: "indigo",
  },
  {
    title: "Watermark PDF",
    description: "Add branding and document overlays.",
    href: "/tools/watermark",
    icon: Stamp,
    tone: "violet",
  },
  {
    title: "Page Numbers",
    description: "Number documents with cleaner output.",
    href: "/tools/page-numbers",
    icon: Hash,
    tone: "violet",
  },
  {
    title: "Protect PDF",
    description: "Secure important files with purpose.",
    href: "/tools/protect",
    icon: ShieldCheck,
    tone: "violet",
  },
  {
    title: "Unlock PDF",
    description: "Open protected files through a clear flow.",
    href: "/tools/unlock",
    icon: ShieldOff,
    tone: "violet",
  },
  {
    title: "Redact PDF",
    description: "Hide sensitive information permanently.",
    href: "/tools/redact",
    icon: Lock,
    tone: "violet",
  },
  {
    title: "OCR PDF",
    description: "Make scanned content easier to search.",
    href: "/tools/ocr",
    icon: Search,
    tone: "mint",
  },
  {
    title: "Sign PDF",
    description: "Place signatures directly on documents.",
    href: "/editor",
    icon: PenLine,
    tone: "violet",
  },
  {
    title: "Crop PDF",
    description: "Trim page boundaries more precisely.",
    href: "/tools",
    icon: Crop,
    tone: "indigo",
  },
  {
    title: "Download Ready",
    description: "Finish each workflow with clean exports.",
    href: "/tools",
    icon: Download,
    tone: "mint",
  },
] as const;

const premiumBenefits = [
  "Sharper document workflows across editing, organizing, and conversion",
  "Focused PDF actions designed to feel cleaner from upload to export",
  "A premium interface that keeps power tools easy to discover",
] as const;

function ToolCard({ tool }: { readonly tool: HomeToolCard }) {
  return (
    <Link
      href={tool.href}
      className="group relative flex min-h-[238px] flex-col rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)] transition duration-200 hover:-translate-y-1 hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:shadow-[var(--shadow-card-hover)]"
    >
      <div className="flex items-start justify-between gap-4">
        <ToolGlyph icon={tool.icon} tone={tool.tone} size="lg" />
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)] transition duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:border-[var(--border-focus)] group-hover:bg-[var(--violet-600)] group-hover:text-white">
          <MoveUpRight size={18} />
        </span>
      </div>

      <h3 className="display-font mt-5 text-[1.18rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] transition group-hover:text-[var(--violet-600)]">
        {tool.title}
      </h3>

      <p className="mt-2 text-[13px] font-normal leading-6 text-[var(--text-secondary)]">
        {tool.description}
      </p>
    </Link>
  );
}

function DesktopVisual() {
  return (
    <div className="relative h-[212px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5">
      <div className="h-full rounded-t-[1.2rem] border border-[var(--violet-border)] bg-white shadow-[0_18px_42px_rgba(101,80,232,0.10)]">
        <div className="flex h-8 items-center gap-2 border-b border-[var(--border-light)] px-4">
          <span className="h-2 w-2 rounded-full bg-rose-300" />
          <span className="h-2 w-2 rounded-full bg-amber-300" />
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
        </div>
        <div className="grid h-[172px] grid-cols-[72px_1fr]">
          <div className="border-r border-[var(--border-light)] bg-[var(--violet-50)] p-3">
            <div className="space-y-3">
              <div className="h-3 rounded bg-[var(--violet-100)]" />
              <div className="h-3 rounded bg-[var(--violet-100)]" />
              <div className="h-3 rounded bg-[var(--violet-600)]/18" />
            </div>
          </div>
          <div className="p-4">
            <div className="mx-auto h-full max-w-[190px] rounded-xl border border-[var(--border-light)] bg-white p-4 shadow-[var(--shadow-soft)]">
              <div className="h-3 w-4/5 rounded bg-[var(--violet-100)]" />
              <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-11/12 rounded bg-slate-100" />
              <div className="mt-2 h-2.5 w-4/5 rounded bg-slate-100" />
              <div className="mt-5 h-8 rounded-lg bg-[var(--violet-50)]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MobileVisual() {
  return (
    <div className="relative h-[212px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5">
      <div className="mx-auto h-[196px] w-[118px] rounded-[1.7rem] border-[6px] border-white bg-white shadow-[0_18px_42px_rgba(101,80,232,0.12)]">
        <div className="h-full overflow-hidden rounded-[1.28rem] border border-[var(--border-light)] bg-[var(--bg-card)]">
          <div className="flex h-7 items-center justify-center border-b border-[var(--border-light)] text-[10px] font-bold text-[var(--text-muted)]">
            9:41
          </div>
          <div className="space-y-3 p-3">
            <div className="rounded-xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-2">
              <div className="h-2.5 w-4/5 rounded bg-[var(--violet-600)]/20" />
              <div className="mt-2 h-2 w-full rounded bg-white/90" />
            </div>
            <div className="rounded-xl border border-[var(--border-light)] bg-white p-2">
              <div className="h-2.5 w-3/4 rounded bg-slate-100" />
              <div className="mt-2 h-2 w-full rounded bg-slate-100" />
            </div>
            <div className="h-8 rounded-xl bg-[var(--violet-600)]/90" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessVisual() {
  return (
    <div className="relative h-[212px] overflow-hidden rounded-t-[1.5rem] bg-[linear-gradient(180deg,#f1eeff_0%,#faf8ff_100%)] px-5 pt-5">
      <div className="absolute left-7 top-7 h-36 w-32 rounded-[1.2rem] border border-[var(--border-light)] bg-white p-4 shadow-[0_16px_38px_rgba(101,80,232,0.10)]">
        <div className="h-3 w-3/5 rounded bg-[var(--violet-100)]" />
        <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
        <div className="mt-2 h-2.5 w-5/6 rounded bg-slate-100" />
        <div className="mt-7 h-8 rounded-lg bg-[var(--violet-50)]" />
      </div>
      <div className="absolute bottom-6 right-6 h-28 w-36 rounded-[1.15rem] bg-[#282a36] p-4 text-white shadow-[0_18px_42px_rgba(24,21,46,0.18)]">
        <div className="text-[10px] font-semibold text-white/60">workflow.ts</div>
        <div className="mt-3 space-y-2">
          <div className="h-2 w-4/5 rounded bg-white/18" />
          <div className="h-2 w-full rounded bg-white/18" />
          <div className="h-2 w-3/5 rounded bg-white/18" />
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora overflow-hidden border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-[1600px] px-4 pb-12 pt-12 sm:px-6 lg:px-8 lg:pb-16 lg:pt-16">
            <div className="mx-auto max-w-6xl text-center">
              <GitaWisdomSpotlight />

              <h1 className="display-font mx-auto mt-6 max-w-5xl text-[2.45rem] font-bold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[3.25rem] lg:text-[3.85rem]">
                Every PDF task,
                <span className="brand-gradient-text block">one clear workspace.</span>
              </h1>

              <p className="mx-auto mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base sm:leading-7">
                Merge, edit, convert, organize, and secure PDFs through a faster, cleaner workflow.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-2.5">
                {heroCategories.map((item, index) => (
                  <Link
                    key={item}
                    href="/tools"
                    className={[
                      "inline-flex min-h-10 items-center rounded-full border px-4 py-2 text-[13px] font-semibold transition duration-200",
                      index === 0
                        ? "border-[var(--violet-600)] bg-[var(--violet-600)] text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)]"
                        : "border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]",
                    ].join(" ")}
                  >
                    {item}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7">
              {homeTools.map((tool) => (
                <ToolCard key={tool.title} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-[1480px]">
            <div className="text-center">
              <p className="section-eyebrow justify-center">Work your way</p>
              <h2 className="display-font mt-3 text-[2.15rem] font-bold tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.8rem]">
                More ways to keep PDF work moving.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <DesktopVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Work with focused tools
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    Open a task-specific PDF workflow, upload your file, and finish the job without wandering through a busy dashboard.
                  </p>
                  <Link href="/tools" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    Browse workflows
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <MobileVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Move faster on smaller screens
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    The interface stays readable and action-first, so users can find tools quickly even when working away from a desk.
                  </p>
                  <Link href="/features" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    View features
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>

              <article className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]">
                <BusinessVisual />
                <div className="p-6">
                  <h3 className="display-font text-[1.35rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                    Built for serious document work
                  </h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                    From file cleanup to secure sharing, PDFMantra keeps advanced workflows visually calm and easier to trust.
                  </p>
                  <Link href="/security" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]">
                    Explore security
                    <MoveUpRight size={16} />
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-[1320px] overflow-hidden rounded-[2rem] border border-[var(--border-light)] bg-[linear-gradient(135deg,#fff5d8_0%,#fff8ea_52%,#f4efff_100%)] shadow-[0_28px_90px_rgba(101,80,232,0.10)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[0.92fr_1.08fr] lg:px-12 lg:py-12">
              <div className="flex flex-col justify-center">
                <p className="section-eyebrow">PDFMantra Premium</p>
                <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.14] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.65rem]">
                  Get more from every PDF workflow.
                </h2>
                <div className="mt-6 space-y-3.5">
                  {premiumBenefits.map((item) => (
                    <div key={item} className="flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-primary)] sm:text-[15px]">
                      <BadgeCheck size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link href="/pricing" className="btn-primary">
                    <span>View Pricing</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link href="/features" className="btn-secondary bg-white/90">
                    <span>See Features</span>
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>

              <div className="relative min-h-[360px] rounded-[1.8rem] border border-white/80 bg-white/68 p-5 shadow-[0_22px_60px_rgba(101,80,232,0.12)] backdrop-blur">
                <div className="absolute right-5 top-5 rounded-full border border-amber-200 bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                  Premium workspace
                </div>
                <div className="absolute left-8 top-10 h-60 w-48 rotate-[-3deg] rounded-[1.2rem] border border-[var(--border-light)] bg-white p-5 shadow-[0_18px_42px_rgba(101,80,232,0.12)]">
                  <div className="h-3 w-3/5 rounded bg-rose-300" />
                  <div className="mt-4 h-2.5 w-full rounded bg-slate-100" />
                  <div className="mt-2 h-2.5 w-11/12 rounded bg-slate-100" />
                  <div className="mt-2 h-2.5 w-4/5 rounded bg-slate-100" />
                  <div className="mt-8 h-24 rounded-xl bg-[var(--violet-50)]" />
                </div>
                <div className="absolute bottom-8 right-8 h-48 w-60 rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--bg-panel)] p-5 shadow-[0_20px_48px_rgba(101,80,232,0.14)]">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-2xl bg-[var(--violet-600)]/90" />
                    <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-[var(--violet-600)]">Aa</div>
                  </div>
                  <div className="mt-5 h-3 w-4/5 rounded bg-white" />
                  <div className="mt-3 h-3 w-full rounded bg-white/85" />
                  <div className="mt-3 h-3 w-3/5 rounded bg-white/75" />
                  <div className="mt-5 h-10 rounded-xl bg-white/92" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
