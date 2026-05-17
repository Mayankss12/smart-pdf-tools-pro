import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  BadgeCheck,
  Clock,
  FileText,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const dashboardItems = [
  "Saved documents",
  "Recent PDF edits",
  "Saved signatures",
  "Premium usage limits",
  "Team workspace",
  "Billing and subscription",
] as const;

export default function DashboardPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="hero-aurora border-b border-[var(--border-light)]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-5xl">
              <div className="eyebrow-chip">
                <Sparkles size={13} />
                PDFMantra Account
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-bold leading-[1.14] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[3.1rem] lg:text-[3.7rem]">
                Account dashboard comes
                <span className="brand-gradient-text block">with the backend phase.</span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)] sm:text-base">
                Login, saved files, usage limits, billing, and team workspaces will be connected when the backend architecture, storage, and premium processing flow are ready.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/editor" className="btn-primary">
                  <span>Open PDF Editor</span>
                  <ArrowRight size={16} />
                </Link>

                <Link href="/pricing" className="btn-secondary">
                  <span>View Pricing</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="section-eyebrow">Coming later</p>
              <h2 className="display-font mt-3 text-[2rem] font-bold leading-[1.16] tracking-[-0.02em] text-[var(--text-primary)] sm:text-[2.55rem]">
                Dashboard roadmap
              </h2>
            </div>

            <p className="max-w-2xl text-sm font-normal leading-7 text-[var(--text-secondary)] sm:text-[15px] lg:justify-self-end">
              This page stays honest while the final product foundation is being finalized. It shows what belongs in the account system without pretending those features already exist.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-card)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                <UserRound size={22} />
              </div>

              <h3 className="display-font text-[1.8rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                Login not enabled yet
              </h3>

              <p className="mt-3 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                User accounts should be added after the frontend demo and backend architecture are finalized. Supabase Auth remains the planned direction.
              </p>

              <div className="mt-6 rounded-[1.25rem] border border-[var(--violet-border)] bg-[var(--bg-panel)] p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Lock size={16} />
                  Backend phase
                </div>
                <p className="text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Auth, database, file storage, and payment gating should be implemented together to avoid rebuilding access control later.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
              <div className="grid border-l border-t border-[var(--border-light)] sm:grid-cols-2">
                {dashboardItems.map((item) => (
                  <div
                    key={item}
                    className="min-h-[142px] border-b border-r border-[var(--border-light)] bg-[var(--bg-card)] px-5 py-5 transition hover:bg-[var(--violet-50)]"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                      <Clock size={18} />
                    </div>

                    <h3 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {item}
                    </h3>

                    <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                      Planned for the backend and account phase.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--border-light)] bg-[var(--bg-panel)]/72">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <BadgeCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Current focus
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Browser-side PDF tools and product demo polish.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Backend later
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Supabase Auth, database, and protected premium usage.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-soft)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]">
                  <FileText size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  File storage later
                </h3>
                <p className="mt-2 text-sm font-normal leading-7 text-[var(--text-secondary)]">
                  Cloudflare R2 or Supabase Storage for saved documents.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
