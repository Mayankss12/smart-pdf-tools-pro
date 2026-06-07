"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  CheckSquare,
  Download,
  FileText,
  ListRestart,
  Loader2,
  RotateCcw,
  RotateCw,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PageGrid } from "@/components/tool-kit/PageGrid";
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
  normalizePdfRotation,
  rotatePdfWithMap,
  type PdfProcessingResult,
  type RotationMap,
} from "@/lib/pdf-engine";

type RotationDegree = 90 | 180 | 270;

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Rotation export failed. Please check your PDF and try again.";
}

function getStatusType(message: string, result: PdfProcessingResult | null): StatusBarType {
  const lowerMessage = message.toLowerCase();

  if (result || lowerMessage.includes("download started")) return "success";

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("valid") ||
    lowerMessage.includes("unsupported") ||
    lowerMessage.includes("too large") ||
    lowerMessage.includes("unable") ||
    lowerMessage.includes("limit") ||
    lowerMessage.includes("empty") ||
    lowerMessage.includes("upload a pdf") ||
    lowerMessage.includes("select pages")
  ) {
    return "error";
  }

  return "info";
}

function cloneRotationMap(map: RotationMap): RotationMap {
  return { ...map };
}

function areRotationMapsEqual(first: RotationMap, second: RotationMap) {
  const keys = new Set([...Object.keys(first), ...Object.keys(second)]);

  for (const key of keys) {
    const pageNumber = Number(key);
    const firstRotation = normalizePdfRotation(first[pageNumber] || 0);
    const secondRotation = normalizePdfRotation(second[pageNumber] || 0);

    if (firstRotation !== secondRotation) return false;
  }

  return true;
}

function getSelectedPagesLabel(selectedPages: number[]) {
  if (selectedPages.length === 0) return "No pages selected";
  if (selectedPages.length <= 24) return selectedPages.join(", ");
  return `${selectedPages.slice(0, 24).join(", ")}, +${selectedPages.length - 24} more`;
}

export default function RotatePage() {
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
    clearSelection,
    resetSelection,
    undoSelection,
    canUndo,
    lastError,
  } = useRangeSelection();

  const [rotationMap, setRotationMap] = useState<RotationMap>({});
  const [rotationPast, setRotationPast] = useState<RotationMap[]>([]);
  const [rotationFuture, setRotationFuture] = useState<RotationMap[]>([]);
  const [status, setStatus] = useState("Upload a PDF to rotate pages.");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedPages = selected;
  const isBusy = pdfLoading || exporting;
  const statusType = getStatusType(lastError || pdfError || status, result);

  const changedPages = useMemo(
    () =>
      Object.values(rotationMap).filter(
        (rotation) => normalizePdfRotation(rotation) !== 0,
      ).length,
    [rotationMap],
  );

  const selectedPagesLabel = useMemo(
    () => getSelectedPagesLabel(selectedPages),
    [selectedPages],
  );

  const canUndoRotation = rotationPast.length > 0;
  const canRedoRotation = rotationFuture.length > 0;

  useEffect(() => {
    if (pdfError) {
      setStatus(pdfError);
      return;
    }

    if (file && pageCount > 0 && !pdfLoading) {
      setStatus(
        `PDF loaded with ${pageCount} page${pageCount > 1 ? "s" : ""}. Rotate pages visually.`,
      );
    }
  }, [file, pageCount, pdfError, pdfLoading]);

  async function handleFile(selectedFile: File) {
    setResult(null);
    setRotationMap({});
    setRotationPast([]);
    setRotationFuture([]);
    resetSelection();
    setStatus("Reading PDF and rendering page thumbnails...");

    await loadFile(selectedFile);
  }

  function clearFile() {
    resetPdf();
    resetSelection();
    setRotationMap({});
    setRotationPast([]);
    setRotationFuture([]);
    setResult(null);
    setStatus("Upload a PDF to rotate pages.");
  }

  function commitRotationMap(nextMap: RotationMap, nextStatus: string) {
    if (areRotationMapsEqual(rotationMap, nextMap)) {
      setStatus(nextStatus);
      return;
    }

    setRotationPast((current) => [...current.slice(-19), cloneRotationMap(rotationMap)]);
    setRotationFuture([]);
    setRotationMap(cloneRotationMap(nextMap));
    setResult(null);
    setStatus(nextStatus);
  }

  function rotatePage(pageNumber: number, direction: "left" | "right") {
    const delta = direction === "left" ? -90 : 90;

    commitRotationMap(
      {
        ...rotationMap,
        [pageNumber]: normalizePdfRotation((rotationMap[pageNumber] || 0) + delta),
      },
      `Page ${pageNumber} rotation updated.`,
    );
  }

  function resetPage(pageNumber: number) {
    commitRotationMap(
      {
        ...rotationMap,
        [pageNumber]: 0,
      },
      `Page ${pageNumber} rotation reset.`,
    );
  }

  function rotateAll(degreeValue: RotationDegree) {
    if (!pageCount) {
      setStatus("Upload a PDF first.");
      return;
    }

    const nextMap: RotationMap = {};

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      nextMap[pageNumber] = degreeValue;
    }

    commitRotationMap(nextMap, `All pages set to ${degreeValue}° rotation.`);
  }

  function resetAll() {
    commitRotationMap({}, "All rotations cleared.");
  }

  function rotateSelectedPages(degreeValue: RotationDegree) {
    if (selectedPages.length === 0) {
      setStatus("Select pages first to rotate them.");
      return;
    }

    const nextMap: RotationMap = { ...rotationMap };

    selectedPages.forEach((pageNumber) => {
      nextMap[pageNumber] = degreeValue;
    });

    commitRotationMap(
      nextMap,
      `Rotated ${selectedPages.length} selected page${selectedPages.length > 1 ? "s" : ""} to ${degreeValue}°.`,
    );
  }

  function resetSelectedPages() {
    if (selectedPages.length === 0) {
      setStatus("Select pages first to reset them.");
      return;
    }

    const nextMap: RotationMap = { ...rotationMap };

    selectedPages.forEach((pageNumber) => {
      nextMap[pageNumber] = 0;
    });

    commitRotationMap(
      nextMap,
      `Reset rotation for ${selectedPages.length} selected page${selectedPages.length > 1 ? "s" : ""}.`,
    );
  }

  function undoRotation() {
    const previousMap = rotationPast[rotationPast.length - 1];

    if (!previousMap) {
      setStatus("No rotation change to undo.");
      return;
    }

    setRotationPast((current) => current.slice(0, -1));
    setRotationFuture((current) => [cloneRotationMap(rotationMap), ...current.slice(0, 19)]);
    setRotationMap(cloneRotationMap(previousMap));
    setResult(null);
    setStatus("Rotation change undone.");
  }

  function redoRotation() {
    const nextMap = rotationFuture[0];

    if (!nextMap) {
      setStatus("No rotation change to redo.");
      return;
    }

    setRotationFuture((current) => current.slice(1));
    setRotationPast((current) => [...current.slice(-19), cloneRotationMap(rotationMap)]);
    setRotationMap(cloneRotationMap(nextMap));
    setResult(null);
    setStatus("Rotation change redone.");
  }

  function handlePageClick(pageNumber: number, event: MouseEvent<HTMLDivElement>) {
    togglePage(pageNumber, event);
    setResult(null);

    if (event.shiftKey) {
      setStatus("Range selection updated.");
      return;
    }

    setStatus(
      selectedSet.has(pageNumber)
        ? `Page ${pageNumber} removed from rotation selection.`
        : `Page ${pageNumber} selected for rotation.`,
    );
  }

  function handleSelectAll() {
    selectAll(pageCount);
    setResult(null);
    setStatus("All pages selected.");
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

  async function handleExport() {
    if (!file || exporting) {
      setStatus("Upload a PDF first.");
      return;
    }

    setExporting(true);
    setResult(null);
    setStatus("Applying rotations with PDFMantra engine...");

    try {
      const output = await rotatePdfWithMap(file, rotationMap);

      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "rotate-pdf",
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
      setStatus("Rotated PDF exported successfully. Download started.");
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
          icon={RotateCw}
          title="Rotate PDF Pages"
          description="Rotate individual pages or all pages together."
          ctaLabel="Select PDF file"
          tips={["Multi-select pages", "Batch rotate 90/180/270", "Selective control"]}
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
            icon={RotateCw}
            title="Rotate PDF Pages"
            description="Rotate individual pages, selected pages, or the full PDF from a visual page grid, then export a clean rotated PDF."
            stats={[
              { label: "Pages", value: pageCount || "-" },
              { label: "Changed", value: changedPages || "-" },
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
                      Visual Rotation Grid
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Click pages to select them. Hold Shift and click another page to select a range.
                    </p>
                  </div>

                  {file ? (
                    <div className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--violet-700)]">
                      {selectedPages.length} selected
                    </div>
                  ) : null}
                </div>

                <PageGrid
                  pages={pages}
                  selectedPages={selectedPages}
                  mode="rotate"
                  rotationMap={rotationMap}
                  onPageClick={handlePageClick}
                  loading={pdfLoading}
                  emptyMessage="Upload a PDF to rotate pages visually."
                  renderHoverActions={(page) => (
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          rotatePage(page.pageNumber, "left");
                        }}
                        disabled={isBusy}
                        className="rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        -90°
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          resetPage(page.pageNumber);
                        }}
                        disabled={isBusy}
                        className="rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        0°
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          rotatePage(page.pageNumber, "right");
                        }}
                        disabled={isBusy}
                        className="rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +90°
                      </button>
                    </div>
                  )}
                />
              </section>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Rotate Settings
                </h2>

                <div className="mt-5 space-y-4">
                  <ToolToolbar
                    description="All Pages"
                    actions={[
                      {
                        label: "90°",
                        icon: RotateCw,
                        onClick: () => rotateAll(90),
                        disabled: !file || isBusy,
                      },
                      {
                        label: "180°",
                        icon: RotateCw,
                        onClick: () => rotateAll(180),
                        disabled: !file || isBusy,
                      },
                      {
                        label: "270°",
                        icon: RotateCw,
                        onClick: () => rotateAll(270),
                        disabled: !file || isBusy,
                      },
                    ]}
                    moreOptions={[
                      {
                        label: "Reset All",
                        icon: ListRestart,
                        onClick: resetAll,
                        disabled: !file || isBusy || changedPages === 0,
                      },
                    ]}
                  />

                  <ToolToolbar
                    description="Selected Pages"
                    actions={[
                      {
                        label: "90°",
                        icon: RotateCw,
                        onClick: () => rotateSelectedPages(90),
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "180°",
                        icon: RotateCw,
                        onClick: () => rotateSelectedPages(180),
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "270°",
                        icon: RotateCw,
                        onClick: () => rotateSelectedPages(270),
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                    ]}
                    moreOptions={[
                      {
                        label: "Reset Selected",
                        icon: RotateCcw,
                        onClick: resetSelectedPages,
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "Select All",
                        icon: CheckSquare,
                        onClick: handleSelectAll,
                        disabled: !file || isBusy,
                      },
                      {
                        label: "Clear Selection",
                        icon: X,
                        onClick: handleClearSelection,
                        disabled: !file || isBusy || selectedPages.length === 0,
                      },
                    ]}
                  />

                  <ToolToolbar
                    description="History and export"
                    actions={[
                      {
                        label: "Undo",
                        icon: RotateCcw,
                        onClick: undoRotation,
                        disabled: isBusy || !canUndoRotation,
                      },
                      {
                        label: "Redo",
                        icon: RotateCw,
                        onClick: redoRotation,
                        disabled: isBusy || !canRedoRotation,
                      },
                    ]}
                    primaryAction={{
                      label: exporting ? "Processing" : "Export PDF",
                      icon: exporting ? Loader2 : Download,
                      onClick: handleExport,
                      disabled: !file || isBusy,
                      loading: exporting,
                    }}
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

                  <div className="rounded-2xl bg-[var(--violet-50)] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--violet-700)]">
                      Changed
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-[var(--violet-700)]">
                      {changedPages || "-"}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Selected pages
                  </div>
                  <div className="mt-1 max-h-24 overflow-y-auto text-sm font-bold leading-6 text-slate-700">
                    {selectedPagesLabel}
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
                  Page thumbnails rotate visually in the grid. The final export uses the existing PDFMantra rotate engine and does not change the original uploaded file.
                </p>
              </div>
            </aside>
          </section>
        </section>

        <SelectionToolbar
          visible={selectedPages.length > 0}
          selectedCount={selectedPages.length}
          selectedLabel={`${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"} selected`}
          actions={[
            {
              label: "90°",
              icon: "↻",
              onClick: () => rotateSelectedPages(90),
              disabled: isBusy,
            },
            {
              label: "180°",
              icon: "↻",
              onClick: () => rotateSelectedPages(180),
              disabled: isBusy,
            },
            {
              label: "270°",
              icon: "↻",
              onClick: () => rotateSelectedPages(270),
              disabled: isBusy,
            },
            {
              label: "Reset",
              icon: "0°",
              onClick: resetSelectedPages,
              disabled: isBusy,
            },
            {
              label: "Undo Select",
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
              label: "Export",
              icon: "↓",
              onClick: handleExport,
              disabled: isBusy || !file,
            },
          ]}
        />
      </main>
    </>
  );
}
