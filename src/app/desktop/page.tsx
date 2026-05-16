import Link from "next/link";
import { Header } from "@/components/Header";
import { ArrowRight, Monitor, Sparkles } from "lucide-react";

export default function DesktopPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-[#faf8ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-14rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/70 blur-3xl" />
            <div className="absolute right-[-14rem] top-[-8rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/65 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 lg:px-8 lg:py-28">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/88 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
              <Sparkles size={14} />
              Future PDFMantra Desktop App
            </div>

            <div className="mx-auto mt-8 flex h-20 w-20 items-center justify-center rounded-[1.8rem] border border-violet-100 bg-white/92 text-violet-700 shadow-[0_20px_60px_rgba(91,63,193,0.16)]">
              <Monitor size={34} />
            </div>

            <h1 className="display-font mx-auto mt-8 max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.055em] text-slate-950 sm:text-6xl">
              PDFMantra Desktop will come after the web platform is ready.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
              The current focus is the live website, stronger editing workflows, and backend-ready PDF processing. The desktop app stays on the roadmap.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/editor"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-violet-600 to-rose-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.24)] transition hover:-translate-y-0.5"
              >
                Open Editor
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/92 px-7 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300"
              >
                Explore Tools
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
