"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  CircleHelp,
  Download,
  FileStack,
  FileText,
  GripVertical,
  Loader2,
  MoreHorizontal,
  MousePointer2,
  RotateCcw,
  Shuffle,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  mergePdfFiles,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

type MergeQueueItem = {
  id: string;
  file: File;
};

type OpenPanel = "order" | "selection" | "more" | "help" | null;

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
  return "Merge failed. Please check your PDFs and try again.";
}

function pluralizeFile(count: number) {
  return `${count} PDF${count === 1 ? "" : "s"}`;
}

function moveArrayItem<T>(items: T[], fromIndex: number, toIndex: number) {
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

export default function MergePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedIdsRef = useRef<string[]>([]);

  const { recordExport } = useEntitlement();

  const [items, setItems] = useState<MergeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [status, setStatus] = useState("Upload two or more PDFs to merge.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const totalSize = useMemo(
    () => items.reduce((sum, item) => sum + item.file.size, 0),
    [items],
  );

  const selectedSummary = useMemo(() => {
    if (!selectedIds.length) return "No PDF selected";
    return `${pluralizeFile(selectedIds.length)} selected`;
  }, [selectedIds.length]);

  const canMerge = items.length >= 2 && !busy;

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("rejected") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("unable");

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

  function addFiles(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0 || busy) return;

    const incomingFiles = Array.from(selectedFiles);
    const validItems: MergeQueueItem[] = [];
    const rejectedMessages: string[] = [];

    for (const file of incomingFiles) {
      try {
        validatePdfFile(file);
        validItems.push({ id: createQueueId(), file });
      } catch (error) {
        rejectedMessages.push(`${file.name}: ${getErrorMessage(error)}`);
      }
    }

    if (validItems.length > 0) {
      setItems((current) => [...current, ...validItems]);
      setSelectedIds(validItems.map((item) => item.id));
      setLastSelectedId(validItems[validItems.length - 1]?.id ?? null);
      setResult(null);
      setExportProgress(0);
      setOpenPanel(null);
    }

    const messages = [];

    if (validItems.length > 0) {
      messages.push(`Added ${pluralizeFile(validItems.length)}.`);
    }

    if (rejectedMessages.length > 0) {
      messages.push(`${rejectedMessages.length} file${rejectedMessages.length > 1 ? "s were" : " was"} rejected.`);
    }

    setStatus(messages.join(" ") || "No valid PDFs were selected.");
  }

  function moveItem(index: number, direction: "up" | "down") {
    setItems((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      return moveArrayItem(current, index, targetIndex);
    });

    setResult(null);
    setExportProgress(0);
    setStatus("Merge order updated.");
  }

  function moveSelectedItems(direction: -1 | 1) {
    if (!selectedIds.length) {
      setStatus("Select one or more PDFs first.");
      return;
    }

    const selected = new Set(selectedIds);

    setItems((current) => {
      const next = [...current];

      if (direction === -1) {
        for (let index = 1; index < next.length; index += 1) {
          if (selected.has(next[index].id) && !selected.has(next[index - 1].id)) {
            [next[index - 1], next[index]] = [next[index], next[index - 1]];
          }
        }
      } else {
        for (let index = next.length - 2; index >= 0; index -= 1) {
          if (selected.has(next[index].id) && !selected.has(next[index + 1].id)) {
            [next[index], next[index + 1]] = [next[index + 1], next[index]];
          }
        }
      }

      return next;
    });

    setResult(null);
    setExportProgress(0);
    setStatus(`${pluralizeFile(selectedIds.length)} moved ${direction === -1 ? "up" : "down"}.`);
  }

  function moveSelectedToEdge(edge: "start" | "end") {
    if (!selectedIds.length) {
      setStatus("Select one or more PDFs first.");
      return;
    }

    const selected = new Set(selectedIds);

    setItems((current) => {
      const selectedItems = current.filter((item) => selected.has(item.id));
      const remainingItems = current.filter((item) => !selected.has(item.id));

      return edge === "start"
        ? [...selectedItems, ...remainingItems]
        : [...remainingItems, ...selectedItems];
    });

    setResult(null);
    setExportProgress(0);
    setStatus(`${pluralizeFile(selectedIds.length)} moved to ${edge === "start" ? "start" : "end"}.`);
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    setLastSelectedId((current) => (current === id ? null : current));
    setResult(null);
    setExportProgress(0);
    setStatus("PDF removed from the merge queue.");
  }

  function removeSelectedItems() {
    if (!selectedIds.length) {
      setStatus("Select PDFs to remove first.");
      return;
    }

    const selected = new Set(selectedIds);

    setItems((current) => current.filter((item) => !selected.has(item.id)));
    setSelectedIds([]);
    setLastSelectedId(null);
    setResult(null);
    setExportProgress(0);
    setStatus(`${pluralizeFile(selectedIds.length)} removed.`);
  }

  function clearItems() {
    setItems([]);
    setSelectedIds([]);
    setLastSelectedId(null);
    setResult(null);
    setExportProgress(0);
    setOpenPanel(null);
    setStatus("Upload two or more PDFs to merge.");
  }

  function reverseItems() {
    setItems((current) => [...current].reverse());
    setResult(null);
    setExportProgress(0);
    setStatus("Merge order reversed.");
  }

  function sortItemsByName() {
    setItems((current) =>
      [...current].sort((first, second) => first.file.name.localeCompare(second.file.name)),
    );
    setResult(null);
    setExportProgress(0);
    setStatus("PDFs sorted by file name.");
  }

  function selectAllItems() {
    setSelectedIds(items.map((item) => item.id));
    setLastSelectedId(items[items.length - 1]?.id ?? null);
    setStatus("All PDFs selected.");
  }

  function clearSelection() {
    setSelectedIds([]);
    setLastSelectedId(null);
    setStatus("Selection cleared.");
  }

  function handleItemSelect(
    id: string,
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) {
    if (busy) return;

    const itemIndex = items.findIndex((item) => item.id === id);

    if (event.shiftKey && lastSelectedId !== null) {
      const lastIndex = items.findIndex((item) => item.id === lastSelectedId);

      if (lastIndex !== -1 && itemIndex !== -1) {
        const start = Math.min(lastIndex, itemIndex);
        const end = Math.max(lastIndex, itemIndex);
        setSelectedIds(items.slice(start, end + 1).map((item) => item.id));
        setLastSelectedId(id);
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedIds((current) => {
        if (current.includes(id)) {
          return current.filter((selectedId) => selectedId !== id);
        }

        return [...current, id];
      });
      setLastSelectedId(id);
      return;
    }

    setSelectedIds([id]);
    setLastSelectedId(id);
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    addFiles(event.dataTransfer.files);
  }

  function handleCardDragStart(index: number, event: DragEvent<HTMLDivElement>) {
    if (busy) return;

    const item = items[index];
    const idsToMove = selectedIdSet.has(item.id) ? selectedIds : [item.id];

    draggedIndexRef.current = index;
    draggedIdsRef.current = idsToMove;
    setDraggedIndex(index);
    setDragOverIndex(index);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    if (!selectedIdSet.has(item.id)) {
      setSelectedIds([item.id]);
      setLastSelectedId(item.id);
    }
  }

  function handleCardDrop(targetIndex: number) {
    const movingIds = draggedIdsRef.current;
    if (!movingIds.length) return;

    const movingSet = new Set(movingIds);
    const targetItem = items[targetIndex];

    if (movingSet.has(targetItem.id) && movingIds.length > 1) {
      resetDragState();
      return;
    }

    const movingItems = items.filter((item) => movingSet.has(item.id));
    const remainingItems = items.filter((item) => !movingSet.has(item.id));
    const insertIndex = remainingItems.findIndex((item) => item.id === targetItem.id);

    if (insertIndex === -1) {
      resetDragState();
      return;
    }

    setItems([
      ...remainingItems.slice(0, insertIndex),
      ...movingItems,
      ...remainingItems.slice(insertIndex),
    ]);

    setResult(null);
    setExportProgress(0);
    setStatus(
      movingItems.length === 1
        ? `${movingItems[0].file.name} moved to position ${insertIndex + 1}.`
        : `${pluralizeFile(movingItems.length)} moved to position ${insertIndex + 1}.`,
    );

    resetDragState();
  }

  function resetDragState() {
    draggedIndexRef.current = null;
    draggedIdsRef.current = [];
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleMerge() {
    if (items.length < 2 || busy) {
      setStatus("Please upload at least two PDFs to merge.");
      return;
    }

    setBusy(true);
    setExportProgress(8);
    setResult(null);
    setOpenPanel(null);
    setStatus("Merging PDFs with PDFMantra engine...");

    try {
      setExportProgress(35);
      const output = await mergePdfFiles(items.map((item) => item.file));

      setExportProgress(82);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "merge",
        exportKind: "clean",
      });

      if (!exportRecord.allowed) {
        setResult(null);
        setExportProgress(0);

        const limitMessage =
          exportRecord.error ||
          (exportRecord.identityType === "guest"
            ? "Guest clean export limit reached for today. Sign in to get 5 clean exports/day."
            : `${exportRecord.planLabel} clean export limit reached for today.`);

        setStatus(limitMessage);
        return;
      }

      setExportProgress(92);
      setResult(output);
      downloadBlob(output.blob, output.fileName);

      setExportProgress(100);
      setStatus(`Merged ${items.length} PDFs successfully. Download started.`);
    } catch (error) {
      console.error(error);
      setResult(null);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(event) => {
              addFiles(event.target.files || undefined);
              event.currentTarget.value = "";
            }}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <FileStack size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Merge PDF Files</h1>
              <p className="text-sm text-slate-500">
                Combine multiple PDFs into one ordered document with drag-and-drop control.
              </p>
            </div>
          </div>

          {items.length ? (
            <div
              ref={toolbarRef}
              className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {pluralizeFile(items.length)}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {selectedSummary}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  Input {formatFileSize(totalSize)}
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
                  icon={<MousePointer2 size={16} />}
                  onClick={selectAllItems}
                  disabled={busy || !items.length}
                />

                <IconButton
                  label="Clear selection"
                  icon={<X size={16} />}
                  onClick={clearSelection}
                  disabled={busy || !selectedIds.length}
                  danger={selectedIds.length > 0}
                />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("order")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Shuffle size={15} />
                    Order
                  </button>

                  {openPanel === "order" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <button
                        type="button"
                        onClick={reverseItems}
                        disabled={!items.length || busy}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Shuffle size={15} />
                        Reverse order
                      </button>

                      <button
                        type="button"
                        onClick={sortItemsByName}
                        disabled={!items.length || busy}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                        Sort A-Z
                      </button>

                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                        Final merged PDF follows the visible order below.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("selection")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowUp size={15} />
                    Move
                  </button>

                  {openPanel === "selection" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => moveSelectedItems(-1)}
                          disabled={busy || !selectedIds.length}
                          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowUp size={15} />
                          Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSelectedItems(1)}
                          disabled={busy || !selectedIds.length}
                          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowDown size={15} />
                          Down
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSelectedToEdge("start")}
                          disabled={busy || !selectedIds.length}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          To start
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSelectedToEdge("end")}
                          disabled={busy || !selectedIds.length}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          To end
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={removeSelectedItems}
                        disabled={busy || !selectedIds.length}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={15} />
                        Remove selected
                      </button>

                      <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                        Use Ctrl/Shift click on cards for multi-select.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <IconButton
                    label="More"
                    icon={<MoreHorizontal size={17} />}
                    onClick={() => togglePanel("more")}
                    active={openPanel === "more"}
                  />

                  {openPanel === "more" ? (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={busy}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload size={15} />
                        Add more PDFs
                      </button>

                      <button
                        type="button"
                        onClick={clearItems}
                        disabled={!items.length || busy}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={15} />
                        Clear all
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

                <button
                  type="button"
                  onClick={handleMerge}
                  disabled={!canMerge}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {busy ? "Merging" : result ? "Merge Again" : "Merge"}
                </button>
              </div>

              {openPanel === "help" ? (
                <div className="absolute right-3 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                  Drag cards to reorder. Use Ctrl/Shift click for multi-select. At least 2 PDFs are required.
                </div>
              ) : null}
            </div>
          ) : null}

          <section
            onDrop={handleUploadDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {!items.length ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {busy ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDFs here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse files or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  Multi-file queue · Drag order · Clean export
                </div>
              </button>
            ) : (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/55 px-4 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[170px]"
                  >
                    <Upload size={16} />
                    Add PDFs
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      Final output follows this order
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {items.length >= 2 ? "Ready to merge" : "Need at least 2 PDFs"}
                    </span>
                  </div>
                </div>

                {busy ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Merging PDFs...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    Merged PDF created · {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((item, index) => {
                    const isSelected = selectedIdSet.has(item.id);
                    const isDropTarget = dragOverIndex === index && draggedIndex !== index;

                    return (
                      <div
                        key={item.id}
                        draggable={!busy}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                        onClick={(event) => handleItemSelect(item.id, event)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleItemSelect(item.id, event);
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
                        className={`group cursor-grab rounded-2xl border bg-white p-3 shadow-sm outline-none transition active:cursor-grabbing ${
                          isSelected
                            ? "border-violet-500 ring-4 ring-violet-100"
                            : "border-slate-200 hover:border-violet-300"
                        } ${isDropTarget ? "scale-[0.985] border-violet-400 bg-violet-50" : ""}`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                            {index + 1}
                          </div>

                          <GripVertical className="shrink-0 text-slate-400 opacity-70 transition group-hover:opacity-100" size={17} />
                        </div>

                        <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <div className="text-center">
                            <FileText className="mx-auto text-violet-400" size={42} />
                            <div className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-violet-600 shadow-sm">
                              PDF {index + 1}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 min-w-0">
                          <div className="truncate text-sm font-bold text-slate-900">{item.file.name}</div>
                          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                            {formatFileSize(item.file.size)}
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveItem(index, "up");
                            }}
                            disabled={busy || index === 0}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Up
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              moveItem(index, "down");
                            }}
                            disabled={busy || index === items.length - 1}
                            className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Down
                          </button>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeItem(item.id);
                            }}
                            disabled={busy}
                            className="rounded-xl border border-red-200 bg-white px-2 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-slate-500"}`}>
            {items.length && !statusLooksLikeError && !busy
              ? `${pluralizeFile(items.length)} · ${selectedSummary} · ${formatFileSize(totalSize)}`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
