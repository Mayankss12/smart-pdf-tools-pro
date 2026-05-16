import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowRight, BadgeCheck, Monitor, Sparkles, Wand2 } from "lucide-react";

const desktopSignals = [
  "Web platform first",
  "Desktop app later",
  "Shared PDFMantra design system",
] as const;

export default function DesktopPage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--pm-bg)] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={13} />
                Future PDFMantra Desktop App
              </div>

              <h1 className="display-font mt-5 max-w-5xl text-[2.45rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[3.1rem] lg:text-[3.55rem]">
                Desktop comes after
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                  the website feels complete.
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                The current focus is the live web product, stronger editing workflows, and backend-ready PDF processing. Once that foundation is stable, PDFMantra Desktop can extend the same system beautifully.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(91,63,193,0.32)]"
                >
                  Open Editor
                  <ArrowRight size={16} />
                </Link>

                <Link
                  href="/tools"
                  className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-violet-200 bg-[#fffdf8]/92 px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                >
                  Explore Tools
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-7 grid gap-3 border-t border-violet-100 pt-5 sm:grid-cols-3">
                {desktopSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2.5 text-[13px] font-semibold leading-6 text-slate-600">
                    <BadgeCheck size={15} className="mt-1 shrink-0 text-emerald-500" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/84 shadow-[0_24px_70px_rgba(91,63,193,0.11)] backdrop-blur">
              <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50/75 via-[#fffdf8] to-rose-50/55 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-violet-100 bg-[#fffdf8] text-violet-700 shadow-sm">
                    <Monitor size={25} />
                  </div>
                  <span className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-rose-500">
                    Roadmap
                  </span>
                </div>

                <h2 className="display-font mt-5 text-[1.95rem] font-medium tracking-[-0.04em] text-slate-950">
                  Desktop design promise
                </h2>
                <p className="mt-2 text-sm font-medium leading-7 text-slate-600">
                  Same cream-violet PDFMantra system, adapted for power workflows and local productivity.
                </p>
              </div>

              <div className="grid border-l border-t border-violet-100 sm:grid-cols-2">
                {[
                  "Offline-friendly editing",
                  "Local batch workflows",
                  "Power-user shortcuts",
                  "Shared cloud-ready identity",
                ].map((item, index) => (
                  <div
                    key={item}
                    className="min-h-[128px] border-b border-r border-violet-100 bg-[#fffdf8]/66 px-5 py-5 transition hover:bg-white"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-rose-500">
                      0{index + 1}
                    </div>
                    <div className="mt-4 text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                      {item}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 border-t border-violet-100 bg-violet-50/36 px-6 py-4 text-sm font-semibold text-violet-800">
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
