"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";
import { degrees, PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type FontStyle = "regular" | "bold" | "italic" | "boldItalic";

const FONT_OPTIONS: Array<{
  value: FontStyle;
  label: string;
  pdfFont: StandardFonts;
  previewClass: string;
}> = [
  {
    value: "regular",
    label: "Regular",
    pdfFont: StandardFonts.Helvetica,
    previewClass: "font-medium not-italic",
  },
  {
    value: "bold",
    label: "Bold",
    pdfFont: StandardFonts.HelveticaBold,
    previewClass: "font-semibold not-italic",
  },
  {
    value: "italic",
    label: "Italic",
    pdfFont: StandardFonts.HelveticaOblique,
    previewClass: "font-medium italic",
  },
  {
    value: "boldItalic",
    label: "Bold Italic",
    pdfFont: StandardFonts.HelveticaBoldOblique,
    previewClass: "font-semibold italic",
  },
];

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

async function addWatermarkToPdf({
  file,
  watermarkText,
  fontSize,
  opacity,
  angle,
  fontStyle,
}: {
  file: File;
  watermarkText: string;
  fontSize: number;
  opacity: number;
  angle: number;
  fontStyle: FontStyle;
}) {
  const selectedFont =
    FONT_OPTIONS.find((font) => font.value === fontStyle) || FONT_OPTIONS[0];

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(selectedFont.pdfFont);

  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);

    page.drawText(watermarkText, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.28, 0.2, 0.82),
      opacity,
      rotate: degrees(angle),
    });
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function WatermarkPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [watermarkText, setWatermarkText] = useState("PDFMantra");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.18);
  const [angle, setAngle] = useState(-32);
  const [fontStyle, setFontStyle] = useState<FontStyle>("bold");
  const [status, setStatus] = useState("Upload a PDF to add watermark.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const selectedFontPreviewClass = useMemo(() => {
    return (
      FONT_OPTIONS.find((font) => font.value === fontStyle)?.previewClass ||
      FONT_OPTIONS[0].previewClass
    );
  }, [fontStyle]);

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
        }. Adjust watermark settings.`
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
    setStatus("Upload a PDF to add watermark.");
  }

  function applyPreset(nextText: string, nextAngle: number, nextOpacity: number) {
    setWatermarkText(nextText);
    setAngle(nextAngle);
    setOpacity(nextOpacity);
    setStatus(`Preset applied: ${nextText}`);
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!watermarkText.trim()) {
      setStatus("Enter watermark text first.");
      return;
    }

    setBusy(true);
    setStatus("Adding watermark to PDF...");

    try {
      const blob = await addWatermarkToPdf({
        file,
        watermarkText: watermarkText.trim(),
        fontSize,
        opacity,
        angle,
        fontStyle,
      });

      downloadBlob(blob, "PDFMantra-watermarked.pdf");
      setStatus("Watermarked PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Watermark export failed. Please try another PDF.");
    } finally {
      setBusy(false);
    }
  }

  const statusIsError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("valid");

  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Type size={14} />
                    PDFMantra Watermark Tool
                  </div>

                  <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                    Add professional watermarks with live preview.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                    Upload a PDF, customize text, style, opacity, and angle, then
                    export a watermarked copy directly from your browser.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="rounded-2xl bg-white/12 p-5 ring-1 ring-white/15">
                    <div className="text-xs font-medium uppercase tracking-wide text-indigo-50">
                      Current watermark
                    </div>
                    <div
                      className={`mt-3 truncate text-3xl tracking-[-0.04em] text-white ${selectedFontPreviewClass}`}
                    >
                      {watermarkText.trim() || "No text"}
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-medium text-indigo-50">
                      <div className="rounded-xl bg-white/10 px-2 py-2">
                        {fontSize}px
                      </div>
                      <div className="rounded-xl bg-white/10 px-2 py-2">
                        {angle}°
                      </div>
                      <div className="rounded-xl bg-white/10 px-2 py-2">
                        {Math.round(opacity * 100)}%
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </section>

            <div className="grid lg:grid-cols-[1fr_390px]">
              <section className="min-h-[700px] border-r border-slate-200 bg-slate-50/70 p-5 sm:p-6">
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
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                    <FileText size={22} />
                  </div>

                  <div className="font-semibold tracking-[-0.02em] text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-500">
                    {file
                      ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                      : "Click here or drag a PDF to begin."}
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    <Upload size={17} />
                    Choose PDF
                  </div>
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                        Live Watermark Preview
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Showing up to first 12 pages with approximate watermark placement.
                      </p>
                    </div>

                    {file && (
                      <button
                        onClick={clearFile}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    )}
                  </div>

                  {busy && previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        Rendering preview
                      </div>
                    </div>
                  ) : previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <FileText className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-semibold text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Upload a PDF to preview watermark placement.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => (
                        <div
                          key={preview.pageNumber}
                          className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm"
                        >
                          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">
                            Page {preview.pageNumber}
                          </div>

                          <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4">
                            <img
                              src={preview.previewUrl}
                              alt={`Page ${preview.pageNumber}`}
                              className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                            />

                            {watermarkText.trim() && (
                              <div
                                className={`pointer-events-none absolute left-1/2 top-1/2 whitespace-nowrap text-indigo-700 ${selectedFontPreviewClass}`}
                                style={{
                                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                  fontSize: Math.max(14, fontSize * 0.42),
                                  opacity,
                                }}
                              >
                                {watermarkText}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Watermark Studio
                  </h2>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("CONFIDENTIAL", -32, 0.16)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Confidential
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("DRAFT", -25, 0.18)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Draft
                    </button>

                    <button
                      type="button"
                      onClick={() => applyPreset("APPROVED", 0, 0.2)}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      Approved
                    </button>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-semibold text-slate-800">
                      Watermark text
                    </span>
                    <input
                      value={watermarkText}
                      onChange={(event) => setWatermarkText(event.target.value)}
                      placeholder="Example: Confidential"
                      className="input-premium mt-2"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">
                      Font style
                    </span>
                    <select
                      value={fontStyle}
                      onChange={(event) =>
                        setFontStyle(event.target.value as FontStyle)
                      }
                      className="input-premium mt-2"
                    >
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.value} value={font.value}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-5 block">
                    <span className="flex justify-between text-sm font-semibold text-slate-800">
                      Font size
                      <span>{fontSize}px</span>
                    </span>
                    <input
                      type="range"
                      min={18}
                      max={120}
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                      className="mt-3 w-full accent-indigo-600"
                    />
                  </label>

                  <label className="mt-5 block">
                    <span className="flex justify-between text-sm font-semibold text-slate-800">
                      Watermark angle
                      <span>{angle}°</span>
                    </span>
                    <input
                      type="range"
                      min={-90}
                      max={90}
                      value={angle}
                      onChange={(event) => setAngle(Number(event.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                    />

                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {[-45, 0, 45].map((presetAngle) => (
                        <button
                          key={presetAngle}
                          type="button"
                          onClick={() => setAngle(presetAngle)}
                          className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                            angle === presetAngle
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {presetAngle}°
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="mt-5 block">
                    <span className="flex justify-between text-sm font-semibold text-slate-800">
                      Opacity
                      <span>{Math.round(opacity * 100)}%</span>
                    </span>
                    <input
                      type="range"
                      min={0.06}
                      max={0.6}
                      step={0.01}
                      value={opacity}
                      onChange={(event) =>
                        setOpacity(Number(event.target.value))
                      }
                      className="mt-3 w-full accent-indigo-600"
                    />
                  </label>

                  <div className="mt-5 rounded-2xl bg-white p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <SlidersHorizontal size={14} />
                      PDF pages
                    </div>
                    <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={busy || !file}
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
                        Export Watermarked PDF
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${
                    statusIsError
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

                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <Sparkles size={16} />
                    Preview note
                  </div>
                  Preview placement is approximate. Export writes the watermark
                  directly into every page of the PDF.
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
