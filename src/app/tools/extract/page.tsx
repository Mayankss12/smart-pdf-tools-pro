"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { extractPdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Extract failed. Please check your PDF and page range.";
}

function getPagePreviewNumbers(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 100) }, (_, index) => index + 1);
}

function normalizePages(pages: number[]) {
  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

function parsePageRangeInput(input: string, pageCount: number) {
  const trimmedInput = input.trim();

  if (!trimmedInput) {
    throw new Error("Enter page ranges like 1-5, 10, 15-20.");
  }

  const parts = trimmedInput.split(",");
  const pages: number[] = [];

  for (const rawPart of parts) {
    const part = rawPart.trim();

    if (!part) {
      throw new Error("Invalid range format. Use values like 1-5, 10, 15-20.");
    }

    if (part.includes("-")) {
      const [rawStart, rawEnd, extra] = part.split("-");

      if (extra !== undefined || !rawStart?.trim() || !rawEnd?.trim()) {
        throw new Error("Invalid range format. Use values like 1-5, 10, 15-20.");
      }

      const start = Number(rawStart.trim());
      const end = Number(rawEnd.trim());

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error("Page ranges must contain whole numbers only.");
      }

      if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
        throw new Error(`Page range must be between 1 and ${pageCount}.`);
      }

      if (start > end) {
        throw new Error("Range start cannot be greater than range end.");
      }

      for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
        pages.push(pageNumber);
      }
    } else {
      const pageNumber = Number(part);

      if (!Number.isInteger(pageNumber)) {
        throw new Error("Page numbers must be whole numbers only.");
      }

      if (pageNumber < 1 || pageNumber > pageCount) {
        throw new Error(`Page number must be between 1 and ${pageCount}.`);
      }

      pages.push(pageNumber);
    }
  }

  return normalizePages(pages);
}

export default function ExtractPagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [selectionHistory, setSelectionHistory] = useState<number[][]>([]);
  const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);
  const [rangeInput, setRangeInput] = useState("1-3");
  const [status, setStatus] = useState("Upload a PDF and choose pages to extract.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const pagePreviewNumbers = useMemo(() => getPagePreviewNumbers(pageCount), [pageCount]);

  function updateSelectedPages(nextPages: number[], nextStatus?: string) {
    setSelectedPages((current) => {
      const normalizedCurrent = normalizePages(current);
      const normalizedNext = normalizePages(nextPages);

      const currentKey = normalizedCurrent.join(",");
      const nextKey = normalizedNext.join(",");

      if (currentKey === nextKey) {
        return current;
      }

      setSelectionHistory((history) => [...history.slice(-9), normalizedCurrent]);
      return normalizedNext;
    });

    setResult(null);

    if (nextStatus) {
      setStatus(nextStatus);
    }
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResult(null);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();
      const defaultSelection = Array.from(
        { length: Math.min(totalPages, 3) },
        (_, index) => index + 1,
      );

      setFile(selectedFile);
      setPageCount(totalPages);
      setSelectedPages(defaultSelection);
      setSelectionHistory([]);
      setLastClickedPage(null);
      setRangeInput(totalPages === 1 ? "1" : `1-${Math.min(totalPages, 3)}`);
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Choose pages to extract.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setSelectedPages([]);
      setSelectionHistory([]);
      setLastClickedPage(null);
      setRangeInput("1-3");
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
    setSelectionHistory([]);
    setLastClickedPage(null);
    setRangeInput("1-3");
    setResult(null);
    setStatus("Upload a PDF and choose pages to extract.");
  }

  function togglePage(pageNumber: number, shiftKey = false) {
    if (shiftKey && lastClickedPage !== null) {
      const start = Math.min(lastClickedPage, pageNumber);
      const end = Math.max(lastClickedPage, pageNumber);
      const rangePages = Array.from({ length: end - start + 1 }, (_, index) => start + index);
      const nextPages = normalizePages([...selectedPages, ...rangePages]);

      updateSelectedPages(nextPages, `Selected pages ${start}-${end} for extraction.`);
      setLastClickedPage(pageNumber);
      return;
    }

    const nextPages = selectedPageSet.has(pageNumber)
      ? selectedPages.filter((page) => page !== pageNumber)
      : [...selectedPages, pageNumber];

    updateSelectedPages(nextPages);
    setLastClickedPage(pageNumber);
  }

  function applyPreset(preset: string) {
    if (!file || !pageCount) {
      setRangeInput(preset);
      setStatus(`Preset ready: ${preset}`);
      return;
    }

    try {
      const parsedPages = parsePageRangeInput(preset, pageCount);
      setRangeInput(preset);
      updateSelectedPages(parsedPages, `Preset applied: ${preset}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid preset.");
    }
  }

  function applyRangeInput() {
    if (!file || !pageCount) {
      setStatus("Upload a PDF first.");
      return;
    }

    try {
      const parsedPages = parsePageRangeInput(rangeInput, pageCount);
      updateSelectedPages(parsedPages, `Applied range selection: ${rangeInput.trim()}`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Invalid range input.");
    }
  }

  function selectAllPages() {
    if (!pageCount) return;

    updateSelectedPages(
      Array.from({ length: pageCount }, (_, index) => index + 1),
      "All pages selected for extraction.",
    );
    setRangeInput(`1-${pageCount}`);
  }

  function clearSelection() {
    updateSelectedPages([], "Page selection cleared.");
  }

  function selectOddPages() {
    if (!pageCount) return;

    const oddPages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (pageNumber) => pageNumber % 2 === 1,
    );

    updateSelectedPages(oddPages, "Odd pages selected for extraction.");
    setRangeInput("Odd pages");
  }

  function selectEvenPages() {
    if (!pageCount) return;

    const evenPages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (pageNumber) => pageNumber % 2 === 0,
    );

    updateSelectedPages(evenPages, "Even pages selected for extraction.");
    setRangeInput("Even pages");
  }

  function invertSelection() {
    if (!pageCount) return;

    const invertedPages = Array.from({ length: pageCount }, (_, index) => index + 1).filter(
      (pageNumber) => !selectedPageSet.has(pageNumber),
    );

    updateSelectedPages(invertedPages, "Selection inverted.");
  }

  function undoSelection() {
    setSelectionHistory((history) => {
      if (history.length === 0) return history;

      const previousSelection = history[history.length - 1];
      setSelectedPages(previousSelection);
      setResult(null);
      setStatus("Selection restored.");
      return history.slice(0, -1);
    });
  }

  async function handleExtract() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    if (selectedPages.length === 0) {
      setStatus("Select at least one page to extract.");
      return;
    }

    setBusy(true);
    setResult(null);

    try {
      const pages = normalizePages(selectedPages);

      setStatus(`Extracting ${pages.length} page${pages.length > 1 ? "s" : ""}...`);

      const output = await extractPdfPages(file, pages);

      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus(`Extracted ${pages.length} page${pages.length > 1 ? "s" : ""}. Download started.`);
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const canExtract = Boolean(file && selectedPages.length > 0 && !busy);
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("range") ||
    status.toLowerCase().includes("whole numbers") ||
    status.toLowerCase().includes("select at least");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Copy}
            eyebrow="PDFMantra Page Engine"
            title="Extract selected pages into a new PDF."
            description="Upload one PDF, select pages visually or by range, and download only those pages as a clean new PDF."
            meta={
              <div className="grid min-w-[260px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {pageCount || "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Pages
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {selectedPages.length || "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Selected
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {result ? formatFileSize(result.outputSize) : "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Output
                  </div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] lg:grid-cols-[1fr_390px]">
            <section className="min-h-[620px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  <Upload size={22} />
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}`
                    : "Click here or drag one PDF to begin."}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Visual Extract Grid
                    </h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      Click pages to include them. Hold Shift and click another page to select a range.
                    </p>
                  </div>

                  {file ? (
                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  ) : null}
                </div>

                {busy && !file ? (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : pagePreviewNumbers.length > 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {pagePreviewNumbers.map((pageNumber) => {
                      const isSelected = selectedPageSet.has(pageNumber);

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={(event) => togglePage(pageNumber, event.shiftKey)}
                          disabled={busy}
                          className={`group overflow-hidden rounded-[1.5rem] border text-left shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                            isSelected
                              ? "border-[var(--border-focus)] bg-[var(--violet-50)] ring-2 ring-[rgba(101,80,232,0.16)]"
                              : "border-[var(--border-light)] bg-white hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)]/60"
                          }`}
                        >
                          <div
                            className={`flex items-center justify-between border-b px-4 py-3 ${
                              isSelected
                                ? "border-[var(--violet-border)] bg-[var(--violet-50)]"
                                : "border-[var(--border-light)] bg-slate-50"
                            }`}
                          >
                            <span
                              className={`text-sm font-semibold ${
                                isSelected ? "text-[var(--violet-600)]" : "text-[var(--text-primary)]"
                              }`}
                            >
                              Page {pageNumber}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                                isSelected
                                  ? "bg-[var(--violet-600)] text-white"
                                  : "bg-white text-[var(--text-muted)]"
                              }`}
                            >
                              {isSelected ? "Extract" : "Skip"}
                            </span>
                          </div>

                          <div className="flex min-h-36 items-center justify-center bg-slate-50 p-4">
                            <div
                              className={`relative flex h-24 w-16 items-center justify-center rounded-xl border bg-white text-sm font-bold shadow-sm transition ${
                                isSelected
                                  ? "border-[var(--border-focus)] text-[var(--violet-600)]"
                                  : "border-[var(--border-light)] text-[var(--text-muted)] group-hover:border-[var(--violet-border)]"
                              }`}
                            >
                              <div className="absolute left-2 top-2 h-1.5 w-8 rounded-full bg-slate-200" />
                              <div className="absolute left-2 top-5 h-1.5 w-10 rounded-full bg-slate-100" />
                              {pageNumber}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                        Upload a PDF to choose pages for extraction.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Extract Planner
                </h2>

                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Select pages visually or use exact ranges. Example{" "}
                  <span className="rounded-lg border border-[var(--violet-border)] bg-white px-2 py-1 font-semibold text-[var(--violet-600)]">
                    1-3,7,10
                  </span>{" "}
                  extracts those pages into one PDF.
                </p>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Pages to extract</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={rangeInput}
                      onChange={(event) => setRangeInput(event.target.value)}
                      disabled={!file || busy}
                      placeholder="Example: 1-3,7,10"
                      className="input-premium min-w-0 flex-1"
                    />
                    <button
                      type="button"
                      onClick={applyRangeInput}
                      disabled={!file || busy}
                      className="rounded-2xl bg-[var(--violet-600)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--violet-500)] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Apply
                    </button>
                  </div>
                </label>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("1")}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Page 1
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset(pageCount ? `1-${Math.min(pageCount, 3)}` : "1-3")}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    First pages
                  </button>

                  <button
                    type="button"
                    onClick={selectOddPages}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Odd pages
                  </button>

                  <button
                    type="button"
                    onClick={selectEvenPages}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Even pages
                  </button>

                  <button
                    type="button"
                    onClick={selectAllPages}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-2 text-xs font-semibold text-[var(--violet-600)] transition hover:bg-[var(--violet-100)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    All pages
                  </button>

                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={!file || busy || selectedPages.length === 0}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Clear
                  </button>

                  <button
                    type="button"
                    onClick={invertSelection}
                    disabled={!file || busy}
                    className="rounded-2xl border border-[var(--violet-border)] bg-white px-3 py-2 text-xs font-semibold text-[var(--violet-600)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Invert
                  </button>

                  <button
                    type="button"
                    onClick={undoSelection}
                    disabled={busy || selectionHistory.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={14} />
                    Undo
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)]">
                    <Copy size={17} />
                    Output PDF
                  </div>
                  <div className="mt-3 rounded-xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-medium text-[var(--text-secondary)]">
                    <div className="font-semibold text-[var(--text-primary)]">Extracted pages</div>
                    <div className="mt-1 max-h-24 overflow-y-auto text-xs font-medium leading-5 text-[var(--text-muted)]">
                      {selectedPages.length ? `Pages ${selectedPages.join(", ")}` : "Select at least one page."}
                    </div>
                  </div>
                </div>

                {result ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={16} />
                      Last output
                    </div>
                    New PDF created: {formatFileSize(result.outputSize)}.
                  </div>
                ) : null}

                <button type="button" onClick={handleExtract} disabled={!canExtract} className="btn-primary mt-5 w-full">
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Extracting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Extract & Download</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Sparkles size={16} />
                  Engine extraction
                </div>
                Selected pages are copied into one new PDF. The original uploaded file is not changed.
              </div>

              <div
                className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[var(--shadow-soft)] ${
                  statusLooksLikeError
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Status
                </div>
                {status}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
