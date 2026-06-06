"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  Download,
  Eraser,
  GripVertical,
  HelpCircle,
  ListRestart,
  Redo2,
  RotateCcw,
  Shuffle,
  Undo2,
  UploadCloud,
  X,
  type LucideIcon,
} from "lucide-react";

import { Header } from "@/components/Header";
import { SelectionToolbar } from "@/components/tool-kit/SelectionToolbar";
import { useEntitlement } from "@/hooks/useEntitlement";
import { usePdfPages } from "@/hooks/usePdfPages";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { reorderPdfPages } from "@/lib/pdf-page-engine";

type OrderedPage = {
  pageNumber: number;
  position: number;
  thumbnailUrl: string;
  isMoved: boolean;
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

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

function getStatusClass(message: string, result: PdfProcessingResult | null) {
  const lowerMessage = message.toLowerCase();

  if (result || lowerMessage.includes("download started")) {
    return "text-emerald-700";
  }

  if (
    lowerMessage.includes("failed") ||
    lowerMessage.includes("valid") ||
    lowerMessage.includes("cannot") ||
    lowerMessage.includes("select") ||
    lowerMessage.includes("unsupported") ||
    lowerMessage.includes("too large") ||
    lowerMessage.includes("empty") ||
    lowerMessage.includes("unable") ||
    lowerMessage.includes("limit")
  ) {
    return "text-red-600";
  }

  return "text-slate-500";
}

function ToolbarButton({
  label,
  icon: Icon,
  onClick,
  disabled,
  primary = false,
}: {
  readonly label: string;
  readonly icon: LucideIcon;
  readonly onClick: () => void;
  readonly disabled?: boolean;
  readonly primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-black transition",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100",
        disabled ? "cursor-not-allowed opacity-45" : "",
        primary
          ? "bg-[var(--violet-600)] text-white shadow-[0_16px_34px_rgba(101,80,232,0.22)] hover:bg-[var(--violet-700)]"
          : "border border-[var(--border-light)] bg-white text-slate-700 shadow-sm hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)]",
      )}
    >
      <Icon size={16} className={label === "Processing" ? "animate-spin" : undefined} />
      {label}
    </button>
  );
}

function ReorderLandingState({
  loading,
  progress,
  statusMessage,
  statusClass,
  onFile,
}: {
  readonly loading: boolean;
  readonly progress: number;
  readonly statusMessage: string;
  readonly statusClass: string;
  readonly onFile: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      onFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDraggingOver(false);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);

    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) {
      onFile(selectedFile);
    }
  }

  const showStatus =
    statusMessage &&
    statusMessage !== "Upload a PDF and rearrange pages before exporting.";

  return (
    <>
      <Header />

      <main className="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-[var(--bg-base)] px-4 py-12 text-[var(--text-primary)] lg:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(101,80,232,0.13),transparent_38%),radial-gradient(circle_at_15%_80%,rgba(124,58,237,0.08),transparent_34%)]" />

        <section className="relative w-full max-w-3xl">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-[var(--violet-600)] shadow-sm">
              <GripVertical size={24} />
            </div>

            <h1 className="text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
              Reorder PDF Pages
            </h1>

            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500 sm:text-base">
              Drag pages into the perfect order and export a clean PDF.
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={handleInputChange}
          />

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={classNames(
              "flex min-h-[420px] flex-col items-center justify-center rounded-[2rem] border-2 border-dashed p-8 text-center shadow-[0_24px_70px_rgba(44,31,95,0.08)] transition sm:min-h-[480px]",
              isDraggingOver
                ? "border-[var(--violet-600)] bg-violet-50/90 ring-4 ring-violet-100"
                : "border-violet-200 bg-gradient-to-br from-violet-50/50 via-white to-white hover:border-violet-400 hover:bg-violet-50/80",
            )}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] bg-white text-[var(--violet-600)] shadow-[0_22px_55px_rgba(101,80,232,0.18)]">
              <UploadCloud size={60} strokeWidth={1.8} />
            </div>

            <h2 className="mt-7 text-2xl font-black tracking-[-0.04em] text-slate-950 sm:text-3xl">
              Drop your PDF here
            </h2>

            <p className="mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500">
              Upload one PDF file to start rearranging pages visually.
            </p>

            <button
              type="button"
              onClick={openPicker}
              disabled={loading}
              className="mt-7 inline-flex min-h-13 items-center justify-center rounded-full bg-[var(--violet-600)] px-8 text-sm font-black text-white shadow-[0_20px_44px_rgba(101,80,232,0.26)] transition hover:bg-[var(--violet-700)] disabled:cursor-not-allowed disabled:opacity-60 sm:text-base"
            >
              {loading ? "Reading PDF..." : "Select PDF file"}
            </button>

            <p className="mt-3 text-xs font-semibold text-slate-400">
              or drop here
            </p>

            {loading ? (
              <div className="mt-7 w-full max-w-md">
                <div className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  <span>Rendering thumbnails</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[var(--violet-600)] transition-all"
                    style={{ width: `${Math.max(4, Math.min(progress, 100))}%` }}
                  />
                </div>
              </div>
            ) : null}

            {showStatus ? (
              <p className={classNames("mt-6 text-sm font-semibold", statusClass)}>
                {statusMessage}
              </p>
            ) : null}
          </div>

          <p className="mt-6 text-center text-xs font-semibold leading-5 text-slate-400">
            Drag pages to reorder · Shift+click for range · Ctrl+Z to undo
          </p>
        </section>
      </main>
    </>
  );
}

function CompactFileStrip({
  file,
  pageCount,
  loading,
  progress,
  onFile,
  onClear,
}: {
  readonly file: File;
  readonly pageCount: number;
  readonly loading: boolean;
  readonly progress: number;
  readonly onFile: (file: File) => void;
  readonly onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  function openPicker() {
    inputRef.current?.click();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];

    if (selectedFile) {
      onFile(selectedFile);
    }

    event.target.value = "";
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setIsDraggingOver(false);
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);

    const selectedFile = event.dataTransfer.files?.[0];

    if (selectedFile) {
      onFile(selectedFile);
    }
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={classNames(
        "rounded-[1.35rem] border bg-white/90 p-4 shadow-sm transition",
        isDraggingOver
          ? "border-[var(--violet-600)] ring-4 ring-violet-100"
          : "border-violet-100",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="truncate text-base font-black tracking-[-0.02em] text-slate-950">
            {file.name}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-500">
            {pageCount || "-"} pages · {formatFileSize(file.size)}
            {loading ? ` · Reading ${progress}%` : ""}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onClear}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={15} />
            Remove
          </button>

          <button
            type="button"
            onClick={openPicker}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-[var(--violet-600)] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(101,80,232,0.18)] transition hover:bg-[var(--violet-700)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Replace
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-violet-50">
          <div
            className="h-full rounded-full bg-[var(--violet-600)] transition-all"
            style={{ width: `${Math.max(4, Math.min(progress, 100))}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function ReorderPageCard({
  page,
  index,
  selected,
  canDrag,
  isDragging,
  isDropTarget,
  aspectRatio,
  isLast,
  onClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onAspectRatio,
}: {
  readonly page: OrderedPage;
  readonly index: number;
  readonly selected: boolean;
  readonly canDrag: boolean;
  readonly isDragging: boolean;
  readonly isDropTarget: boolean;
  readonly aspectRatio: string;
  readonly isLast: boolean;
  readonly onClick: (event: ReactMouseEvent<HTMLDivElement>) => void;
  readonly onDragStart: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly onDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly onDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  readonly onDragEnd: () => void;
  readonly onMoveUp: () => void;
  readonly onMoveDown: () => void;
  readonly onAspectRatio: (width: number, height: number) => void;
}) {
  return (
    <div
      draggable={canDrag}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={classNames(
        "group min-w-[220px] cursor-pointer rounded-[1.35rem] border bg-white p-3 shadow-sm transition duration-200",
        selected
          ? "border-[var(--violet-600)] ring-4 ring-violet-100"
          : "border-violet-100 hover:border-[var(--violet-border)] hover:shadow-[0_18px_45px_rgba(101,80,232,0.10)]",
        isDropTarget && !isDragging ? "scale-[1.015] ring-4 ring-violet-100" : "",
        isDragging ? "scale-[0.98] opacity-45" : "",
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-700">
            <GripVertical size={15} />
          </span>
          <span className="flex h-8 min-w-8 items-center justify-center rounded-full border border-violet-100 bg-white px-2 text-sm font-black text-slate-800">
            {page.position}
          </span>
          {page.isMoved ? (
            <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-700">
              Page {page.pageNumber}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveUp();
            }}
            disabled={index === 0}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={`Move page ${page.pageNumber} up`}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onMoveDown();
            }}
            disabled={isLast}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
            aria-label={`Move page ${page.pageNumber} down`}
          >
            <ArrowDown size={15} />
          </button>
        </div>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
        style={{ aspectRatio }}
      >
        {page.thumbnailUrl ? (
          <img
            src={page.thumbnailUrl}
            alt={`Page ${page.pageNumber}`}
            draggable={false}
            onLoad={(event) => {
              const image = event.currentTarget;
              if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                onAspectRatio(image.naturalWidth, image.naturalHeight);
              }
            }}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full w-full animate-pulse items-center justify-center text-xs font-black uppercase tracking-[0.16em] text-slate-300">
            Loading
          </div>
        )}
      </div>
    </div>
  );
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

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const [aspectRatioMap, setAspectRatioMap] = useState<Record<number, string>>({});

  const [status, setStatus] = useState("Upload a PDF and rearrange pages before exporting.");
  const [exporting, setExporting] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const isBusy = pdfLoading || exporting;
  const canUndo = historyPast.length > 0;
  const canRedo = historyFuture.length > 0;

  const pageMap = useMemo(() => {
    return new Map(pages.map((page) => [page.pageNumber, page]));
  }, [pages]);

  const orderedPages = useMemo<OrderedPage[]>(() => {
    return pageOrder.map((pageNumber, index) => {
      const page = pageMap.get(pageNumber);
      const thumbnailUrl = page?.thumbnailUrl || page?.thumbnail || "";

      return {
        pageNumber,
        position: index + 1,
        thumbnailUrl,
        isMoved: pageNumber !== index + 1,
      };
    });
  }, [pageMap, pageOrder]);

  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const hasChangedOrder = useMemo(
    () => pageOrder.some((pageNumber, index) => pageNumber !== index + 1),
    [pageOrder],
  );

  const statusMessage = pdfError || status;
  const statusClass = getStatusClass(statusMessage, result);
  const canDrag = pageOrder.length > 1 && !isBusy;

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
      setStatus(`PDF loaded with ${pageCount} page${pageCount > 1 ? "s" : ""}. Drag pages into the right order.`);
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
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setAspectRatioMap({});
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
    setDraggedIndex(null);
    setDropTargetIndex(null);
    setAspectRatioMap({});
    setResult(null);
    setStatus("Upload a PDF and rearrange pages before exporting.");
  }

  function handlePageClick(
    pageNumber: number,
    event: ReactMouseEvent<HTMLDivElement>,
  ) {
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
    const nextOrder = moveItem(pageOrder, fromIndex, toIndex);

    commitOrder(nextOrder, `Page ${movedPage} moved to position ${toIndex + 1}.`);
  }

  function handleDragStart(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!canDrag) return;

    setDraggedIndex(index);
    setDropTargetIndex(index);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }

  function handleDragOver(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!canDrag) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTargetIndex(index);
  }

  function handleDragLeave(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!canDrag) return;

    const nextTarget = event.relatedTarget;

    if (
      nextTarget instanceof Node &&
      event.currentTarget.contains(nextTarget)
    ) {
      return;
    }

    setDropTargetIndex((currentIndex) => (currentIndex === index ? null : currentIndex));
  }

  function handleDrop(event: ReactDragEvent<HTMLDivElement>, index: number) {
    if (!canDrag || draggedIndex === null) return;

    event.preventDefault();

    if (draggedIndex !== index) {
      handleReorder(draggedIndex, index);
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDropTargetIndex(null);
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

  function handleThumbnailAspectRatio(pageNumber: number, width: number, height: number) {
    if (width <= 0 || height <= 0) return;

    setAspectRatioMap((current) => {
      const nextRatio = `${width} / ${height}`;

      if (current[pageNumber] === nextRatio) {
        return current;
      }

      return {
        ...current,
        [pageNumber]: nextRatio,
      };
    });
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
      <ReorderLandingState
        loading={pdfLoading}
        progress={progress}
        statusMessage={statusMessage}
        statusClass={statusClass}
        onFile={handleFile}
      />
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
          <CompactFileStrip
            file={file}
            pageCount={pageCount}
            loading={pdfLoading}
            progress={progress}
            onFile={handleFile}
            onClear={clearFile}
          />

          <section className="rounded-[1.35rem] border border-violet-100 bg-white/90 p-3 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <ToolbarButton
                  label="Reset"
                  icon={RotateCcw}
                  onClick={handleResetOrder}
                  disabled={isBusy || !hasChangedOrder}
                />
                <ToolbarButton
                  label="Reverse"
                  icon={Shuffle}
                  onClick={handleReverseOrder}
                  disabled={isBusy || pageOrder.length <= 1}
                />
                <ToolbarButton
                  label="Undo"
                  icon={Undo2}
                  onClick={undoOrder}
                  disabled={isBusy || !canUndo}
                />
                <ToolbarButton
                  label="Redo"
                  icon={Redo2}
                  onClick={redoOrder}
                  disabled={isBusy || !canRedo}
                />

                <details className="group relative">
                  <summary className="inline-flex min-h-10 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)] [&::-webkit-details-marker]:hidden">
                    More
                    <span className="transition group-open:rotate-180">⌄</span>
                  </summary>

                  <div className="absolute left-0 z-30 mt-2 w-56 rounded-2xl border border-violet-100 bg-white p-2 shadow-[0_24px_70px_rgba(44,31,95,0.16)]">
                    {[
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
                      {
                        label: "Select All",
                        icon: CheckSquare,
                        onClick: handleSelectAll,
                        disabled: isBusy,
                      },
                      {
                        label: "Clear Selection",
                        icon: Eraser,
                        onClick: handleClearSelection,
                        disabled: isBusy || selectedPages.length === 0,
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={item.onClick}
                          disabled={item.disabled}
                          className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Icon size={15} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </details>

                <div className="group relative">
                  <button
                    type="button"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-slate-500 shadow-sm transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-700)]"
                    aria-label="Show reorder shortcuts"
                  >
                    <HelpCircle size={16} />
                  </button>

                  <div className="pointer-events-none absolute left-0 top-12 z-30 w-72 translate-y-1 rounded-2xl border border-violet-100 bg-white p-3 opacity-0 shadow-[0_24px_70px_rgba(44,31,95,0.16)] transition group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                      Shortcuts
                    </div>
                    <div className="mt-2 space-y-2 text-xs font-semibold text-slate-600">
                      <div className="flex justify-between gap-4">
                        <span>Undo order change</span>
                        <kbd>Ctrl/⌘ + Z</kbd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Redo order change</span>
                        <kbd>Ctrl/⌘ + Y</kbd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Move selected pages</span>
                        <kbd>↑ / ↓</kbd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span>Move selected to edge</span>
                        <kbd>Home / End</kbd>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <ToolbarButton
                label={exporting ? "Processing" : "Export"}
                icon={exporting ? RotateCcw : Download}
                onClick={handleExport}
                disabled={isBusy || pageOrder.length === 0}
                primary
              />
            </div>
          </section>

          <section className="rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold leading-6 text-slate-500">
                Drag to reorder · Shift+click range · Ctrl+Z undo
              </p>

              <div className="rounded-full border border-violet-100 bg-[var(--violet-50)] px-4 py-2 text-xs font-black uppercase tracking-[0.12em] text-[var(--violet-700)]">
                {hasChangedOrder ? "Order changed" : "Original order"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {orderedPages.map((page, index) => (
                <ReorderPageCard
                  key={`${page.pageNumber}-${page.position}`}
                  page={page}
                  index={index}
                  selected={selectedPageSet.has(page.pageNumber)}
                  canDrag={canDrag}
                  isDragging={draggedIndex === index}
                  isDropTarget={dropTargetIndex === index}
                  aspectRatio={aspectRatioMap[page.pageNumber] ?? "3 / 4"}
                  isLast={index === pageOrder.length - 1}
                  onClick={(event) => handlePageClick(page.pageNumber, event)}
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDragLeave={(event) => handleDragLeave(event, index)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={handleDragEnd}
                  onMoveUp={() => handleReorder(index, Math.max(0, index - 1))}
                  onMoveDown={() => handleReorder(index, Math.min(pageOrder.length - 1, index + 1))}
                  onAspectRatio={(width, height) =>
                    handleThumbnailAspectRatio(page.pageNumber, width, height)
                  }
                />
              ))}
            </div>
          </section>

          <p className={classNames("px-1 text-sm font-semibold leading-6", statusClass)}>
            {statusMessage}
          </p>
        </section>

        <SelectionToolbar
          visible={selectedPages.length > 0}
          selectedCount={selectedPages.length}
          selectedLabel={`${pluralizePage(selectedPages.length)} selected`}
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
              icon: "↟",
              onClick: () => moveSelectedToEdge("start"),
              disabled: isBusy,
            },
            {
              label: "End",
              icon: "↡",
              onClick: () => moveSelectedToEdge("end"),
              disabled: isBusy,
            },
            {
              label: "Clear",
              icon: "×",
              onClick: handleClearSelection,
              disabled: isBusy,
            },
          ]}
        />
      </main>
    </>
  );
}
