"use client";

import { Header } from "@/components/Header";
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

      <main className="min-h-screen bg-[var(--pm-bg)] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid gap-7 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                  <RotateCw size={13} />
                  PDFMantra Rotate Tool
                </div>

                <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                  Rotate pages with
                  <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                    a cleaner visual flow.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                  Preview pages, rotate individual sheets or all pages together, then export a polished rotated PDF.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/84 p-4 shadow-[0_24px_70px_rgba(91,63,193,0.11)] backdrop-blur">
                <div className="grid grid-cols-2 divide-x divide-violet-100 text-center">
                  <div className="px-3 py-4">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-slate-950">
                      {pageCount || "-"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Pages
                    </div>
                  </div>

                  <div className="px-3 py-4">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-slate-950">
                      {changedPages || "-"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Changed
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
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/82 shadow-[0_18px_50px_rgba(91,63,193,0.08)] lg:grid-cols-[1fr_360px]">
            <section className="min-h-[720px] border-r border-violet-100 bg-[#fffaf4]/72 p-5 sm:p-6">
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
                className="cursor-pointer rounded-[1.8rem] border-2 border-dashed border-violet-200 bg-gradient-to-br from-[#fffdf8] via-violet-50/52 to-rose-50/42 p-6 text-center transition hover:border-violet-400 hover:bg-white"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-gradient-to-r from-violet-600 to-rose-500 text-white shadow-[0_18px_42px_rgba(91,63,193,0.22)]">
                  <FileText size={22} />
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-slate-600">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                    : "Click here or drag a PDF to begin."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              <div className="mt-5 rounded-[1.8rem] border border-violet-100 bg-[#fffdf8]/92 p-5 shadow-[0_14px_36px_rgba(91,63,193,0.06)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-medium tracking-[-0.035em] text-slate-950">
                      Page Preview & Rotation
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Use the controls beneath each page or apply a bulk rotation from the settings panel.
                    </p>
                  </div>

                  {file && (
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-rose-50/90 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  )}
                </div>

                {busy && thumbs.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] bg-violet-50/45">
                    <div className="flex items-center gap-2 rounded-full bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm">
                      <Loader2 className="animate-spin" size={18} />
                      Rendering preview
                    </div>
                  </div>
                ) : thumbs.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-violet-100 bg-violet-50/30 text-center">
                    <div>
                      <FileText className="mx-auto text-violet-300" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-slate-950">
                        No PDF selected
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">
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
                          className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-[#fffdf8] shadow-[0_12px_28px_rgba(91,63,193,0.06)]"
                        >
                          <div className="flex items-center justify-between border-b border-violet-100 bg-[#fffaf4] px-4 py-3">
                            <div className="text-sm font-semibold text-slate-800">
                              Page {thumb.pageNumber}
                            </div>
                            <div className="rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                              {rotation}°
                            </div>
                          </div>

                          <div className="flex min-h-56 items-center justify-center overflow-hidden bg-[#fffaf4] p-4">
                            <img
                              src={thumb.url}
                              alt={`Page ${thumb.pageNumber}`}
                              className="max-h-64 rounded border border-violet-100 bg-white shadow-sm transition-transform"
                              style={{
                                transform: `rotate(${rotation}deg)`,
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-2 border-t border-violet-100 bg-[#fffdf8] p-3">
                            <button
                              onClick={() => rotatePage(thumb.pageNumber, "left")}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-100 bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50/70"
                            >
                              <RotateCcw size={15} />
                              Left
                            </button>

                            <button
                              onClick={() => resetPage(thumb.pageNumber)}
                              className="inline-flex items-center justify-center rounded-xl border border-violet-100 bg-violet-50/62 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-100/70"
                            >
                              Reset
                            </button>

                            <button
                              onClick={() =>
                                rotatePage(thumb.pageNumber, "right")
                              }
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-violet-100 bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50/70"
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

            <aside className="bg-[#fffdf8]/86 p-5 sm:p-6">
              <div className="rounded-[1.8rem] border border-violet-100 bg-gradient-to-br from-violet-50/72 via-[#fffdf8] to-rose-50/58 p-5 shadow-[0_14px_36px_rgba(91,63,193,0.06)]">
                <h2 className="display-font text-[1.75rem] font-medium tracking-[-0.035em] text-slate-950">
                  Rotate Settings
                </h2>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[90, 180, 270].map((degree) => (
                    <button
                      key={degree}
                      onClick={() => rotateAll(degree as 90 | 180 | 270)}
                      disabled={!file}
                      className="rounded-2xl bg-gradient-to-r from-violet-600 to-rose-500 px-3 py-3 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300"
                    >
                      All {degree}°
                    </button>
                  ))}
                </div>

                <button
                  onClick={resetAll}
                  disabled={!file}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8] px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-violet-50/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw size={17} />
                  Reset All
                </button>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div className="rounded-[1.35rem] border border-violet-100 bg-[#fffdf8] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Pages
                    </div>
                    <div className="mt-1 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-violet-100 bg-[#fffdf8] p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Changed pages
                    </div>
                    <div className="mt-1 text-[1.9rem] font-semibold tracking-[-0.04em] text-slate-950">
                      {changedPages || "-"}
                    </div>
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
                      Export Rotated PDF
                    </>
                  )}
                </button>
              </div>

              <div
                className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[0_12px_28px_rgba(91,63,193,0.05)] ${
                  status.toLowerCase().includes("failed") ||
                  status.toLowerCase().includes("valid")
                    ? "border-rose-100 bg-rose-50/90 text-rose-700"
                    : "border-violet-100 bg-violet-50/72 text-violet-800"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Status
                </div>
                {status}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-[#fffdf8] p-4 text-sm font-medium leading-6 text-slate-600 shadow-[0_12px_28px_rgba(91,63,193,0.05)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles size={16} />
                  How it works
                </div>
                Rotate individual pages from the preview grid or apply a bulk rotation to every page before export.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
