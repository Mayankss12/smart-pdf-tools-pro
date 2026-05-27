"use client";

import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  parsePageGroups,
  safeFileBaseName,
  validatePdfFile,
} from "@/lib/pdf-engine";

type ExportFormat = "png" | "jpeg";
type RenderScale = "standard" | "high" | "ultra";

type RenderedImage = {
  pageNumber: number;
  blob: Blob;
  fileName: string;
  previewUrl: string;
};

const SCALE_VALUES: Record<RenderScale, number> = {
  standard: 1.5,
  high: 2,
  ultra: 3,
};

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Unable to convert this PDF into images. Please try another file.";
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality = 0.92) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to create image output."));
      },
      format === "png" ? "image/png" : "image/jpeg",
      quality,
    );
  });
}

async function loadPdfJsDocument(file: File) {
  validatePdfFile(file);
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  return loadingTask.promise;
}

async function renderPageToImage({
  pdf,
  pageNumber,
  format,
  scale,
  baseName,
}: {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  format: ExportFormat;
  scale: number;
  baseName: string;
}) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: format === "png" });

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to prepare image rendering canvas.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  if (format === "jpeg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await canvasToBlob(canvas, format);
  const extension = format === "png" ? "png" : "jpg";

  return {
    pageNumber,
    blob,
    fileName: `PDFMantra-${baseName}-page-${String(pageNumber).padStart(3, "0")}.${extension}`,
    previewUrl: URL.createObjectURL(blob),
  };
}

function getPreviewPages(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 80) }, (_, index) => index + 1);
}

export default function PdfToImagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("1");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [scale, setScale] = useState<RenderScale>("high");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to export pages as images.");
  const [outputs, setOutputs] = useState<RenderedImage[]>([]);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    return () => {
      outputs.forEach((output) => URL.revokeObjectURL(output.previewUrl));
    };
  }, [outputs]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    clearOutputs();
    setStatus("Reading PDF with PDFMantra render engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);
      setPageInput(totalPages === 1 ? "1" : `1-${Math.min(totalPages, 3)}`);
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Choose pages to export.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearOutputs() {
    setOutputs((current) => {
      current.forEach((output) => URL.revokeObjectURL(output.previewUrl));
      return [];
    });
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPageInput("1");
    clearOutputs();
    setStatus("Upload a PDF to export pages as images.");
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Please upload a PDF first.");
      return;
    }

    setBusy(true);
    clearOutputs();

    try {
      const groups = parsePageGroups(pageInput, pageCount);
      const pages = Array.from(new Set(groups.flatMap((group) => group.pages))).sort((a, b) => a - b);
      const pdf = await loadPdfJsDocument(file);
      const baseName = safeFileBaseName(file.name);
      const rendered: RenderedImage[] = [];

      setStatus(`Rendering ${pages.length} page${pages.length > 1 ? "s" : ""} as ${format.toUpperCase()}...`);

      for (const pageNumber of pages) {
        const image = await renderPageToImage({
          pdf,
          pageNumber,
          format,
          scale: SCALE_VALUES[scale],
          baseName,
        });

        rendered.push(image);
      }

      setOutputs(rendered);

      for (const image of rendered) {
        downloadBlob(image.blob, image.fileName);
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      setStatus(`Exported ${rendered.length} image${rendered.length > 1 ? "s" : ""}. Download started.`);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const previewPages = getPreviewPages(pageCount);
  const outputSize = outputs.reduce((sum, output) => sum + output.blob.size, 0);
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("unable");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <FileImage size={14} />
                PDFMantra Render Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                PDF to Images
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Upload a PDF, choose pages, export them as PNG or JPEG images, and download each rendered page.
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
                        <X size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Page Map</h2>
                  <p className="mt-1 text-sm text-slate-600">Fast page cards show up to 80 pages. Export range controls are on the right.</p>

                  {previewPages.length === 0 ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-violet-50/40 text-center">
                      <div>
                        <FileText className="mx-auto text-violet-300" size={38} />
                        <div className="mt-3 text-[15px] font-semibold text-slate-950">No PDF selected</div>
                        <p className="mt-1 text-sm text-slate-600">Upload a PDF to prepare image export.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                      {previewPages.map((pageNumber) => (
                        <div key={pageNumber} className="rounded-2xl border border-violet-100 bg-violet-50/50 px-3 py-4 text-center text-sm font-bold text-violet-700">
                          {pageNumber}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {outputs.length > 0 ? (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Last Export Preview</h2>
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {outputs.slice(0, 12).map((output) => (
                        <div key={output.fileName} className="overflow-hidden rounded-[1.35rem] border border-violet-100 bg-white shadow-sm">
                          <div className="border-b border-violet-100 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
                            Page {output.pageNumber}
                          </div>
                          <div className="flex min-h-52 items-center justify-center bg-slate-100 p-4">
                            <img src={output.previewUrl} alt={`Page ${output.pageNumber}`} className="max-h-56 rounded-xl object-contain shadow-sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Export Settings</h2>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">Pages</span>
                    <input
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      placeholder="Example: 1-3,5"
                      className="input-premium mt-2"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {(["png", "jpeg"] as ExportFormat[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setFormat(item)}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          format === item
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {(["standard", "high", "ultra"] as RenderScale[]).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setScale(item)}
                        className={`rounded-2xl border px-3 py-3 text-xs font-semibold capitalize transition ${
                          scale === item
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{pageCount || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output files</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{outputs.length || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output size</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{outputs.length ? formatFileSize(outputSize) : "-"}</div>
                    </div>
                  </div>

                  <button type="button" onClick={handleExport} disabled={!file || busy} className="btn-primary mt-5 w-full">
                    {busy ? (
                      <><Loader2 className="animate-spin" size={18} /> Rendering</>
                    ) : (
                      <><Download size={18} /> Export Images</>
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><ImageIcon size={16} /> Export note</div>
                  Multiple pages download as separate image files. ZIP export can be added next with a dedicated dependency.
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
