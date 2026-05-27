"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  CheckCircle2,
  Download,
  FileText,
  Grip,
  Hash,
  Loader2,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import {
  addPageNumbersWithOptions,
  type PageNumberPosition,
} from "@/lib/pdf-number-engine";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type NumberPosition = PageNumberPosition;

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Page number export failed. This PDF may be encrypted, damaged, or unsupported.";
}

async function loadPdfForPreview(file: File) {
  validatePdfFile(file);
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  return loadingTask.promise;
}

async function renderPdfPageToPng(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number,
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to create preview canvas.");
  }

  const outputScale = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toDataURL("image/png");
}

export default function PageNumbersPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragAreaRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [position, setPosition] = useState<NumberPosition>({ xPercent: 50, yPercent: 93 });
  const [isDragging, setIsDragging] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(13);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [status, setStatus] = useState("Upload a PDF, drag the page number into position, then export.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      if (!isDragging || !dragAreaRef.current) return;

      const rect = dragAreaRef.current.getBoundingClientRect();
      const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

      setPosition({
        xPercent: Math.min(96, Math.max(4, xPercent)),
        yPercent: Math.min(96, Math.max(4, yPercent)),
      });
    }

    function handleMouseUp() {
      if (isDragging) {
        setIsDragging(false);
        setResult(null);
        setStatus("Page number position updated.");
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResult(null);
    setPreviews([]);
    setStatus("Rendering PDF preview...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfForPreview(selectedFile);
      const nextPreviews: PdfPagePreview[] = [];
      const pagesToPreview = Math.min(pdf.numPages, 12);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        nextPreviews.push({
          pageNumber,
          previewUrl: await renderPdfPageToPng(pdf, pageNumber, 0.35),
        });
      }

      setFile(selectedFile);
      setPageCount(pdf.numPages);
      setPreviews(nextPreviews);
      setStatus(`PDF loaded with ${pdf.numPages} page${pdf.numPages > 1 ? "s" : ""}. Drag page 1 number to set placement.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setResult(null);
    setStatus("Upload a PDF, drag the page number into position, then export.");
  }

  function resetPosition() {
    setPosition({ xPercent: 50, yPercent: 93 });
    setResult(null);
    setStatus("Page number position reset to bottom center.");
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!Number.isInteger(startNumber) || startNumber < 0) {
      setStatus("Start number must be 0 or higher.");
      return;
    }

    setBusy(true);
    setResult(null);
    setStatus("Adding page numbers with PDFMantra engine...");

    try {
      const output = await addPageNumbersWithOptions(file, {
        position,
        startNumber,
        fontSize,
        prefix,
        suffix,
      });

      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus("Page numbered PDF exported successfully. Download started.");
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function previewText(pageNumber: number) {
    return `${prefix}${startNumber + pageNumber - 1}${suffix}`;
  }

  function startDrag(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    setStatus("Dragging page number position...");
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Hash size={14} />
                PDFMantra Engine Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Add Page Numbers
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Drag the number on the preview, customize prefix and suffix, then export using PDFMantra&apos;s page number engine.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_380px]">
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
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{file ? file.name : "Drop PDF here"}</div>
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
                        <X size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Drag Position Preview</h2>
                      <p className="mt-1 text-sm text-slate-600">Drag the number on page 1. Same relative position applies to every page.</p>
                    </div>
                    <button
                      type="button"
                      onClick={resetPosition}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      Reset position
                    </button>
                  </div>

                  {busy && previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={18} />
                        Rendering preview
                      </div>
                    </div>
                  ) : previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-violet-50/40 text-center">
                      <div>
                        <FileText className="mx-auto text-violet-300" size={38} />
                        <div className="mt-3 text-[15px] font-semibold text-slate-950">No PDF selected</div>
                        <p className="mt-1 text-sm text-slate-600">Upload a PDF to place page numbers visually.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => {
                        const isPrimary = preview.pageNumber === 1;

                        return (
                          <div key={preview.pageNumber} className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-violet-100 bg-slate-50 px-4 py-3">
                              <div className="text-sm font-semibold text-slate-800">Page {preview.pageNumber}</div>
                              {isPrimary ? (
                                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">Drag here</div>
                              ) : null}
                            </div>

                            <div ref={isPrimary ? dragAreaRef : null} className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4">
                              <img src={preview.previewUrl} alt={`Page ${preview.pageNumber}`} className="max-h-64 rounded border border-slate-200 bg-white shadow-sm" />

                              <div
                                onMouseDown={isPrimary ? startDrag : undefined}
                                className={`absolute z-20 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-bold shadow-lg ${
                                  isPrimary
                                    ? "cursor-move border-indigo-300 bg-white text-indigo-700 ring-4 ring-indigo-100"
                                    : "pointer-events-none border-slate-200 bg-white/95 text-slate-800"
                                }`}
                                style={{
                                  left: `${position.xPercent}%`,
                                  top: `${position.yPercent}%`,
                                  transform: "translate(-50%, -50%)",
                                  fontSize: Math.max(9, fontSize * 0.78),
                                }}
                                title={isPrimary ? "Drag page number position" : undefined}
                              >
                                {isPrimary ? <Grip size={12} /> : null}
                                {previewText(preview.pageNumber)}
                              </div>
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
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Number Settings</h2>
                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                    Drag the page number on page 1 preview. That placement is used for every page during export.
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">Start number</span>
                    <input
                      type="number"
                      min={0}
                      value={startNumber}
                      onChange={(event) => setStartNumber(Number(event.target.value))}
                      className="input-premium mt-2"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="flex justify-between text-sm font-semibold text-slate-800">Font size <span>{fontSize}px</span></span>
                    <input type="range" min={8} max={36} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-2 w-full" />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">Prefix</span>
                    <input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="Page " className="input-premium mt-2" />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">Suffix</span>
                    <input value={suffix} onChange={(event) => setSuffix(event.target.value)} placeholder=" / total" className="input-premium mt-2" />
                  </label>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preview text</div>
                      <div className="mt-1 truncate text-xl font-semibold text-slate-950">{previewText(1)}</div>
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
                      <><Download size={18} /> Export Numbered PDF</>
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
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
