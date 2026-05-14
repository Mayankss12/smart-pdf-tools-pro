import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Sparkles,
} from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 text-white shadow-lg shadow-indigo-200 transition group-hover:-translate-y-0.5">
            <div className="absolute inset-0 bg-white/10 opacity-0 transition group-hover:opacity-100" />
            <FileText size={21} className="relative" />
          </div>

          <div className="leading-tight">
            <div className="text-base font-semibold tracking-[-0.03em] text-slate-950">
              PDFMantra
            </div>
            <div className="text-xs font-medium text-slate-500">
              Smart PDF Workspace
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-slate-200/80 bg-white/80 p-1.5 text-sm font-medium text-slate-600 shadow-sm md:flex">
          <Link
            href="/#tools"
            className="rounded-full px-4 py-2 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            Tools
          </Link>

          <Link
            href="/#workspace"
            className="rounded-full px-4 py-2 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            Workspace
          </Link>

          <Link
            href="/#platform"
            className="rounded-full px-4 py-2 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            Web + Desktop
          </Link>

          <Link
            href="/#roadmap"
            className="rounded-full px-4 py-2 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            Roadmap
          </Link>
        </nav>

        <Link
          href="/editor"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-indigo-700"
        >
          <Sparkles size={15} />
          <span className="hidden sm:inline">Open Editor</span>
          <span className="sm:hidden">Editor</span>
          <ArrowRight size={15} className="hidden sm:block" />
        </Link>
      </div>
    </header>
  );
}
