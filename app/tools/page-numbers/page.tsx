"use client";

import { Header } from "@/components/Header";
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
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { MouseEvent, useEffect, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type NumberPosition = {
  xPercent: number;
  yPercent: number;
};

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
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

async function addPageNumbersToPdf({
  file,
  position,
  startNumber,
  fontSize,
  prefix,
  suffix,
}: {
  file: File;
  position: NumberPosition;
  startNumber: number;
  fontSize: number;
  prefix: string;
  suffix: string;
}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNumber = startNumber + index;
    const text = `${prefix}${pageNumber}${suffix}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    const x = Math.min(
      Math.max(12, (position.xPercent / 100) * width - textWidth / 2),
      width - textWidth - 12
    );

    const y = Math.min(
      Math.max(12, height - (position.yPercent / 100) * height - fontSize / 2),
      height - fontSize - 12
    );

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.12, 0.14, 0.2),
      opacity: 0.92,
    });
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function PageNumbersPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragAreaRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [position, setPosition] = useState<NumberPosition>({
    xPercent: 50,
    yPercent: 93,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(13);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [status, setStatus] = useState(
    "Upload a PDF, drag the page number into position, then export."
  );
  const [busy, setBusy] = useState(false);

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

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Rendering PDF preview...");

    try {
      setFile(selectedFile);
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
        `PDF loaded with ${pdf.numPages} page${
          pdf.numPages > 1 ? "s" : ""
        }. Drag the number on page 1 preview to set placement.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setStatus("Upload a PDF, drag the page number into position, then export.");
  }

  function resetPosition() {
    setPosition({
      xPercent: 50,
      yPercent: 93,
    });

    setStatus("Page number position reset to bottom center.");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!Number.isInteger(startNumber) || startNumber < 0) {
      setStatus("Start number must be 0 or higher.");
      return;
    }

    setBusy(true);
    setStatus("Adding page numbers to PDF...");

    try {
      const blob = await addPageNumbersToPdf({
        file,
        position,
        startNumber,
        fontSize,
        prefix,
        suffix,
      });

      downloadBlob(blob, "PDFMantra-page-numbers.pdf");
      setStatus("Page numbered PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Page number export failed. Please try another PDF.");
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

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                  <Hash size={14} />
                  PDFMantra Page Number Tool
                </div>

                <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                  Add Page Numbers
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Drag the page number directly on the preview and export the
                  same placement across all PDF pages.
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
                        Drag Position Preview
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Drag the number on page 1. Same relative position will
                        apply to every page.
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
                          Upload a PDF to place page numbers visually.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => {
                        const isPrimary = preview.pageNumber === 1;

                        return (
                          <div
                            key={preview.pageNumber}
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-sm font-black text-slate-800">
                                Page {preview.pageNumber}
                              </div>

                              {isPrimary && (
                                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                  Drag here
                                </div>
                              )}
                            </div>

                            <div
                              ref={isPrimary ? dragAreaRef : null}
                              className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4"
                            >
                              <img
                                src={preview.previewUrl}
                                alt={`Page ${preview.pageNumber}`}
                                className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                              />

                              <div
                                onMouseDown={isPrimary ? startDrag : undefined}
                                className={`absolute z-20 inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-black shadow-lg ${
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
                                title={
                                  isPrimary
                                    ? "Drag page number position"
                                    : undefined
                                }
                              >
                                {isPrimary && <Grip size={12} />}
                                {previewText(preview.pageNumber)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Number Settings
                  </h2>

                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-bold leading-6 text-indigo-800">
                    Drag the page number on page 1 preview. That placement will
                    be used for every page during export.
                  </div>

                  <label className="mt-4 block">
                    <span className="text-sm font-black text-slate-800">
                      Start number
                    </span>

                    <input
                      type="number"
                      min={0}
                      value={startNumber}
                      onChange={(event) =>
                        setStartNumber(Number(event.target.value))
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="flex justify-between text-sm font-black text-slate-800">
                      Font size
                      <span>{fontSize}px</span>
                    </span>

                    <input
                      type="range"
                      min={8}
                      max={28}
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                      className="mt-3 w-full"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-black text-slate-800">
                        Prefix
                      </span>

                      <input
                        value={prefix}
                        onChange={(event) => setPrefix(event.target.value)}
                        placeholder="Page "
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-black text-slate-800">
                        Suffix
                      </span>

                      <input
                        value={suffix}
                        onChange={(event) => setSuffix(event.target.value)}
                        placeholder="/10"
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    </label>
                  </div>

                  <button
                    onClick={resetPosition}
                    disabled={!file}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={17} />
                    Reset Position
                  </button>

                  <div className="mt-5 rounded-2xl bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      PDF pages
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
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
                        Export Numbered PDF
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("valid")
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
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
