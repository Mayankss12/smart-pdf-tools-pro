"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Loader2,
  PenLine,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type SignaturePosition =
  | "bottom-right"
  | "bottom-left"
  | "bottom-center"
  | "top-right"
  | "top-left"
  | "top-center";

type SignatureStyle = "clean" | "bold" | "italic";

const POSITION_OPTIONS: Array<{
  value: SignaturePosition;
  label: string;
}> = [
  { value: "bottom-right", label: "Bottom Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-center", label: "Bottom Center" },
  { value: "top-right", label: "Top Right" },
  { value: "top-left", label: "Top Left" },
  { value: "top-center", label: "Top Center" },
];

const STYLE_OPTIONS: Array<{
  value: SignatureStyle;
  label: string;
  font: StandardFonts;
  previewClass: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    font: StandardFonts.Helvetica,
    previewClass: "font-semibold not-italic",
  },
  {
    value: "bold",
    label: "Bold",
    font: StandardFonts.HelveticaBold,
    previewClass: "font-black not-italic",
  },
  {
    value: "italic",
    label: "Italic",
    font: StandardFonts.HelveticaOblique,
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

function getPreviewPositionClass(position: SignaturePosition) {
  const base =
    "absolute z-10 rounded-2xl bg-white/95 px-3 py-2 text-indigo-700 shadow-lg ring-1 ring-indigo-100";

  switch (position) {
    case "top-left":
      return `${base} left-4 top-4`;
    case "top-center":
      return `${base} left-1/2 top-4 -translate-x-1/2`;
    case "top-right":
      return `${base} right-4 top-4`;
    case "bottom-left":
      return `${base} bottom-4 left-4`;
    case "bottom-center":
      return `${base} bottom-4 left-1/2 -translate-x-1/2`;
    case "bottom-right":
    default:
      return `${base} bottom-4 right-4`;
  }
}

function getPdfPosition({
  position,
  pageWidth,
  pageHeight,
  textWidth,
  fontSize,
  margin,
}: {
  position: SignaturePosition;
  pageWidth: number;
  pageHeight: number;
  textWidth: number;
  fontSize: number;
  margin: number;
}) {
  const isTop = position.startsWith("top");
  const y = isTop ? pageHeight - margin - fontSize : margin;

  if (position.endsWith("left")) {
    return { x: margin, y };
  }

  if (position.endsWith("right")) {
    return { x: pageWidth - margin - textWidth, y };
  }

  return { x: pageWidth / 2 - textWidth / 2, y };
}

async function addSignatureToPdf({
  file,
  signerName,
  position,
  fontSize,
  style,
}: {
  file: File;
  signerName: string;
  position: SignaturePosition;
  fontSize: number;
  style: SignatureStyle;
}) {
  const selectedStyle =
    STYLE_OPTIONS.find((option) => option.value === style) || STYLE_OPTIONS[0];

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(selectedStyle.font);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("This PDF has no pages.");
  }

  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const label = `Signed by ${signerName}`;
  const textWidth = font.widthOfTextAtSize(label, fontSize);
  const margin = 36;

  const { x, y } = getPdfPosition({
    position,
    pageWidth: width,
    pageHeight: height,
    textWidth,
    fontSize,
    margin,
  });

  firstPage.drawText(label, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.18, 0.14, 0.52),
    opacity: 0.95,
  });

  firstPage.drawLine({
    start: { x, y: y - 6 },
    end: { x: x + Math.min(textWidth, 180), y: y - 6 },
    thickness: 1,
    color: rgb(0.18, 0.14, 0.52),
    opacity: 0.65,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function FillSignPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [signerName, setSignerName] = useState("Mayank Singh");
  const [position, setPosition] = useState<SignaturePosition>("bottom-right");
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>("italic");
  const [fontSize, setFontSize] = useState(16);
  const [status, setStatus] = useState("Upload a PDF to add a simple signature.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const selectedPreviewClass = useMemo(() => {
    return (
      STYLE_OPTIONS.find((option) => option.value === signatureStyle)
        ?.previewClass || STYLE_OPTIONS[0].previewClass
    );
  }, [signatureStyle]);

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
        }. Add signature details.`
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
    setStatus("Upload a PDF to add a simple signature.");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!signerName.trim()) {
      setStatus("Enter signer name first.");
      return;
    }

    setBusy(true);
    setStatus("Adding signature to PDF...");

    try {
      const blob = await addSignatureToPdf({
        file,
        signerName: signerName.trim(),
        position,
        fontSize,
        style: signatureStyle,
      });

      downloadBlob(blob, "PDFMantra-signed.pdf");
      setStatus("Signed PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Signature export failed.");
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
                  <FileSignature size={14} />
                  PDFMantra Fill & Sign
                </div>

                <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                  Fill & Sign PDF
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Add a simple text signature to your PDF in the browser. Full
                  form filling and freehand signatures can be added next.
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
                        Signature preview is shown on page 1 only.
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
                        <PenLine className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to preview signature placement.
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

                          <div className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4">
                            <img
                              src={preview.previewUrl}
                              alt={`Page ${preview.pageNumber}`}
                              className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                            />

                            {preview.pageNumber === 1 && signerName.trim() && (
                              <div
                                className={`${getPreviewPositionClass(
                                  position
                                )} ${selectedPreviewClass}`}
                                style={{
                                  fontSize: Math.max(11, fontSize * 0.78),
                                }}
                              >
                                Signed by {signerName}
                              </div>
                            )}
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
                    Signature Settings
                  </h2>

                  <label className="mt-4 block">
                    <span className="text-sm font-black text-slate-800">
                      Signer name
                    </span>

                    <input
                      value={signerName}
                      onChange={(event) => setSignerName(event.target.value)}
                      placeholder="Enter signer name"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-black text-slate-800">
                      Signature style
                    </span>

                    <select
                      value={signatureStyle}
                      onChange={(event) =>
                        setSignatureStyle(event.target.value as SignatureStyle)
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      {STYLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-black text-slate-800">
                      Position on first page
                    </span>

                    <select
                      value={position}
                      onChange={(event) =>
                        setPosition(event.target.value as SignaturePosition)
                      }
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      {POSITION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block">
                    <span className="flex justify-between text-sm font-black text-slate-800">
                      Font size
                      <span>{fontSize}px</span>
                    </span>

                    <input
                      type="range"
                      min={10}
                      max={32}
                      value={fontSize}
                      onChange={(event) =>
                        setFontSize(Number(event.target.value))
                      }
                      className="mt-3 w-full"
                    />
                  </label>

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
                        Export Signed PDF
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

                <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                  <div className="font-black">Foundation note</div>
                  <p className="mt-2">
                    This adds a simple text signature to the first page. Later,
                    we can add freehand drawing, draggable placement, initials,
                    date fields, and form filling.
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
