"use client";

import { useEffect, useRef, useState } from "react";
import {
  Brain,
  CheckCircle2,
  Download,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  StopCircle,
  Upload,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { formatFileSize, safeFileBaseName } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import {
  createSearchablePdf,
  type SearchablePdfProgress,
} from "@/lib/conversions/searchable-pdf-engine";
import type {
  OcrLanguage,
  OcrQuality,
} from "@/lib/pdf-ocr-engine";

type TargetMode = "all" | "current";

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return blob.size;
}

export default function OcrPdfPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { recordExport } = useEntitlement();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [language, setLanguage] = useState<OcrLanguage>("auto");
  const [quality, setQuality] = useState<OcrQuality>("balanced");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    "Upload a scanned PDF to add searchable text.",
  );
  const [progress, setProgress] = useState<SearchablePdfProgress | null>(null);
  const [result, setResult] = useState<{
    outputSize: number;
    ocrPages: number;
    wordCount: number;
  } | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function selectFile(selected: File | undefined) {
    if (!selected) return;
    setStatus("Validating PDF...");
    setResult(null);
    try {
      const bytes = await readValidatedPdfBytes(selected);
      const pdf = await PDFDocument.load(bytes);
      if (!pdf.getPageCount()) throw new Error("This PDF contains no pages.");
      setFile(selected);
      setPageCount(pdf.getPageCount());
      setCurrentPage(1);
      setStatus(
        `${selected.name} is ready with ${pdf.getPageCount()} page${pdf.getPageCount() === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setStatus(
        error instanceof Error
          ? error.message
          : "This PDF is encrypted, damaged, or unsupported.",
      );
    }
  }

  async function convert() {
    if (!file || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setResult(null);
    setProgress(null);

    try {
      const prepared = await prepareEntitledExport({
        toolKey: "ocr",
        recordExport,
        prepare: () =>
          createSearchablePdf(file, {
            targetPages:
              targetMode === "all"
                ? Array.from({ length: pageCount }, (_, index) => index + 1)
                : [currentPage],
            language,
            quality,
            signal: controller.signal,
            onProgress(next) {
              setProgress(next);
              setStatus(next.message);
            },
          }),
      });

      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }

      const outputSize = downloadPdf(
        prepared.output.bytes,
        `PDFMantra-searchable-${safeFileBaseName(file.name)}.pdf`,
      );
      setResult({
        outputSize,
        ocrPages: prepared.output.ocrPageCount,
        wordCount: prepared.output.wordCount,
      });
      setStatus(
        `Searchable PDF created with ${prepared.output.wordCount} recognized word${prepared.output.wordCount === 1 ? "" : "s"}. Download started.`,
      );
    } catch (error) {
      setProgress(null);
      setStatus(
        controller.signal.aborted
          ? "OCR cancelled. The source PDF was not changed."
          : error instanceof Error
            ? error.message
            : "Unable to create a searchable PDF.",
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setPageCount(0);
    setResult(null);
    setProgress(null);
    setStatus("Upload a scanned PDF to add searchable text.");
  }

  const progressPercent = progress
    ? Math.round((progress.completed / Math.max(1, progress.total)) * 100)
    : 0;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Brain size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PDF to Searchable PDF</h1>
              <p className="text-sm text-slate-500">
                Preserve page visuals and add an invisible OCR text layer.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  void selectFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 disabled:opacity-50"
              >
                <Upload className="text-violet-600" size={36} />
                <span className="mt-4 text-lg font-bold">
                  {file ? "Replace PDF" : "Choose a PDF"}
                </span>
                <span className="mt-2 text-sm font-medium text-slate-500">
                  Browser OCR · valid PDF · up to 80 MB
                </span>
              </button>

              {file ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <div className="truncate text-sm font-bold">{file.name}</div>
                  <div className="text-sm font-semibold">
                    {formatFileSize(file.size)}
                  </div>
                  <div className="text-sm font-semibold">{pageCount} pages</div>
                </div>
              ) : null}

              {progress ? (
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex justify-between text-sm font-bold text-violet-800">
                    <span className="capitalize">{progress.stage}</span>
                    <span>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold leading-6 text-violet-800">
                {status}
              </div>

              {result ? (
                <div className="mt-4 flex flex-wrap gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 size={18} /> Completed
                  </span>
                  <span>{result.ocrPages} OCR pages</span>
                  <span>{result.wordCount} words</span>
                  <span>{formatFileSize(result.outputSize)}</span>
                </div>
              ) : null}
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">OCR settings</h2>
              <label className="mt-4 block text-xs font-bold text-slate-500">
                Pages
                <select
                  value={targetMode}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (value === "all" || value === "current") {
                      setTargetMode(value);
                    }
                  }}
                  disabled={busy}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="all">All pages</option>
                  <option value="current">One page</option>
                </select>
              </label>
              {targetMode === "current" ? (
                <label className="mt-3 block text-xs font-bold text-slate-500">
                  Page number
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, pageCount)}
                    value={currentPage}
                    onChange={(event) =>
                      setCurrentPage(
                        Math.max(
                          1,
                          Math.min(pageCount || 1, Number(event.target.value)),
                        ),
                      )
                    }
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
              ) : null}
              <label className="mt-3 block text-xs font-bold text-slate-500">
                Language
                <select
                  value={language}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "auto" ||
                      value === "eng" ||
                      value === "hin" ||
                      value === "spa" ||
                      value === "fra" ||
                      value === "deu" ||
                      value === "ara"
                    ) {
                      setLanguage(value);
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="auto">Auto detect</option>
                  <option value="eng">English</option>
                  <option value="hin">Hindi</option>
                  <option value="spa">Spanish</option>
                  <option value="fra">French</option>
                  <option value="deu">German</option>
                  <option value="ara">Arabic</option>
                </select>
              </label>
              <label className="mt-3 block text-xs font-bold text-slate-500">
                Quality
                <select
                  value={quality}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "fast" ||
                      value === "balanced" ||
                      value === "high"
                    ) {
                      setQuality(value);
                    }
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                >
                  <option value="fast">Fast</option>
                  <option value="balanced">Balanced</option>
                  <option value="high">High</option>
                </select>
              </label>

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-6 text-emerald-800">
                <ShieldCheck className="mb-2" size={18} />
                Your file stays in your browser. Existing page visuals are preserved.
              </div>

              {busy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600"
                >
                  <StopCircle size={17} /> Cancel OCR
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void convert()}
                  disabled={!file}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {busy ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  Create searchable PDF
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
              >
                <RefreshCcw size={16} /> Convert another
              </button>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
