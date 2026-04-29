import Link from "next/link";
import { Header } from "@/components/Header";
import { tools } from "@/lib/tools";
import { Upload, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-gradient-to-br from-brand-50 via-white to-slate-100">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-brand-700">
                <Sparkles size={16} /> Free-first PDF tools website
              </div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Edit, sign, merge and manage PDFs online.
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                A professional starter website for advanced PDF tools, built for your own company branding.
              </p>
              <div className="mt-8 flex gap-3">
                <Link href="/editor" className="btn-primary gap-2"><Upload size={18} /> Upload PDF</Link>
                <Link href="/tools" className="btn-secondary">View tools</Link>
              </div>
            </div>
            <div className="rounded-3xl border bg-white p-6 shadow-xl">
              <div className="rounded-2xl bg-slate-50 p-5">
                <div className="font-bold">PDF Editor Workspace</div>
                <div className="mt-5 min-h-[360px] rounded-xl border bg-white p-8">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="mt-5 h-3 rounded bg-slate-100" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-slate-100" />
                  <div className="mt-8 rounded-xl border-2 border-dashed border-brand-600/30 bg-brand-50 p-5 text-center text-brand-700">
                    Editable layer area
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <h2 className="text-3xl font-bold">Popular tools</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <Link href={tool.href} key={tool.name} className="tool-card">
                  <Icon className="mb-4 text-brand-600" />
                  <h3 className="font-bold">{tool.name}</h3>
                  <p className="mt-2 text-sm text-slate-600">{tool.desc}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
