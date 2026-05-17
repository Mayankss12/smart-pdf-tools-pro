import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  EyeOff,
  FileLock2,
  GlobeLock,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const securityHighlights = [
  {
    title: "Browser-first processing",
    description:
      "PDFMantra prioritizes tools that work directly in your browser whenever that workflow can be handled locally.",
    icon: MonitorSmartphone,
  },
  {
    title: "Clear file handling",
    description:
      "The interface is designed to keep file actions understandable, so users know when they upload, edit, export, or replace a document.",
    icon: FileLock2,
  },
  {
    title: "Privacy-minded product design",
    description:
      "Security is treated as part of the workflow itself, not as a hidden page users only find after they worry.",
    icon: EyeOff,
  },
] as const;

const securityPromises = [
  "Prefer on-device document handling where practical",
  "Keep tool flows clear and user-controlled",
  "Avoid unnecessary friction around file exports",
  "Design public pages around truthful, explainable trust signals",
] as const;

export default function SecurityPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-5xl">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                PDFMantra Security
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                Built around clearer,
                <span className="brand-gradient-text block">more transparent PDF handling.</span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                PDFMantra focuses on practical trust: browser-first document workflows where possible, clear file actions, and a product experience that keeps security understandable instead of vague.
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
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Trust signals</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Security language that users can actually understand.
              </h2>
            </div>
            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              Instead of hiding behind generic claims, PDFMantra’s security story should stay simple: what the tool does, how the file moves, and what the user controls.
            </p>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {securityHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)] transition hover:-translate-y-1 hover:border-[var(--border-focus)] hover:shadow-[var(--shadow-card-hover)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                    <Icon size={22} />
                  </div>
                  <h3 className="display-font mt-5 text-[1.45rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">{item.title}</h3>
                  <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">{item.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="border-y border-[var(--border-light)] bg-[var(--bg-panel)]/72">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-11 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
            <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.22)]">
                <ShieldCheck size={22} />
              </div>
              <h2 className="display-font mt-5 text-[1.9rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">PDFMantra security standard</h2>
              <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                Security should feel visible in the product. That means clear processing cues, calm language, and an interface that explains what users are doing with their documents.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
              <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2">
                {securityPromises.map((item, index) => (
                  <div key={item} className="min-h-[132px] border-b border-r border-[var(--border-light)] px-5 py-5 transition hover:bg-[var(--violet-50)]">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-caption)]">0{index + 1}</div>
                    <div className="mt-4 flex items-start gap-3 text-sm font-semibold leading-6 text-[var(--text-primary)]">
                      <BadgeCheck size={17} className="mt-0.5 shrink-0 text-[var(--violet-600)]" />
                      <span>{item}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="section-eyebrow">Security in context</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Better than a checkbox page.
              </h2>
              <p className="mt-4 text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px]">
                A strong PDF security page should explain actual handling patterns, not only list slogans. PDFMantra can stand out by pairing concise trust signals with tool-level clarity and readable workflow guidance.
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--violet-600)]"><MonitorSmartphone size={16} /> Local-first cues</div>
                  <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">Show users when a workflow is designed to stay browser-first.</p>
                </div>
                <div className="rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--violet-600)]"><GlobeLock size={16} /> Clear trust copy</div>
                  <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">Keep privacy messaging direct, visible, and understandable.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
