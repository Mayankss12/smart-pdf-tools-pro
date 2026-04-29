import Link from "next/link";
import { FileText } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white">
            <FileText size={22} />
          </div>
          <div>
            <div className="font-bold">Mayank PDF Tools</div>
            <div className="text-xs text-slate-500">Smart document editor</div>
          </div>
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold md:flex">
          <Link href="/tools">Tools</Link>
          <Link href="/editor">PDF Editor</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/dashboard">Dashboard</Link>
        </nav>
        <Link href="/editor" className="btn-primary px-4 py-2">Start</Link>
      </div>
    </header>
  );
}
