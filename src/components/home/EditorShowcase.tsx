import Link from "next/link";
import {
  ArrowRight,
  FilePlus2,
  Highlighter,
  Image,
  MousePointer2,
  PenLine,
  RotateCw,
  Search,
  Shapes,
  Type,
  Undo2,
} from "lucide-react";

const EDITOR_FEATURES = [
  "Add and edit text",
  "Images and signatures",
  "Highlight, draw, whiteout, shapes and notes",
  "Add, reorder and rotate pages",
  "Page numbering",
  "OCR and Find",
  "Atomic Undo and Redo",
  "Export in one workspace",
] as const;

const RIBBON_TOOLS = [
  { label: "Select", icon: MousePointer2 },
  { label: "Text", icon: Type },
  { label: "Image", icon: Image },
  { label: "Sign", icon: PenLine },
  { label: "Highlight", icon: Highlighter },
  { label: "Shape", icon: Shapes },
  { label: "Add", icon: FilePlus2 },
  { label: "Rotate", icon: RotateCw },
  { label: "Undo", icon: Undo2 },
] as const;

function EditorProductMock() {
  return (
    <div
      className="home-editor-mock overflow-hidden rounded-[1.35rem] border border-slate-700 bg-[#181922] shadow-[0_24px_64px_rgba(16,17,24,0.20)]"
      aria-label="Presentational preview of the PDFMantra Editor"
      role="img"
    >
      <div className="flex items-center justify-between border-b border-white/10 bg-[#242530] px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">
          PDFMantra Editor
        </span>
        <span className="rounded-full bg-emerald-400/12 px-2 py-1 text-[9px] font-bold uppercase text-emerald-300">
          Saved
        </span>
      </div>

      <div className="flex gap-px overflow-x-auto border-b border-white/10 bg-white/5 p-2 [scrollbar-width:none]">
        {RIBBON_TOOLS.map(({ label, icon: Icon }, index) => (
          <div
            key={label}
            className={`flex min-w-[54px] flex-col items-center gap-1 rounded-lg px-2 py-2 text-[8px] font-bold ${
              index === 1
                ? "bg-violet-500 text-white"
                : "text-white/60"
            }`}
          >
            <Icon size={14} />
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-h-[410px] grid-cols-[56px_minmax(0,1fr)] sm:grid-cols-[82px_minmax(320px,1fr)_150px]">
        <div className="border-r border-white/10 bg-[#20212b] p-2">
          {[1, 2, 3].map((page) => (
            <div
              key={page}
              className={`mb-2 aspect-[0.72] rounded-md bg-white p-1 ${
                page === 2 ? "ring-2 ring-violet-400" : "opacity-65"
              }`}
            >
              <div className="h-1 w-2/3 rounded bg-slate-200" />
              <div className="mt-1 h-0.5 w-full rounded bg-slate-100" />
              <div className="mt-1 h-0.5 w-4/5 rounded bg-slate-100" />
            </div>
          ))}
        </div>

        <div className="home-editor-canvas flex items-center justify-center overflow-hidden bg-[#30313c] p-5">
          <div className="relative aspect-[0.72] h-[350px] max-h-[88%] bg-white p-7 shadow-2xl sm:h-[380px]">
            <div className="h-2 w-2/3 rounded bg-slate-900" />
            <div className="mt-3 h-1 w-full rounded bg-slate-200" />
            <div className="mt-1.5 h-1 w-[92%] rounded bg-slate-200" />
            <div className="mt-1.5 h-1 w-[78%] rounded bg-slate-200" />

            <div className="absolute left-[14%] top-[28%] w-[72%] border-2 border-violet-500 bg-violet-50/70 p-2 shadow-[0_0_0_3px_rgba(139,92,246,0.12)]">
              <p className="text-[8px] font-bold !text-violet-900">
                Quarterly review — approved copy
              </p>
              <span className="absolute -right-1.5 -top-1.5 h-3 w-3 rounded-sm border border-white bg-violet-500" />
              <span className="absolute -bottom-1.5 -left-1.5 h-3 w-3 rounded-sm border border-white bg-violet-500" />
            </div>

            <div className="absolute left-[14%] top-[48%] h-2 w-[55%] -rotate-1 bg-amber-300/70" />
            <div className="absolute bottom-[18%] right-[13%] h-14 w-20 rotate-2 rounded border border-slate-200 bg-blue-50 p-2">
              <div className="h-1 w-3/4 rounded bg-blue-200" />
              <div className="mt-1 h-1 w-full rounded bg-blue-100" />
            </div>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[7px] font-bold text-slate-400">
              2 / 3
            </div>
          </div>
        </div>

        <div className="hidden border-l border-white/10 bg-[#20212b] p-3 sm:block">
          <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.1em] text-white/55">
            <Search size={12} />
            Find
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-[9px] text-white/70">
            approved
          </div>
          <div className="mt-3 text-[8px] font-bold text-violet-300">
            3 results
          </div>
          {[1, 2, 3].map((result) => (
            <div
              key={result}
              className={`mt-2 rounded-lg p-2 text-[8px] leading-4 ${
                result === 1
                  ? "bg-violet-500/20 text-violet-200"
                  : "bg-white/5 text-white/45"
              }`}
            >
              Page {result} · approved…
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EditorShowcase() {
  return (
    <section className="home-section-alt overflow-hidden border-y border-[var(--home-border)] py-16 sm:py-24">
      <div className="mx-auto grid max-w-[1320px] gap-10 px-4 sm:px-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-center lg:px-8">
        <div>
          <p className="section-eyebrow">More than a collection of tools</p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-0.05em] text-slate-950 sm:text-5xl">
            One editor for the whole document.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-8 text-slate-600">
            Work across content, pages, OCR and review without bouncing between
            disconnected screens.
          </p>

          <div className="mt-7 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            {EDITOR_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-2.5 text-sm font-semibold leading-6 text-slate-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-600" />
                {feature}
              </div>
            ))}
          </div>

          <Link href="/editor" className="btn-primary mt-8">
            Open PDF Editor
            <ArrowRight size={16} />
          </Link>
        </div>

        <EditorProductMock />
      </div>
    </section>
  );
}
