"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileArchive, Loader2, Upload, X } from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  optimizePdfStructure,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) {
    return error.message;
  }

  return "Compression failed. This PDF may be encrypted, damaged, or unsupported.";
}

export default function CompressPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to optimize and download.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    try {
      validatePdfFile(selectedFile);
      setFile(selectedFile);
      setResult(null);
      setStatus(`Ready to optimize ${selectedFile.name}.`);
    } catch (error) {
      setFile(null);
      setResult(null);
      setStatus(getErrorMessage(error));
    }
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    setStatus("Upload a PDF to optimize and download.");
  }

  async function handleCompress() {
    if (!file || busy) return;

    setBusy(true);
    setStatus("Optimizing PDF with PDFMantra engine...");

    try {
      const optimized = await optimizePdfStructure(file);
      setResult(optimized);
      downloadBlob(optimized.blob, optimized.fileName);

      setStatus(
        optimized.outputSize < optimized.originalSize
          ? `Optimized successfully. Reduced by ${optimized.reductionPercent}%. Download started.`
          : "PDF processed and downloaded. This file was already compact, so size reduction may be minimal.",
      );
    } catch (error) {
      console.error(error);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <FileArchive size={14} />
                PDFMantra Engine Tool
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Compress PDF
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Upload a PDF, optimize its document structure with PDFMantra&apos;s shared browser engine, and download the processed file instantly.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      inputRef.current?.click();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Upload size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-500">
                    {file ? `${formatFileSize(file.size)} selected` : "Click here or drag a PDF to begin."}
                  </div>
                </div>

                {file ? (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Selected file</div>
                        <div className="mt-1 truncate text-lg font-semibold text-slate-950">{file.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Original size: {formatFileSize(file.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Compression Summary</h2>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{file ? formatFileSize(file.size) : "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{result ? formatFileSize(result.outputSize) : "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reduction</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{result ? `${result.reductionPercent}%` : "-"}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={!file || busy}
                    className="btn-primary mt-5 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Optimize & Download
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${
                    statusLooksLikeError
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-indigo-100 bg-indigo-50 text-indigo-800"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
