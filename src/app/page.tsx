import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowRight, CheckCircle2, FileText, Highlighter, Layers3, ShieldCheck, Sparkles } from "lucide-react";

const starts = [
  {
    title: "Edit PDF",
    description: "Add text, images, signatures, and export.",
    href: "/editor",
    icon: FileText,
  },
  {
    title: "Highlight PDF",
    description: "Use the smart highlight workspace.",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
  },
  {
    title: "Explore Tools",
    description: "Find merge, split, compress, OCR, and more.",
    href: "/tools",
    icon: Layers3,
  },
] as const;

const benefits = [
  "Clear actions from the first screen",
  "Friendly layout without tool clutter",
  "Ready for advanced backend workflows",
] as const;

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#f8f7ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-10rem] top-[-9rem] h-[32rem] w-[32rem] rounded-full bg-fuchsia-300/25 blur-3xl" />
            <div className="absolute right-[-9rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-violet-300/35 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={14} />
                PDFMantra Smart PDF Workspace
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[5.25rem]">
                PDF tools that feel
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  cleaner, friendlier, and faster.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                Edit, highlight, sign, organize, and prepare documents without making the interface feel heavy or confusing.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/editor" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.28)] transition hover:-translate-y-0.5 hover:bg-violet-700">
                  Open PDF Editor
                  <ArrowRight size={17} />
                </Link>
                <Link href="/tools" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/90 px-7 py-3 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white">
                  Explore All Tools
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-slate-600">
                    <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-500" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[2.25rem] border border-violet-100 bg-white/90 p-5 shadow-[0_36px_110px_rgba(82,58,182,0.18)] backdrop-blur">
              <div className="rounded-[1.85rem] bg-gradient-to-br from-[#765cf1] via-[#7a5cff] to-[#a55cff] p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">Start here</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">What do you want to do?</h2>
                  </div>
                  <span className="rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">Easy flow</span>
                </div>

                <div className="mt-6 rounded-[1.6rem] bg-white p-5 text-slate-950 shadow-[0_18px_48px_rgba(47,30,120,0.18)]">
                  {starts.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link key={item.title} href={item.href} className="group flex items-center justify-between gap-5 border-b border-violet-100 py-5 transition last:border-b-0 hover:border-violet-200">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                            <Icon size={21} />
                          </div>
                          <div>
                            <div className="text-base font-semibold tracking-[-0.03em] text-slate-950 group-hover:text-violet-700">{item.title}</div>
                            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">{item.description}</p>
                          </div>
                        </div>
                        <ArrowRight size={18} className="shrink-0 text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-600" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/70">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">Built for clarity</p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-5xl">A PDF homepage should make the next click obvious.</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {["Task-first navigation", "Cleaner PDF workspaces", "Premium backend roadmap"].map((item) => (
                  <div key={item} className="rounded-[1.5rem] border border-violet-100 bg-white px-5 py-5 text-sm font-semibold leading-6 text-slate-700 shadow-[0_16px_40px_rgba(82,58,182,0.08)]">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-[#765cf1] via-[#7a5cff] to-[#a55cff] text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl" />
            <div className="absolute right-[-12rem] bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="mt-5 max-w-5xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-6xl">Friendly on the surface. Serious underneath.</h2>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-violet-50">The experience stays simple while the product grows toward advanced processing, saved workflows, and stronger premium features.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link href="/editor" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow-[0_18px_44px_rgba(43,25,122,0.24)] transition hover:-translate-y-0.5 hover:bg-violet-50">Start Editing<ArrowRight size={17} /></Link>
              <Link href="/tools" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20">View All Tools<ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
