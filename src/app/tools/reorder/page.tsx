"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  CheckCircle2,
  CircleHelp,
  Download,
  FileText,
  GripVertical,
  Loader2,
  MousePointer2,
  Redo2,
  RotateCcw,
  Shuffle,
  Upload,
  Undo2,
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
import { reorderPdfPages } from "@/lib/pdf-page-engine";

type BusyMode = "idle" | "reading" | "rendering" | "exporting";
type ThumbnailStatus = "idle" | "loading" | "ready" | "error";

type ThumbnailProgress = {
  done: number;
  total: number;
};

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Reorder failed. This PDF may be encrypted, damaged, or unsupported.";
}

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
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

function formatSequence(order: number[]) {
  if (!order.length) return "Upload a PDF to build page order.";
  if (order.length <= 70) return order.join(" → ");

  const head = order.slice(0, 48).join(" → ");
  const tail = order.slice(-10).join(" → ");
  return `${head} → ... → ${tail}`;
}

function pluralizePage(count: number) {
  return `${count} page${count === 1 ? "" : "s"}`;
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/75">
      <div
        className="h-full rounded-full bg-[var(--violet-600)] transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function ReorderPagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const renderTokenRef = useRef(0);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedPagesRef = useRef<number[]>([]);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);

  const [historyPast, setHistoryPast] = useState<number[][]>([]);
  const [historyFuture, setHistoryFuture] = useState<number[][]>([]);

  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [thumbnailStatus, setThumbnailStatus] = useState<ThumbnailStatus>("idle");
  const [thumbnailProgress, setThumbnailProgress] = useState<ThumbnailProgress>({ done: 0, total: 0 });

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [status, setStatus] = useState("Upload a PDF and rearrange pages before exporting.");
  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [exportProgress, setExportProgress] = useState(0);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const busy = busyMode !== "idle";

  const hasChangedOrder = useMemo(
    () => pageOrder.some((pageNumber, index) => pageNumber !== index + 1),
    [pageOrder],
  );

  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const selectedSummary = useMemo(() => {
    if (!selectedPages.length) return "No page selected";
    return `${pluralizePage(selectedPages.length)} selected`;
  }, [selectedPages.length]);

  const thumbnailPercent = useMemo(() => {
    if (!thumbnailProgress.total) return 0;
    return Math.round((thumbnailProgress.done / thumbnailProgress.total) * 100);
  }, [thumbnailProgress.done, thumbnailProgress.total]);

  const sequencePreview = useMemo(() => formatSequence(pageOrder), [pageOrder]);

  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  useEffect(() => {
    configurePdfWorker();
  }, []);

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
    if (!previous) return;

    setHistoryPast((current) => current.slice(0, -1));
    setHistoryFuture((current) => [pageOrder, ...current].slice(0, 25));
    setPageOrder(previous);
    setResult(null);
    setStatus("Undo applied.");
  }, [historyPast, pageOrder]);

  const redoOrder = useCallback(() => {
    const next = historyFuture[0];
    if (!next) return;

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

      commitOrder(next, `${pluralizePage(selectedPages.length)} moved ${direction === -1 ? "up" : "down"}.`);
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

      const next = edge === "start" ? [...selectedInOrder, ...remaining] : [...remaining, ...selectedInOrder];
      commitOrder(next, `${pluralizePage(selectedPages.length)} moved to ${edge === "start" ? "start" : "end"}.`);
    },
    [commitOrder, pageOrder, selectedPages],
  );

  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();

      if (tagName === "input" || tagName === "textarea" || target?.isContentEditable) return;
      if (!file || busy) return;

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
  }, [busy, file, moveSelectedPages, moveSelectedToEdge, redoOrder, selectedPages.length, undoOrder]);

  async function renderThumbnails(selectedFile: File, totalPages: number) {
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    setBusyMode("rendering");
    setThumbnailStatus("loading");
    setThumbnailProgress({ done: 0, total: totalPages });
    setThumbnailUrls({});
    setStatus("Rendering real PDF page thumbnails...");

    try {
      configurePdfWorker();

      const pdf = await pdfjsLib.getDocument({ data: await selectedFile.arrayBuffer() }).promise;
      const nextUrls: Record<number, string> = {};
      const pagesToRender = Math.min(pdf.numPages, totalPages);

      for (let pageNumber = 1; pageNumber <= pagesToRender; pageNumber += 1) {
        if (renderTokenRef.current !== token) return;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.42 });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) continue;

        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        await page.render({ canvasContext: context, viewport }).promise;

        nextUrls[pageNumber] = canvas.toDataURL("image/png");

        if (renderTokenRef.current === token) {
          setThumbnailUrls({ ...nextUrls });
          setThumbnailProgress({ done: pageNumber, total: totalPages });
        }
      }

      if (renderTokenRef.current === token) {
        setThumbnailStatus("ready");
        setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Drag pages into the right order.`);
      }
    } catch {
      if (renderTokenRef.current === token) {
        setThumbnailStatus("error");
        setStatus("PDF loaded, but thumbnails could not be rendered. You can still reorder and export.");
      }
    } finally {
      if (renderTokenRef.current === token) {
        setBusyMode("idle");
      }
    }
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile || busy) return;

    setBusyMode("reading");
    setResult(null);
    setExportProgress(0);
    setThumbnailStatus("idle");
    setThumbnailUrls({});
    setThumbnailProgress({ done: 0, total: 0 });
    setSelectedPages([]);
    setLastSelectedPage(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();
      const initialOrder = createPageOrder(totalPages);

      setFile(selectedFile);
      setPageCount(totalPages);
      setPageOrder(initialOrder);

      if (totalPages <= 1) {
        setStatus("PDF loaded with 1 page. Reordering needs at least 2 pages.");
        setBusyMode("idle");
        return;
      }

      await renderThumbnails(selectedFile, totalPages);
    } catch (error) {
      renderTokenRef.current += 1;
      setFile(null);
      setPageCount(0);
      setPageOrder([]);
      setSelectedPages([]);
      setLastSelectedPage(null);
      setHistoryPast([]);
      setHistoryFuture([]);
      setThumbnailUrls({});
      setThumbnailStatus("idle");
      setThumbnailProgress({ done: 0, total: 0 });
      setResult(null);
      setStatus(getErrorMessage(error));
      setBusyMode("idle");
    }
  }

  function clearFile() {
    renderTokenRef.current += 1;
    setFile(null);
    setPageCount(0);
    setPageOrder([]);
    setSelectedPages([]);
    setLastSelectedPage(null);
    setHistoryPast([]);
    setHistoryFuture([]);
    setThumbnailUrls({});
    setThumbnailStatus("idle");
    setThumbnailProgress({ done: 0, total: 0 });
    setDraggedIndex(null);
    setDragOverIndex(null);
    setResult(null);
    setExportProgress(0);
    setBusyMode("idle");
    setStatus("Upload a PDF and rearrange pages before exporting.");
  }

  function resetOrder() {
    commitOrder(createPageOrder(pageCount), "Page order reset to original sequence.");
  }

  function reverseOrder() {
    commitOrder([...pageOrder].reverse(), "Page order reversed.");
  }

  function oddFirstOrder() {
    const original = createPageOrder(pageCount);
    const odds = original.filter((pageNumber) => pageNumber % 2 === 1);
    const evens = original.filter((pageNumber) => pageNumber % 2 === 0);
    commitOrder([...odds, ...evens], "Smart preset applied: odd pages first.");
  }

  function evenFirstOrder() {
    const original = createPageOrder(pageCount);
    const evens = original.filter((pageNumber) => pageNumber % 2 === 0);
    const odds = original.filter((pageNumber) => pageNumber % 2 === 1);
    commitOrder([...evens, ...odds], "Smart preset applied: even pages first.");
  }

  function moveSinglePage(index: number, direction: -1 | 1) {
    const next = moveItem(pageOrder, index, index + direction);
    setSelectedPages([pageOrder[index]]);
    setLastSelectedPage(pageOrder[index]);
    commitOrder(next, `Page ${pageOrder[index]} moved ${direction === -1 ? "up" : "down"}.`);
  }

  function handlePageSelect(pageNumber: number, event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) {
    if (busy) return;

    const pageIndex = pageOrder.indexOf(pageNumber);

    if (event.shiftKey && lastSelectedPage !== null) {
      const lastIndex = pageOrder.indexOf(lastSelectedPage);

      if (lastIndex !== -1 && pageIndex !== -1) {
        const start = Math.min(lastIndex, pageIndex);
        const end = Math.max(lastIndex, pageIndex);
        setSelectedPages(pageOrder.slice(start, end + 1));
        setLastSelectedPage(pageNumber);
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedPages((current) => {
        if (current.includes(pageNumber)) {
          return current.filter((selectedPage) => selectedPage !== pageNumber);
        }

        return [...current, pageNumber];
      });
      setLastSelectedPage(pageNumber);
      return;
    }

    setSelectedPages([pageNumber]);
    setLastSelectedPage(pageNumber);
  }

  function clearSelection() {
    setSelectedPages([]);
    setLastSelectedPage(null);
    setStatus("Selection cleared.");
  }

  function selectAllPages() {
    setSelectedPages([...pageOrder]);
    setLastSelectedPage(pageOrder[pageOrder.length - 1] ?? null);
    setStatus("All pages selected.");
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function handleCardDragStart(index: number, event: DragEvent<HTMLDivElement>) {
    if (busy) return;

    const pageNumber = pageOrder[index];
    const pagesToMove = selectedPageSet.has(pageNumber) ? selectedPages : [pageNumber];

    draggedIndexRef.current = index;
    draggedPagesRef.current = pagesToMove;
    setDraggedIndex(index);
    setDragOverIndex(index);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    if (!selectedPageSet.has(pageNumber)) {
      setSelectedPages([pageNumber]);
      setLastSelectedPage(pageNumber);
    }
  }

  function handleCardDrop(targetIndex: number) {
    const movingPages = draggedPagesRef.current;
    if (!movingPages.length) return;

    const movingSet = new Set(movingPages);
    const targetPage = pageOrder[targetIndex];

    if (movingSet.has(targetPage) && movingPages.length > 1) {
      resetDragState();
      return;
    }

    const movingItems = pageOrder.filter((pageNumber) => movingSet.has(pageNumber));
    const remaining = pageOrder.filter((pageNumber) => !movingSet.has(pageNumber));
    const insertIndex = remaining.indexOf(targetPage);

    if (insertIndex === -1) {
      resetDragState();
      return;
    }

    const next = [...remaining.slice(0, insertIndex), ...movingItems, ...remaining.slice(insertIndex)];

    commitOrder(
      next,
      movingItems.length === 1
        ? `Page ${movingItems[0]} moved to position ${insertIndex + 1}.`
        : `${pluralizePage(movingItems.length)} moved to position ${insertIndex + 1}.`,
    );

    resetDragState();
  }

  function resetDragState() {
    draggedIndexRef.current = null;
    draggedPagesRef.current = [];
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    setBusyMode("exporting");
    setExportProgress(8);
    setResult(null);
    setStatus("Preparing reordered PDF...");

    try {
      setExportProgress(28);
      const output = await reorderPdfPages(file, pageOrder);

      setExportProgress(82);
      setResult(output);
      downloadBlob(output.blob, output.fileName);

      setExportProgress(100);
      setStatus("Reordered PDF exported successfully. Download started.");
    } catch (error) {
      setResult(null);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusyMode("idle");
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("could not");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-5 sm:py-6 lg:px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.14)_0%,rgba(101,80,232,0.05)_38%,transparent_72%)]"
            />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_34px_rgba(101,80,232,0.18)]">
                  <ArrowUpDown size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Reorder PDF pages visually.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Upload one PDF, preview real page thumbnails, drag pages into order, and export a clean reordered copy.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] rounded-[1.25rem] border border-[var(--border-light)] bg-white/92 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedPages.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {result ? formatFileSize(result.outputSize) : hasChangedOrder ? "Yes" : "No"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {result ? "Output" : "Changed"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <section className="min-h-[660px] bg-[var(--bg-base)] p-3 sm:p-4">
              <div
                onClick={() => {
                  if (!busy) fileInputRef.current?.click();
                }}
                onDrop={handleUploadDrop}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !busy) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                className="cursor-pointer rounded-[1.25rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-4 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white">
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag one PDF to begin."}
                </div>

                {busyMode === "rendering" ? (
                  <div className="mx-auto mt-3 max-w-md">
                    <ProgressBar value={thumbnailPercent} />
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      Rendering thumbnails {thumbnailProgress.done}/{thumbnailProgress.total}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Drag pages into order. Use Ctrl/Shift for multi-select.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={resetOrder}
                      disabled={!file || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                      Reset
                    </button>
                    <button
                      type="button"
                      onClick={reverseOrder}
                      disabled={!file || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Shuffle size={15} />
                      Reverse
                    </button>
                    <button
                      type="button"
                      onClick={undoOrder}
                      disabled={!file || busy || !canUndo}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Undo2 size={15} />
                      Undo
                    </button>
                    <button
                      type="button"
                      onClick={redoOrder}
                      disabled={!file || busy || !canRedo}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Redo2 size={15} />
                      Redo
                    </button>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        More options
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={oddFirstOrder}
                          disabled={!file || busy}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Odd First
                        </button>
                        <button
                          type="button"
                          onClick={evenFirstOrder}
                          disabled={!file || busy}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Even First
                        </button>
                        <button
                          type="button"
                          onClick={selectAllPages}
                          disabled={busy || !pageOrder.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MousePointer2 size={15} />
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={clearFile}
                          disabled={!file || busy}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Remove PDF
                        </button>
                      </div>
                    </details>

                    <div className="group relative">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)]"
                        aria-label="Keyboard shortcuts"
                      >
                        <CircleHelp size={17} />
                      </button>
                      <div className="pointer-events-none absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-[var(--border-light)] bg-white p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-card)] transition group-hover:opacity-100">
                        Ctrl Z / Ctrl Y · Undo / Redo<br />
                        ↑ / ↓ · Move selected<br />
                        Home / End · Send start/end<br />
                        Ctrl / Shift click · Multi select<br />
                        Sequence: {sequencePreview}
                      </div>
                    </div>

                    <button type="button" onClick={handleExport} disabled={!file || busy} className="btn-primary px-4 py-2">
                      {busyMode === "exporting" ? (
                        <><Loader2 className="animate-spin" size={18} /><span>Exporting</span></>
                      ) : (
                        <><Download size={18} /><span>Export</span></>
                      )}
                    </button>
                  </div>
                </div>

                {busyMode === "exporting" ? (
                  <div className="mt-3 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                      <span>Exporting</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    Reordered PDF: {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                {busyMode === "reading" ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : pageOrder.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {pageOrder.map((pageNumber, index) => {
                      const isSelected = selectedPageSet.has(pageNumber);
                      const isDropTarget = dragOverIndex === index && draggedIndex !== index;
                      const isMoved = pageNumber !== index + 1;

                      return (
                        <div
                          key={pageNumber}
                          draggable={!busy}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={(event) => handlePageSelect(pageNumber, event)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handlePageSelect(pageNumber, event);
                            }
                          }}
                          onDragStart={(event) => handleCardDragStart(index, event)}
                          onDragEnter={() => setDragOverIndex(index)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = "move";
                            setDragOverIndex(index);
                          }}
                          onDragLeave={() => {
                            if (dragOverIndex === index) setDragOverIndex(null);
                          }}
                          onDrop={(event) => {
                            event.preventDefault();
                            handleCardDrop(index);
                          }}
                          onDragEnd={resetDragState}
                          className={`group cursor-grab rounded-[1.25rem] border bg-white p-3 shadow-sm outline-none transition active:cursor-grabbing ${
                            isSelected
                              ? "border-[var(--violet-600)] ring-4 ring-violet-100"
                              : "border-[var(--border-light)] hover:border-[var(--violet-border)]"
                          } ${isDropTarget ? "scale-[0.985] border-[var(--border-focus)] bg-[var(--violet-50)]" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">Page {pageNumber}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  Position {index + 1}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              {isMoved ? (
                                <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                                  Moved
                                </span>
                              ) : null}
                              <GripVertical className="text-[var(--text-muted)] opacity-70 transition group-hover:opacity-100" size={17} />
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)]">
                            <div className="flex aspect-[3/4] items-center justify-center">
                              {thumbnailUrls[pageNumber] ? (
                                <img
                                  src={thumbnailUrls[pageNumber]}
                                  alt={`PDF page ${pageNumber}`}
                                  className="h-full w-full object-contain"
                                  draggable={false}
                                />
                              ) : thumbnailStatus === "error" ? (
                                <div className="px-4 text-center">
                                  <FileText className="mx-auto text-[var(--violet-400)]" size={34} />
                                  <div className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">Preview unavailable</div>
                                </div>
                              ) : (
                                <div className="w-full px-5">
                                  <div className="mx-auto h-24 w-20 animate-pulse rounded-xl bg-white shadow-sm" />
                                  <div className="mx-auto mt-3 h-2 w-24 animate-pulse rounded-full bg-white" />
                                  <div className="mx-auto mt-2 h-2 w-16 animate-pulse rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-2 gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveSinglePage(index, -1);
                              }}
                              disabled={busy || index === 0}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move up"
                            >
                              <ArrowUp size={14} />
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveSinglePage(index, 1);
                              }}
                              disabled={busy || index === pageOrder.length - 1}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move down"
                            >
                              <ArrowDown size={14} />
                              Down
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to reorder its pages visually.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className={`mt-3 px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
            {status}
          </div>

          {selectedPages.length > 0 ? (
            <div className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-2xl flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-white/95 px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-card)] backdrop-blur">
              <span className="px-2 text-[var(--violet-600)]">{selectedSummary}</span>
              <button type="button" onClick={() => moveSelectedPages(-1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">↑ Up</button>
              <button type="button" onClick={() => moveSelectedPages(1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">↓ Down</button>
              <button type="button" onClick={() => moveSelectedToEdge("start")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">⤒ Start</button>
              <button type="button" onClick={() => moveSelectedToEdge("end")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">⤓ End</button>
              <button type="button" onClick={clearSelection} disabled={busy} className="rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">✕ Clear</button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
