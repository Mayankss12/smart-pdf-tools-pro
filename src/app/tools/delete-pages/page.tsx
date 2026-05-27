"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { deletePdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Delete pages export failed. This PDF may be encrypted, damaged, or unsupported.";
}

function getPageNumbers(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 160) }, (_, index) => index + 1);
}

export default function DeletePagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [status, setStatus] = useState("Upload a PDF and select pages you want to delete.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const pageNumbers = useMemo(() => getPageNumbers(pageCount), [pageCount]);
  const pagesRemaining = Math.max(0, pageCount - selectedPages.length);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResult(null);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);
      setSelectedPages([]);
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Select pages to delete.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setSelectedPages([]);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setSelectedPages([]);
    setResult(null);
    setStatus("Upload a PDF and select pages you want to delete.");
  }

  function togglePage(pageNumber: number) {
    setSelectedPages((current) => {
      if (current.includes(pageNumber)) {
        return current.filter((page) => page !== pageNumber);
      }

      return [...current, pageNumber].sort((a, b) => a - b);
    });
    setResult(null);
  }

  function selectAllPages() {
    if (!pageCount) return;
    setSelectedPages(Array.from({ length: pageCount }, (_, index) => index + 1));
    setResult(null);
    setStatus("All pages selected. Keep at least one page before exporting.");
  }

  function clearSelection() {
    setSelectedPages([]);
    setResult(null);
    setStatus("Page selection cleared.");
  }

  function selectOddPages() {
    if (!pageCount) return;
    const oddPages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (pageNumber) => pageNumber % 2 === 1,
    );

    setSelectedPages(oddPages);
    setResult(null);
    setStatus("Odd pages selected for deletion.");
  }

  function selectEvenPages() {
    if (!pageCount) return;
    const evenPages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (pageNumber) => pageNumber % 2 === 0,
    );

    setSelectedPages(evenPages);
    setResult(null);
    setStatus("Even pages selected for deletion.");
  }

  async function handleExport() {
    if (!file || busy) {
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
    setResult(null);
    setStatus("Creating PDF without selected pages...");

    try {
      const output = await deletePdfPages(file, selectedPages);
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus(`Deleted ${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""}. Download started.`);
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("valid") ||
    status.toLowerCase().includes("cannot") ||
    status.toLowerCase().includes("select at least") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-rose-700 via-red-600 to-orange-600 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Trash2 size={14} />
                PDFMantra Engine Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Delete PDF Pages
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-red-50/95">
                Select unwanted pages and export a clean PDF with those pages removed through the shared page-operation engine.
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
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-red-200 bg-white p-8 text-center shadow-sm transition hover:border-red-400 hover:bg-red-50/40 focus:border-red-400 focus:outline-none focus:ring-4 focus:ring-red-100"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-600 text-white">
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
                  <div className="mt-5 rounded-[1.5rem] border border-red-100 bg-white p-5 shadow-sm">
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
                  <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Page Selection Map</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Select pages to remove. Up to 160 page cards are shown for stable browser performance.
                  </p>

                  {busy && !file ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm">
                        <Loader2 className="animate-spin text-red-600" size={18} />
                        Reading PDF
                      </div>
                    </div>
                  ) : pageNumbers.length === 0 ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-violet-50/40 text-center">
                      <div>
                        <FileText className="mx-auto text-violet-300" size={38} />
                        <div className="mt-3 text-[15px] font-semibold text-slate-950">No PDF selected</div>
                        <p className="mt-1 text-sm text-slate-600">Upload a PDF to choose pages for deletion.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                      {pageNumbers.map((pageNumber) => {
                        const isSelected = selectedSet.has(pageNumber);

                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => togglePage(pageNumber)}
                            disabled={busy}
                            className={`rounded-2xl border px-3 py-4 text-center text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              isSelected
                                ? "border-red-300 bg-red-50 text-red-700 ring-4 ring-red-100"
                                : "border-violet-100 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50"
                            }`}
                          >
                            <div>Page {pageNumber}</div>
                            <div className="mt-1 text-[10px] uppercase tracking-wide">
                              {isSelected ? "Delete" : "Keep"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Delete Settings</h2>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button type="button" onClick={selectAllPages} disabled={!file || busy} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Select All</button>
                    <button type="button" onClick={clearSelection} disabled={!file || busy || selectedPages.length === 0} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
                    <button type="button" onClick={selectOddPages} disabled={!file || busy} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Odd Pages</button>
                    <button type="button" onClick={selectEvenPages} disabled={!file || busy} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Even Pages</button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total pages</div>
                      <div className="mt-1 text-3xl font-semibold text-slate-950">{pageCount || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delete</div>
                      <div className="mt-1 text-3xl font-semibold text-red-600">{selectedPages.length || "-"}</div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pages remaining</div>
                    <div className="mt-1 text-3xl font-semibold text-slate-950">{file ? pagesRemaining : "-"}</div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  </div>

                  {selectedPages.length > 0 ? (
                    <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                      Selected pages: {selectedPages.join(", ")}
                    </div>
                  ) : null}

                  <button type="button" onClick={handleExport} disabled={busy || !file || selectedPages.length === 0} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {busy ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing</>
                    ) : (
                      <><Download size={18} /> Delete & Download</>
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                  <div className="font-semibold">How it works</div>
                  <p className="mt-2">Selected pages are removed from the exported PDF. The original uploaded file is not changed.</p>
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
