"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  CheckSquare,
  CircleHelp,
  Download,
  FileText,
  Grid2X2,
  Loader2,
  Upload,
  RotateCcw,
  RotateCw,
  RotateCcwSquare,
  RotateCwSquare,
  Undo2,
  Redo2,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PageGrid } from "@/components/tool-kit/PageGrid";
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
type OpenPanel = "all" | "selected" | "history" | "help" | null;

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Rotation export failed. Please check your PDF and try again.";
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

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
          : active
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {icon}
      <span className="pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition delay-300 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/75">
      <div
        className="h-full rounded-full bg-violet-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function RotatePage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const selectedPages = selected;
  const isBusy = pdfLoading || exporting;

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

  const currentStatus = lastError || pdfError || status;

  const statusIsError =
    currentStatus.toLowerCase().includes("failed") ||
    currentStatus.toLowerCase().includes("valid") ||
    currentStatus.toLowerCase().includes("unsupported") ||
    currentStatus.toLowerCase().includes("too large") ||
    currentStatus.toLowerCase().includes("unable") ||
    currentStatus.toLowerCase().includes("limit") ||
    currentStatus.toLowerCase().includes("empty") ||
    currentStatus.toLowerCase().includes("upload a pdf") ||
    currentStatus.toLowerCase().includes("select pages");

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

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current) return;
      if (event.target instanceof Node && toolbarRef.current.contains(event.target)) return;

      setOpenPanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function togglePanel(nextPanel: OpenPanel) {
    setOpenPanel((current) => (current === nextPanel ? null : nextPanel));
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile || isBusy) return;

    setResult(null);
    setRotationMap({});
    setRotationPast([]);
    setRotationFuture([]);
    setOpenPanel(null);
    resetSelection();
    setStatus("Reading PDF and rendering page thumbnails...");

    await loadFile(selectedFile);
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isBusy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function clearFile() {
    resetPdf();
    resetSelection();
    setRotationMap({});
    setRotationPast([]);
    setRotationFuture([]);
    setResult(null);
    setOpenPanel(null);
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
    setOpenPanel(null);
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

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <RotateCw size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Rotate PDF Pages</h1>
              <p className="text-sm text-slate-500">
                Rotate all pages, selected pages, or individual pages from a visual grid.
              </p>
            </div>
          </div>

          {file ? (
            <div
              ref={toolbarRef}
              className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {pageCount} page{pageCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {changedPages || 0} changed
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {selectedPages.length} selected
                </span>
                {result ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Output {formatFileSize(result.outputSize)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  label="Select all"
                  icon={<CheckSquare size={16} />}
                  onClick={handleSelectAll}
                  disabled={!file || isBusy}
                />

                <IconButton
                  label="Clear selection"
                  icon={<X size={16} />}
                  onClick={handleClearSelection}
                  disabled={!file || isBusy || selectedPages.length === 0}
                  danger={selectedPages.length > 0}
                />

                <IconButton
                  label="Undo selection"
                  icon={<Undo2 size={16} />}
                  onClick={handleUndoSelection}
                  disabled={isBusy || !canUndo}
                />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("selected")}
                    disabled={isBusy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Grid2X2 size={15} />
                    Selected
                  </button>

                  {openPanel === "selected" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        Rotate selected pages
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          { label: "90°", value: 90 },
                          { label: "180°", value: 180 },
                          { label: "270°", value: 270 },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => rotateSelectedPages(item.value as RotationDegree)}
                            disabled={!file || isBusy || selectedPages.length === 0}
                            className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={resetSelectedPages}
                        disabled={!file || isBusy || selectedPages.length === 0}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                        Reset selected
                      </button>

                      <div className="mt-3 max-h-28 overflow-y-auto rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                        {selectedPagesLabel}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("all")}
                    disabled={isBusy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCwSquare size={15} />
                    All
                  </button>

                  {openPanel === "all" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        Rotate all pages
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {[
                          { label: "90°", value: 90 },
                          { label: "180°", value: 180 },
                          { label: "270°", value: 270 },
                        ].map((item) => (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => rotateAll(item.value as RotationDegree)}
                            disabled={!file || isBusy}
                            className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={resetAll}
                        disabled={!file || isBusy || changedPages === 0}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                        Reset all rotations
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("history")}
                    disabled={isBusy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcwSquare size={15} />
                    History
                  </button>

                  {openPanel === "history" ? (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <button
                        type="button"
                        onClick={undoRotation}
                        disabled={isBusy || !canUndoRotation}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Undo2 size={15} />
                        Undo rotation
                      </button>

                      <button
                        type="button"
                        onClick={redoRotation}
                        disabled={isBusy || !canRedoRotation}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Redo2 size={15} />
                        Redo rotation
                      </button>
                    </div>
                  ) : null}
                </div>

                <IconButton
                  label="Help"
                  icon={<CircleHelp size={16} />}
                  onClick={() => togglePanel("help")}
                  active={openPanel === "help"}
                />

                <IconButton
                  label="Remove file"
                  icon={<X size={16} />}
                  onClick={clearFile}
                  disabled={isBusy}
                  danger
                />

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={!file || isBusy}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {exporting ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {exporting ? "Exporting" : result ? "Export Again" : "Export"}
                </button>
              </div>

              {openPanel === "help" ? (
                <div className="absolute right-3 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                  Click pages to select them. Hold Shift and click another page to select a range.
                  Use individual page buttons for quick -90°, 0°, and +90° rotation.
                </div>
              ) : null}
            </div>
          ) : null}

          <section
            onDrop={handleUploadDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {pdfLoading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDF here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse file or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  Visual rotate · Multi-select · Undo/redo
                </div>
              </button>
            ) : (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={isBusy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/55 px-4 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[160px]"
                  >
                    <Upload size={16} />
                    Change PDF
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {file.name}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                </div>

                {pdfLoading ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Rendering page thumbnails...</span>
                      <span>{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <Download size={16} />
                    Rotated PDF created · {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

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
                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        +90°
                      </button>
                    </div>
                  )}
                />
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusIsError ? "text-red-600" : "text-slate-500"}`}>
            {file && !statusIsError && !isBusy
              ? `${changedPages || 0} changed · ${selectedPages.length} selected · ${result ? `output ${formatFileSize(result.outputSize)}` : "ready to export"}`
              : currentStatus}
          </div>
        </section>
      </main>
    </>
  );
}
