"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  normalizePdfRotation,
  rotatePdfWithMap,
  validatePdfFile,
  type PdfProcessingResult,
  type RotationMap,
} from "@/lib/pdf-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Rotation export failed. Please check your PDF and try again.";
}

function getPreviewPages(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 60) }, (_, index) => index + 1);
}

export default function RotatePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rotationMap, setRotationMap] = useState<RotationMap>({});
  const [status, setStatus] = useState("Upload a PDF to rotate pages.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const changedPages = useMemo(
    () => Object.values(rotationMap).filter((rotation) => normalizePdfRotation(rotation) !== 0).length,
    [rotationMap],
  );

  const previewPages = useMemo(() => getPreviewPages(pageCount), [pageCount]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResult(null);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);
      setRotationMap({});
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Rotate pages below.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setRotationMap({});
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setRotationMap({});
    setResult(null);
    setStatus("Upload a PDF to rotate pages.");
  }

  function rotatePage(pageNumber: number, direction: "left" | "right") {
    const delta = direction === "left" ? -90 : 90;
    setRotationMap((current) => ({
      ...current,
      [pageNumber]: normalizePdfRotation((current[pageNumber] || 0) + delta),
    }));
    setResult(null);
    setStatus(`Page ${pageNumber} rotation updated.`);
  }

  function resetPage(pageNumber: number) {
    setRotationMap((current) => ({ ...current, [pageNumber]: 0 }));
    setResult(null);
    setStatus(`Page ${pageNumber} rotation reset.`);
  }

  function rotateAll(degreeValue: 90 | 180 | 270) {
    if (!pageCount) {
      setStatus("Upload a PDF first.");
      return;
    }

    const nextMap: RotationMap = {};
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      nextMap[pageNumber] = degreeValue;
    }

    setRotationMap(nextMap);
    setResult(null);
    setStatus(`All pages set to ${degreeValue}° rotation.`);
  }

  function resetAll() {
    setRotationMap({});
    setResult(null);
    setStatus("All rotations cleared.");
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Please upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Applying rotations with PDFMantra engine...");

    try {
      const output = await rotatePdfWithMap(file, rotationMap);
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus("Rotated PDF exported successfully. Download started.");
    } catch (error) {
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
                <RotateCw size={14} /> PDFMantra Engine Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Rotate PDF
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Rotate individual pages or all pages together, then export through the shared PDFMantra engine.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
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
                    {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag a PDF to begin."}
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
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={15} /> Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Page Rotation Map</h2>
                      <p className="mt-1 text-sm text-slate-600">Fast cards show rotation for up to 60 pages.</p>
                    </div>
                  </div>

                  {busy && !file ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-violet-100 bg-violet-50">
                      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm">
                        <Loader2 className="animate-spin" size={18} /> Reading PDF
                      </div>
                    </div>
                  ) : previewPages.length === 0 ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-violet-50/40 text-center">
                      <div>
                        <FileText className="mx-auto text-violet-300" size={38} />
                        <div className="mt-3 text-[15px] font-semibold text-slate-950">No PDF selected</div>
                        <p className="mt-1 text-sm text-slate-600">Upload a PDF to build the rotation map.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {previewPages.map((pageNumber) => {
                        const rotation = normalizePdfRotation(rotationMap[pageNumber] || 0);
                        return (
                          <div key={pageNumber} className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/50 px-4 py-3">
                              <div className="text-sm font-semibold text-slate-800">Page {pageNumber}</div>
                              <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-violet-700">{rotation}°</div>
                            </div>
                            <div className="flex min-h-32 items-center justify-center bg-slate-50 p-4">
                              <div className="flex h-20 w-16 items-center justify-center rounded-xl border border-violet-100 bg-white text-sm font-bold text-violet-700 shadow-sm transition-transform" style={{ transform: `rotate(${rotation}deg)` }}>
                                {pageNumber}
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-t border-violet-100 bg-white p-3">
                              <button type="button" onClick={() => rotatePage(pageNumber, "left")} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-100 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50">
                                <RotateCcw size={14} /> Left
                              </button>
                              <button type="button" onClick={() => resetPage(pageNumber)} className="inline-flex items-center justify-center rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-100">
                                Reset
                              </button>
                              <button type="button" onClick={() => rotatePage(pageNumber, "right")} className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-100 bg-white px-2 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50">
                                Right <RotateCw size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Rotate Settings</h2>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {[90, 180, 270].map((degree) => (
                      <button key={degree} type="button" onClick={() => rotateAll(degree as 90 | 180 | 270)} disabled={!file || busy} className="rounded-2xl bg-indigo-600 px-3 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-slate-300">
                        All {degree}°
                      </button>
                    ))}
                  </div>
                  <button type="button" onClick={resetAll} disabled={!file || busy} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-violet-100 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
                    <RotateCcw size={17} /> Reset All
                  </button>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{pageCount || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Changed pages</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{changedPages || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{result ? formatFileSize(result.outputSize) : "-"}</div>
                    </div>
                  </div>

                  <button type="button" onClick={handleExport} disabled={busy || !file} className="btn-primary mt-5 w-full">
                    {busy ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing</>
                    ) : (
                      <><Download size={18} /> Export Rotated PDF</>
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><Sparkles size={16} /> Stable rotation flow</div>
                  This tool uses the shared PDFMantra engine for actual PDF export while keeping the page map fast and stable.
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
