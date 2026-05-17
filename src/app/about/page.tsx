import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  Compass,
  FileText,
  Layers,
  Sparkles,
  Target,
} from "lucide-react";

const principles = [
  {
    title: "Clear tool discovery",
    description:
      "Users should find the right PDF action fast, without navigating through cluttered menus or unclear labels.",
    icon: Compass,
  },
  {
    title: "Focused workspaces",
    description:
      "Each tool should feel purposeful: upload, act, preview, and export without unnecessary distractions.",
    icon: Layers,
  },
  {
    title: "Polished document handling",
    description:
      "PDFMantra is designed to make everyday document work feel calmer, sharper, and easier to trust.",
    icon: FileText,
  },
] as const;

const beliefs = [
  "PDF tools should feel easier than the task itself",
  "Strong UI should improve confidence, not create noise",
  "A serious product can still feel friendly and approachable",
  "Useful workflows matter more than decorative complexity",
] as const;

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-5xl">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                About PDFMantra
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                Built to make PDF work
                <span className="brand-gradient-text block">feel cleaner from the first click.</span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                PDFMantra is a focused PDF workspace for people who want tools that look clear, work with purpose, and make document tasks easier to understand.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/tools" className="btn-primary">
                  <span>Explore PDF Tools</span>
                  <ArrowRight size={16} />
                </Link>
                <Link href="/features" className="btn-secondary">
                  <span>View Features</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Product philosophy</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                A modern PDF platform should feel obvious to use.
              </h2>
            </div>
            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              PDFMantra is shaped around practical workflows, premium clarity, and a strong sense of control over the document in front of you.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {principles.map((principle) => {
              const Icon = principle.icon;
              return (
                <article key={principle.title} className="rounded-[1.6rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                    <Icon size={22} />
                  </div>
                  <h3 className="display-font mt-5 text-[1.45rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{principle.title}</h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">{principle.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-[var(--border-light)] bg-[var(--bg-panel)]/72">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-11 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
            <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.22)]">
                <Target size={22} />
              </div>
              <h2 className="display-font mt-5 text-[1.9rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">What PDFMantra stands for</h2>
              <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                The goal is simple: make document work feel more direct, more polished, and more comfortable for people who need results quickly.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2">
                {beliefs.map((belief, index) => (
                  <div key={belief} className="min-h-[132px] border-b border-r border-[var(--border-light)] px-5 py-5 transition hover:bg-[var(--violet-50)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-caption)]">0{index + 1}</div>
                    <div className="mt-4 flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-primary)]">
                      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--violet-600)]" />
                      <span>{belief}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:px-8 lg:py-14">
          <div>
            <div className="eyebrow-chip">
              <Sparkles size={14} />
              PDFMantra
            </div>
            <h2 className="display-font mt-5 text-[2.15rem] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.7rem]">
              A calmer way to handle PDFs.
            </h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/editor" className="btn-primary"><span>Open Editor</span><ArrowRight size={16} /></Link>
            <Link href="/security" className="btn-secondary"><span>View Security</span><ArrowRight size={16} /></Link>
          </div>
        </section>
      </main>
    </>
  );
}
