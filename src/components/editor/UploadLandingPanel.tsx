"use client";

import {
  FileText,
  Highlighter,
  PenLine,
  Type,
  Upload,
} from "lucide-react";

type UploadLandingPanelProps = {
  busy?: boolean;
  onBrowseClick: () => void;
  onFileDrop: (file?: File) => void;
};

const featureItems = [
  {
    label: "Add text",
    icon: Type,
  },
  {
    label: "Highlight PDFs",
    icon: Highlighter,
  },
  {
    label: "Sign documents",
    icon: PenLine,
  },
];

export function UploadLandingPanel({
  busy = false,
  onBrowseClick,
  onFileDrop,
}: UploadLandingPanelProps) {
  return (
    <section className="flex min-h-[calc(100vh-74px)] items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-sky-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-indigo-700 shadow-sm">
            <FileText size={14} />
            PDFMantra Editor
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-[-0.055em] text-slate-950 sm:text-5xl">
            Upload a PDF and start editing.
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
            Add text, highlights, images, and signatures in a focused editor
            workspace built to feel fast and easy from the first click.
          </p>
        </div>

        <div
          onDrop={(event) => {
            event.preventDefault();
            onFileDrop(event.dataTransfer.files?.[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
          className="rounded-[2rem] border-2 border-dashed border-indigo-200 bg-white/90 p-5 shadow-[0_30px_90px_rgba(79,70,229,0.12)] backdrop-blur sm:p-7"
        >
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.55rem] bg-gradient-to-br from-indigo-50 via-white to-amber-50 px-5 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-indigo-700 text-white shadow-xl shadow-indigo-200">
              <Upload size={28} />
            </div>

            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em] text-slate-950">
              Drop your PDF here
            </h2>

            <p className="mt-2 text-sm font-semibold text-slate-500">
              or click below to browse from your device
            </p>

            <button
              type="button"
              onClick={onBrowseClick}
              disabled={busy}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-6 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              <Upload size={18} />
              {busy ? "Preparing..." : "Upload PDF"}
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {featureItems.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.label}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm"
              >
                <Icon size={16} className="text-indigo-600" />
                {feature.label}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
