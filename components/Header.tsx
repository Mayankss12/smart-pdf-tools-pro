import Link from "next/link";
import { FileText } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white shadow-sm">
            <FileText size={22} />
          </div>
          <div>
            <div className="font-extrabold text-[#0F172A]">PDFMantra</div>
            <div className="text-xs text-slate-500">Smart PDF Workspace</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 md:flex">
          <Link href="/tools" className="hover:text-[#2563EB]">Tools</Link>
          <Link href="/pricing" className="hover:text-[#2563EB]">Pricing</Link>
          <Link href="/dashboard" className="hover:text-[#2563EB]">Login</Link>
          <Link href="/editor" className="rounded-xl bg-gradient-to-r from-[#2563EB] to-[#7C3AED] px-4 py-2 text-white shadow-sm">Get Started</Link>
        </nav>
      </div>
    </header>
  );
}
