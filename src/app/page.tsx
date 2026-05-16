import Link from "next/link";
import { Header } from "@/components/Header";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Highlighter,
  Images,
  Layers3,
  MousePointer2,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const quickActions = [
  {
    title: "Edit a PDF",
    description: "Add text, images, signatures, and export your file.",
    href: "/editor",
    icon: FileText,
    status: "Beta",
  },
  {
    title: "Highlight PDF",
    description: "Mark important content with the new smart highlight tool.",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
    status: "New",
  },
  {
    title: "Find a tool",
    description: "Browse merge, split, convert, compress, OCR, and more.",
    href: "/tools",
    icon: Search,
    status: "Tools",
  },
] as const;

const popularTools = [
  {
    title: "Merge PDF",
    description: "Combine PDFs into one clean file.",
    href: "/tools/merge",
    icon: Layers3,
  },
  {
    title: "Images to PDF",
    description: "Turn images into a PDF document.",
    href: "/tools/images-to-pdf",
    icon: Images,
  },
  {
    title: "Compress PDF",
    description: "Reduce file size with backend-grade processing later.",
    href: "/tools/compress",
    icon: Wand2,
  },
] as const;

const principles = [
  {
    title: "Easy first click",
    description:
      "The homepage keeps the main actions visible so users do not feel lost.",
    icon: MousePointer2,
  },
  {
    title: "Clean workspaces",
    description:
      "Each tool should feel focused, calm, and simple to complete.",
    icon: CheckCircle2,
  },
  {
    title: "Serious roadmap",
    description:
      "OCR, compression, conversion, security, and saved files can grow on backend architecture.",
    icon: ShieldCheck,
  },
] as const;

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/80">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-14rem] top-[-12rem] h-[38rem] w-[38rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-15rem] top-[-8rem] h-[36rem] w-[36rem] rounded-full bg-fuchsia-200/45 blur-3xl" />
            <div className="absolute bottom-[-18rem] left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-indigo-100/60 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-12 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={14} />
                PDFMantra workspace
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.95] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-[5.05rem]">
                Simple PDF tools for
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  everyday document work.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                Edit, highlight, sign, organize, and prepare PDFs in a cleaner
                workspace that feels friendly first and powerful when you need it.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/editor"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-violet-600 px-7 py-3 text-sm font-semibold text-white shadow-[0_20px_48px_rgba(91,63,193,0.24)] transition hover:-translate-y-0.5 hover:bg-violet-700"
                >
                  Start editing
                  <ArrowRight size={17} />
                </Link>

                <Link
                  href="/tools"
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-violet-200 bg-white/90 px-7 py-3 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-violet-300 hover:bg-white"
                >
                  See all tools
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-violet-100 bg-white/85 p-5 shadow-[0_30px_90px_rgba(91,63,193,0.14)] backdrop-blur">
              <div className="rounded-[1.6rem] bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-500 p-5 text-white">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100">
                      Quick start
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
                      What do you want to do?
                    </h2>
                  </div>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    No clutter
                  </span>
                </div>

                <div className="mt-6 overflow-hidden rounded-[1.35rem] bg-white text-slate-950 shadow-[0_18px_48px_rgba(47,30,120,0.16)]">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.title}
                        href={item.href}
                        className="group flex items-center justify-between gap-5 border-b border-violet-100 px-5 py-5 transition last:border-b-0 hover:bg-violet-50/70"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                            <Icon size={21} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-semibold tracking-[-0.03em] text-slate-950 group-hover:text-violet-700">
                                {item.title}
                              </span>
                              <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                                {item.status}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                              {item.description}
                            </p>
                          </div>
                        </div>
                        <ArrowRight
                          size={18}
                          className="shrink-0 text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                        />
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/75">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Popular work
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-5xl">
                  Keep common tasks one click away.
                </h2>
                <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  The homepage should feel light. Important tools are surfaced,
                  but the page does not overwhelm users with a giant grid.
                </p>
              </div>

              <div className="overflow-hidden rounded-[1.6rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
                {popularTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <Link
                      key={tool.title}
                      href={tool.href}
                      className="group flex items-center justify-between gap-5 border-b border-violet-100 px-5 py-5 transition last:border-b-0 hover:bg-violet-50/70"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                          <Icon size={19} />
                        </div>
                        <div>
                          <div className="text-base font-semibold tracking-[-0.03em] text-slate-950 group-hover:text-violet-700">
                            {tool.title}
                          </div>
                          <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                      <ArrowRight
                        size={17}
                        className="text-violet-300 transition group-hover:translate-x-1 group-hover:text-violet-600"
                      />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#faf9ff]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-5 md:grid-cols-3">
              {principles.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="rounded-[1.6rem] border border-violet-100 bg-white p-6 shadow-[0_16px_42px_rgba(91,63,193,0.07)]"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                      <Icon size={21} />
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-500 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl" />
            <div className="absolute right-[-12rem] bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-white/10 blur-3xl" />
          </div>
          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-18">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl">
                Friendly on the surface. Serious underneath.
              </h2>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-violet-50">
                The experience stays simple while the product grows toward OCR,
                compression, conversion, saved workflows, and secure backend processing.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/editor"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow-[0_18px_44px_rgba(43,25,122,0.22)] transition hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Start editing
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                View all tools
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
