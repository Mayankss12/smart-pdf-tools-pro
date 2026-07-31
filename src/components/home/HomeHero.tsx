import Link from "next/link";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";

export function HomeHero() {
  return (
    <section className="home-hero relative overflow-hidden border-b border-[var(--home-border)] bg-[var(--home-surface)]">
      <div className="home-hero-glow absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto flex min-h-[280px] max-w-[950px] flex-col items-center justify-center px-4 py-10 text-center sm:px-6 sm:py-12 lg:px-8">
        <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-violet-700">
          <Sparkles size={14} aria-hidden="true" />
          PDF tools, made simple
        </div>

        <h1 className="mt-4 text-[2.2rem] font-bold leading-[1.04] tracking-[-0.055em] text-slate-950 sm:text-[3.15rem] lg:text-[3.5rem]">
          Every PDF tool you need,
          <span className="text-violet-700"> in one place.</span>
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Edit, organize, convert, compress, sign and OCR PDFs online.
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/editor" className="btn-primary">
            Open PDF Editor
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <a href="#pdf-tools" className="btn-light">
            Browse PDF tools
            <ArrowDown size={16} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

