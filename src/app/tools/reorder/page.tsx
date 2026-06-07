"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckSquare,
  Download,
  Eraser,
  FileText,
  ListRestart,
  Loader2,
  Redo2,
  RotateCcw,
  Shuffle,
  Undo2,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PageGrid, type PageGridData } from "@/components/tool-kit/PageGrid";
import { PdfDropzone } from "@/components/tool-kit/PdfDropzone";
import { SelectionToolbar } from "@/components/tool-kit/SelectionToolbar";
import { StatusBar, type StatusBarType } from "@/components/tool-kit/StatusBar";
import { ToolHero } from "@/components/tool-kit/ToolHero";
import { ToolLandingState } from "@/components/tool-kit/ToolLandingState";
import { ToolToolbar } from "@/components/tool-kit/ToolToolbar";
import { useEntitlement } from "@/hooks/useEntitlement";
import { usePdfPages } from "@/hooks/usePdfPages";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { reorderPdfPages } from "@/lib/pdf-page-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Reorder failed. This PDF may be encrypted, damaged, or unsupported.";
}

function createPageOrder(pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function ordersEqual(first: number[], second: number[]) {
  if (first.length !== second.length) return false;
  return first.every((pageNumber, index) => pageNumber === second[index]);
}

function moveItem(items: number[], fromIndex: number, toIndex: number) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= items.length ||
    toIndex >= items.length
  ) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);

  return next;
}

function pluralizePage(count: number) {
  return `${count} page${count === 1 ? "" : "s"}`;
}

function getStatusType(message: string, result: PdfProcessingResult | null): StatusBarType {
  const lowerMessage = message.toLowerCase();

  if (result || lowerMessage.includes("download started")) return "success";

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("valid") ||
    lowerMessage.includes("cannot") ||
    lowerMessage.includes("select") ||
    lowerMessage.includes("unsupported") ||
    lowerMessage.includes("too large") ||
    lowerMessage.includes("empty") ||
    lowerMessage.includes("unable") ||
    lowerMessage.includes("limit") ||
    lowerMessage.includes("no pages")
  ) {
    return "error";
  }

  return "info";
}

function getSelectedPagesLabel(selectedPages: number[], pageOrder: number[]) {
  if (selectedPages.length === 0) return "No pages selected";

  const selectedSet = new Set(selectedPages);
  const selectedInOrder = pageOrder.filter((pageNumber) => selectedSet.has(pageNumber));

  if (selectedInOrder.length <= 24) return selectedInOrder.join(", ");
  return `${selectedInOrder.slice(0, 24).join(", ")}, +${selectedInOrder.length - 24} more`;
}

export default function ReorderPagesPage() {
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

  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);

  const [historyPast, setHistoryPast] = useState<number[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<number[][]>([]);

  const [status, setStatus] = useState("Upload a PDF and rearrange pages before exporting.");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const isBusy = pdfLoading || exporting;
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const pageMap = useMemo(() => {
    return new Map(pages.map((page) => [page.pageNumber, page]));
  }, [pages]);

  const orderedPages = useMemo<PageGridData[]>(() => {
    return pageOrder.map((pageNumber, index) => {
      const page = pageMap.get(pageNumber);

      return {
        pageNumber,
        position: index + 1,
        thumbnailUrl: page?.thumbnailUrl || page?.thumbnail || "",
        thumbnail: page?.thumbnail || page?.thumbnailUrl || "",
        isMoved: pageNumber !== index + 1,
      };
    });
  }, [pageMap, pageOrder]);

  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const hasChangedOrder = useMemo(
    () => pageOrder.some((pageNumber, index) => pageNumber !== index + 1),
    [pageOrder],
  );

  const selectedPagesLabel = useMemo(
    () => getSelectedPagesLabel(selectedPages, pageOrder),
    [pageOrder, selectedPages],
  );

  const statusMessage = pdfError || status;
  const statusType = getStatusType(statusMessage, result);

  const commitOrder = useCallback(
    (nextOrder: number[], message: string) => {
      if (!nextOrder.length || ordersEqual(nextOrder, pageOrder)) {
        setStatus("No order change needed.");
        return;
      }

      setHistoryPast((current) => [...current.slice(-24), pageOrder]);
      setHistoryFuture([]);
      setPageOrder(nextOrder);
      setResult(null);
      setStatus(message);
    },
    [pageOrder],
  );

  const undoOrder = useCallback(() => {
    const previous = historyPast[historyPast.length - 1];

    if (!previous) {
      setStatus("No order change to undo.");
      return;
    }

    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [pageOrder, ...current].slice(0, 25));
    setPageOrder(previous);
    setResult(null);
    setStatus("Undo applied.");
  }, [historyPast, pageOrder]);

  const redoOrder = useCallback(() => {
    const next = historyFuture[0];

    if (!next) {
      setStatus("No order change to redo.");
      return;
    }

    setHistoryFuture((current) => current.slice(1));
    setHistoryPast((current) => [...current.slice(-24), pageOrder]);
    setPageOrder(next);
    setResult(null);
    setStatus("Redo applied.");
  }, [historyFuture, pageOrder]);

  const moveSelectedPages = useCallback(
    (direction: -1 | 1) => {
      if (!selectedPages.length) {
        setStatus("Select one or more pages first.");
        return;
      }

      const selected = new Set(selectedPages);
      const next = [...pageOrder];

      if (direction === -1) {
        for (let index = 1; index < next.length; index += 1) {
          if (selected.has(next[index]) && !selected.has(next[index - 1])) {
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
          }
        }
      } else {
        for (let index = next.length - 2; index >= 0; index -= 1) {
          if (selected.has(next[index]) && !selected.has(next[index + 1])) {
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
          }
        }
      }

      commitOrder(
        next,
        `${pluralizePage(selectedPages.length)} moved ${direction === -1 ? "up" : "down"}.`,
      );
    },
    [commitOrder, pageOrder, selectedPages],
  );

  const moveSelectedToEdge = useCallback(
    (edge: "start" | "end") => {
      if (!selectedPages.length) {
        setStatus("Select one or more pages first.");
        return;
      }

      const selected = new Set(selectedPages);
      const selectedInOrder = pageOrder.filter((pageNumber) => selected.has(pageNumber));
      const remaining = pageOrder.filter((pageNumber) => !selected.has(pageNumber));
      const next =
        edge === "start"
          ? [...selectedInOrder, ...remaining]
          : [...remaining, ...selectedInOrder];

      commitOrder(
        next,
        `${pluralizePage(selectedPages.length)} moved to ${edge === "start" ? "start" : "end"}.`,
      );
    },
    [commitOrder, pageOrder, selectedPages],
  );

  useEffect(() => {
    if (pdfError) {
      setStatus(pdfError);
      return;
    }

    if (file && pageCount > 0 && !pdfLoading && pageOrder.length === 0) {
      const initialOrder = createPageOrder(pageCount);

      setPageOrder(initialOrder);
      setHistoryPast([]);
      setHistoryFuture([]);
      setSelectedPages([]);
      setLastSelectedPage(null);
      setResult(null);
      setStatus(
        `PDF loaded with ${pageCount} page${pageCount > 1 ? "s" : ""}. Drag pages into the right order.`,
      );
    }
  }, [file, pageCount, pageOrder.length, pdfError, pdfLoading]);

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;
      if (!file || isBusy) return;

      const key = event.key.toLowerCase();

      if ((event.ctrlKey || event.metaKey) && key === "z" && !event.shiftKey) {
        event.preventDefault();
        undoOrder();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (key === "y" || (key === "z" && event.shiftKey))) {
        event.preventDefault();
        redoOrder();
        return;
      }

      if (!selectedPages.length) return;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelectedPages(-1);
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelectedPages(1);
      }

      if (event.key === "Home") {
        event.preventDefault();
        moveSelectedToEdge("start");
      }

      if (event.key === "End") {
        event.preventDefault();
        moveSelectedToEdge("end");
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [
    file,
    isBusy,
    moveSelectedPages,
    moveSelectedToEdge,
    redoOrder,
    selectedPages.length,
    undoOrder,
  ]);

  async function handleFile(selectedFile: File) {
    setPageOrder([]);
    setSelectedPages([]);
    setLastSelectedPage(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setResult(null);
    setStatus("Reading PDF and rendering page thumbnails...");

    await loadFile(selectedFile);
  }

  function clearFile() {
    resetPdf();
    setPageOrder([]);
    setSelectedPages([]);
    setLastSelectedPage(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setResult(null);
    setStatus("Upload a PDF and rearrange pages before exporting.");
  }

  function handlePageClick(pageNumber: number, event: MouseEvent<HTMLDivElement>) {
    setResult(null);

    if (event.shiftKey && lastSelectedPage !== null) {
      const startIndex = pageOrder.indexOf(lastSelectedPage);
      const endIndex = pageOrder.indexOf(pageNumber);

      if (startIndex !== -1 && endIndex !== -1) {
        const [fromIndex, toIndex] =
          startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
        const rangePages = pageOrder.slice(fromIndex, toIndex + 1);

        setSelectedPages((current) => Array.from(new Set([...current, ...rangePages])));
        setStatus(`${pluralizePage(rangePages.length)} selected.`);
        return;
      }
    }

    setSelectedPages((current) => {
      const exists = current.includes(pageNumber);

      if (exists) {
        return current.filter((item) => item !== pageNumber);
      }

      return [...current, pageNumber];
    });

    setLastSelectedPage(pageNumber);
    setStatus(
      selectedPageSet.has(pageNumber)
        ? `Page ${pageNumber} removed from selection.`
        : `Page ${pageNumber} selected.`,
    );
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    const movedPage = pageOrder[fromIndex];

    if (selectedPageSet.has(movedPage) && selectedPages.length > 1) {
      const movingSet = new Set(selectedPages);
      const movingPages = pageOrder.filter((pageNumber) => movingSet.has(pageNumber));
      const remainingPages = pageOrder.filter((pageNumber) => !movingSet.has(pageNumber));
      const targetPage = pageOrder[toIndex];
      const targetIndex = remainingPages.indexOf(targetPage);
      const insertIndex = targetIndex === -1 ? remainingPages.length : targetIndex;
      const nextOrder = [
        ...remainingPages.slice(0, insertIndex),
        ...movingPages,
        ...remainingPages.slice(insertIndex),
      ];

      commitOrder(
        nextOrder,
        `${pluralizePage(movingPages.length)} moved to position ${insertIndex + 1}.`,
      );
      return;
    }

    const nextOrder = moveItem(pageOrder, fromIndex, toIndex);

    commitOrder(nextOrder, `Page ${movedPage} moved to position ${toIndex + 1}.`);
  }

  function handleSelectAll() {
    setSelectedPages([...pageOrder]);
    setLastSelectedPage(pageOrder[0] ?? null);
    setStatus("All pages selected.");
  }

  function handleClearSelection() {
    setSelectedPages([]);
    setLastSelectedPage(null);
    setStatus("Selection cleared.");
  }

  function handleResetOrder() {
    if (!pageCount) return;

    const initialOrder = createPageOrder(pageCount);
    commitOrder(initialOrder, "Page order reset.");
  }

  function handleReverseOrder() {
    commitOrder([...pageOrder].reverse(), "Page order reversed.");
  }

  function handleOddFirst() {
    const odds = pageOrder.filter((pageNumber) => pageNumber % 2 === 1);
    const evens = pageOrder.filter((pageNumber) => pageNumber % 2 === 0);

    commitOrder([...odds, ...evens], "Odd pages moved first.");
  }

  function handleEvenFirst() {
    const evens = pageOrder.filter((pageNumber) => pageNumber % 2 === 0);
    const odds = pageOrder.filter((pageNumber) => pageNumber % 2 === 1);

    commitOrder([...evens, ...odds], "Even pages moved first.");
  }

  async function handleExport() {
    if (!file || exporting) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (pageOrder.length === 0) {
      setStatus("No pages available to reorder.");
      return;
    }

    setExporting(true);
    setResult(null);
    setStatus("Creating reordered PDF...");

    try {
      const output = await reorderPdfPages(file, pageOrder);

      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "reorder-pages",
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
      setStatus("Reordered PDF created. Download started.");
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
          icon={ArrowUpDown}
          title="Reorder PDF Pages"
          description="Drag pages into the perfect order and export."
          ctaLabel="Select PDF file"
          tips={["Drag pages to reorder", "Shift+click for range", "Ctrl+Z to undo"]}
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
            icon={ArrowUpDown}
            title="Reorder PDF Pages"
            description="Drag PDF pages into the correct order, use smart rearrange actions, and export one clean reordered PDF."
            stats={[
              { label: "Pages", value: pageCount || "-" },
              { label: "Selected", value: selectedPages.length || "-" },
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
                      Visual Reorder Grid
                    </h2>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      Drag pages to reorder. Click to select pages, then use the floating toolbar for batch movement.
                    </p>
                  </div>

                  {file ? (
                    <div className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--violet-700)]">
                      {hasChangedOrder ? "Order changed" : "Original order"}
                    </div>
                  ) : null}
                </div>

                <PageGrid
                  pages={orderedPages}
                  selectedPages={selectedPages}
                  mode="reorder"
                  onPageClick={handlePageClick}
                  draggable={!isBusy}
                  onReorder={handleReorder}
                  loading={pdfLoading}
                  emptyMessage="Upload a PDF to rearrange pages."
                  columns={{ sm: 2, md: 3, lg: 4, xl: 5 }}
                  renderHoverActions={(page, index) => (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReorder(index, Math.max(0, index - 1));
                        }}
                        disabled={isBusy || index === 0}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowUp size={13} />
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleReorder(index, Math.min(pageOrder.length - 1, index + 1));
                        }}
                        disabled={isBusy || index === pageOrder.length - 1}
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-black text-slate-700 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ArrowDown size={13} />
                        Down
                      </button>
                    </div>
                  )}
                />
              </section>
            </div>

            <aside className="space-y-5">
              <div className="rounded-[1.75rem] border border-[var(--border-light)] bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black tracking-[-0.03em] text-slate-950">
                  Reorder Settings
                </h2>

                <div className="mt-5 space-y-4">
                  <ToolToolbar
                    description="Order actions"
                    actions={[
                      {
                        label: "Reverse",
                        icon: Shuffle,
                        onClick: handleReverseOrder,
                        disabled: isBusy || pageOrder.length <= 1,
                      },
                      {
                        label: "Reset",
                        icon: RotateCcw,
                        onClick: handleResetOrder,
                        disabled: isBusy || !hasChangedOrder,
                      },
                    ]}
                    moreOptions={[
                      {
                        label: "Odd Pages First",
                        icon: ListRestart,
                        onClick: handleOddFirst,
                        disabled: isBusy || pageOrder.length <= 1,
                      },
                      {
                        label: "Even Pages First",
                        icon: ListRestart,
                        onClick: handleEvenFirst,
                        disabled: isBusy || pageOrder.length <= 1,
                      },
                    ]}
                  />

                  <ToolToolbar
                    description="Selection actions"
                    actions={[
                      {
                        label: "Select All",
                        icon: CheckSquare,
                        onClick: handleSelectAll,
                        disabled: isBusy || pageOrder.length === 0,
                      },
                      {
                        label: "Clear",
                        icon: Eraser,
                        onClick: handleClearSelection,
                        disabled: isBusy || selectedPages.length === 0,
                      },
                    ]}
                    moreOptions={[
                      {
                        label: "Move Up",
                        icon: ArrowUp,
                        onClick: () => moveSelectedPages(-1),
                        disabled: isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "Move Down",
                        icon: ArrowDown,
                        onClick: () => moveSelectedPages(1),
                        disabled: isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "Move To Start",
                        icon: ArrowUp,
                        onClick: () => moveSelectedToEdge("start"),
                        disabled: isBusy || selectedPages.length === 0,
                      },
                      {
                        label: "Move To End",
                        icon: ArrowDown,
                        onClick: () => moveSelectedToEdge("end"),
                        disabled: isBusy || selectedPages.length === 0,
                      },
                    ]}
                  />

                  <ToolToolbar
                    description="History and export"
                    actions={[
                      {
                        label: "Undo",
                        icon: Undo2,
                        onClick: undoOrder,
                        disabled: isBusy || !canUndo,
                      },
                      {
                        label: "Redo",
                        icon: Redo2,
                        onClick: redoOrder,
                        disabled: isBusy || !canRedo,
                      },
                    ]}
                    primaryAction={{
                      label: exporting ? "Processing" : "Export PDF",
                      icon: exporting ? Loader2 : Download,
                      onClick: handleExport,
                      disabled: isBusy || !file || pageOrder.length === 0,
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
                      Selected
                    </div>
                    <div className="mt-1 text-3xl font-black tracking-[-0.04em] text-[var(--violet-700)]">
                      {selectedPages.length || "-"}
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
                <StatusBar message={statusMessage} type={statusType} />
              </div>

              <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                <div className="font-black">How it works</div>
                <p className="mt-2">
                  The visual order shown in the grid is the order used for export. The original uploaded file is not changed.
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
              label: "Up",
              icon: "↑",
              onClick: () => moveSelectedPages(-1),
              disabled: isBusy,
            },
            {
              label: "Down",
              icon: "↓",
              onClick: () => moveSelectedPages(1),
              disabled: isBusy,
            },
            {
              label: "Start",
              icon: "⤒",
              onClick: () => moveSelectedToEdge("start"),
              disabled: isBusy,
            },
            {
              label: "End",
              icon: "⤓",
              onClick: () => moveSelectedToEdge("end"),
              disabled: isBusy,
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
              disabled: isBusy || !file || pageOrder.length === 0,
            },
          ]}
        />
      </main>
    </>
  );
}
