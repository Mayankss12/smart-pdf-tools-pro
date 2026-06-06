"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Copy,
  Download,
  Eraser,
  FileText,
  ListRestart,
  RotateCcw,
  Rows3,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PageGrid } from "@/components/tool-kit/PageGrid";
import { PageRangeInput } from "@/components/tool-kit/PageRangeInput";
import { PdfDropzone } from "@/components/tool-kit/PdfDropzone";
import { SelectionToolbar } from "@/components/tool-kit/SelectionToolbar";
import { StatusBar, type StatusBarType } from "@/components/tool-kit/StatusBar";
import { ToolHero } from "@/components/tool-kit/ToolHero";
import { ToolLandingState } from "@/components/tool-kit/ToolLandingState";
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
import { extractPdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Extract pages export failed. This PDF may be encrypted, damaged, or unsupported.";
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

export default function ExtractPagesPage() {
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
  const [status, setStatus] = useState("Upload a PDF and choose pages to extract.");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);
  const [autoSelectionApplied, setAutoSelectionApplied] = useState(false);

  const selectedPages = selected;
  const isBusy = pdfLoading || exporting;
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
        `PDF loaded with ${pageCount} page${pageCount > 1 ? "s" : ""}. Select pages to extract.`,
      );
    }
  }, [file, pageCount, pdfError, pdfLoading]);

  useEffect(() => {
    if (!file || pageCount <= 0 || pdfLoading || autoSelectionApplied) return;

    const defaultRange = pageCount === 1 ? "1" : `1-${Math.min(pageCount, 3)}`;
    setRangeInput(defaultRange);
    applyRangeInput(defaultRange, pageCount);
    setAutoSelectionApplied(true);
    setResult(null);
    setStatus(`Default selection applied: ${defaultRange}`);
  }, [applyRangeInput, autoSelectionApplied, file, pageCount, pdfLoading]);

  async function handleFile(selectedFile: File) {
    setResult(null);
    setRangeInput("");
    setAutoSelectionApplied(false);
    resetSelection();
    setStatus("Reading PDF and rendering page thumbnails...");

    await loadFile(selectedFile);
  }

  function clearFile() {
    resetPdf();
    resetSelection();
    setRangeInput("");
    setAutoSelectionApplied(false);
    setResult(null);
    setStatus("Upload a PDF and choose pages to extract.");
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
          ? `Page ${pageNumber} removed from extract selection.`
          : `Page ${pageNumber} selected for extraction.`,
      );
    }
  }

  function handleSelectAll() {
    selectAll(pageCount);
    setRangeInput(pageCount ? `1-${pageCount}` : "");
    setResult(null);
    setStatus("All pages selected for extraction.");
  }

  function handleSelectOdd() {
    selectOdd(pageCount);
    setResult(null);
    setStatus("Odd pages selected for extraction.");
  }

  function handleSelectEven() {
    selectEven(pageCount);
    setResult(null);
    setStatus("Even pages selected for extraction.");
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
      setStatus("Select at least one page to extract.");
      return;
    }

    setExporting(true);
    setResult(null);
    setStatus(`Extracting ${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""}...`);

    try {
      const output = await extractPdfPages(file, selectedPages);

      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "extract-pages",
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
        `Extracted ${selectedPages.length} page${selectedPages.length > 1 ? "s" : ""}. Download started.`,
      );
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

  if (!file) {
    return (
      <>
        <Header />
        <ToolLandingState
          icon={Copy}
          title="Extract PDF Pages"
          description="Pull out specific pages into a new PDF."
          ctaLabel="Select PDF file"
          tips={["Pick pages to extract", "Smart presets", "Shift+click for range"]}
          onFileSelect={(selected) => handleFile(Array.isArray(selected) ? selected[0] : selected)}
        />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolHero
            icon={Copy}
            title="Extract PDF Pages"
            description="Select pages from a visual PDF grid, use smart range controls, and export only the pages you need into a clean new PDF."
            stats={[
              { label: "Pages", value: pageCount || "-" },
              { label: "Extract", value: selectedPages.length || "-" },
              { label: "Output", value: result ? formatFileSize(result.outputSize) : "-" },
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
                      Visual Extract Grid
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Click pages to select them for extraction. Hold Shift and click another page to select a range.
                    </p>
                  </div>

                  {file ? (
                    <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-emerald-700">
                      {selectedPages.length} selected
                    </div>
                  ) : null}
                </div>

                <PageGrid
                  pages={pages}
                  selectedPages={selectedPages}
                  mode="extract"
                  onPageClick={handlePageClick}
                  loading={pdfLoading}
                  emptyMessage="Upload a PDF to choose pages for extraction."
                />
              </section>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Extract Settings
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

                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-emerald-500">
                      Extract
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-emerald-600">
                      {selectedPages.length || "-"}
                    </div>
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
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
                    <div>Selected pages</div>
                    <div className="mt-1 max-h-24 overflow-y-auto text-xs font-semibold leading-5 text-emerald-600">
                      {selectedPagesLabel}
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={isBusy || !file || selectedPages.length === 0}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {exporting ? (
                    <>
                      <RotateCcw className="animate-spin" size={18} />
                      Processing
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Extract & Download
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

              <div className="rounded-[1.5rem] border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-800">
                <div className="font-black">How it works</div>
                <p className="mt-2">
                  Selected pages are copied into a new PDF. The original uploaded file is not changed.
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
              label: "Extract & Download",
              icon: "↓",
              onClick: handleExport,
              disabled: isBusy || !file || selectedPages.length === 0,
            },
          ]}
        />
      </main>
    </>
  );
}
