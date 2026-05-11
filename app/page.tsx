import Link from "next/link";
import { Header } from "@/components/Header";
import { getWorkingTools, getComingSoonTools, STATUS_CONFIG } from "@/lib/tools";
import {
  ArrowRight,
  BadgeCheck,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

const workingTools = getWorkingTools();
const comingSoonTools = getComingSoonTools();

const heroFeatures = [
  "Upload any PDF instantly",
  "Add text, image, signature",
  "Highlight and annotate",
  "Export clean final PDF",
];

const benefits = [
  "100% browser-side — files never leave your device",
  "No account needed for free tools",
  "Premium backend tools coming soon",
  "Built for speed, privacy, and a clean workspace",
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">

            {/* ── Hero ── */}
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-14 text-white sm:px-10 lg:px-14 lg:py-20">
              <div className="pointer-events-none absolute right-[-160px] top-[-160px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="pointer-events-none absolute bottom-[-180px] left-[-140px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                <div>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Sparkles size={13} />
                    PDFMantra — Smart PDF Workspace
                  </div>

                  <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-[3.4rem]">
                    Professional PDF tools that work in your browser.
                  </h1>

                  <p className="mt-6 max-w-xl text-base font-medium leading-8 text-indigo-100/90 sm:text-lg">
                    Edit, sign, highlight, and annotate PDFs without uploading to
                    any server. Fast, private, and ready to use instantly.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link
                      href="/editor"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-black/10 transition hover:bg-amber-300"
                    >
                      Open PDF Editor
                      <ArrowRight size={17} />
                    </Link>
                    
                      href="#tools"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white/12 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/20"
                    >
                      Browse All Tools
                    </a>
                  </div>
                </div>

                {/* Feature card */}
                <div className="rounded-[1.75rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="rounded-[1.35rem] bg-white p-5 text-slate-950 shadow-xl">
                    <div className="mb-5 flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                          Browser-side
                        </div>
                        <div className="mt-1 text-xl font-semibold tracking-[-0.02em]">
                          PDF workspace
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Live
                      </span>
                    </div>
                    <div className="space-y-3">
                      {heroFeatures.map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"
                        >
                          <BadgeCheck size={16} className="shrink-0 text-emerald-600" />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── Working / Beta Tools ── */}
            <section id="tools" className="px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="section-eyebrow">Available now</div>
                  <h2 className="mt-2 section-title">PDF editing tools</h2>
                </div>
                <p className="section-description max-w-xl lg:justify-self-end">
                  These tools run entirely in your browser. No upload, no account needed.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {workingTools.map((tool) => {
                  const Icon = tool.icon;
                  const badge = STATUS_CONFIG[tool.status];
                  return (
                    <Link
                      key={tool.id}
                      href={tool.href}
                      className="tool-card group"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 transition group-hover:bg-indigo-700 group-hover:text-white">
                          <Icon size={20} />
                        </div>
                        <span className={badge.className}>{badge.label}</span>
                      </div>
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                        {tool.title}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                        {tool.description}
                      </p>
                      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-indigo-700">
                        Open tool
                        <ArrowRight
                          size={15}
                          className="transition group-hover:translate-x-1"
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* ── Coming Soon Tools ── */}
            <section className="border-t border-slate-100 bg-slate-50/70 px-6 py-10 sm:px-10 lg:px-14">
              <div className="mb-8 grid gap-4 lg:grid-cols-[0.8fr_1fr] lg:items-end">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-wide text-amber-600">
                    Roadmap
                  </div>
                  <h2 className="mt-2 section-title">More tools coming soon</h2>
                </div>
                <p className="section-description max-w-xl lg:justify-self-end">
                  Merge, split, compress, OCR, and more — rolling out progressively.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {comingSoonTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <div
                      key={tool.id}
                      className="premium-card cursor-not-allowed opacity-80"
                    >
                      <div className="mb-5 flex items-center justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                          <Icon size={19} />
                        </div>
                        <span className={STATUS_CONFIG["coming-soon"].className}>
                          Coming Soon
                        </span>
                      </div>
                      <h3 className="text-base font-semibold tracking-[-0.02em] text-slate-700">
                        {tool.title}
                      </h3>
                      <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
                        {tool.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Trust / Benefits ── */}
            <section className="grid gap-8 border-t border-slate-100 px-6 py-10 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-14">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-700">
                  <ShieldCheck size={14} />
                  Privacy first
                </div>
                <h2 className="mt-4 section-title">
                  Your files never leave your device.
                </h2>
                <p className="section-description mt-3">
                  PDFMantra processes everything locally in your browser. No
                  server uploads, no accounts, no data collection for free tools.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-700"
                  >
                    <Zap size={16} className="mt-0.5 shrink-0 text-indigo-600" />
                    {benefit}
                  </div>
                ))}
              </div>
            </section>

          </div>
        </section>
      </main>
    </>
  );
}
