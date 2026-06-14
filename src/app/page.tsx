"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileImage,
  FileSignature,
  FileText,
  Hash,
  Image as ImageIcon,
  Layers,
  Lock,
  Minimize2,
  MousePointer2,
  RotateCw,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type PdfTool = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  keywords: string[];
};

type Workflow = {
  title: string;
  description: string;
  tools: string[];
};

const tools: PdfTool[] = [
  {
    title: "Merge PDF",
    href: "/tools/merge",
    description: "Combine multiple PDFs into one file.",
    icon: Layers,
    keywords: ["merge", "combine", "join", "multiple pdf"],
  },
  {
    title: "Split PDF",
    href: "/tools/split",
    description: "Separate one PDF into smaller files.",
    icon: Scissors,
    keywords: ["split", "separate", "divide"],
  },
  {
    title: "Compress PDF",
    href: "/tools/compress",
    description: "Reduce PDF size for sharing and uploads.",
    icon: Minimize2,
    keywords: ["compress", "reduce", "small", "optimize"],
  },
  {
    title: "Fill & Sign",
    href: "/tools/fill-sign",
    description: "Add text, dates, marks and signatures.",
    icon: FileSignature,
    keywords: ["fill", "sign", "signature", "form", "date"],
  },
  {
    title: "Edit PDF",
    href: "/editor",
    description: "Open the browser PDF workspace.",
    icon: FileText,
    keywords: ["edit", "editor", "text", "highlight", "annotate"],
  },
  {
    title: "Reorder Pages",
    href: "/tools/reorder",
    description: "Move pages into the correct order.",
    icon: RotateCw,
    keywords: ["reorder", "arrange", "sort", "pages"],
  },
  {
    title: "Delete Pages",
    href: "/tools/delete-pages",
    description: "Remove unwanted pages from a PDF.",
    icon: Trash2,
    keywords: ["delete", "remove", "pages"],
  },
  {
    title: "Extract Pages",
    href: "/tools/extract",
    description: "Save selected pages as a new PDF.",
    icon: FileText,
    keywords: ["extract", "selected", "pages"],
  },
  {
    title: "Images to PDF",
    href: "/tools/images-to-pdf",
    description: "Create a PDF from JPG or PNG files.",
    icon: ImageIcon,
    keywords: ["image", "jpg", "png", "photo", "convert"],
  },
  {
    title: "PDF to Images",
    href: "/tools/pdf-to-images",
    description: "Export PDF pages as image files.",
    icon: FileImage,
    keywords: ["pdf to image", "jpg", "png", "export"],
  },
  {
    title: "Watermark PDF",
    href: "/tools/watermark",
    description: "Add watermark text to your PDF.",
    icon: Sparkles,
    keywords: ["watermark", "stamp", "brand"],
  },
  {
    title: "Page Numbers",
    href: "/tools/page-numbers",
    description: "Add page numbers to PDF pages.",
    icon: Hash,
    keywords: ["page number", "numbering", "footer"],
  },
];

const mostUsedToolTitles = [
  "Merge PDF",
  "Compress PDF",
  "Fill & Sign",
  "Edit PDF",
  "Reorder Pages",
  "Images to PDF",
  "PDF to Images",
  "Delete Pages",
];

const workflows: Workflow[] = [
  {
    title: "Organize pages",
    description: "Arrange, split, delete or extract pages from existing PDFs.",
    tools: ["Merge PDF", "Split PDF", "Reorder Pages", "Delete Pages", "Extract Pages"],
  },
  {
    title: "Edit & sign",
    description: "Add information, marks, page numbers, signatures or watermarks.",
    tools: ["Fill & Sign", "Edit PDF", "Watermark PDF", "Page Numbers"],
  },
  {
    title: "Convert files",
    description: "Move between PDFs and image formats for sharing or uploads.",
    tools: ["Images to PDF", "PDF to Images"],
  },
  {
    title: "Optimize",
    description: "Make PDFs easier to share, upload and store.",
    tools: ["Compress PDF"],
  },
];

const steps = [
  {
    title: "Choose your task",
    description: "Pick Merge, Compress, Fill & Sign, Convert or another PDF action.",
    icon: MousePointer2,
  },
  {
    title: "Work in browser",
    description: "Use a clean tool screen focused on one job at a time.",
    icon: Upload,
  },
  {
    title: "Download result",
    description: "Export your finished PDF or files when processing is complete.",
    icon: Download,
  },
];

const trustPoints = [
  {
    title: "Browser-first workflow",
    description: "Supported PDF tools run directly in your browser for faster daily work.",
    icon: ShieldCheck,
  },
  {
    title: "No complicated app",
    description: "Each tool is focused on one job, so users do not need to learn a heavy editor.",
    icon: FileText,
  },
  {
    title: "Clean tool discovery",
    description: "Popular tools and workflows are easy to find without scrolling through clutter.",
    icon: Layers,
  },
  {
    title: "Free to start",
    description: "Start with core PDF actions first. Advanced limits and paid features can come later.",
    icon: Lock,
  },
];

function getTool(title: string) {
  return tools.find((tool) => tool.title === title);
}

const mostUsedTools = mostUsedToolTitles
  .map((title) => getTool(title))
  .filter((tool): tool is PdfTool => Boolean(tool));

function ToolRow({ tool }: { readonly tool: PdfTool }) {
  const Icon = tool.icon;

  return (
    <Link
      href={tool.href}
      className="group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[var(--border-light)] hover:bg-white hover:shadow-[0_14px_35px_rgba(15,23,42,0.05)]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {tool.title}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-[var(--text-secondary)]">
          {tool.description}
        </span>
      </span>

      <ArrowRight
        size={16}
        className="shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--violet-600)]"
      />
    </Link>
  );
}

function WorkflowBlock({ workflow }: { readonly workflow: Workflow }) {
  return (
    <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <h3 className="text-base font-bold text-[var(--text-primary)]">
        {workflow.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
        {workflow.description}
      </p>

      <div className="mt-5 space-y-2">
        {workflow.tools.map((toolTitle) => {
          const tool = getTool(toolTitle);

          if (!tool) return null;

          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex items-center justify-between rounded-xl bg-[#fbfbff] px-3 py-2.5 text-sm font-bold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
            >
              {tool.title}
              <ArrowRight size={14} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StepBlock({
  title,
  description,
  icon: Icon,
  index,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
  readonly index: number;
}) {
  return (
    <div className="relative rounded-[1.5rem] border border-[var(--border-light)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-50)] text-[var(--violet-600)]">
          <Icon size={20} />
        </span>

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            Step {index + 1}
          </div>

          <h3 className="mt-1 text-base font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function TrustBlock({
  title,
  description,
  icon: Icon,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: LucideIcon;
}) {
  return (
    <div className="rounded-[1.35rem] bg-white/75 p-4 ring-1 ring-white/70">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--violet-600)] text-white">
          <Icon size={17} />
        </span>

        <div>
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();

  function openWorkspace() {
    router.push("/editor");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#fbfbff] text-[var(--text-primary)]">
        <section className="border-b border-[var(--border-light)] bg-white">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[#fbfbff] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]">
                  <ShieldCheck size={14} className="text-[var(--violet-600)]" />
                  Focused PDF tools, no heavy app
                </div>

                <h1 className="display-font mt-5 max-w-2xl text-[2.25rem] font-bold leading-[1.08] tracking-[-0.04em] text-[var(--text-primary)] sm:text-[3rem] lg:text-[3.5rem]">
                  Simple PDF work starts here.
                </h1>

                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  Merge, compress, sign, convert and organize PDFs through focused browser tools.
                  Start with the workspace or jump directly to a common PDF action.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openWorkspace}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--violet-600)] px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(101,80,232,0.22)] transition hover:bg-[var(--violet-500)]"
                  >
                    <Upload size={17} />
                    Get Started
                  </button>

                  <Link
                    href="/tools"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-5 text-sm font-bold text-[var(--violet-600)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
                  >
                    Browse all tools
                    <ArrowRight size={16} />
                  </Link>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {["No signup needed", "Browser-first tools", "Free to start"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--violet-50)] px-3 py-1.5 text-xs font-bold text-[var(--text-secondary)]"
                    >
                      <CheckCircle2 size={13} className="text-[var(--violet-600)]" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-[#fbfbff] p-3 shadow-[0_22px_70px_rgba(15,23,42,0.07)]">
                <div className="rounded-[1.35rem] bg-white p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet-600)]">
                        Start flow
                      </p>

                      <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                        Upload. Choose. Download.
                      </h2>
                    </div>

                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_32px_rgba(101,80,232,0.24)]">
                      <Upload size={21} />
                    </span>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      {
                        title: "Upload your PDF",
                        description: "Start from the workspace or a focused tool.",
                      },
                      {
                        title: "Pick the action",
                        description: "Merge, sign, compress, convert or organize.",
                      },
                      {
                        title: "Export the result",
                        description: "Download the final file after processing.",
                      },
                    ].map((item, index) => (
                      <div
                        key={item.title}
                        className="flex items-start gap-3 rounded-2xl bg-[#fbfbff] p-3"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                          {index + 1}
                        </span>

                        <span>
                          <span className="block text-sm font-bold text-[var(--text-primary)]">
                            {item.title}
                          </span>
                          <span className="mt-0.5 block text-xs leading-5 text-[var(--text-secondary)]">
                            {item.description}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-[var(--border-light)] bg-white px-4 py-3 text-xs font-bold text-[var(--text-secondary)]">
                    No heavy software. No confusing dashboard. Just focused PDF actions.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fbfbff]">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet-600)]">
                  Popular tools
                </p>

                <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                  Most-used PDF actions
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                  These are the fastest routes for everyday document work.
                </p>
              </div>

              <Link
                href="/tools"
                className="inline-flex items-center gap-2 text-sm font-bold text-[var(--violet-600)] transition hover:text-[var(--violet-500)]"
              >
                View full tools directory
                <ArrowRight size={15} />
              </Link>
            </div>

            <div className="mt-6 grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              {mostUsedTools.map((tool) => (
                <ToolRow key={tool.href} tool={tool} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet-600)]">
                How it works
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                Finish PDF tasks in three simple steps
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                The homepage helps users start fast, then the tool pages handle the detailed work.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <StepBlock
                  key={step.title}
                  title={step.title}
                  description={step.description}
                  icon={step.icon}
                  index={index}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#fbfbff]">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet-600)]">
                Browse by workflow
              </p>

              <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                Find the right tool by the work you need
              </h2>

              <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                Grouped workflows make the homepage useful without turning it into a full tools directory.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {workflows.map((workflow) => (
                <WorkflowBlock key={workflow.title} workflow={workflow} />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="rounded-[2rem] bg-[linear-gradient(135deg,#f4f1ff_0%,#ffffff_55%,#eef2ff_100%)] p-5 ring-1 ring-[var(--border-light)] sm:p-7 lg:p-8">
              <div className="grid gap-7 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--violet-600)]">
                    Built for focused PDF work
                  </p>

                  <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    A cleaner way to handle daily PDFs
                  </h2>

                  <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                    The goal is simple: help users reach the correct PDF action quickly,
                    keep the interface calm, and avoid unnecessary steps.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {trustPoints.map((point) => (
                    <TrustBlock
                      key={point.title}
                      title={point.title}
                      description={point.description}
                      icon={point.icon}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#fbfbff]">
          <div className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="rounded-[2rem] border border-[var(--border-light)] bg-white p-6 text-center shadow-[0_20px_60px_rgba(15,23,42,0.05)] sm:p-8">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                Start with any PDF task
              </h2>

              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                Open the workspace for editing, or browse the full tools directory to choose a focused action.
              </p>

              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={openWorkspace}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--violet-600)] px-5 text-sm font-bold text-white shadow-[0_18px_40px_rgba(101,80,232,0.22)] transition hover:bg-[var(--violet-500)]"
                >
                  Get Started
                  <ArrowRight size={16} />
                </button>

                <Link
                  href="/tools"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-5 text-sm font-bold text-[var(--violet-600)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
                >
                  Browse all tools
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
