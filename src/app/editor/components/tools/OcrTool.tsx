"use client";

import { AlertCircle, Loader2, ScanText, X } from "lucide-react";
import { useState } from "react";

export type OcrOptions = {
  readonly language: string;
  readonly pages: "all";
  readonly output: "searchable-pdf";
};

export type OcrProgress = {
  readonly currentPage: number;
  readonly totalPages: number;
  readonly message: string;
};

type OcrToolProps = {
  readonly open: boolean;
  readonly fileName?: string;
  readonly totalPages?: number;
  readonly onClose: () => void;
  readonly onStartOcr: (
    options: OcrOptions,
    progress: (nextProgress: OcrProgress) => void,
  ) => void | Promise<void>;
};

export function OcrTool({
  open,
  fileName,
  totalPages,
  onClose,
  onStartOcr,
}: OcrToolProps) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<OcrProgress>({
    currentPage: 0,
    totalPages: totalPages || 1,
    message: "Ready to check OCR.",
  });

  async function handleStart() {
    setRunning(true);
    setError("");

    try {
      await onStartOcr(
        {
          language: "eng",
          pages: "all",
          output: "searchable-pdf",
        },
        setProgress,
      );
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "OCR could not be completed.",
      );
    } finally {
      setRunning(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <ScanText size={24} />
            </div>

            <h2 className="mt-4 text-2xl font-black tracking-[-0.04em] text-slate-950">
              OCR scanned PDF
            </h2>

            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
              OCR UI is ready, but scanned PDF OCR needs backend wiring before searchable PDF export.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close OCR panel"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            Current file
          </div>
          <div className="mt-2 text-sm font-black text-slate-800">
            {fileName || "Untitled PDF"}
          </div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            {totalPages || 1} page{(totalPages || 1) === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
          <div className="text-sm font-black text-violet-800">
            {progress.message}
          </div>
        </div>

        {error ? (
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-800">
            <AlertCircle className="mt-0.5 shrink-0" size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleStart}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {running ? <Loader2 className="animate-spin" size={17} /> : null}
            {running ? "Checking OCR..." : "Start OCR"}
          </button>
        </div>
      </div>
    </div>
  );
}