import Link from "next/link";
import { ArrowRight, Clock3, FileArchive, ShieldCheck, Sparkles } from "lucide-react";

import { Header } from "@/components/Header";

const COMING_SOON_POINTS = [
  "Backend-grade compression for stronger size reduction",
  "Clear before/after file size reporting",
  "Quality-safe optimization for business documents",
] as const;

export default function CompressPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Clock3 size={14} />
                Coming Soon
              </div>

              <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                Compress PDF is being rebuilt for reliable, backend-grade optimization.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                We have temporarily disabled browser-only compression because it cannot consistently reduce every PDF safely. A stronger compression workflow will return with proper backend processing.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="rounded-[2rem] border border-violet-100 bg-[#fffdf8]/84 p-6 shadow-[0_18px_50px_rgba(91,63,193,0.08)] backdrop-blur sm:p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                <FileArchive size={26} />
              </div>

              <h2 className="display-font mt-6 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">
                Why this tool is paused
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                Basic browser compression can sometimes make PDFs larger or provide only minor savings. For a professional PDF tool, compression should be predictable, safe, and transparent.
              </p>

              <div className="mt-6 grid gap-3">
                {COMING_SOON_POINTS.map((point) => (
                  <div
                    key={point}
                    className="flex items-start gap-3 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-[0_8px_24px_rgba(101,80,232,0.06)]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-black text-violet-700">
                      ✓
                    </span>
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <aside className="rounded-[2rem] border border-violet-100 bg-white p-6 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Sparkles size={22} />
              </div>

              <h2 className="display-font mt-5 text-2xl font-bold tracking-[-0.03em] text-slate-950">
                Use these tools now
              </h2>

              <div className="mt-5 space-y-3">
                <Link
                  href="/tools/merge"
                  className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  Merge PDF
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/tools/split"
                  className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  Split PDF
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/editor"
                  className="flex items-center justify-between rounded-2xl border border-violet-100 bg-violet-50/50 px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-violet-200 hover:bg-violet-50 hover:text-violet-700"
                >
                  PDF Editor
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold leading-6 text-emerald-800">
                <div className="mb-1 flex items-center gap-2">
                  <ShieldCheck size={16} />
                  Safe product decision
                </div>
                This page now clearly communicates that compression is not ready instead of offering a weak output.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
