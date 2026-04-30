import Link from "next/link";
import {
  ShieldCheck,
  Zap,
  Smartphone,
  FilePenLine,
  Signature,
  Minimize2,
  GitMerge,
  Scissors,
  Stamp,
  FileType,
  ImageUp,
  Layers,
} from "lucide-react";
import { Header } from "@/components/Header";

const popularTools = [
  { title: "Edit PDF", desc: "Add and edit text layers with precision controls.", icon: FilePenLine, href: "/editor" },
  { title: "Sign PDF", desc: "Place text or image signatures on any page.", icon: Signature, href: "/tools/fill-sign" },
  { title: "Compress PDF", desc: "Best-effort browser optimization for smaller files.", icon: Minimize2, href: "/tools/compress" },
  { title: "Merge PDF", desc: "Combine multiple PDFs in your preferred order.", icon: GitMerge, href: "/tools/merge" },
  { title: "Split PDF", desc: "Split by ranges or groups into separate files.", icon: Scissors, href: "/tools/split" },
  { title: "Watermark PDF", desc: "Add clean diagonal watermarks across pages.", icon: Stamp, href: "/tools/watermark" },
  { title: "PDF to Word", desc: "Conversion workflow coming soon in PDFMantra.", icon: FileType, href: "/tools" },
  { title: "Image to PDF", desc: "Turn JPG/PNG/WebP images into ordered PDFs.", icon: ImageUp, href: "/tools/images-to-pdf" },
];

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="bg-[#F8FAFC] text-[#0F172A]">
        <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Smart PDF Tools for Professionals</h1>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Edit, sign, compress, convert, watermark and manage PDFs in one clean workspace.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/editor" className="btn-primary">Upload PDF</Link>
              <Link href="/tools" className="btn-secondary">Explore Tools</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
              <span className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1"><ShieldCheck size={14} /> Secure Processing</span>
              <span className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1"><Zap size={14} /> Fast Tools</span>
              <span className="inline-flex items-center gap-1 rounded-full border bg-white px-3 py-1"><Smartphone size={14} /> Works on Any Device</span>
            </div>
          </div>

          <div className="rounded-3xl border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="rounded-3xl border-2 border-dashed border-[#2563EB]/35 bg-gradient-to-br from-blue-50 to-violet-50 p-12 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white">
                <Layers size={22} />
              </div>
              <p className="font-bold">Drop your PDF here</p>
              <p className="mt-1 text-sm text-slate-500">Drag & drop or click Upload PDF to start instantly.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="text-3xl font-bold">Popular Tools</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {popularTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link key={tool.title} href={tool.href} className="group rounded-3xl border border-[#E2E8F0] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white">
                    <Icon size={20} />
                  </div>
                  <h3 className="font-bold">{tool.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{tool.desc}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-[#2563EB]">Open Tool →</span>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="text-3xl font-bold">Categories</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {["Edit & Sign", "Convert", "Organize", "Optimize", "Security", "Business Tools"].map((item) => (
              <div key={item} className="rounded-2xl border bg-white px-4 py-3 font-semibold">{item}</div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <h2 className="text-3xl font-bold">Why PDF Mantra</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              "Fast Processing",
              "Secure File Handling",
              "Easy to Use",
              "Professional Workspace",
            ].map((item) => (
              <div key={item} className="rounded-3xl border bg-white p-5 shadow-sm">{item}</div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-12">
          <h2 className="text-3xl font-bold">Pricing Preview</h2>
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Free</h3>
              <p className="mt-2 text-slate-600">Essential tools, limited usage.</p>
            </div>
            <div className="rounded-3xl border-2 border-[#2563EB] bg-white p-6 shadow-md">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">Most Popular</span>
              <h3 className="mt-3 text-xl font-bold">Pro</h3>
              <p className="mt-2 text-slate-600">Saved signatures, higher limits, and bulk tools.</p>
            </div>
            <div className="rounded-3xl border bg-white p-6 shadow-sm">
              <h3 className="text-xl font-bold">Business</h3>
              <p className="mt-2 text-slate-600">Team workflows, advanced limits, and bulk processing.</p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
