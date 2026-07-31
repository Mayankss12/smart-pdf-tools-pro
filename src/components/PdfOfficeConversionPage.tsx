"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
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
  convertPdfToOffice,
  type PdfOfficeFormat,
} from "@/lib/conversions/pdf-office-engine";
import type { OcrLanguage, OcrQuality } from "@/lib/pdf-ocr-engine";

type UiState =
  | "idle"
  | "validating"
  | "ready"
  | "processing"
  | "cancelling"
  | "completed"
  | "failed"
  | "usage-limit";

const FORMAT_META: Record<
  PdfOfficeFormat,
  {
    readonly label: string;
    readonly extension: string;
    readonly mime: string;
    readonly toolKey: string;
    readonly quality: string;
  }
> = {
  docx: {
    label: "Word",
    extension: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    toolKey: "pdf-to-word",
    quality:
      "Creates editable Word paragraphs page-by-page. Text remains editable, while complex columns, tables, fonts, and exact visual placement may differ from the PDF.",
  },
  xlsx: {
    label: "Excel",
    extension: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    toolKey: "pdf-to-excel",
    quality:
      "Creates one worksheet per PDF page. Detected lines become spreadsheet rows; clearly separated pipe or tab values become cells. Complex table reconstruction remains best-effort.",
  },
  pptx: {
    label: "PowerPoint",
    extension: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    toolKey: "pdf-to-powerpoint",
    quality:
      "Creates one slide per PDF page using a rendered page image. Visual appearance is preserved, but page text is not independently editable inside PowerPoint.",
  },
};

function iconFor(format: PdfOfficeFormat) {
  if (format === "xlsx") return FileSpreadsheet;
  if (format === "pptx") return Presentation;
  return FileText;
}

function downloadBytes(bytes: Uint8Array, mime: string, fileName: string) {
  const blob = new Blob([bytes], { type: mime });
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

export function PdfOfficeConversionPage({
  format,
}: {
  readonly format: PdfOfficeFormat;
}) {
  const meta = FORMAT_META[format];
  const Icon = iconFor(format);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { recordExport } = useEntitlement();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [state, setState] = useState<UiState>("idle");
  const [status, setStatus] = useState(`Upload a PDF to create ${meta.label} output.`);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [ocrFallback, setOcrFallback] = useState(true);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("auto");
  const [ocrQuality, setOcrQuality] = useState<OcrQuality>("balanced");
  const [result, setResult] = useState<{
    readonly outputSize: number;
    readonly pages: number;
    readonly ocrPages: number;
  } | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function selectFile(selected: File | undefined) {
    if (!selected) return;
    setState("validating");
    setStatus("Validating PDF...");
    setResult(null);
    try {
      const bytes = await readValidatedPdfBytes(selected);
      const pdf = await PDFDocument.load(bytes);
      const pages = pdf.getPageCount();
      if (pages <= 0) throw new Error("This PDF contains no pages.");
      setFile(selected);
      setPageCount(pages);
      setState("ready");
      setStatus(`${selected.name} is ready with ${pages} page${pages === 1 ? "" : "s"}.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setState("failed");
      setStatus(
        error instanceof Error
          ? error.message
          : "This PDF is damaged, encrypted, or unsupported.",
      );
    }
  }

  async function convert() {
    if (!file || state === "processing") return;
    const controller = new AbortController();
    abortRef.current = controller;
    setState("processing");
    setResult(null);
    setProgress({ completed: 0, total: pageCount });
    setStatus(`Preparing ${meta.label} conversion...`);
    try {
      const prepared = await prepareEntitledExport({
        toolKey: meta.toolKey,
        recordExport,
        prepare: () =>
          convertPdfToOffice(file, format, {
            ocrFallback: format === "pptx" ? false : ocrFallback,
            ocrLanguage,
            ocrQuality,
            signal: controller.signal,
            onProgress(next) {
              setProgress({ completed: next.completed, total: next.total });
              setStatus(next.message);
            },
          }),
      });
      if (!prepared.allowed) {
        setState("usage-limit");
        setProgress(null);
        setStatus(prepared.message);
        return;
      }
      const outputSize = downloadBytes(
        prepared.output.bytes,
        meta.mime,
        `PDFMantra-${safeFileBaseName(file.name)}.${meta.extension}`,
      );
      setResult({
        outputSize,
        pages: prepared.output.pageCount,
        ocrPages: prepared.output.ocrPageCount,
      });
      setState("completed");
      setProgress({ completed: prepared.output.pageCount, total: prepared.output.pageCount });
      setStatus(`${meta.label} file created successfully. Download started.`);
    } catch (error) {
      const cancelled = controller.signal.aborted;
      setState(cancelled ? "ready" : "failed");
      setProgress(null);
      setStatus(
        cancelled
          ? "Conversion cancelled. The source PDF was not changed."
          : error instanceof Error
            ? error.message
            : `${meta.label} conversion failed.`,
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function cancel() {
    setState("cancelling");
    setStatus("Cancelling conversion...");
    abortRef.current?.abort();
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setPageCount(0);
    setState("idle");
    setProgress(null);
    setResult(null);
    setStatus(`Upload a PDF to create ${meta.label} output.`);
  }

  const busy = state === "processing" || state === "cancelling" || state === "validating";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Icon size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">PDF to {meta.label}</h1>
              <p className="text-sm text-slate-500">Real browser conversion with a valid .{meta.extension} download.</p>
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
                className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 text-center transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="text-violet-600" size={36} />
                <span className="mt-4 text-lg font-bold">{file ? "Replace PDF" : "Choose a PDF"}</span>
                <span className="mt-2 text-sm font-medium text-slate-500">Valid PDF signature required · up to 80 MB</span>
              </button>

              {file ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <div><div className="text-xs font-bold uppercase text-slate-400">File</div><div className="mt-1 truncate text-sm font-semibold">{file.name}</div></div>
                  <div><div className="text-xs font-bold uppercase text-slate-400">Size</div><div className="mt-1 text-sm font-semibold">{formatFileSize(file.size)}</div></div>
                  <div><div className="text-xs font-bold uppercase text-slate-400">Pages</div><div className="mt-1 text-sm font-semibold">{pageCount}</div></div>
                </div>
              ) : null}

              {progress && state !== "completed" ? (
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex justify-between text-sm font-bold text-violet-800"><span>Processing</span><span>{progress.completed}/{progress.total}</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${Math.round(progress.completed / Math.max(1, progress.total) * 100)}%` }} /></div>
                </div>
              ) : null}

              <div className={`mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ${state === "failed" || state === "usage-limit" ? "border-red-200 bg-red-50 text-red-700" : state === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-violet-100 bg-violet-50 text-violet-700"}`}>
                {status}
              </div>

              {result ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18} /> Completed</div>
                  <div className="text-sm font-semibold text-emerald-800">{result.pages} pages{format !== "pptx" ? ` · ${result.ocrPages} OCR` : ""}</div>
                  <div className="text-sm font-semibold text-emerald-800">{formatFileSize(result.outputSize)}</div>
                </div>
              ) : null}
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Conversion options</h2>
              {format !== "pptx" ? (
                <>
                  <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 p-3">
                    <input type="checkbox" checked={ocrFallback} onChange={(event) => setOcrFallback(event.target.checked)} disabled={busy} className="mt-1" />
                    <span><span className="block text-sm font-bold">OCR scan-like pages</span><span className="mt-1 block text-xs leading-5 text-slate-500">Use OCR when a page contains little or no native text.</span></span>
                  </label>
                  {ocrFallback ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="text-xs font-bold text-slate-500">Language<select value={ocrLanguage} onChange={(event) => setOcrLanguage(event.target.value as OcrLanguage)} disabled={busy} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm"><option value="auto">Auto</option><option value="eng">English</option><option value="hin">Hindi</option><option value="spa">Spanish</option><option value="fra">French</option><option value="deu">German</option><option value="ara">Arabic</option></select></label>
                      <label className="text-xs font-bold text-slate-500">Quality<select value={ocrQuality} onChange={(event) => setOcrQuality(event.target.value as OcrQuality)} disabled={busy} className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm"><option value="fast">Fast</option><option value="balanced">Balanced</option><option value="high">High</option></select></label>
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold leading-6 text-violet-800">Each PDF page becomes one visual PowerPoint slide.</div>
              )}

              <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                <ShieldCheck size={19} className="text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold">Browser processing</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Your source PDF is processed in this browser for this conversion.</p>
              </div>
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-5 text-amber-900">{meta.quality}</div>

              <div className="mt-5 grid gap-2">
                {state === "processing" || state === "cancelling" ? (
                  <button type="button" onClick={cancel} disabled={state === "cancelling"} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-700 disabled:opacity-60"><StopCircle size={17} />{state === "cancelling" ? "Cancelling..." : "Cancel"}</button>
                ) : (
                  <button type="button" onClick={() => void convert()} disabled={!file || busy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{state === "validating" ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}Convert to {meta.label}</button>
                )}
                <button type="button" onClick={reset} disabled={busy && state !== "processing"} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={16} />Reset</button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
