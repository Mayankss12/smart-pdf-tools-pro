"use client";

import { Header } from "@/components/Header";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type CompressionMode = "light" | "balanced" | "strong";

type CompressionResult = {
  blob: Blob;
  originalSize: number;
  outputSize: number;
  ratio: number;
};

const COMPRESSION_MODES: Array<{
  value: CompressionMode;
  label: string;
  description: string;
}> = [
  {
    value: "light",
    label: "Light optimization",
    description: "Fast rewrite with safest output. Best for already-small PDFs.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Best default option for browser-only optimization.",
  },
  {
    value: "strong",
    label: "Strong / smaller size",
    description:
      "Best-effort smaller output. Exact size target may need backend compression.",
  },
];

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function loadPdfFromFile(file: File) {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
  });

  return loadingTask.promise;
}

async function renderPdfPageToPng(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas preview.");
  }

  const outputScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return canvas.toDataURL("image/png");
}

async function optimizePdfBestEffort(
  file: File,
  mode: CompressionMode
): Promise<CompressionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, {
    ignoreEncryption: true,
  });

  pdfDoc.setTitle("");
  pdfDoc.setAuthor("");
  pdfDoc.setSubject("");
  pdfDoc.setKeywords([]);
  pdfDoc.setProducer("PDFMantra");
  pdfDoc.setCreator("PDFMantra");

  const saveOptions =
    mode === "light"
      ? {
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 100,
        }
      : mode === "balanced"
        ? {
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 50,
          }
        : {
            useObjectStreams: true,
            addDefaultPage: false,
            objectsPerTick: 25,
          };

  const pdfBytes = await pdfDoc.save(saveOptions);

  const blob = new Blob([pdfBytes], {
    type: "application/pdf",
  });

  const originalSize = file.size;
  const outputSize = blob.size;
  const ratio =
    originalSize > 0
      ? Math.max(0, Math.round((1 - outputSize / originalSize) * 100))
      : 0;

  return {
    blob,
    originalSize,
    outputSize,
    ratio,
  };
}

export default function CompressPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [mode, setMode] = useState<CompressionMode>("balanced");
  const [targetKb, setTargetKb] = useState("");
  const [result, setResult] = useState<CompressionResult | null>(null);
  const [status, setStatus] = useState("Upload a PDF to optimize.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Rendering PDF preview...");

    try {
      setFile(selectedFile);
      setResult(null);
      setPreviews([]);

      const pdf = await loadPdfFromFile(selectedFile);
      setPageCount(pdf.numPages);

      const nextPreviews: PdfPagePreview[] = [];
      const pagesToPreview = Math.min(pdf.numPages, 12);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.35);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);
      setStatus(
        `PDF loaded. Size: ${formatFileSize(selectedFile.size)}. Choose optimization settings.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setResult(null);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setResult(null);
    setStatus("Upload a PDF to optimize.");
  }

  async function handleCompress() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    const targetSizeNumber = targetKb.trim() ? Number(targetKb) : null;

    if (
      targetSizeNumber !== null &&
      (!Number.isFinite(targetSizeNumber) || targetSizeNumber <= 0)
    ) {
      setStatus("Target size must be a positive number in KB.");
      return;
    }

    setBusy(true);
    setResult(null);
    setStatus("Optimizing PDF in browser...");

    try {
      const optimized = await optimizePdfBestEffort(file, mode);
      setResult(optimized);

      const targetBytes =
        targetSizeNumber !== null ? targetSizeNumber * 1024 : null;

      downloadBlob(optimized.blob, "PDFMantra-optimized.pdf");

      if (targetBytes && optimized.outputSize > targetBytes) {
        setStatus(
          `Best effort completed. Output: ${formatFileSize(
            optimized.outputSize
          )}. Exact target size may require advanced backend compression.`
        );
      } else if (optimized.outputSize < optimized.originalSize) {
        setStatus(
          `Optimized successfully. Reduced by ${optimized.ratio}%. Download started.`
        );
      } else {
        setStatus(
          "Best effort completed. This PDF is already optimized or needs backend image recompression for stronger reduction."
        );
      }
    } catch (error) {
      console.error(error);
      setStatus("Optimization failed. This PDF may be encrypted or unsupported.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                  <Zap size={14} />
                  PDFMantra Optimize Tool
                </div>

                <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                  Compress PDF
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Optimize PDF file size with browser-only best-effort
                  compression and clear size reporting.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_380px]">
              <section className="min-h-[720px] border-r border-slate-200 bg-slate-50/70 p-5">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <FileText size={23} />
                  </div>

                  <div className="font-black text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    {file
                      ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                      : "Click here or drag a PDF to begin."}
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                    <Upload size={17} />
                    Click here to choose PDF
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        PDF Preview
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Showing up to first 12 pages.
                      </p>
                    </div>

                    {file && (
                      <button
                        onClick={clearFile}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    )}
                  </div>

                  {busy && previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-sm">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        Rendering preview
                      </div>
                    </div>
                  ) : previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <FileText className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to preview and optimize it.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => (
                        <div
                          key={preview.pageNumber}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800">
                            Page {preview.pageNumber}
                          </div>

                          <div className="flex min-h-56 items-center justify-center bg-slate-100 p-4">
                            <img
                              src={preview.previewUrl}
                              alt={`Page ${preview.pageNumber}`}
                              className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Compression Settings
                  </h2>

                  <div className="mt-4 space-y-3">
                    {COMPRESSION_MODES.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200"
                      >
                        <input
                          type="radio"
                          name="compressionMode"
                          checked={mode === option.value}
                          onChange={() => setMode(option.value)}
                          className="mt-1 h-4 w-4"
                        />

                        <div>
                          <div className="font-black text-slate-900">
                            {option.label}
                          </div>
                          <div className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                            {option.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-black text-slate-800">
                      Target size in KB{" "}
                      <span className="font-semibold text-slate-500">
                        (best effort)
                      </span>
                    </span>

                    <input
                      type="number"
                      min={1}
                      value={targetKb}
                      onChange={(event) => setTargetKb(event.target.value)}
                      placeholder="Example: 200"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Original
                      </div>
                      <div className="mt-1 text-xl font-black text-slate-950">
                        {file ? formatFileSize(file.size) : "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Output
                      </div>
                      <div className="mt-1 text-xl font-black text-slate-950">
                        {result ? formatFileSize(result.outputSize) : "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Reduction
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-950">
                      {result ? `${result.ratio}%` : "-"}
                    </div>
                  </div>

                  <button
                    onClick={handleCompress}
                    disabled={busy || !file}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
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

                <div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">
                  <div className="mb-1 flex items-center gap-2 font-black">
                    <AlertTriangle size={16} />
                    Important limitation
                  </div>
                  Browser-only compression is best-effort. Exact target size and
                  high-quality image recompression require backend processing,
                  which can be added later.
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("valid") ||
                    status.toLowerCase().includes("unsupported")
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-indigo-100 bg-indigo-50 text-indigo-800"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-black">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
