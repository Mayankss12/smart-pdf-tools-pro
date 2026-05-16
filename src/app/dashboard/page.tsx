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

      <main className="min-h-screen bg-[var(--pm-bg)] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-11 sm:px-6 lg:px-8 lg:py-14">
            <div className="max-w-5xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={13} />
                PDFMantra Account
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.45rem]">
                Account dashboard comes
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                  with the backend phase.
                </span>
              </h1>

              <p className="mt-4 max-w-3xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                Login, saved files, usage limits, billing, and team workspaces will be connected when the backend architecture, storage, and premium processing flow are ready.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(91,63,193,0.32)]"
                >
                  Open PDF Editor
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/pricing"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-violet-200 bg-[#fffdf8]/92 px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                >
                  View Pricing
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                Coming later
              </p>
              <h2 className="display-font mt-3 text-[2rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.55rem]">
                Dashboard roadmap
              </h2>
            </div>

            <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-[15px] lg:justify-self-end">
              This page stays honest while the final product foundation is being finalized. It shows what belongs in the account system without pretending those features already exist.
            </p>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50/70 via-[#fffdf8] to-rose-50/55 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-[1.2rem] border border-violet-100 bg-[#fffdf8] text-violet-700 shadow-sm">
                <UserRound size={22} />
              </div>

              <h3 className="display-font text-[1.8rem] font-medium tracking-[-0.04em] text-slate-950">
                Login not enabled yet
              </h3>

              <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                User accounts should be added after the frontend demo and backend architecture are finalized. Supabase Auth remains the planned direction.
              </p>

              <div className="mt-6 rounded-[1.35rem] border border-rose-100 bg-rose-50/75 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700">
                  <Lock size={16} />
                  Backend phase
                </div>
                <p className="text-sm font-medium leading-6 text-rose-700/90">
                  Auth, database, file storage, and payment gating should be implemented together to avoid rebuilding access control later.
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/82 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
              <div className="grid border-l border-t border-violet-100 sm:grid-cols-2">
                {dashboardItems.map((item) => (
                  <div
                    key={item}
                    className="min-h-[142px] border-b border-r border-violet-100 bg-[#fffdf8]/65 px-5 py-5 transition hover:bg-white"
                  >
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[1rem] border border-violet-100 bg-violet-50/80 text-violet-700">
                      <Clock size={18} />
                    </div>

                    <h3 className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                      {item}
                    </h3>

                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                      Planned for the backend and account phase.
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-violet-100 bg-[#fffdf8]/74">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/82 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-emerald-100 bg-emerald-50 text-emerald-700">
                  <BadgeCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-medium tracking-[-0.035em] text-slate-950">
                  Current focus
                </h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                  Browser-side PDF tools and product demo polish.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-gradient-to-br from-violet-50/70 via-[#fffdf8] to-rose-50/55 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-violet-100 bg-[#fffdf8] text-violet-700">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-medium tracking-[-0.035em] text-slate-950">
                  Backend later
                </h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                  Supabase Auth, database, and protected premium usage.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/82 p-6 shadow-[0_18px_46px_rgba(91,63,193,0.08)]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[1.1rem] border border-rose-100 bg-rose-50 text-rose-600">
                  <FileText size={20} />
                </div>
                <h3 className="display-font text-[1.55rem] font-medium tracking-[-0.035em] text-slate-950">
                  File storage later
                </h3>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
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
