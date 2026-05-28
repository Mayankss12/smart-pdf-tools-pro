"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
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
  parsePageGroups,
  validatePdfFile,
  type PageGroup,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { extractPdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Extract failed. Please check your PDF and page range.";
}

function getSelectedPages(groups: PageGroup[]) {
  return new Set(groups.flatMap((group) => group.pages));
}

function getPagePreviewNumbers(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 80) }, (_, index) => index + 1);
}

export default function ExtractPagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageInput, setPageInput] = useState("1-3");
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("Upload a PDF and choose pages to extract.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const groups = useMemo(() => {
    if (!file || pageCount <= 0) return [];

    try {
      return parsePageGroups(pageInput, pageCount);
    } catch {
      return [];
    }
  }, [file, pageCount, pageInput]);

  const selectedPages = useMemo(
    () => Array.from(getSelectedPages(groups)).sort((a, b) => a - b),
    [groups],
  );
  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const pagePreviewNumbers = useMemo(() => getPagePreviewNumbers(pageCount), [pageCount]);

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
      setPageInput(totalPages === 1 ? "1" : `1-${Math.min(totalPages, 3)}`);
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Choose pages to extract.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setResult(null);
    setStatus("Upload a PDF and choose pages to extract.");
  }

  function applyPreset(preset: string) {
    setPageInput(preset);
    setResult(null);
    setStatus(`Preset applied: ${preset}`);
  }

  async function handleExtract() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    setBusy(true);
    setResult(null);

    try {
      const parsedGroups = parsePageGroups(pageInput, pageCount);
      const pages = Array.from(getSelectedPages(parsedGroups)).sort((a, b) => a - b);
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

  const canExtract = Boolean(file && groups.length > 0 && !busy);
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Copy}
            eyebrow="PDFMantra Page Engine"
            title="Extract selected pages into a new PDF."
            description="Upload one PDF, enter exact page numbers or ranges, and download only the selected pages as a clean new PDF."
            meta={
              <div className="grid min-w-[260px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedPages.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Output</div>
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
                  if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
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
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag one PDF to begin."}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Page Selection Map</h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Selected pages are highlighted. Up to 80 pages are shown for stable performance.</p>
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
                  <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                    {pagePreviewNumbers.map((pageNumber) => {
                      const isSelected = selectedPageSet.has(pageNumber);

                      return (
                        <div
                          key={pageNumber}
                          className={`rounded-2xl border px-3 py-4 text-center text-sm font-bold transition ${
                            isSelected
                              ? "border-[var(--border-focus)] bg-[var(--violet-50)] text-[var(--violet-600)] ring-4 ring-[rgba(101,80,232,0.12)]"
                              : "border-[var(--border-light)] bg-white text-[var(--text-secondary)]"
                          }`}
                        >
                          {pageNumber}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to choose pages for extraction.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Extract Planner</h2>

                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Use commas and ranges. Example <span className="rounded-lg border border-[var(--violet-border)] bg-white px-2 py-1 font-semibold text-[var(--violet-600)]">1-3,7,10</span> extracts those pages into one PDF.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => applyPreset("1")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">Page 1</button>
                  <button type="button" onClick={() => applyPreset(pageCount ? `1-${Math.min(pageCount, 3)}` : "1-3")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">First pages</button>
                  <button type="button" onClick={() => applyPreset(pageCount ? `1-${pageCount}` : "1-3")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">All pages</button>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Pages to extract</span>
                  <input
                    value={pageInput}
                    onChange={(event) => {
                      setPageInput(event.target.value);
                      setResult(null);
                    }}
                    placeholder="Example: 1-3,7,10"
                    className="input-premium mt-2"
                  />
                </label>

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)]">
                    <Copy size={17} />
                    Output PDF
                  </div>
                  <div className="mt-3 rounded-xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-medium text-[var(--text-secondary)]">
                    <div className="font-semibold text-[var(--text-primary)]">Extracted pages</div>
                    <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                      {selectedPages.length ? `Pages ${selectedPages.join(", ")}` : "Upload a PDF and enter valid pages."}
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
