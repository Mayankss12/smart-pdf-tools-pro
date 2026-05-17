import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowRight, BadgeCheck, Monitor, Sparkles, Wand2 } from "lucide-react";

const desktopSignals = [
  "Web platform first",
  "Desktop app later",
  "Shared PDFMantra design system",
] as const;

const desktopPromises = [
  "Offline-friendly editing",
  "Local batch workflows",
  "Power-user shortcuts",
  "Shared cloud-ready identity",
] as const;

export default function DesktopPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-16">
            <div>
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                Future PDFMantra Desktop App
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                Desktop comes after
                <span className="brand-gradient-text block">the website feels complete.</span>
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                The current focus is the live web product, stronger editing workflows, and backend-ready PDF processing. Once that foundation is stable, PDFMantra Desktop can extend the same system beautifully.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/editor" className="btn-primary">
                  <span>Open Editor</span>
                  <ArrowRight size={16} />
                </Link>

                <Link href="/tools" className="btn-secondary">
                  <span>Explore Tools</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-7 grid gap-3 border-t border-[var(--border-light)] pt-5 sm:grid-cols-3">
                {desktopSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2.5 text-[13px] font-semibold leading-6 text-[var(--text-secondary)]">
                    <BadgeCheck size={15} className="mt-1 shrink-0 text-[var(--violet-600)]" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
              <div className="border-b border-[var(--border-light)] bg-[var(--bg-panel)] px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-white text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                    <Monitor size={25} />
                  </div>
                  <span className="status-beta">Roadmap</span>
                </div>

                <h2 className="display-font mt-5 text-[1.95rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Desktop design promise
                </h2>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Same violet-led PDFMantra identity, adapted for power workflows and local productivity.
                </p>
              </div>

              <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2">
                {desktopPromises.map((item, index) => (
                  <div
                    key={item}
                    className="min-h-[128px] border-b border-r border-[var(--border-light)] bg-[var(--bg-card)] px-5 py-5 transition hover:bg-[var(--violet-50)]"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--violet-600)]">
                      0{index + 1}
                    </div>
                    <div className="mt-4 text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {item}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 border-t border-[var(--border-light)] bg-[var(--violet-50)] px-6 py-4 text-sm font-semibold text-[var(--violet-600)]">
                <Wand2 size={16} />
                The desktop app starts only after the web experience is ready to scale.
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
