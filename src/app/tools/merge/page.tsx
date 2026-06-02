"use client";

import {
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  CheckCircle2,
  CircleHelp,
  Download,
  FileStack,
  FileText,
  GripVertical,
  Loader2,
  MousePointer2,
  RotateCcw,
  Shuffle,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
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

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
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

export default function MergePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedIdsRef = useRef<string[]>([]);

  const [items, setItems] = useState<MergeQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [busy, setBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [status, setStatus] = useState("Upload two or more PDFs to merge.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

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
    status.toLowerCase().includes("empty");

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
    setStatus("Merging PDFs with PDFMantra engine...");

    try {
      setExportProgress(35);
      const output = await mergePdfFiles(items.map((item) => item.file));

      setExportProgress(86);
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

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
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

          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-5 sm:py-6 lg:px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.14)_0%,rgba(101,80,232,0.05)_38%,transparent_72%)]"
            />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_34px_rgba(101,80,232,0.18)]">
                  <FileStack size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Merge PDFs in a controlled queue.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Upload multiple PDFs, drag them into order, and export one polished document.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] rounded-[1.25rem] border border-[var(--border-light)] bg-white/92 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Files</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedIds.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {result ? formatFileSize(result.outputSize) : items.length ? formatFileSize(totalSize) : "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {result ? "Output" : "Input"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <section className="min-h-[620px] bg-[var(--bg-base)] p-3 sm:p-4">
              <div
                onClick={() => {
                  if (!busy) fileInputRef.current?.click();
                }}
                onDrop={handleUploadDrop}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !busy) {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                className="cursor-pointer rounded-[1.25rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-4 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white">
                  {busy ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Drop PDFs here
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  Upload two or more PDFs. Final output follows the visible order below.
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Drag PDFs into order. Use Ctrl/Shift for multi-select.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={reverseItems}
                      disabled={!items.length || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Shuffle size={15} />
                      Reverse
                    </button>

                    <button
                      type="button"
                      onClick={sortItemsByName}
                      disabled={!items.length || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                      Sort A-Z
                    </button>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        More options
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-52 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={selectAllItems}
                          disabled={busy || !items.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MousePointer2 size={15} />
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={removeSelectedItems}
                          disabled={busy || !selectedIds.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Remove Selected
                        </button>
                        <button
                          type="button"
                          onClick={clearItems}
                          disabled={!items.length || busy}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Clear All
                        </button>
                      </div>
                    </details>

                    <div className="group relative">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)]"
                        aria-label="Help"
                      >
                        <CircleHelp size={17} />
                      </button>
                      <div className="pointer-events-none absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[var(--border-light)] bg-white p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-card)] transition group-hover:opacity-100">
                        Drag cards to reorder.<br />
                        Ctrl / Shift click · Multi select<br />
                        Final merged PDF follows visible order.<br />
                        At least 2 PDFs are required.
                      </div>
                    </div>

                    <button type="button" onClick={handleMerge} disabled={!canMerge} className="btn-primary px-4 py-2">
                      {busy ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Merging</span>
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          <span>Export</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-1.5 text-[var(--violet-600)]">
                    {items.length ? `${items.length} PDF${items.length === 1 ? "" : "s"} in queue` : "No PDFs in queue"}
                  </span>
                  <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    {items.length ? formatFileSize(totalSize) : "0 KB"}
                  </span>
                  <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    {items.length >= 2 ? "Ready to merge" : "Need at least 2 PDFs"}
                  </span>
                </div>

                {busy ? (
                  <div className="mt-3 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                      <span>Merging</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    Merged PDF: {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                {items.length === 0 ? (
                  <div className="mt-4 flex min-h-72 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDFs in queue</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Add PDFs to build your merge sequence.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                          className={`group cursor-grab rounded-[1.25rem] border bg-white p-3 shadow-sm outline-none transition active:cursor-grabbing ${
                            isSelected
                              ? "border-[var(--violet-600)] ring-4 ring-violet-100"
                              : "border-[var(--border-light)] hover:border-[var(--violet-border)]"
                          } ${isDropTarget ? "scale-[0.985] border-[var(--border-focus)] bg-[var(--violet-50)]" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-[var(--text-primary)]">{item.file.name}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  {formatFileSize(item.file.size)}
                                </div>
                              </div>
                            </div>

                            <GripVertical className="shrink-0 text-[var(--text-muted)] opacity-70 transition group-hover:opacity-100" size={17} />
                          </div>

                          <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)]">
                            <div className="text-center">
                              <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                              <div className="mt-3 rounded-full bg-white px-3 py-1 text-xs font-bold text-[var(--violet-600)] shadow-sm">
                                Position {index + 1}
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveItem(index, "up");
                              }}
                              disabled={index === 0 || busy}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move up"
                            >
                              <ArrowUp size={13} />
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveItem(index, "down");
                              }}
                              disabled={index === items.length - 1 || busy}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-[var(--border-light)] bg-white px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-35"
                              title="Move down"
                            >
                              <ArrowDown size={13} />
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                removeItem(item.id);
                              }}
                              disabled={busy}
                              className="inline-flex items-center justify-center rounded-xl border border-red-100 bg-red-50 px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-35"
                              title="Remove"
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className={`mt-3 px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
            {status}
          </div>

          {selectedIds.length > 0 ? (
            <div className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-3xl flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-white/95 px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-card)] backdrop-blur">
              <span className="px-2 text-[var(--violet-600)]">{selectedSummary}</span>
              <button type="button" onClick={() => moveSelectedItems(-1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">↑ Up</button>
              <button type="button" onClick={() => moveSelectedItems(1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">↓ Down</button>
              <button type="button" onClick={() => moveSelectedToEdge("start")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">⤒ Start</button>
              <button type="button" onClick={() => moveSelectedToEdge("end")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">⤓ End</button>
              <button type="button" onClick={removeSelectedItems} disabled={busy} className="rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">✕ Remove</button>
              <button type="button" onClick={clearSelection} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
