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
];

export default function DashboardPage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative max-w-4xl">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                  <Sparkles size={14} />
                  PDFMantra Dashboard
                </div>

                <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.4rem]">
                  Account dashboard will be added after backend setup.
                </h1>

                <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-indigo-50/95 sm:text-lg">
                  Login, saved files, usage limits, billing, and team workspace
                  features will be connected later with Supabase, storage, and
                  payment integration.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/editor" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-amber-300">
                    Open PDF Editor
                    <ArrowRight size={18} />
                  </Link>

                  <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20">
                    View Pricing
                  </Link>
                </div>
              </div>
            </section>

            <section className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Coming later</div>
                  <h2 className="mt-2 section-title">Dashboard roadmap</h2>
                </div>

                <p className="section-description max-w-2xl lg:justify-self-end">
                  This page is intentionally a placeholder for now so the product
                  demo has complete navigation without pretending backend features
                  already exist.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="premium-card">
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <UserRound size={22} />
                  </div>

                  <h3 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                    Login not enabled yet
                  </h3>

                  <p className="mt-3 text-sm font-medium leading-7 text-slate-500">
                    User accounts should be added after the frontend demo and
                    backend architecture are finalized. Supabase Auth is the
                    planned option.
                  </p>

                  <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4">
                    <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <Lock size={16} />
                      Backend phase
                    </div>
                    <p className="text-sm font-medium leading-6 text-amber-800">
                      Auth, database, file storage, and payment gating should be
                      implemented together to avoid rebuilding access control later.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {dashboardItems.map((item) => (
                    <div
                      key={item}
                      className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                        <Clock size={18} />
                      </div>

                      <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-950">
                        {item}
                      </h3>

                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        Planned for backend and account system phase.
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="border-t border-slate-100 bg-slate-50 px-6 py-10 sm:px-10 lg:px-14">
              <div className="grid gap-5 lg:grid-cols-3">
                <div className="premium-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <BadgeCheck size={20} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    Current focus
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                    Browser-side PDF tools and product demo polish.
                  </p>
                </div>

                <div className="premium-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <ShieldCheck size={20} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    Backend later
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                    Supabase Auth, database, and protected premium usage.
                  </p>
                </div>

                <div className="premium-card">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                    <FileText size={20} />
                  </div>
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    File storage later
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-7 text-slate-500">
                    Cloudflare R2 or Supabase Storage for saved documents.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
