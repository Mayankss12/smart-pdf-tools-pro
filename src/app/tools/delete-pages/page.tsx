"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Download,
  Eraser,
  FileText,
  ListRestart,
  RotateCcw,
  Rows3,
  Trash2,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PageGrid } from "@/components/tool-kit/PageGrid";
import { PageRangeInput } from "@/components/tool-kit/PageRangeInput";
import { PdfDropzone } from "@/components/tool-kit/PdfDropzone";
import { SelectionToolbar } from "@/components/tool-kit/SelectionToolbar";
import { StatusBar, type StatusBarType } from "@/components/tool-kit/StatusBar";
import { ToolHero } from "@/components/tool-kit/ToolHero";
import { ToolToolbar } from "@/components/tool-kit/ToolToolbar";
import { useEntitlement } from "@/hooks/useEntitlement";
import { usePdfPages } from "@/hooks/usePdfPages";
import { useRangeSelection } from "@/hooks/useRangeSelection";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { deletePdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Delete pages export failed. This PDF may be encrypted, damaged, or unsupported.";
}

function getStatusType(message: string, result: PdfProcessingResult | null): StatusBarType {
  const lowerMessage = message.toLowerCase();

  if (result || lowerMessage.includes("download started")) return "success";

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("valid") ||
    lowerMessage.includes("cannot") ||
    lowerMessage.includes("select at least") ||
    lowerMessage.includes("unsupported") ||
    lowerMessage.includes("too large") ||
    lowerMessage.includes("empty") ||
    lowerMessage.includes("range") ||
    lowerMessage.includes("unable") ||
    lowerMessage.includes("limit") ||
    lowerMessage.includes("whole numbers")
  ) {
    return "error";
  }

  return "info";
}

export default function DeletePagesPage() {
  const { recordExport } = useEntitlement();

  const {
    file,
    pages,
    pageCount,
    loading: pdfLoading,
    progress,
    error: pdfError,
    loadFile,
    reset: resetPdf,
  } = usePdfPages();

  const {
    selected,
    selectedSet,
    togglePage,
    selectAll,
    selectOdd,
    selectEven,
    invertSelection,
    clearSelection,
    applyRangeInput,
    undoSelection,
    resetSelection,
    canUndo,
    lastError,
  } = useRangeSelection();

  const [rangeInput, setRangeInput] = useState("");
  const [status, setStatus] = useState("Upload a PDF and select pages you want to delete.");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedPages = selected;
  const isBusy = pdfLoading || exporting;
  const pagesRemaining = Math.max(0, pageCount - selectedPages.length);
  const statusType = getStatusType(lastError || pdfError || status, result);

  const selectedPagesLabel = useMemo(() => {
    if (selectedPages.length === 0) return "No pages selected";
    if (selectedPages.length <= 24) return selectedPages.join(", ");
    return `${selectedPages.slice(0, 24).join(", ")}, +${selectedPages.length - 24} more`;
  }, [selectedPages]);

  useEffect(() => {
    if (pdfError) {
      setStatus(pdfError);
      return;
    }

    if (file && pageCount > 0 && !pdfLoading) {
      setStatus(
        `PDF loaded with ${pageCount} page${pageCount > 1 ? "s" : ""}. Select pages to delete.`,
      );
    }
  }, [file, pageCount, pdfError, pdfLoading]);

  async function handleFile(selectedFile: File) {
    setResult(null);
    setRangeInput("");
    resetSelection();
    setStatus("Reading PDF and rendering page thumbnails...");

    await loadFile(selectedFile);
  }

  function clearFile() {
    resetPdf();
    resetSelection();
    setRangeInput("");
    setResult(null);
    setStatus("Upload a PDF and select pages you want to delete.");
  }

  function handlePageClick(
    pageNumber: number,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    togglePage(pageNumber, event);
    setResult(null);

    if (event.shiftKey) {
      setStatus("Range selection updated.");
    } else {
      setStatus(
        selectedSet.has(pageNumber)
          ? `Page ${pageNumber} removed from delete selection.`
          : `Page ${pageNumber} marked for deletion.`,
      );
    }
  }

  function handleSelectAll() {
    selectAll(pageCount);
    setResult(null);
    setStatus("All pages selected. Keep at least one page before exporting.");
  }

  function handleSelectOdd() {
    selectOdd(pageCount);
    setResult(null);
    setStatus("Odd pages selected for deletion.");
  }

  function handleSelectEven() {
    selectEven(pageCount);
    setResult(null);
    setStatus("Even pages selected for deletion.");
  }

  function handleInvertSelection() {
    invertSelection(pageCount);
    setResult(null);
    setStatus("Selection inverted.");
  }

  function handleClearSelection() {
    clearSelection();
    setResult(null);
    setStatus("Page selection cleared.");
  }

  function handleUndoSelection() {
    undoSelection();
    setResult(null);
    setStatus("Selection restored.");
  }

  function handleApplyRangeInput() {
    const applied = applyRangeInput(rangeInput, pageCount);

    setResult(null);

    if (applied) {
      setStatus(`Applied range selection: ${rangeInput.trim()}`);
    }
  }

  async function handleExport() {
    if (!file || exporting) {
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

    setExporting(true);
    setResult(null);
    setStatus("Creating PDF without selected pages...");

    try {
      const output = await deletePdfPages(file, selectedPages);

      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "delete-pages",
        exportKind: "clean",
      });

      if (!exportRecord.allowed) {
        setResult(null);

        const limitMessage =
          exportRecord.error ||
          (exportRecord.identityType === "guest"
            ? "Guest clean export limit reached for today. Sign in to get 5 clean exports/day."
            : `${exportRecord.planLabel} clean export limit reached for today.`);

        setStatus(limitMessage);
        return;
      }

      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus(
        `Deleted ${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""}. Download started.`,
      );
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolHero
            icon={Trash2}
            title="Delete PDF Pages"
            description="Select unwanted pages from a visual page grid, use ranges for speed, and export a clean PDF with those pages removed."
            stats={[
              { label: "Pages", value: pageCount || "-" },
              { label: "Delete", value: selectedPages.length || "-" },
              { label: "Remaining", value: file ? pagesRemaining : "-" },
            ]}
          />

          <section className="grid gap-6 lg:grid-cols-[1fr_390px]">
            <div className="space-y-5">
              <PdfDropzone
                onFile={handleFile}
                loading={pdfLoading}
                loadingLabel="Reading PDF..."
                progress={progress}
                currentFileName={file?.name}
                pageCount={pageCount || undefined}
                fileSize={file?.size}
              />

              {file ? (
                <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                        Selected file
                      </div>
                      <div className="mt-1 truncate text-lg font-black tracking-[-0.03em] text-slate-950">
                        {file.name}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        Original size: {formatFileSize(file.size)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={isBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}

              <section className="rounded-[1.5rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="text-[1.75rem] font-black tracking-[-0.04em] text-slate-950">
                      Visual Delete Grid
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Click pages to mark them for deletion. Hold Shift and click another page to select a range.
                    </p>
                  </div>

                  {file ? (
                    <div className="rounded-full border border-red-100 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-red-700">
                      {selectedPages.length} selected
                    </div>
                  ) : null}
                </div>

                <PageGrid
                  pages={pages}
                  selectedPages={selectedPages}
                  mode="delete"
                  onPageClick={handlePageClick}
                  loading={pdfLoading}
                  emptyMessage="Upload a PDF to choose pages for deletion."
                />
              </section>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Delete Settings
                </h2>

                <div className="mt-5">
                  <PageRangeInput
                    value={rangeInput}
                    onChange={setRangeInput}
                    onApply={handleApplyRangeInput}
                    maxPages={pageCount}
                    disabled={!file || isBusy}
                    error={lastError}
                  />
                </div>

                <div className="mt-5">
                  <ToolToolbar
                    description="Quick selection presets"
                    actions={[
                      {
                        label: "All",
                        icon: CheckSquare,
                        onClick: handleSelectAll,
                        disabled: !file || isBusy,
                      },
                      {
                        label: "Clear",
                        icon: Eraser,
                        onClick: handleClearSelection,
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                    ]}
                    moreOptions={[
                      {
                        label: "Odd Pages",
                        icon: Rows3,
                        onClick: handleSelectOdd,
                        disabled: !file || isBusy,
                      },
                      {
                        label: "Even Pages",
                        icon: Rows3,
                        onClick: handleSelectEven,
                        disabled: !file || isBusy,
                      },
                      {
                        label: "Invert Selection",
                        icon: ListRestart,
                        onClick: handleInvertSelection,
                        disabled: !file || isBusy,
                      },
                      {
                        label: "Undo Selection",
                        icon: RotateCcw,
                        onClick: handleUndoSelection,
                        disabled: isBusy || !canUndo,
                      },
                    ]}
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                      Total pages
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-red-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-red-400">
                      Delete
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-red-600">
                      {selectedPages.length || "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Pages remaining
                  </div>
                  <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
                    {file ? pagesRemaining : "-"}
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Output
                  </div>
                  <div className="mt-1 text-xl font-black tracking-[-0.03em] text-slate-950">
                    {result ? formatFileSize(result.outputSize) : "-"}
                  </div>
                </div>

                {selectedPages.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
                    <div>Selected pages</div>
                    <div className="mt-1 max-h-24 overflow-y-auto text-xs font-semibold leading-5 text-red-600">
                      {selectedPagesLabel}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isBusy || !file || selectedPages.length === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-red-100 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exporting ? (
                    <>
                      <RotateCcw className="animate-spin" size={18} />
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

              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center gap-2 text-sm font-black text-slate-800">
                  <FileText size={16} />
                  Status
                </div>
                <StatusBar message={lastError || pdfError || status} type={statusType} />
              </div>

              <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                <div className="font-black">How it works</div>
                <p className="mt-2">
                  Selected pages are removed from the exported PDF. The original uploaded file is not changed.
                </p>
              </div>
            </aside>
          </section>
        </section>

        <SelectionToolbar
          visible={selectedPages.length > 0}
          selectedCount={selectedPages.length}
          actions={[
            {
              label: "Undo",
              icon: "↶",
              onClick: handleUndoSelection,
              disabled: isBusy || !canUndo,
            },
            {
              label: "Clear",
              icon: "×",
              onClick: handleClearSelection,
              disabled: isBusy,
            },
            {
              label: "Delete & Download",
              icon: "↓",
              onClick: handleExport,
              danger: true,
              disabled: isBusy || !file || selectedPages.length === 0,
            },
          ]}
        />
      </main>
    </>
  );
}
