"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  RotateCw,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, degrees } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

type PdfPageThumb = {
  pageNumber: number;
  url: string;
};

type RotationMap = Record<number, number>;

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

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function renderPdfThumbnails(file: File, maxPages = 24) {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
  });

  const pdf = await loadingTask.promise;
  const thumbs: PdfPageThumb[] = [];

  const pagesToRender = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.38 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

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

    thumbs.push({
      pageNumber,
      url: canvas.toDataURL("image/png"),
    });
  }

  return {
    pageCount: pdf.numPages,
    thumbs,
  };
}

function normalizeRotation(value: number) {
  const normalized = ((value % 360) + 360) % 360;
  return normalized;
}

async function rotatePdfWithMap(file: File, rotationMap: RotationMap) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  pages.forEach((page, index) => {
    const pageNumber = index + 1;
    const existingRotation = page.getRotation().angle || 0;
    const extraRotation = rotationMap[pageNumber] || 0;
    const finalRotation = normalizeRotation(existingRotation + extraRotation);

    page.setRotation(degrees(finalRotation));
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function RotatePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [thumbs, setThumbs] = useState<PdfPageThumb[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [rotationMap, setRotationMap] = useState<RotationMap>({});
  const [status, setStatus] = useState("Upload a PDF to rotate pages.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const changedPages = useMemo(() => {
    return Object.values(rotationMap).filter((rotation) => rotation !== 0).length;
  }, [rotationMap]);

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
      setThumbs([]);
      setRotationMap({});

      const result = await renderPdfThumbnails(selectedFile, 30);

      setPageCount(result.pageCount);
      setThumbs(result.thumbs);
      setStatus(
        `PDF loaded with ${result.pageCount} page${
          result.pageCount > 1 ? "s" : ""
        }. Rotate pages below.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setThumbs([]);
      setPageCount(0);
      setRotationMap({});
      setStatus("Unable to load PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setThumbs([]);
    setPageCount(0);
    setRotationMap({});
    setStatus("Upload a PDF to rotate pages.");
  }

  function rotatePage(pageNumber: number, direction: "left" | "right") {
    const delta = direction === "left" ? -90 : 90;

    setRotationMap((prev) => ({
      ...prev,
      [pageNumber]: normalizeRotation((prev[pageNumber] || 0) + delta),
    }));

    setStatus(`Page ${pageNumber} rotation updated.`);
  }

  function resetPage(pageNumber: number) {
    setRotationMap((prev) => ({
      ...prev,
      [pageNumber]: 0,
    }));

    setStatus(`Page ${pageNumber} rotation reset.`);
  }

  function rotateAll(degreeValue: 90 | 180 | 270) {
    if (!pageCount) {
      setStatus("Upload a PDF first.");
      return;
    }

    const next: RotationMap = {};

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      next[pageNumber] = degreeValue;
    }

    setRotationMap(next);
    setStatus(`All pages set to ${degreeValue}° rotation.`);
  }

  function resetAll() {
    setRotationMap({});
    setStatus("All rotations cleared.");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Please upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Applying rotations and exporting PDF...");

    try {
      const rotatedBlob = await rotatePdfWithMap(file, rotationMap);

      downloadBlob(rotatedBlob, "PDFMantra-rotated.pdf");
      setStatus("Rotated PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Rotation export failed. Please try again.");
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
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                    <RotateCw size={14} />
                    PDFMantra Rotate Tool
                  </div>

                  <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                    Rotate PDF
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                    Preview pages, rotate individual pages or all pages, then
                    export a clean rotated PDF.
                  </p>
                </div>

                <div className="hidden rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 lg:block">
                  Click the drop zone below to upload PDF
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
                        Page Preview & Rotation
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Click rotate controls under each page preview.
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

                  {busy && thumbs.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-sm">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        Rendering preview
                      </div>
                    </div>
                  ) : thumbs.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <FileText className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to see page previews.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {thumbs.map((thumb) => {
                        const rotation = rotationMap[thumb.pageNumber] || 0;

                        return (
                          <div
                            key={thumb.pageNumber}
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-sm font-black text-slate-800">
                                Page {thumb.pageNumber}
                              </div>
                              <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                {rotation}°
                              </div>
                            </div>

                            <div className="flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4">
                              <img
                                src={thumb.url}
                                alt={`Page ${thumb.pageNumber}`}
                                className="max-h-64 rounded border border-slate-200 bg-white shadow-sm transition-transform"
                                style={{
                                  transform: `rotate(${rotation}deg)`,
                                }}
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 border-t border-slate-200 bg-white p-3">
                              <button
                                onClick={() => rotatePage(thumb.pageNumber, "left")}
                                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                <RotateCcw size={15} />
                                Left
                              </button>

                              <button
                                onClick={() => resetPage(thumb.pageNumber)}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-100"
                              >
                                Reset
                              </button>

                              <button
                                onClick={() =>
                                  rotatePage(thumb.pageNumber, "right")
                                }
                                className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                              >
                                Right
                                <RotateCw size={15} />
                              </button>
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
                    Rotate Settings
                  </h2>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button
                      onClick={() => rotateAll(90)}
                      disabled={!file}
                      className="rounded-2xl bg-indigo-700 px-3 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      All 90°
                    </button>

                    <button
                      onClick={() => rotateAll(180)}
                      disabled={!file}
                      className="rounded-2xl bg-indigo-700 px-3 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      All 180°
                    </button>

                    <button
                      onClick={() => rotateAll(270)}
                      disabled={!file}
                      className="rounded-2xl bg-indigo-700 px-3 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      All 270°
                    </button>
                  </div>

                  <button
                    onClick={resetAll}
                    disabled={!file}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={17} />
                    Reset All
                  </button>

                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Pages
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {pageCount || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Changed pages
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {changedPages || "-"}
                      </div>
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
                        Export Rotated PDF
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
                  <div className="font-black">How it works</div>
                  <p className="mt-2">
                    Rotate individual pages from the preview cards or apply one
                    rotation to all pages. Export applies your selected rotation
                    values to the final PDF.
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
