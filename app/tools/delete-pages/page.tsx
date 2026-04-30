"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
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

async function deletePagesFromPdf(file: File, pagesToDelete: number[]) {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);
  const outputPdf = await PDFDocument.create();

  const deleteSet = new Set(pagesToDelete);
  const pagesToKeep = sourcePdf
    .getPageIndices()
    .filter((pageIndex) => !deleteSet.has(pageIndex + 1));

  if (pagesToKeep.length === 0) {
    throw new Error("You cannot delete all pages. Keep at least one page.");
  }

  const copiedPages = await outputPdf.copyPages(sourcePdf, pagesToKeep);
  copiedPages.forEach((page) => outputPdf.addPage(page));

  const pdfBytes = await outputPdf.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function DeletePagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [status, setStatus] = useState(
    "Upload a PDF and select pages you want to delete."
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const selectedSet = useMemo(() => {
    return new Set(selectedPages);
  }, [selectedPages]);

  const pagesRemaining = Math.max(0, pageCount - selectedPages.length);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Rendering PDF pages...");

    try {
      setFile(selectedFile);
      setPreviews([]);
      setSelectedPages([]);

      const pdf = await loadPdfFromFile(selectedFile);
      setPageCount(pdf.numPages);

      const nextPreviews: PdfPagePreview[] = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.42);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);
      setStatus(
        `PDF loaded with ${pdf.numPages} page${
          pdf.numPages > 1 ? "s" : ""
        }. Select pages to delete.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setSelectedPages([]);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setSelectedPages([]);
    setStatus("Upload a PDF and select pages you want to delete.");
  }

  function togglePage(pageNumber: number) {
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((page) => page !== pageNumber);
      }

      return [...current, pageNumber].sort((a, b) => a - b);
    });
  }

  function selectAllPages() {
    if (!pageCount) return;

    setSelectedPages(Array.from({ length: pageCount }, (_, index) => index + 1));
    setStatus("All pages selected. Keep at least one page before exporting.");
  }

  function clearSelection() {
    setSelectedPages([]);
    setStatus("Page selection cleared.");
  }

  function selectOddPages() {
    if (!pageCount) return;

    const oddPages = Array.from({ length: pageCount }, (_, index) => index + 1)
      .filter((pageNumber) => pageNumber % 2 === 1);

    setSelectedPages(oddPages);
    setStatus("Odd pages selected for deletion.");
  }

  function selectEvenPages() {
    if (!pageCount) return;

    const evenPages = Array.from({ length: pageCount }, (_, index) => index + 1)
      .filter((pageNumber) => pageNumber % 2 === 0);

    setSelectedPages(evenPages);
    setStatus("Even pages selected for deletion.");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (selectedPages.length === 0) {
      setStatus("Select at least one page to delete.");
      return;
    }

    if (selectedPages.length >= pageCount) {
      setStatus("You cannot delete all pages. Keep at least one page.");
      return;
    }

    setBusy(true);
    setStatus("Creating PDF without selected pages...");

    try {
      const blob = await deletePagesFromPdf(file, selectedPages);

      downloadBlob(blob, "PDFMantra-deleted-pages.pdf");
      setStatus(
        `Deleted ${selectedPages.length} page${
          selectedPages.length > 1 ? "s" : ""
        }. Download started.`
      );
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error ? error.message : "Delete pages export failed."
      );
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
                  <Trash2 size={14} />
                  PDFMantra Delete Pages
                </div>

                <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                  Delete PDF Pages
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Preview your PDF, select unwanted pages, and export a clean
                  PDF with those pages removed.
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
                        Page Preview
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Click pages to mark them for deletion.
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
                        Rendering pages
                      </div>
                    </div>
                  ) : previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <Trash2 className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to preview pages and delete selected
                          ones.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => {
                        const isSelected = selectedSet.has(preview.pageNumber);

                        return (
                          <button
                            key={preview.pageNumber}
                            type="button"
                            onClick={() => togglePage(preview.pageNumber)}
                            className={`group overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition ${
                              isSelected
                                ? "border-red-400 ring-4 ring-red-100"
                                : "border-slate-200 hover:border-indigo-200 hover:shadow-md"
                            }`}
                          >
                            <div
                              className={`flex items-center justify-between border-b px-4 py-3 ${
                                isSelected
                                  ? "border-red-100 bg-red-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >
                              <div
                                className={`text-sm font-black ${
                                  isSelected ? "text-red-700" : "text-slate-800"
                                }`}
                              >
                                Page {preview.pageNumber}
                              </div>

                              <div
                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                  isSelected
                                    ? "bg-red-600 text-white"
                                    : "bg-white text-slate-500 ring-1 ring-slate-200"
                                }`}
                              >
                                {isSelected ? "Delete" : "Keep"}
                              </div>
                            </div>

                            <div className="relative flex min-h-56 items-center justify-center bg-slate-100 p-4">
                              <img
                                src={preview.previewUrl}
                                alt={`Page ${preview.pageNumber}`}
                                className={`max-h-64 rounded border bg-white shadow-sm transition ${
                                  isSelected
                                    ? "border-red-300 opacity-45 grayscale"
                                    : "border-slate-200 group-hover:scale-[1.01]"
                                }`}
                              />

                              {isSelected && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="rounded-2xl bg-red-600 px-4 py-3 text-sm font-black text-white shadow-lg">
                                    Marked for deletion
                                  </div>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Delete Settings
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={selectAllPages}
                      disabled={!file}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Select All
                    </button>

                    <button
                      onClick={clearSelection}
                      disabled={!file || selectedPages.length === 0}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Clear
                    </button>

                    <button
                      onClick={selectOddPages}
                      disabled={!file}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Odd Pages
                    </button>

                    <button
                      onClick={selectEvenPages}
                      disabled={!file}
                      className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Even Pages
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Total pages
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {pageCount || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Delete
                      </div>
                      <div className="mt-1 text-3xl font-black text-red-600">
                        {selectedPages.length || "-"}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      Pages remaining
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-950">
                      {file ? pagesRemaining : "-"}
                    </div>
                  </div>

                  {selectedPages.length > 0 && (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
                      Selected pages: {selectedPages.join(", ")}
                    </div>
                  )}

                  <button
                    onClick={handleExport}
                    disabled={busy || !file || selectedPages.length === 0}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Delete & Download
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("valid") ||
                    status.toLowerCase().includes("cannot") ||
                    status.toLowerCase().includes("select at least")
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
                    Selected pages are removed from the final exported PDF. The
                    original uploaded file is not changed.
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
