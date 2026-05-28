import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";

import { Header } from "@/components/Header";

type BackendToolShellProps = {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  steps: string[];
  capabilityNote: string;
};

export function BackendToolShell({
  icon: Icon,
  eyebrow,
  title,
  description,
  steps,
  capabilityNote,
}: BackendToolShellProps) {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Icon size={14} />
                {eyebrow}
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                {title}
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                {description}
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_390px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <div className="rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <UploadCloud size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Backend processing required</div>
                  <div className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    This workflow needs secure upload, account checks, processing jobs, and private output delivery before final production use.
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-sm">
                    <ShieldCheck className="text-emerald-600" size={22} />
                    <h2 className="mt-3 text-sm font-bold text-slate-950">Secure</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Use protected uploads and authenticated access.</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-sm">
                    <LockKeyhole className="text-violet-700" size={22} />
                    <h2 className="mt-3 text-sm font-bold text-slate-950">Gated</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Connect to plan limits and paid features.</p>
                  </div>
                  <div className="rounded-[1.5rem] border border-violet-100 bg-white p-4 shadow-sm">
                    <Sparkles className="text-amber-600" size={22} />
                    <h2 className="mt-3 text-sm font-bold text-slate-950">Scalable</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">Run heavier PDF jobs outside the browser.</p>
                  </div>
                </div>
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Production flow</h2>
                  <div className="mt-4 space-y-3">
                    {steps.map((step, index) => (
                      <div key={step} className="flex gap-3 rounded-2xl bg-white p-4 text-sm font-medium leading-6 text-slate-700">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">{index + 1}</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Capability note</div>
                    {capabilityNote}
                  </div>

                  <Link href="/tools/pro" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-violet-100 transition hover:bg-violet-800">
                    View Pro tools
                    <ArrowRight size={17} />
                  </Link>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
