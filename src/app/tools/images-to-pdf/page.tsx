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
  FileImage,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  MousePointer2,
  RotateCcw,
  Shuffle,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { PdfEngineError, downloadBlob, formatFileSize, type PdfProcessingResult } from "@/lib/pdf-engine";
import {
  convertImagesToPdfEngine,
  getImageToPdfRejectedSummary,
  validateImageFiles,
} from "@/lib/pdf-image-engine";

type ImageQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Conversion failed. Please check your images and try again.";
}

function pluralizeImage(count: number) {
  return `${count} image${count === 1 ? "" : "s"}`;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
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

export default function ImagesToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedImageIdsRef = useRef<string[]>([]);

  const { recordExport } = useEntitlement();

  const [images, setImages] = useState<ImageQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const [status, setStatus] = useState("Upload JPG, PNG, or WebP images to convert into PDF.");
  const [busy, setBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const totalSize = useMemo(
    () => images.reduce((sum, item) => sum + item.file.size, 0),
    [images],
  );

  const selectedSummary = useMemo(() => {
    if (!selectedIds.length) return "No image selected";
    return `${pluralizeImage(selectedIds.length)} selected`;
  }, [selectedIds.length]);

  const canConvert = images.length > 0 && !busy;

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("no supported") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("unable");

  function addImages(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0 || busy) return;

    const incomingFiles = Array.from(selectedFiles);
    const validation = validateImageFiles(incomingFiles);
    const preparedImages = validation.accepted.map((file) => ({
      id: createQueueId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (preparedImages.length > 0) {
      setImages((current) => [...current, ...preparedImages]);
      setSelectedIds(preparedImages.map((image) => image.id));
      setLastSelectedId(preparedImages[preparedImages.length - 1]?.id ?? null);
      setResult(null);
    }

    const messageParts: string[] = [];
    if (preparedImages.length > 0) {
      messageParts.push(`Added ${pluralizeImage(preparedImages.length)}.`);
    }

    const rejectedSummary = getImageToPdfRejectedSummary(validation.rejected);
    if (rejectedSummary) messageParts.push(rejectedSummary);

    setStatus(messageParts.join(" ") || "No supported images were selected.");
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      return moveItem(current, index, targetIndex);
    });
    setResult(null);
    setStatus("Image order updated.");
  }

  function moveSelectedImages(direction: -1 | 1) {
    if (!selectedIds.length) {
      setStatus("Select one or more images first.");
      return;
    }

    const selected = new Set(selectedIds);

    setImages((current) => {
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
    setStatus(`${pluralizeImage(selectedIds.length)} moved ${direction === -1 ? "up" : "down"}.`);
  }

  function moveSelectedToEdge(edge: "start" | "end") {
    if (!selectedIds.length) {
      setStatus("Select one or more images first.");
      return;
    }

    const selected = new Set(selectedIds);

    setImages((current) => {
      const selectedImages = current.filter((image) => selected.has(image.id));
      const remainingImages = current.filter((image) => !selected.has(image.id));

      return edge === "start"
        ? [...selectedImages, ...remainingImages]
        : [...remainingImages, ...selectedImages];
    });

    setResult(null);
    setStatus(`${pluralizeImage(selectedIds.length)} moved to ${edge === "start" ? "start" : "end"}.`);
  }

  function removeImage(id: string) {
    setImages((current) => {
      const item = current.find((image) => image.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((image) => image.id !== id);
    });

    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id));
    setLastSelectedId((current) => (current === id ? null : current));
    setResult(null);
    setStatus("Image removed from queue.");
  }

  function removeSelectedImages() {
    if (!selectedIds.length) {
      setStatus("Select images to remove first.");
      return;
    }

    const selected = new Set(selectedIds);

    setImages((current) => {
      current.forEach((image) => {
        if (selected.has(image.id)) URL.revokeObjectURL(image.previewUrl);
      });

      return current.filter((image) => !selected.has(image.id));
    });

    setSelectedIds([]);
    setLastSelectedId(null);
    setResult(null);
    setStatus(`${pluralizeImage(selectedIds.length)} removed.`);
  }

  function clearImages() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setSelectedIds([]);
    setLastSelectedId(null);
    setResult(null);
    setExportProgress(0);
    setStatus("Upload JPG, PNG, or WebP images to convert into PDF.");
  }

  function reverseImages() {
    setImages((current) => [...current].reverse());
    setResult(null);
    setStatus("Image order reversed.");
  }

  function sortImagesByName() {
    setImages((current) =>
      [...current].sort((first, second) => first.file.name.localeCompare(second.file.name)),
    );
    setResult(null);
    setStatus("Images sorted by file name.");
  }

  function selectAllImages() {
    setSelectedIds(images.map((image) => image.id));
    setLastSelectedId(images[images.length - 1]?.id ?? null);
    setStatus("All images selected.");
  }

  function clearSelection() {
    setSelectedIds([]);
    setLastSelectedId(null);
    setStatus("Selection cleared.");
  }

  function handleImageSelect(
    id: string,
    event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>,
  ) {
    if (busy) return;

    const imageIndex = images.findIndex((image) => image.id === id);

    if (event.shiftKey && lastSelectedId !== null) {
      const lastIndex = images.findIndex((image) => image.id === lastSelectedId);

      if (lastIndex !== -1 && imageIndex !== -1) {
        const start = Math.min(lastIndex, imageIndex);
        const end = Math.max(lastIndex, imageIndex);
        setSelectedIds(images.slice(start, end + 1).map((image) => image.id));
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
    addImages(event.dataTransfer.files);
  }

  function handleCardDragStart(index: number, event: DragEvent<HTMLDivElement>) {
    if (busy) return;

    const image = images[index];
    const idsToMove = selectedIdSet.has(image.id) ? selectedIds : [image.id];

    draggedIndexRef.current = index;
    draggedImageIdsRef.current = idsToMove;
    setDraggedIndex(index);
    setDragOverIndex(index);

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));

    if (!selectedIdSet.has(image.id)) {
      setSelectedIds([image.id]);
      setLastSelectedId(image.id);
    }
  }

  function handleCardDrop(targetIndex: number) {
    const movingIds = draggedImageIdsRef.current;
    if (!movingIds.length) return;

    const movingSet = new Set(movingIds);
    const targetImage = images[targetIndex];

    if (movingSet.has(targetImage.id) && movingIds.length > 1) {
      resetDragState();
      return;
    }

    const movingImages = images.filter((image) => movingSet.has(image.id));
    const remainingImages = images.filter((image) => !movingSet.has(image.id));
    const insertIndex = remainingImages.findIndex((image) => image.id === targetImage.id);

    if (insertIndex === -1) {
      resetDragState();
      return;
    }

    setImages([
      ...remainingImages.slice(0, insertIndex),
      ...movingImages,
      ...remainingImages.slice(insertIndex),
    ]);

    setResult(null);
    setStatus(
      movingImages.length === 1
        ? `${movingImages[0].file.name} moved to position ${insertIndex + 1}.`
        : `${pluralizeImage(movingImages.length)} moved to position ${insertIndex + 1}.`,
    );

    resetDragState();
  }

  function resetDragState() {
    draggedIndexRef.current = null;
    draggedImageIdsRef.current = [];
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleConvert() {
    if (images.length === 0 || busy) {
      setStatus("Upload at least one supported image first.");
      return;
    }

    setBusy(true);
    setExportProgress(8);
    setResult(null);
    setStatus("Converting images with PDFMantra image engine...");

    try {
      setExportProgress(32);
      const output = await convertImagesToPdfEngine(images.map((image) => image.file));

      setExportProgress(82);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "images-to-pdf",
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
      setStatus(`PDF created successfully from ${pluralizeImage(images.length)}. Download started.`);
    } catch (error) {
      setResult(null);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  if (images.length === 0) {
    return (
      <>
        <Header />
        <ToolLandingState
          icon={FileImage}
          title="Images to PDF"
          description="Convert JPG, PNG, or WebP images into a single PDF."
          ctaLabel="Select images"
          accept="image/*"
          multiple
          tips={["Drag to reorder", "Multiple formats supported", "Single PDF output"]}
          onFileSelect={(selected) => addImages(Array.isArray(selected) ? selected : [selected])}
        />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            multiple
            className="hidden"
            onChange={(event) => {
              addImages(event.target.files || undefined);
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
                  <FileImage size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Convert images to PDF.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Upload JPG, PNG, or WebP images, drag them into order, and export one clean PDF.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] rounded-[1.25rem] border border-[var(--border-light)] bg-white/92 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{images.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Images</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedIds.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {result ? formatFileSize(result.outputSize) : images.length ? formatFileSize(totalSize) : "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {result ? "Output" : "Input"}
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
                  {busy ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Drop images here
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  JPG, PNG, and WebP supported. PDF follows the order below.
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Drag images into order. Use Ctrl/Shift for multi-select.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={reverseImages}
                      disabled={!images.length || busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Shuffle size={15} />
                      Reverse
                    </button>
                    <button
                      type="button"
                      onClick={sortImagesByName}
                      disabled={!images.length || busy}
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
                          onClick={selectAllImages}
                          disabled={busy || !images.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MousePointer2 size={15} />
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={removeSelectedImages}
                          disabled={busy || !selectedIds.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Remove Selected
                        </button>
                        <button
                          type="button"
                          onClick={clearImages}
                          disabled={!images.length || busy}
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
                        Ctrl / Shift click Â· Multi select<br />
                        PDF output follows visible image order.<br />
                        WebP is handled by the image engine before PDF export.
                      </div>
                    </div>

                    <button type="button" onClick={handleConvert} disabled={!canConvert} className="btn-primary px-4 py-2">
                      {busy ? (
                        <><Loader2 className="animate-spin" size={18} /><span>Processing</span></>
                      ) : (
                        <><Download size={18} /><span>Export</span></>
                      )}
                    </button>
                  </div>
                </div>

                {busy ? (
                  <div className="mt-3 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                      <span>Creating PDF</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    PDF created: {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                {images.length === 0 ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <ImageIcon className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No images selected</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Add images to preview and convert them into PDF.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {images.map((item, index) => {
                      const isSelected = selectedIdSet.has(item.id);
                      const isDropTarget = dragOverIndex === index && draggedIndex !== index;

                      return (
                        <div
                          key={item.id}
                          draggable={!busy}
                          role="button"
                          tabIndex={0}
                          aria-pressed={isSelected}
                          onClick={(event) => handleImageSelect(item.id, event)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleImageSelect(item.id, event);
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

                          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)]">
                            <div className="flex aspect-[3/4] items-center justify-center p-3">
                              <img
                                src={item.previewUrl}
                                alt={item.file.name}
                                className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
                                draggable={false}
                              />
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-2 opacity-0 transition group-focus-within:opacity-100 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveImage(index, "up");
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
                                moveImage(index, "down");
                              }}
                              disabled={index === images.length - 1 || busy}
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
                                removeImage(item.id);
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
              <button type="button" onClick={() => moveSelectedImages(-1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">â†‘ Up</button>
              <button type="button" onClick={() => moveSelectedImages(1)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">â†“ Down</button>
              <button type="button" onClick={() => moveSelectedToEdge("start")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">â¤’ Start</button>
              <button type="button" onClick={() => moveSelectedToEdge("end")} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">â¤“ End</button>
              <button type="button" onClick={removeSelectedImages} disabled={busy} className="rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">âœ• Remove</button>
              <button type="button" onClick={clearSelection} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Clear</button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}

