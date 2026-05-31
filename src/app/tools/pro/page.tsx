import Link from "next/link";
import { ArrowRight, Brain, Crown, Eye, LockKeyhole, ShieldCheck, ShieldOff, Sparkles, Wand2 } from "lucide-react";

import { Header } from "@/components/Header";

const PRO_TOOLS = [
  ["Watermark Remover", "Authorized PDF cleanup workflow for watermark, stamp, text, and object removal processing.", "/tools/watermark-remover", Crown],
  ["Protect PDF", "Password protection workflow prepared for secure backend encryption and private delivery.", "/tools/protect", ShieldCheck],
  ["Unlock PDF", "Authorized unlock workflow for PDFs you own or are allowed to access with a known password.", "/tools/unlock", ShieldOff],
  ["OCR PDF", "Backend OCR workflow for scanned PDFs that need searchable and selectable text layers.", "/tools/ocr", Brain],
  ["PDF to Word", "Backend document workflow prepared for editable Word-style output and layout reconstruction.", "/tools/pdf-to-word", Wand2],
  ["Redact PDF", "Privacy workflow prepared for true permanent redaction instead of visual-only hiding.", "/tools/redact", Eye],
] as const;

export default function ProToolsPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-900 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Crown size={14} />
                PDFMantra Pro
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                Advanced PDF workflows for paid backend processing.
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Pro tools are prepared for account gating, secure upload, backend jobs, plan checks, and private output delivery.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[360px_1fr]">
              <aside className="border-r border-violet-100 bg-slate-50 p-5 sm:p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <LockKeyhole size={22} />
                </div>
                <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                  Pro principles
                </h2>
                <div className="mt-5 space-y-4 text-sm font-medium leading-6 text-slate-600">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                    <span>Use only for PDFs the user owns or is authorized to edit.</span>
                  </div>
                  <div className="flex gap-3">
                    <Sparkles className="mt-0.5 shrink-0 text-amber-600" size={18} />
                    <span>Use backend processing where browser-only shortcuts would be weak.</span>
                  </div>
                  <div className="flex gap-3">
                    <LockKeyhole className="mt-0.5 shrink-0 text-violet-700" size={18} />
                    <span>Connect plan checks, secure jobs, and private output delivery before final paid launch.</span>
                  </div>
                </div>
              </aside>

              <div className="p-5 sm:p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Pro workflow directory
                </p>

                <div className="mt-5 grid gap-4 xl:grid-cols-2">
                  {PRO_TOOLS.map(([title, description, href, Icon]) => (
                    <Link
                      key={href}
                      href={href}
                      className="group flex items-center justify-between gap-4 rounded-[1.5rem] border border-violet-100 bg-slate-50 p-5 transition hover:border-violet-200 hover:bg-violet-50"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-700 group-hover:text-white">
                          <Icon size={22} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{title}</h2>
                            <span className="rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700">
                              Pro workflow
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{description}</p>
                        </div>
                      </div>
                      <ArrowRight className="shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-violet-700" size={18} />
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
