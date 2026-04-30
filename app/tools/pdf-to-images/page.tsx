"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type GeneratedImage = {
  pageNumber: number;
  imageUrl: string;
  fileName: string;
};

type ConvertMode = "first" | "all" | "custom";

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function downloadUrl(url: string, fileName: string) {
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;

  document.body.appendChild(link);
  link.click();
  link.remove();
}

function uniqueSortedNumbers(numbers: number[]) {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

function parsePageSelection(input: string, totalPages: number) {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error("Enter custom pages first. Example: 1-3,5,7");
  }

  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Enter valid pages. Example: 1-3,5,7");
  }

  const pages: number[] = [];

  for (const part of parts) {
    if (part.includes("-")) {
      const pieces = part.split("-").map((piece) => piece.trim());

      if (pieces.length !== 2 || !pieces[0] || !pieces[1]) {
        throw new Error(`Invalid range: ${part}`);
      }

      const start = Number(pieces[0]);
      const end = Number(pieces[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid number in range: ${part}`);
      }

      if (start <= 0 || end <= 0) {
        throw new Error("Page number 0 is invalid. Pages start from 1.");
      }

      if (start > end) {
        throw new Error(`Invalid reversed range: ${part}`);
      }

      if (end > totalPages) {
        throw new Error(
          `Page ${end} is outside this PDF. Total pages: ${totalPages}.`
        );
      }

      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: ${part}`);
      }

      if (page <= 0) {
        throw new Error("Page number 0 is invalid. Pages start from 1.");
      }

      if (page > totalPages) {
        throw new Error(
          `Page ${page} is outside this PDF. Total pages: ${totalPages}.`
        );
      }

      pages.push(page);
    }
  }

  return uniqueSortedNumbers(pages);
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

async function loadPdfFromFile(file: File) {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
  });

  return loadingTask.promise;
}

export default function PdfToImagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [mode, setMode] = useState<ConvertMode>("first");
  const [customPages, setCustomPages] = useState("1-3,5");
  const [status, setStatus] = useState(
    "Upload a PDF to convert pages to PNG images."
  );
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
      setGeneratedImages([]);
      setPreviews([]);

      const pdf = await loadPdfFromFile(selectedFile);
      setPageCount(pdf.numPages);

      const pagesToPreview = Math.min(pdf.numPages, 12);
      const nextPreviews: PdfPagePreview[] = [];

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.35);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);
      setStatus(
        `PDF loaded with ${pdf.numPages} page${
          pdf.numPages > 1 ? "s" : ""
        }. Choose conversion mode.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setGeneratedImages([]);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    generatedImages.forEach((image) => URL.revokeObjectURL(image.imageUrl));
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setGeneratedImages([]);
    setStatus("Upload a PDF to convert pages to PNG images.");
  }

  function getPagesToConvert(totalPages: number) {
    if (mode === "first") return [1];

    if (mode === "all") {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    return parsePageSelection(customPages, totalPages);
  }

  async function convertPages() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Converting PDF pages to PNG images...");

    try {
      generatedImages.forEach((image) => URL.revokeObjectURL(image.imageUrl));

      const pdf = await loadPdfFromFile(file);
      const pagesToConvert = getPagesToConvert(pdf.numPages);
      const baseName = file.name.replace(/\.pdf$/i, "");
      const outputImages: GeneratedImage[] = [];

      for (const pageNumber of pagesToConvert) {
        const imageUrl = await renderPdfPageToPng(pdf, pageNumber, 2);

        outputImages.push({
          pageNumber,
          imageUrl,
          fileName: `PDFMantra-${baseName}-page-${pageNumber}.png`,
        });
      }

      setGeneratedImages(outputImages);

      if (outputImages.length === 1) {
        downloadUrl(outputImages[0].imageUrl, outputImages[0].fileName);
      }

      setStatus(
        `Created ${outputImages.length} PNG image${
          outputImages.length > 1 ? "s" : ""
        }. Download buttons are ready.`
      );
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  function downloadAllImages() {
    generatedImages.forEach((image, index) => {
      setTimeout(() => {
        downloadUrl(image.imageUrl, image.fileName);
      }, index * 250);
    });

    setStatus(`Started downloading ${generatedImages.length} image files.`);
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                    <ImageIcon size={14} />
                    PDFMantra Convert Tool
                  </div>

                  <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                    PDF to Images
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                    Preview PDF pages and convert them into high-quality PNG
                    images directly in your browser.
                  </p>
                </div>

                <div className="hidden rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold leading-6 text-white ring-1 ring-white/20 lg:block">
                  Convert full PDFs or hand-pick exact pages like 1-3,5,7.
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_360px]">
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
                          Upload a PDF to preview pages.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => (
                        <div
                          key={preview.pageNumber}
                          className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                            mode === "custom" &&
                            parsePageSelectionSafe(customPages, pageCount).includes(
                              preview.pageNumber
                            )
                              ? "border-indigo-400 ring-4 ring-indigo-100"
                              : "border-slate-200"
                          }`}
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

                {generatedImages.length > 0 && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                      <div>
                        <h2 className="text-xl font-black text-slate-950">
                          Generated Images
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          Preview and download PNG outputs.
                        </p>
                      </div>

                      {generatedImages.length > 1 && (
                        <button
                          onClick={downloadAllImages}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2 text-sm font-black text-white transition hover:bg-indigo-800"
                        >
                          <Download size={16} />
                          Download All
                        </button>
                      )}
                    </div>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {generatedImages.map((image) => (
                        <div
                          key={image.fileName}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-800">
                            Page {image.pageNumber}
                          </div>

                          <div className="flex min-h-56 items-center justify-center bg-slate-100 p-4">
                            <img
                              src={image.imageUrl}
                              alt={image.fileName}
                              className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                            />
                          </div>

                          <div className="border-t border-slate-200 bg-white p-3">
                            <button
                              onClick={() =>
                                downloadUrl(image.imageUrl, image.fileName)
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-800"
                            >
                              <Download size={16} />
                              Download PNG
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Conversion Settings
                  </h2>

                  <div className="mt-4 space-y-3">
                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "first"}
                        onChange={() => setMode("first")}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-black text-slate-900">
                          First page only
                        </div>
                        <div className="text-sm font-semibold text-slate-500">
                          Quick export for preview or thumbnail use.
                        </div>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === "all"}
                        onChange={() => setMode("all")}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-black text-slate-900">
                          All pages
                        </div>
                        <div className="text-sm font-semibold text-slate-500">
                          Creates one PNG per PDF page.
                        </div>
                      </div>
                    </label>

                    <label className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200">
                      <div className="flex cursor-pointer items-center gap-3">
                        <input
                          type="radio"
                          name="mode"
                          checked={mode === "custom"}
                          onChange={() => setMode("custom")}
                          className="h-4 w-4"
                        />
                        <div>
                          <div className="font-black text-slate-900">
                            Custom pages
                          </div>
                          <div className="text-sm font-semibold text-slate-500">
                            Convert selected pages only.
                          </div>
                        </div>
                      </div>

                      {mode === "custom" && (
                        <div className="mt-4">
                          <input
                            value={customPages}
                            onChange={(event) =>
                              setCustomPages(event.target.value)
                            }
                            placeholder="Example: 1-3,5,7"
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          />

                          <p className="mt-2 text-xs font-bold text-slate-500">
                            Example: 1-3,5,7 converts pages 1, 2, 3, 5 and 7.
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  <div className="mt-5 rounded-2xl bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      PDF pages
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <button
                    onClick={convertPages}
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
                        Convert to PNG
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("valid") ||
                    status.toLowerCase().includes("invalid") ||
                    status.toLowerCase().includes("outside") ||
                    status.toLowerCase().includes("reversed")
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-black">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>

                <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                  <div className="font-black">About browser conversion</div>
                  <p className="mt-2">
                    Pages are rendered in your browser using PDF preview canvas
                    and exported as PNG images.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function parsePageSelectionSafe(input: string, totalPages: number) {
  try {
    return parsePageSelection(input, totalPages);
  } catch {
    return [];
  }
}
