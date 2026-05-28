"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  Shuffle,
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
import { reorderPdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Reorder failed. This PDF may be encrypted, damaged, or unsupported.";
}

function createPageOrder(pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function moveItem(items: number[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export default function ReorderPagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [status, setStatus] = useState("Upload a PDF and rearrange pages before exporting.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const hasChangedOrder = useMemo(
    () => pageOrder.some((pageNumber, index) => pageNumber !== index + 1),
    [pageOrder],
  );

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
      setPageOrder(createPageOrder(totalPages));
      setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Move pages into the right order.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setPageOrder([]);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setPageOrder([]);
    setResult(null);
    setStatus("Upload a PDF and rearrange pages before exporting.");
  }

  function resetOrder() {
    setPageOrder(createPageOrder(pageCount));
    setResult(null);
    setStatus("Page order reset to original sequence.");
  }

  function reverseOrder() {
    setPageOrder((current) => [...current].reverse());
    setResult(null);
    setStatus("Page order reversed.");
  }

  function movePage(index: number, direction: -1 | 1) {
    setPageOrder((current) => moveItem(current, index, index + direction));
    setResult(null);
    setStatus("Page order updated.");
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    setBusy(true);
    setResult(null);
    setStatus("Exporting reordered PDF...");

    try {
      const output = await reorderPdfPages(file, pageOrder);
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus("Reordered PDF exported successfully. Download started.");
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={ArrowUpDown}
            eyebrow="PDFMantra Page Engine"
            title="Reorder PDF pages visually."
            description="Upload one PDF, move pages up or down, reverse order if needed, then export a reordered copy."
            meta={
              <div className="grid min-w-[260px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{hasChangedOrder ? "Yes" : "No"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Changed</div>
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
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white">
                  <Upload size={22} />
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{file ? file.name : "Drop PDF here"}</div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag one PDF to begin."}
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Page Order</h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Move pages up or down. This sequence becomes the exported PDF order.</p>
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
                ) : pageOrder.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pageOrder.map((pageNumber, index) => (
                      <div key={`${pageNumber}-${index}`} className="rounded-2xl border border-[var(--border-light)] bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-[var(--text-primary)]">Page {pageNumber}</div>
                            <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">Position {index + 1}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => movePage(index, -1)}
                              disabled={busy || index === 0}
                              className="rounded-full border border-[var(--border-light)] bg-white p-2 text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move up"
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => movePage(index, 1)}
                              disabled={busy || index === pageOrder.length - 1}
                              className="rounded-full border border-[var(--border-light)] bg-white p-2 text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move down"
                            >
                              <ArrowDown size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to reorder its pages.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Reorder Controls</h2>
                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">Use quick controls or move each page manually.</p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button type="button" onClick={reverseOrder} disabled={!file || busy} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">
                    <Shuffle size={16} /> Reverse
                  </button>
                  <button type="button" onClick={resetOrder} disabled={!file || busy} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">
                    <RotateCcw size={16} /> Reset
                  </button>
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="text-sm font-semibold text-[var(--violet-600)]">Current sequence</div>
                  <div className="mt-2 max-h-28 overflow-auto text-sm font-medium leading-6 text-[var(--text-secondary)]">
                    {pageOrder.length ? pageOrder.join(" → ") : "Upload a PDF to build page order."}
                  </div>
                </div>

                {result ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Last output</div>
                    Reordered PDF: {formatFileSize(result.outputSize)}.
                  </div>
                ) : null}

                <button type="button" onClick={handleExport} disabled={!file || busy} className="btn-primary mt-5 w-full">
                  {busy ? (
                    <><Loader2 className="animate-spin" size={18} /><span>Exporting</span></>
                  ) : (
                    <><Download size={18} /><span>Export Reordered PDF</span></>
                  )}
                </button>
              </div>

              <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[var(--shadow-soft)] ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"}`}>
                <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                {status}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
