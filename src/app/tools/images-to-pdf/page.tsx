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
  ArrowUpDown,
  BarChart3,
  CheckCircle2,
  ChevronsDown,
  ChevronsUp,
  CircleHelp,
  Download,
  FileImage,
  GripVertical,
  Loader2,
  MoreHorizontal,
  MousePointer2,
  Search,
  Settings2,
  ShieldCheck,
  Shuffle,
  StopCircle,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { PdfEngineError, downloadBlob, formatFileSize, type PdfProcessingResult } from "@/lib/pdf-engine";
import {
  convertImagesToPdfEngine,
  convertImagesToSearchablePdfEngine,
  getImageToPdfRejectedSummary,
  validateImageFiles,
  type ImageToPdfFitMode,
  type ImageToPdfOrientation,
  type ImageToPdfPageSize,
} from "@/lib/pdf-image-engine";
import {
  runOcrPipeline,
  terminateOcrWorker,
  type OcrDetectedLanguage,
  type OcrLanguage,
  type OcrLanguageBreakdown,
  type OcrProgress,
  type OcrQuality,
  type OcrResult,
} from "@/lib/pdf-ocr-engine";
import type { TextOverlayProgress } from "@/lib/pdf-text-overlay";

type ImageQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type ImagesToPdfVariant = {
  title: string;
  subtitle: string;
  initialStatus: string;
  accept: string;
  outputSlug: string;
};

const DEFAULT_IMAGES_TO_PDF_VARIANT: ImagesToPdfVariant = {
  title: "Images to PDF",
  subtitle: "Convert images into a PDF document.",
  initialStatus: "Upload JPG, PNG, or WebP images to convert into PDF.",
  accept: "image/png,image/jpeg,image/jpg,image/webp",
  outputSlug: "images-to-pdf",
};

type OcrSummary = {
  totalWords: number;
  rawWords: number;
  averageConfidence: number;
  language: string;
  detectedLanguage: OcrDetectedLanguage;
  languageSymbol: string;
  languageBreakdown: OcrLanguageBreakdown;
};

type OpenDropdown = "layout" | "ocr" | "more" | "help" | null;
type PerRow = 1 | 2 | 3 | 4 | 5;

const OCR_FREE_RUN_LIMIT = 3;
const OCR_FREE_IMAGE_LIMIT = 20;

const PAGE_SIZE_OPTIONS: Array<{ value: ImageToPdfPageSize; label: string }> = [
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
  { value: "legal", label: "Legal" },
  { value: "a3", label: "A3" },
  { value: "original", label: "Original" },
];

const ORIENTATION_OPTIONS: Array<{ value: ImageToPdfOrientation; label: string }> = [
  { value: "auto", label: "Auto" },
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
];

const FIT_MODE_OPTIONS: Array<{ value: ImageToPdfFitMode; label: string }> = [
  { value: "contain", label: "Contain" },
  { value: "cover", label: "Cover" },
  { value: "stretch", label: "Stretch" },
];

const OCR_QUALITY_OPTIONS: Array<{ value: OcrQuality; label: string; description: string }> = [
  { value: "fast", label: "Fast", description: "Quick OCR scan" },
  { value: "balanced", label: "Balanced", description: "Recommended OCR scan" },
  { value: "high", label: "High", description: "Best for scanned documents" },
];

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  if (error instanceof Error) return error.message;
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
        className="h-full rounded-full bg-violet-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
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

function getGridClass(perRow: PerRow) {
  if (perRow === 1) return "grid-cols-1";
  if (perRow === 2) return "grid-cols-2";
  if (perRow === 3) return "grid-cols-2 md:grid-cols-3";
  if (perRow === 4) return "grid-cols-2 lg:grid-cols-4";
  return "grid-cols-2 lg:grid-cols-5";
}

function getTodayOcrUsageKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `pdfmantra-ocr-runs-${year}-${month}-${day}`;
}

function getLocalOcrRunsUsed() {
  if (typeof window === "undefined") return 0;

  const value = window.localStorage.getItem(getTodayOcrUsageKey());
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : 0;
}

function recordLocalOcrRun() {
  if (typeof window === "undefined") return 0;

  const nextValue = getLocalOcrRunsUsed() + 1;
  window.localStorage.setItem(getTodayOcrUsageKey(), String(nextValue));

  return nextValue;
}

function buildOcrProgressMessage(progress: OcrProgress | TextOverlayProgress | null) {
  if (!progress) return "OCR is ready.";

  if (progress.stage === "preprocess") return progress.message;
  if (progress.stage === "ocr") return progress.message;
  return progress.message || "Adding searchable text layer...";
}

function getLanguageLabel(language: OcrDetectedLanguage) {
  if (language === "hindi") return "Hindi";
  if (language === "english") return "English";
  if (language === "mixed") return "Mixed";
  if (language === "arabic") return "Arabic";
  if (language === "spanish") return "Spanish";
  if (language === "french") return "French";
  if (language === "german") return "German";
  return "Auto";
}

function getOcrSummary(results: OcrResult[]): OcrSummary {
  const totalWords = results.reduce((sum, result) => sum + result.words.length, 0);
  const rawWords = results.reduce((sum, result) => sum + result.rawWords.length, 0);
  const confidenceInputs = results.filter((result) => result.words.length > 0);
  const averageConfidence = confidenceInputs.length
    ? confidenceInputs.reduce((sum, result) => sum + result.averageConfidence, 0) / confidenceInputs.length
    : 0;

  const languageBreakdown = results.reduce<OcrLanguageBreakdown>(
    (summary, result) => ({
      english: summary.english + result.languageBreakdown.english,
      hindi: summary.hindi + result.languageBreakdown.hindi,
      arabic: summary.arabic + result.languageBreakdown.arabic,
      other: summary.other + result.languageBreakdown.other,
    }),
    { english: 0, hindi: 0, arabic: 0, other: 0 },
  );

  const detectedLanguage = detectDominantLanguage(languageBreakdown, results);
  const languageSymbol = getLanguageSymbol(detectedLanguage);

  return {
    totalWords,
    rawWords,
    averageConfidence: Math.round(averageConfidence),
    language: getLanguageLabel(detectedLanguage),
    detectedLanguage,
    languageSymbol,
    languageBreakdown,
  };
}

function detectDominantLanguage(
  breakdown: OcrLanguageBreakdown,
  results: OcrResult[],
): OcrDetectedLanguage {
  const total = breakdown.english + breakdown.hindi + breakdown.arabic + breakdown.other;

  if (total === 0) {
    return results[0]?.detectedLanguage || "unknown";
  }

  const englishRatio = breakdown.english / total;
  const hindiRatio = breakdown.hindi / total;
  const arabicRatio = breakdown.arabic / total;
  const activeLanguages = [englishRatio, hindiRatio, arabicRatio].filter((ratio) => ratio >= 0.18).length;

  if (activeLanguages >= 2) return "mixed";
  if (hindiRatio >= 0.18) return "hindi";
  if (arabicRatio >= 0.18) return "arabic";
  if (englishRatio >= 0.18) return "english";

  return results[0]?.detectedLanguage || "unknown";
}

function getLanguageSymbol(language: OcrDetectedLanguage) {
  if (language === "hindi") return "अ";
  if (language === "english") return "EN";
  if (language === "mixed") return "🌐";
  if (language === "arabic") return "ع";
  if (language === "spanish") return "ES";
  if (language === "french") return "FR";
  if (language === "german") return "DE";
  return "OCR";
}

function getBreakdownTotal(breakdown: OcrLanguageBreakdown) {
  return Math.max(1, breakdown.english + breakdown.hindi + breakdown.arabic + breakdown.other);
}

function getBreakdownPercent(value: number, total: number) {
  return Math.round((value / total) * 100);
}

function OcrGraph({ summary }: { summary: OcrSummary }) {
  const total = getBreakdownTotal(summary.languageBreakdown);
  const englishPercent = getBreakdownPercent(summary.languageBreakdown.english, total);
  const hindiPercent = getBreakdownPercent(summary.languageBreakdown.hindi, total);
  const arabicPercent = getBreakdownPercent(summary.languageBreakdown.arabic, total);
  const otherPercent = Math.max(0, 100 - englishPercent - hindiPercent - arabicPercent);

  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold text-emerald-800">
          <BarChart3 size={16} />
          OCR scan result
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700">
          {summary.languageSymbol} {summary.language}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Words</div>
          <div className="mt-1 text-lg font-black text-slate-900">{summary.totalWords}</div>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Raw OCR</div>
          <div className="mt-1 text-lg font-black text-slate-900">{summary.rawWords}</div>
        </div>
        <div className="rounded-xl bg-white px-3 py-2">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">Confidence</div>
          <div className="mt-1 text-lg font-black text-slate-900">{summary.averageConfidence}%</div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-full bg-white">
        <div className="flex h-3 w-full">
          <div className="bg-blue-500" style={{ width: `${englishPercent}%` }} />
          <div className="bg-violet-500" style={{ width: `${hindiPercent}%` }} />
          <div className="bg-amber-500" style={{ width: `${arabicPercent}%` }} />
          <div className="bg-slate-300" style={{ width: `${otherPercent}%` }} />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
        <span>EN {englishPercent}%</span>
        <span>Hindi {hindiPercent}%</span>
        <span>Arabic {arabicPercent}%</span>
        <span>Other {otherPercent}%</span>
      </div>
    </div>
  );
}

export default function ImagesToPdfPage({ variant = DEFAULT_IMAGES_TO_PDF_VARIANT }: { readonly variant?: ImagesToPdfVariant } = {}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const draggedIndexRef = useRef<number | null>(null);
  const draggedImageIdsRef = useRef<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { recordExport, isUnlimited, planLabel } = useEntitlement();

  const [images, setImages] = useState<ImageQueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);

  const [pageSize, setPageSize] = useState<ImageToPdfPageSize>("a4");
  const [orientation, setOrientation] = useState<ImageToPdfOrientation>("auto");
  const [fitMode, setFitMode] = useState<ImageToPdfFitMode>("contain");
  const [margin, setMargin] = useState(28);
  const [perRow, setPerRow] = useState<PerRow>(4);

  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [ocrLanguage] = useState<OcrLanguage>("auto");
  const [ocrQuality, setOcrQuality] = useState<OcrQuality>("high");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | TextOverlayProgress | null>(null);
  const [ocrSummary, setOcrSummary] = useState<OcrSummary | null>(null);
  const [localOcrRunsUsed, setLocalOcrRunsUsed] = useState(0);

  const [status, setStatus] = useState(variant.initialStatus);
  const [busy, setBusy] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const totalSize = useMemo(
    () => images.reduce((sum, item) => sum + item.file.size, 0),
    [images],
  );

  const ocrRunsRemaining = useMemo(() => {
    if (isUnlimited) return Number.POSITIVE_INFINITY;
    return Math.max(0, OCR_FREE_RUN_LIMIT - localOcrRunsUsed);
  }, [isUnlimited, localOcrRunsUsed]);

  const canConvert = images.length > 0 && !busy;

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("no supported") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("cancelled") ||
    status.toLowerCase().includes("ocr limit") ||
    status.toLowerCase().includes("free ocr");

  useEffect(() => {
    setLocalOcrRunsUsed(getLocalOcrRunsUsed());

    return () => {
      abortControllerRef.current?.abort();
      void terminateOcrWorker();
    };
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current) return;
      if (event.target instanceof Node && toolbarRef.current.contains(event.target)) return;

      setOpenDropdown(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function toggleDropdown(nextDropdown: OpenDropdown) {
    setOpenDropdown((current) => (current === nextDropdown ? null : nextDropdown));
  }

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
      setOcrSummary(null);
      setOcrProgress(null);
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
    setOcrSummary(null);
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
    setOcrSummary(null);
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
    setOcrSummary(null);
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
    setOcrSummary(null);
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
    setOcrSummary(null);
    setStatus(`${pluralizeImage(selectedIds.length)} removed.`);
  }

  function clearImages() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setSelectedIds([]);
    setLastSelectedId(null);
    setResult(null);
    setOcrSummary(null);
    setOcrProgress(null);
    setExportProgress(0);
    setOpenDropdown(null);
    setStatus(variant.initialStatus);
  }

  function reverseImages() {
    setImages((current) => [...current].reverse());
    setResult(null);
    setOcrSummary(null);
    setStatus("Image order reversed.");
  }

  function sortImagesByName() {
    setImages((current) =>
      [...current].sort((first, second) => first.file.name.localeCompare(second.file.name)),
    );
    setResult(null);
    setOcrSummary(null);
    setStatus("Images sorted by file name.");
  }

  function selectAllImages() {
    setSelectedIds(images.map((image) => image.id));
    setLastSelectedId(images[images.length - 1]?.id ?? null);
    setStatus("All images selected.");
    setOpenDropdown(null);
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
    setOcrSummary(null);
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

  function cancelOcr() {
    abortControllerRef.current?.abort();
    setStatus("OCR cancelled.");
  }

  function validateOcrRun() {
    if (!ocrEnabled) return true;

    if (!isUnlimited && images.length > OCR_FREE_IMAGE_LIMIT) {
      setStatus(`Free OCR supports up to ${OCR_FREE_IMAGE_LIMIT} images per run. Upgrade to Pro for unlimited OCR images.`);
      return false;
    }

    if (!isUnlimited && ocrRunsRemaining <= 0) {
      setStatus(`Free OCR limit reached. ${planLabel} allows ${OCR_FREE_RUN_LIMIT} OCR runs per day.`);
      return false;
    }

    return true;
  }

  async function handleConvert() {
    if (images.length === 0 || busy) {
      setStatus("Upload at least one supported image first.");
      return;
    }

    if (!validateOcrRun()) return;

    setBusy(true);
    setOpenDropdown(null);
    setExportProgress(8);
    setResult(null);
    setOcrSummary(null);
    setOcrProgress(null);

    const orderedFiles = images.map((image) => image.file);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const pdfOptions = {
      pageSize,
      orientation,
      fitMode,
      margin,
      outputFileName: ocrEnabled ? `PDFMantra-searchable-${variant.outputSlug}.pdf` : `PDFMantra-${variant.outputSlug}.pdf`,
    };

    try {
      let output: PdfProcessingResult;

      if (ocrEnabled) {
        setStatus("Auto OCR scan started. Detecting Hindi/English text...");
        setExportProgress(10);

        const ocrResults = await runOcrPipeline(orderedFiles, {
          language: ocrLanguage,
          quality: ocrQuality,
          signal: abortController.signal,
          onProgress(progress) {
            setOcrProgress(progress);
            setExportProgress(Math.max(10, Math.min(74, Math.round(progress.percent * 0.74))));
            setStatus(buildOcrProgressMessage(progress));
          },
        });

        const summary = getOcrSummary(ocrResults);
        setOcrSummary(summary);

        setExportProgress(76);
        setStatus(
          `${summary.languageSymbol} ${summary.language} detected · ${summary.totalWords} searchable words · Creating searchable PDF...`,
        );

        output = await convertImagesToSearchablePdfEngine(orderedFiles, {
          ...pdfOptions,
          ocrResults,
          signal: abortController.signal,
          onOverlayProgress(progress) {
            setOcrProgress(progress);
            setExportProgress(76 + Math.round(progress.percent * 0.16));
            setStatus(buildOcrProgressMessage(progress));
          },
        });
      } else {
        setStatus("Converting images with PDFMantra image engine...");
        setExportProgress(32);
        output = await convertImagesToPdfEngine(orderedFiles, pdfOptions);
      }

      setExportProgress(88);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: ocrEnabled ? "images-to-pdf-ocr" : "images-to-pdf",
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

      setExportProgress(94);
      setResult(output);
      downloadBlob(output.blob, output.fileName);

      if (ocrEnabled && !isUnlimited) {
        setLocalOcrRunsUsed(recordLocalOcrRun());
      }

      setExportProgress(100);
      setStatus(
        ocrEnabled && ocrSummary
          ? `Searchable PDF created · ${ocrSummary.languageSymbol} ${ocrSummary.language} · Download started.`
          : ocrEnabled
            ? `Searchable PDF created successfully from ${pluralizeImage(images.length)}. Download started.`
            : `PDF created successfully from ${pluralizeImage(images.length)}. Download started.`,
      );
    } catch (error) {
      setResult(null);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      abortControllerRef.current = null;
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
            accept={variant.accept}
            multiple
            className="hidden"
            onChange={(event) => {
              addImages(event.target.files || undefined);
              event.currentTarget.value = "";
            }}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <FileImage size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Images to PDF
              </h1>
              <p className="text-sm text-slate-500">
                Convert images into a PDF document.
              </p>
            </div>
          </div>

          {images.length > 0 ? (
            <div
              ref={toolbarRef}
              className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                {selectedIds.length > 0 ? (
                  <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                    {selectedIds.length} selected
                  </span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                    {images.length} image{images.length === 1 ? "" : "s"}
                  </span>
                )}

                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {formatFileSize(totalSize)}
                </span>

                {ocrSummary ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    {ocrSummary.languageSymbol} {ocrSummary.totalWords} words · {ocrSummary.averageConfidence}%
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  label="Reverse"
                  icon={<Shuffle size={16} />}
                  onClick={reverseImages}
                  disabled={!images.length || busy}
                />

                <IconButton
                  label="Sort A-Z"
                  icon={<ArrowUpDown size={16} />}
                  onClick={sortImagesByName}
                  disabled={!images.length || busy}
                />

                <IconButton
                  label="Move up"
                  icon={<ArrowUp size={16} />}
                  onClick={() => moveSelectedImages(-1)}
                  disabled={!selectedIds.length || busy}
                />

                <IconButton
                  label="Move down"
                  icon={<ArrowDown size={16} />}
                  onClick={() => moveSelectedImages(1)}
                  disabled={!selectedIds.length || busy}
                />

                <IconButton
                  label="Move to start"
                  icon={<ChevronsUp size={16} />}
                  onClick={() => moveSelectedToEdge("start")}
                  disabled={!selectedIds.length || busy}
                />

                <IconButton
                  label="Move to end"
                  icon={<ChevronsDown size={16} />}
                  onClick={() => moveSelectedToEdge("end")}
                  disabled={!selectedIds.length || busy}
                />

                <IconButton
                  label="Remove selected"
                  icon={<X size={16} />}
                  onClick={removeSelectedImages}
                  disabled={!selectedIds.length || busy}
                  danger
                />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("layout")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Settings2 size={15} />
                    Layout: {pageSize.toUpperCase()}
                  </button>

                  {openDropdown === "layout" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="space-y-3">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Page size
                          </span>
                          <select
                            value={pageSize}
                            onChange={(event) => {
                              setPageSize(event.target.value as ImageToPdfPageSize);
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          >
                            {PAGE_SIZE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Orientation
                          </span>
                          <select
                            value={orientation}
                            onChange={(event) => {
                              setOrientation(event.target.value as ImageToPdfOrientation);
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          >
                            {ORIENTATION_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Fit mode
                          </span>
                          <select
                            value={fitMode}
                            onChange={(event) => {
                              setFitMode(event.target.value as ImageToPdfFitMode);
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                          >
                            {FIT_MODE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Margin <span>{margin}px</span>
                          </span>
                          <input
                            type="range"
                            min={0}
                            max={80}
                            value={margin}
                            onChange={(event) => {
                              setMargin(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy || pageSize === "original"}
                            className="mt-3 w-full"
                          />
                        </label>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => toggleDropdown("ocr")}
                    disabled={busy}
                    className={`inline-flex h-9 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                      ocrEnabled
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  >
                    <Search size={15} />
                    {ocrEnabled
                      ? ocrSummary
                        ? `OCR: ${ocrSummary.languageSymbol}`
                        : "OCR: Auto"
                      : "OCR"}
                  </button>

                  {openDropdown === "ocr" ? (
                    <div className="absolute right-0 z-50 mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={ocrEnabled}
                          onChange={(event) => {
                            setOcrEnabled(event.target.checked);
                            setResult(null);
                            setOcrSummary(null);
                          }}
                          disabled={busy}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600"
                        />
                        <span>
                          <span className="block text-sm font-bold text-slate-900">
                            Auto searchable PDF
                          </span>
                          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">
                            Detects Hindi/English and adds searchable text.
                          </span>
                        </span>
                      </label>

                      <div className="my-3 h-px bg-slate-200" />

                      <label className="grid grid-cols-[72px_1fr] items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Quality
                        </span>
                        <select
                          value={ocrQuality}
                          onChange={(event) => {
                            setOcrQuality(event.target.value as OcrQuality);
                            setOcrSummary(null);
                          }}
                          disabled={busy || !ocrEnabled}
                          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {OCR_QUALITY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      {ocrSummary ? (
                        <div className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                          {ocrSummary.languageSymbol} {ocrSummary.language} · {ocrSummary.totalWords} words · {ocrSummary.averageConfidence}%
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-800">
                          First OCR run downloads language data. Scan runs before export.
                        </div>
                      )}

                      <div className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs font-semibold leading-5 text-violet-700">
                        <ShieldCheck className="mr-1 inline" size={13} />
                        {isUnlimited
                          ? "Pro: unlimited OCR runs"
                          : `${ocrRunsRemaining}/${OCR_FREE_RUN_LIMIT} OCR runs today`}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <IconButton
                    label="More"
                    icon={<MoreHorizontal size={17} />}
                    onClick={() => toggleDropdown("more")}
                    active={openDropdown === "more"}
                  />

                  {openDropdown === "more" ? (
                    <div className="absolute right-0 z-50 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button
                        type="button"
                        onClick={selectAllImages}
                        disabled={busy || !images.length}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MousePointer2 size={15} />
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={clearImages}
                        disabled={!images.length || busy}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={15} />
                        Clear all
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <IconButton
                    label="Help"
                    icon={<CircleHelp size={17} />}
                    onClick={() => toggleDropdown("help")}
                    active={openDropdown === "help"}
                  />

                  {openDropdown === "help" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                      Drag cards to reorder.<br />
                      Ctrl / Shift click · Multi select<br />
                      Toolbar buttons work on selected images.<br />
                      OCR auto-detects Hindi/English before export.
                    </div>
                  ) : null}
                </div>

                {busy && ocrEnabled ? (
                  <IconButton
                    label="Cancel OCR"
                    icon={<StopCircle size={17} />}
                    onClick={cancelOcr}
                    danger
                  />
                ) : null}

                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={!canConvert}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {busy ? "Processing" : ocrEnabled ? "Scan & Export" : "Export"}
                </button>
              </div>
            </div>
          ) : null}

          <section
            onDrop={handleUploadDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {images.length === 0 ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  <Upload size={24} />
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">
                  Drop images here
                </div>
                <div className="mt-2 text-sm font-medium text-slate-500">
                  Browse files or drag and drop
                </div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  JPG, PNG, WebP supported · Multiple OK
                </div>
              </button>
            ) : (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/55 px-4 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[160px]"
                  >
                    <Upload size={16} />
                    Add more
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Per row
                    </span>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([1, 2, 3, 4, 5] as PerRow[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPerRow(value)}
                          disabled={busy}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            perRow === value
                              ? "bg-violet-600 text-white shadow-sm"
                              : "text-slate-500 hover:bg-white hover:text-violet-700"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {busy ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>{ocrEnabled ? buildOcrProgressMessage(ocrProgress) : "Creating PDF"}</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {ocrSummary ? (
                  <div className="mb-4">
                    <OcrGraph summary={ocrSummary} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    {ocrEnabled ? "Searchable PDF" : "PDF"} created: {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                <div className={`grid ${getGridClass(perRow)} gap-4`}>
                  {images.map((item, index) => {
                    const isSelected = selectedIdSet.has(item.id);
                    const isDropTarget = dragOverIndex === index && draggedIndex !== index;
                    const isLargeSingle = perRow === 1;

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
                        className={`group cursor-grab rounded-2xl border bg-white p-3 shadow-sm outline-none transition active:cursor-grabbing ${
                          isSelected
                            ? "border-violet-500 ring-4 ring-violet-100"
                            : "border-slate-200 hover:border-violet-300"
                        } ${isDropTarget ? "scale-[0.985] border-violet-400 bg-violet-50" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 pb-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">
                                {item.file.name}
                              </div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                                {formatFileSize(item.file.size)}
                              </div>
                            </div>
                          </div>

                          <GripVertical className="shrink-0 text-slate-400 opacity-70 transition group-hover:opacity-100" size={17} />
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          <div className={`flex items-center justify-center p-3 ${isLargeSingle ? "min-h-[520px]" : "aspect-[3/4]"}`}>
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
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-35"
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
                            className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold uppercase tracking-[0.06em] text-slate-500 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-35"
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
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-slate-500"}`}>
            {images.length > 0 && !statusLooksLikeError && !busy && !ocrSummary
              ? `${images.length} image${images.length === 1 ? "" : "s"} added · ${formatFileSize(totalSize)} total`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}

