"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
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
  createPlainTextOutput,
  createSafeHtmlOutput,
  extractPdfTextContent,
} from "@/lib/conversions/pdf-text-engine";
import type {
  OcrLanguage,
  OcrQuality,
} from "@/lib/pdf-ocr-engine";

type UiState =
  | "idle"
  | "validating"
  | "ready"
  | "processing"
  | "cancelling"
  | "completed"
  | "failed"
  | "usage-limit";

function downloadText(
  text: string,
  mimeType: string,
  fileName: string,
) {
  const blob = new Blob(["\uFEFF", text], { type: mimeType });
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

export function PdfTextConversionPage({
  outputFormat,
}: {
  readonly outputFormat: "txt" | "html";
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { recordExport } = useEntitlement();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [state, setState] = useState<UiState>("idle");
  const [status, setStatus] = useState(
    `Upload a PDF to extract ${outputFormat.toUpperCase()}.`,
  );
  const [progress, setProgress] = useState<{
    completed: number;
    total: number;
  } | null>(null);
  const [ocrFallback, setOcrFallback] = useState(true);
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("auto");
  const [ocrQuality, setOcrQuality] = useState<OcrQuality>("balanced");
  const [textSeparator, setTextSeparator] =
    useState<"heading" | "form-feed" | "blank-lines">("heading");
  const [htmlMode, setHtmlMode] = useState<"simple" | "layout">("simple");
  const [result, setResult] = useState<{
    outputSize: number;
    pages: number;
    ocrPages: number;
  } | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function selectFile(selected: File | undefined) {
    if (!selected) return;
    setState("validating");
    setStatus("Validating PDF...");
    setResult(null);
    try {
      const bytes = await readValidatedPdfBytes(selected);
      const pdf = await PDFDocument.load(bytes);
      if (pdf.getPageCount() <= 0) {
        throw new Error("This PDF contains no pages.");
      }
      setFile(selected);
      setPageCount(pdf.getPageCount());
      setState("ready");
      setStatus(
        `${selected.name} is ready with ${pdf.getPageCount()} page${pdf.getPageCount() === 1 ? "" : "s"}.`,
      );
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
    setProgress({ completed: 0, total: pageCount });
    setResult(null);

    try {
      const prepared = await prepareEntitledExport({
        toolKey:
          outputFormat === "txt" ? "pdf-to-text" : "pdf-to-html",
        recordExport,
        prepare: async () => {
          const extracted = await extractPdfTextContent(file, {
            ocrFallback,
            ocrLanguage,
            ocrQuality,
            signal: controller.signal,
            onProgress(next) {
              setProgress({
                completed: next.completed,
                total: next.total,
              });
              setStatus(next.message);
            },
          });
          return {
            extracted,
            output:
              outputFormat === "txt"
                ? createPlainTextOutput(extracted, textSeparator)
                : createSafeHtmlOutput(extracted, htmlMode),
          };
        },
      });

      if (!prepared.allowed) {
        setState("usage-limit");
        setStatus(prepared.message);
        setProgress(null);
        return;
      }

      const extension = outputFormat;
      const outputSize = downloadText(
        prepared.output.output,
        outputFormat === "txt"
          ? "text/plain;charset=utf-8"
          : "text/html;charset=utf-8",
        `PDFMantra-${safeFileBaseName(file.name)}.${extension}`,
      );
      setResult({
        outputSize,
        pages: prepared.output.extracted.pageCount,
        ocrPages: prepared.output.extracted.ocrPageCount,
      });
      setState("completed");
      setProgress({
        completed: prepared.output.extracted.pageCount,
        total: prepared.output.extracted.pageCount,
      });
      setStatus(
        `${outputFormat.toUpperCase()} created from ${prepared.output.extracted.pageCount} page${prepared.output.extracted.pageCount === 1 ? "" : "s"}. Download started.`,
      );
    } catch (error) {
      setState(controller.signal.aborted ? "ready" : "failed");
      setProgress(null);
      setStatus(
        controller.signal.aborted
          ? "Conversion cancelled. The source PDF was not changed."
          : error instanceof Error
            ? error.message
            : "Conversion failed.",
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
    setStatus(`Upload a PDF to extract ${outputFormat.toUpperCase()}.`);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <FileText size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  PDF to {outputFormat.toUpperCase()}
                </h1>
                <p className="text-sm text-slate-500">
                  Native text extraction with optional OCR fallback.
                </p>
              </div>
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
                disabled={state === "processing" || state === "cancelling"}
                className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 text-center transition hover:border-violet-400 disabled:opacity-50"
              >
                <Upload className="text-violet-600" size={36} />
                <span className="mt-4 text-lg font-bold">
                  {file ? "Replace PDF" : "Choose a PDF"}
                </span>
                <span className="mt-2 text-sm font-medium text-slate-500">
                  Valid PDF signature required · up to 80 MB
                </span>
              </button>

              {file ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">
                      File
                    </div>
                    <div className="mt-1 truncate text-sm font-semibold">
                      {file.name}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">
                      Size
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold uppercase text-slate-400">
                      Pages
                    </div>
                    <div className="mt-1 text-sm font-semibold">{pageCount}</div>
                  </div>
                </div>
              ) : null}

              {progress && state !== "completed" ? (
                <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4">
                  <div className="flex justify-between text-sm font-bold text-violet-800">
                    <span>Processing pages</span>
                    <span>
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className="h-full rounded-full bg-violet-600 transition-all"
                      style={{
                        width: `${Math.round((progress.completed / Math.max(1, progress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}

              <div
                className={`mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ${
                  state === "failed" || state === "usage-limit"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : state === "completed"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-violet-100 bg-violet-50 text-violet-700"
                }`}
              >
                {status}
              </div>

              {result ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-3">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 size={18} /> Completed
                  </div>
                  <div className="text-sm font-semibold text-emerald-800">
                    {result.pages} pages · {result.ocrPages} OCR
                  </div>
                  <div className="text-sm font-semibold text-emerald-800">
                    {formatFileSize(result.outputSize)}
                  </div>
                </div>
              ) : null}
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Conversion options</h2>
              <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 p-3">
                <input
                  type="checkbox"
                  checked={ocrFallback}
                  onChange={(event) => setOcrFallback(event.target.checked)}
                  disabled={state === "processing"}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-bold">OCR fallback</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    OCR only pages with little or no native text.
                  </span>
                </span>
              </label>

              {ocrFallback ? (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label className="text-xs font-bold text-slate-500">
                    Language
                    <select
                      value={ocrLanguage}
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
                          setOcrLanguage(value);
                        }
                      }}
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm"
                    >
                      <option value="auto">Auto</option>
                      <option value="eng">English</option>
                      <option value="hin">Hindi</option>
                      <option value="spa">Spanish</option>
                      <option value="fra">French</option>
                      <option value="deu">German</option>
                      <option value="ara">Arabic</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-500">
                    Quality
                    <select
                      value={ocrQuality}
                      onChange={(event) => {
                        const value = event.target.value;
                        if (
                          value === "fast" ||
                          value === "balanced" ||
                          value === "high"
                        ) {
                          setOcrQuality(value);
                        }
                      }}
                      className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-2 text-sm"
                    >
                      <option value="fast">Fast</option>
                      <option value="balanced">Balanced</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {outputFormat === "txt" ? (
                <label className="mt-4 block text-xs font-bold text-slate-500">
                  Page separator
                  <select
                    value={textSeparator}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (
                        value === "heading" ||
                        value === "form-feed" ||
                        value === "blank-lines"
                      ) {
                        setTextSeparator(value);
                      }
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="heading">Page headings</option>
                    <option value="form-feed">Form-feed characters</option>
                    <option value="blank-lines">Blank lines</option>
                  </select>
                </label>
              ) : (
                <label className="mt-4 block text-xs font-bold text-slate-500">
                  HTML mode
                  <select
                    value={htmlMode}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "simple" || value === "layout") {
                        setHtmlMode(value);
                      }
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  >
                    <option value="simple">Simple semantic flow</option>
                    <option value="layout">Font-size preserving</option>
                  </select>
                </label>
              )}

              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-6 text-emerald-800">
                <ShieldCheck className="mb-2" size={18} />
                Your files stay in your browser. Generated HTML contains no scripts or external resources.
              </div>
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-6 text-amber-900">
                {outputFormat === "txt"
                  ? "Plain text output does not reproduce visual page layout. Images and tables are not reconstructed. OCR accuracy depends on scan quality and language."
                  : "HTML output is a sanitized text flow. Complex columns and typography may differ, and images and tables are not fully reconstructed. OCR accuracy depends on scan quality and language."}
              </div>

              {state === "processing" || state === "cancelling" ? (
                <button
                  type="button"
                  onClick={cancel}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600"
                >
                  <StopCircle size={17} /> Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void convert()}
                  disabled={!file || state === "validating"}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {state === "validating" ? (
                    <Loader2 className="animate-spin" size={17} />
                  ) : (
                    <Download size={17} />
                  )}
                  Convert to {outputFormat.toUpperCase()}
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
