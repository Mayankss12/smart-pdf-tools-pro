import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-200">
            <FileText size={20} />
          </div>
          <div className="leading-tight">
            <div className="text-base font-semibold tracking-[-0.02em] text-slate-950">
              PDFMantra
            </div>
            <div className="text-xs font-medium text-slate-500">
              Smart PDF Workspace
            </div>
          </div>
        </Link>

        {/* Desktop nav — only link to pages that exist */}
        <nav className="hidden items-center gap-1 text-sm font-medium text-slate-600 md:flex">
          <Link
            href="/#tools"
            className="rounded-xl px-3 py-2 transition hover:bg-slate-100 hover:text-indigo-700"
          >
            Tools
          </Link>
          <Link
            href="/editor"
            className="ml-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:-translate-y-0.5 hover:bg-indigo-700 hover:shadow-md"
          >
            <Sparkles size={15} />
            Open Editor
          </Link>
        </nav>

        {/* Mobile CTA */}
        <Link
          href="/editor"
          className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 md:hidden"
        >
          Editor
        </Link>
      </div>
    </header>
  );
}
