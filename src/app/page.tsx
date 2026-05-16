import Link from "next/link";
import { Header } from "@/components/Header";
import { BrandMark } from "@/components/BrandMark";
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Highlighter,
  Images,
  Layers3,
  PenLine,
  Search,
  ShieldCheck,
  Sparkles,
  Wand2,
} from "lucide-react";

const gridTools = [
  {
    title: "Edit PDF",
    description: "Add text, images, notes, signatures, and export in one workspace.",
    href: "/editor",
    icon: FileText,
    marker: "Beta",
  },
  {
    title: "Highlight PDF",
    description: "Snap highlights to text or mark scanned areas cleanly.",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
    marker: "New",
  },
  {
    title: "Sign PDF",
    description: "Place signatures directly in the editor workflow.",
    href: "/editor",
    icon: PenLine,
    marker: "Editor",
  },
  {
    title: "Merge PDF",
    description: "Combine documents into a single guided output flow.",
    href: "/tools/merge",
    icon: Layers3,
    marker: "Soon",
  },
  {
    title: "Images to PDF",
    description: "Turn product shots, scans, and screenshots into PDFs.",
    href: "/tools/images-to-pdf",
    icon: Images,
    marker: "Soon",
  },
  {
    title: "Compress PDF",
    description: "Prepare a backend-grade file size reduction experience.",
    href: "/tools/compress",
    icon: Wand2,
    marker: "Roadmap",
  },
] as const;

const workflowLanes = [
  {
    number: "01",
    title: "Choose a task",
    description: "Open the exact tool instead of searching through a cluttered homepage.",
  },
  {
    number: "02",
    title: "Work in focus",
    description: "Each page keeps the file, controls, and next action easy to understand.",
  },
  {
    number: "03",
    title: "Export with confidence",
    description: "Browser-first tools now, backend-grade processing where reliability matters.",
  },
] as const;

const productSignals = [
  "Original PDFMantra visual identity",
  "Friendly grid-led tool discovery",
  "Advanced engine roadmap without a noisy interface",
] as const;

const platformRows = [
  {
    label: "Workspace",
    title: "Editor, signing, and smart highlighting",
    description: "Fast visual actions that should feel immediate and approachable.",
  },
  {
    label: "Processing",
    title: "Compression, OCR, conversion, security",
    description: "Heavier workflows prepared for backend infrastructure and cleaner completion states.",
  },
  {
    label: "Direction",
    title: "Web first, desktop later",
    description: "One PDFMantra system that can scale across product surfaces.",
  },
] as const;

function GridToolCell({
  title,
  description,
  href,
  icon: Icon,
  marker,
}: (typeof gridTools)[number]) {
  return (
    <Link
      href={href}
      className="group grid min-h-[180px] grid-rows-[auto_1fr_auto] border-b border-r border-violet-100 bg-white/45 px-5 py-5 transition duration-200 hover:bg-white/90 md:min-h-[196px] lg:px-6 lg:py-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 transition duration-200 group-hover:bg-violet-600 group-hover:text-white">
          <Icon size={20} />
        </div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-500">
          {marker}
        </span>
      </div>

      <div className="mt-5">
        <h3 className="text-xl font-semibold tracking-[-0.04em] text-slate-950 transition group-hover:text-violet-700">
          {title}
        </h3>
        <p className="mt-2 max-w-[22rem] text-sm font-medium leading-6 text-slate-600">
          {description}
        </p>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-violet-700">
        Open flow
        <ArrowRight size={16} className="transition duration-200 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main className="min-h-screen bg-[#faf9ff] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-12rem] h-[40rem] w-[40rem] rounded-full bg-violet-200/55 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[38rem] w-[38rem] rounded-full bg-fuchsia-200/55 blur-3xl" />
            <div className="absolute bottom-[-22rem] left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-indigo-100/65 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-center lg:px-8 lg:pb-20 lg:pt-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={14} />
                PDFMantra Smart PDF Platform
              </div>

              <h1 className="mt-6 max-w-5xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] text-slate-950 sm:text-6xl lg:text-[5.4rem]">
                PDF work,
                <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
                  arranged with clarity.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base font-medium leading-8 text-slate-600 sm:text-lg">
                PDFMantra should feel easier than a giant tool catalog. Start from a
                clear action, move through a focused workspace, and build toward
                powerful processing without losing simplicity.
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
                  Browse tools
                  <ArrowRight size={17} />
                </Link>
              </div>

              <div className="mt-8 grid gap-3 border-t border-violet-100 pt-5 sm:grid-cols-3">
                {productSignals.map((signal) => (
                  <div key={signal} className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-slate-600">
                    <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-500" />
                    <span>{signal}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[520px] overflow-hidden rounded-[2.5rem] border border-violet-100 bg-white/72 shadow-[0_36px_110px_rgba(82,58,182,0.18)] backdrop-blur">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_16%,rgba(255,255,255,0.92),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(233,213,255,0.82),transparent_30%),linear-gradient(135deg,rgba(124,92,255,0.16),rgba(255,255,255,0.75))]" />

              <div className="relative grid h-full grid-rows-[auto_1fr_auto] p-6 sm:p-7">
                <div className="flex items-center justify-between gap-4 border-b border-violet-100 pb-5">
                  <div className="flex items-center gap-4">
                    <BrandMark className="h-16 w-16 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-600">
                        New mark
                      </p>
                      <h2 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-slate-950">
                        Document + engine
                      </h2>
                    </div>
                  </div>
                  <span className="hidden rounded-full border border-violet-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-violet-700 sm:inline-flex">
                    Original PDFMantra
                  </span>
                </div>

                <div className="grid gap-0 border-l border-t border-violet-100 md:grid-cols-2">
                  {[
                    "Edit",
                    "Highlight",
                    "Convert",
                    "Secure",
                  ].map((label, index) => (
                    <div
                      key={label}
                      className="flex min-h-[116px] items-end border-b border-r border-violet-100 p-4 sm:p-5"
                    >
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-500">
                          0{index + 1}
                        </div>
                        <div className="mt-2 text-2xl font-semibold tracking-[-0.045em] text-slate-950">
                          {label}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between gap-4 border-t border-violet-100 pt-5 text-sm font-semibold text-slate-600">
                  <span>Grid-led navigation. Less clutter. More direction.</span>
                  <Link href="/tools" className="inline-flex items-center gap-2 text-violet-700 transition hover:text-violet-900">
                    View system
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/76">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Direct tool grid
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  Start from the tool you actually need.
                </h2>
              </div>
              <p className="max-w-2xl text-sm font-medium leading-7 text-slate-600 sm:text-base lg:justify-self-end">
                I reviewed the usual PDF-tool homepage pattern — direct task entry,
                visible utility, clear CTAs — and rebuilt this around PDFMantra’s own
                cleaner grid system rather than copying anyone’s layout. citeturn2search0turn2search1turn2search2turn2search3
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[2rem] border border-violet-100 bg-white/75 shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
              <div className="grid border-l border-t border-violet-100 md:grid-cols-2 xl:grid-cols-3">
                {gridTools.map((tool) => (
                  <GridToolCell key={tool.title} {...tool} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-[#faf9ff]">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Workflow logic
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  A cleaner homepage needs a clearer story.
                </h2>
                <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-slate-600 sm:text-base">
                  Instead of a card-heavy brochure, this homepage explains the product
                  through a left-to-right workflow and a structured grid.
                </p>
              </div>

              <div className="grid border-l border-t border-violet-100 bg-white/72 md:grid-cols-3">
                {workflowLanes.map((item) => (
                  <div
                    key={item.number}
                    className="min-h-[240px] border-b border-r border-violet-100 px-5 py-6 sm:px-6"
                  >
                    <div className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-500">
                      {item.number}
                    </div>
                    <h3 className="mt-8 text-2xl font-semibold tracking-[-0.045em] text-slate-950">
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm font-medium leading-7 text-slate-600">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-violet-100 bg-white/78">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[0.74fr_1.26fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-600">
                  Platform map
                </p>
                <h2 className="mt-3 text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-slate-950 sm:text-5xl">
                  What PDFMantra is growing into.
                </h2>
              </div>

              <div className="border-t border-violet-100">
                {platformRows.map((row) => (
                  <div
                    key={row.label}
                    className="grid gap-3 border-b border-violet-100 py-5 md:grid-cols-[160px_1fr] md:gap-6"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                      {row.label}
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.045em] text-slate-950">
                        {row.title}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-slate-600">
                        {row.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-gradient-to-br from-violet-500 via-violet-600 to-fuchsia-500 text-white">
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-[-10rem] top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-white/20 blur-3xl" />
            <div className="absolute right-[-12rem] bottom-[-10rem] h-[34rem] w-[34rem] rounded-full bg-white/10 blur-3xl" />
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                <ShieldCheck size={14} />
                PDFMantra direction
              </div>
              <h2 className="mt-5 max-w-4xl text-4xl font-semibold leading-[0.98] tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">
                Friendly entry. Serious document engine.
              </h2>
              <p className="mt-4 max-w-3xl text-base font-medium leading-8 text-violet-50">
                The homepage now reads faster, routes users better, and leaves room for
                the deeper backend work PDFMantra is moving toward.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/editor"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-violet-700 shadow-[0_18px_44px_rgba(43,25,122,0.22)] transition hover:-translate-y-0.5 hover:bg-violet-50"
              >
                Open editor
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/tools"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/12 px-7 py-3 text-sm font-semibold text-white backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                Browse tool grid
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
