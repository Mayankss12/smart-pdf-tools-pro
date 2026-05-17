import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  Combine,
  FileCog,
  FileSearch,
  FileText,
  Highlighter,
  Layers,
  Lock,
  Sparkles,
  Wand2,
} from "lucide-react";

const featureGroups = [
  {
    title: "Edit and annotate",
    description: "Work directly with text, marks, signatures, highlights, and document review actions.",
    icon: Highlighter,
    items: ["PDF editor", "Smart highlight", "Text and image placement", "Signing and review-ready workflows"],
  },
  {
    title: "Organize documents",
    description: "Reshape files cleanly with merge, split, rotate, extract, and page-level handling.",
    icon: Layers,
    items: ["Merge PDF", "Split PDF", "Rotate pages", "Extract and organize"],
  },
  {
    title: "Convert and optimize",
    description: "Move documents into the right format while keeping the workflow clear and direct.",
    icon: Wand2,
    items: ["PDF to Word", "Images to PDF", "PDF to images", "Compression-ready flow"],
  },
] as const;

const workflowSteps = [
  {
    title: "Choose a tool",
    description: "Open the exact workflow you need without digging through a cluttered dashboard.",
    icon: FileSearch,
  },
  {
    title: "Work in a focused surface",
    description: "Upload, preview, adjust, and understand what will happen before export.",
    icon: FileCog,
  },
  {
    title: "Finish with confidence",
    description: "Download the result through a cleaner, purpose-built PDF action flow.",
    icon: BadgeCheck,
  },
] as const;

const capabilityRows = [
  ["Document editing", "Text, images, signatures, highlights"],
  ["Page control", "Merge, split, rotate, extract"],
  ["Conversion", "PDF-to-file and file-to-PDF workflows"],
  ["Security", "Protect, unlock, redact direction"],
  ["Discovery", "Category-led tools and streamlined navigation"],
] as const;

export default function FeaturesPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-5xl">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                PDFMantra Features
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                A complete PDF workspace,
                <span className="brand-gradient-text block">organized around real tasks.</span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                PDFMantra brings tool discovery, focused workspaces, and practical document actions together in one calm, premium interface.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/tools" className="btn-primary">
                  <span>Explore All Tools</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/editor" className="btn-secondary">
                  <span>Open Editor</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Core capabilities</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                The product is easier to scan when features stay grouped.
              </h2>
            </div>
            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              Instead of overwhelming users with disconnected cards, PDFMantra presents its product in practical work families.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {featureGroups.map((group) => {
              const Icon = group.icon;
              return (
                <article key={group.title} className="rounded-[1.6rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                    <Icon size={22} />
                  </div>
                  <h3 className="display-font mt-5 text-[1.45rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{group.title}</h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">{group.description}</p>
                  <div className="mt-5 space-y-2.5">
                    {group.items.map((item) => (
                      <div key={item} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-[var(--text-primary)]">
                        <BadgeCheck size={16} className="mt-0.5 shrink-0 text-[var(--violet-600)]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-[var(--border-light)] bg-[var(--bg-panel)]/72">
          <div className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
              <div>
                <p className="section-eyebrow">Workflow logic</p>
                <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                  One product, three clear steps.
                </h2>
                <p className="mt-4 max-w-xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                  Great PDF products feel direct. PDFMantra keeps the experience centered on action, clarity, and visible progress.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
                <div className="grid border-l border-t border-[var(--border-light)] md:grid-cols-3">
                  {workflowSteps.map((step, index) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.title} className="min-h-[230px] border-b border-r border-[var(--border-light)] px-5 py-5 transition hover:bg-[var(--violet-50)]">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-caption)]">0{index + 1}</div>
                        <div className="mt-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                          <Icon size={19} />
                        </div>
                        <h3 className="mt-5 text-[1.1rem] font-bold tracking-[-0.01em] text-[var(--text-primary)]">{step.title}</h3>
                        <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">{step.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div>
              <p className="section-eyebrow">Capability map</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Built for everyday PDF work and heavier document flows.
              </h2>
              <p className="mt-4 text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                PDFMantra’s feature system is designed to scale while staying readable on the first visit.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
              {capabilityRows.map(([label, value], index) => (
                <div key={label} className={`grid gap-3 px-5 py-4 sm:grid-cols-[180px_1fr] ${index < capabilityRows.length - 1 ? "border-b border-[var(--border-light)]" : ""}`}>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{label}</div>
                  <div className="text-sm font-normal leading-6 text-[var(--text-secondary)]">{value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[var(--bg-base)]">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 border-t border-[var(--border-light)] px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-14">
            <div>
              <div className="eyebrow-chip">
                <Combine size={14} />
                PDFMantra Features
              </div>
              <h2 className="display-font mt-5 text-[2.15rem] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.7rem]">
                Find the tool. Finish the document.
              </h2>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/tools" className="btn-primary"><span>Browse Tools</span><ArrowRight size={16} /></Link>
              <Link href="/security" className="btn-secondary"><span>View Security</span><ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
