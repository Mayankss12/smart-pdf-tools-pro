"use client";

import {
  type DragEvent,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Grip,
  Hash,
  ListFilter,
  Loader2,
  MousePointer2,
  RotateCcw,
  Settings2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { StandardFonts, rgb } from "pdf-lib";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import {
  PdfEngineError,
  createPdfFileName,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  savePdfResult,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

type BusyMode = "idle" | "rendering" | "exporting";
type TargetMode = "all" | "odd" | "even" | "custom";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type NumberPosition = {
  xPercent: number;
  yPercent: number;
};

type PositionPreset = {
  id: string;
  label: string;
  shortLabel: string;
  xPercent: number;
  yPercent: number;
};

type NumberColor = {
  id: string;
  label: string;
  previewClassName: string;
  pdf: [number, number, number];
};

type TargetPlan = {
  pages: number[];
  error: string | null;
};

type AdvancedPageNumberOptions = {
  position: NumberPosition;
  targetPages: number[];
  startNumber: number;
  fontSize: number;
  prefix: string;
  suffix: string;
  color: [number, number, number];
};

const POSITION_PRESETS: PositionPreset[] = [
  { id: "top-left", label: "Top Left", shortLabel: "TL", xPercent: 14, yPercent: 10 },
  { id: "top-center", label: "Top Center", shortLabel: "TC", xPercent: 50, yPercent: 10 },
  { id: "top-right", label: "Top Right", shortLabel: "TR", xPercent: 86, yPercent: 10 },
  { id: "middle-left", label: "Middle Left", shortLabel: "ML", xPercent: 14, yPercent: 50 },
  { id: "middle-center", label: "Center", shortLabel: "C", xPercent: 50, yPercent: 50 },
  { id: "middle-right", label: "Middle Right", shortLabel: "MR", xPercent: 86, yPercent: 50 },
  { id: "bottom-left", label: "Bottom Left", shortLabel: "BL", xPercent: 14, yPercent: 92 },
  { id: "bottom-center", label: "Bottom Center", shortLabel: "BC", xPercent: 50, yPercent: 92 },
  { id: "bottom-right", label: "Bottom Right", shortLabel: "BR", xPercent: 86, yPercent: 92 },
];

const NUMBER_COLORS: NumberColor[] = [
  {
    id: "slate",
    label: "Slate",
    previewClassName: "border-slate-900 bg-slate-950 text-white",
    pdf: [0.12, 0.14, 0.2],
  },
  {
    id: "indigo",
    label: "Indigo",
    previewClassName: "border-indigo-600 bg-indigo-600 text-white",
    pdf: [0.31, 0.27, 0.9],
  },
  {
    id: "violet",
    label: "Violet",
    previewClassName: "border-violet-600 bg-violet-600 text-white",
    pdf: [0.49, 0.23, 0.93],
  },
  {
    id: "black",
    label: "Black",
    previewClassName: "border-black bg-black text-white",
    pdf: [0, 0, 0],
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Page number export failed. This PDF may be encrypted, damaged, or unsupported.";
}

function configurePdfWorker() {
  if (typeof window === "undefined") return;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function createPageNumbers(pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function parsePageRange(input: string, pageCount: number): TargetPlan {
  const cleanedInput = input.trim();

  if (!cleanedInput) {
    return { pages: [], error: "Enter a page range like 1-5, 8, 10-12." };
  }

  const selected = new Set<number>();
  const parts = cleanedInput.split(",").map((part) => part.trim()).filter(Boolean);

  for (const part of parts) {
    if (!/^\d+(\s*-\s*\d+)?$/.test(part)) {
      return { pages: [], error: `Invalid range part: ${part}` };
    }

    const [startRaw, endRaw] = part.split("-").map((value) => value.trim());
    const start = Number(startRaw);
    const end = endRaw ? Number(endRaw) : start;

    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
      return { pages: [], error: "Page numbers must be positive whole numbers." };
    }

    if (start > end) {
      return { pages: [], error: `Invalid range ${part}. Start page cannot be greater than end page.` };
    }

    if (end > pageCount) {
      return { pages: [], error: `Range ${part} exceeds this PDF's ${pageCount} page limit.` };
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      selected.add(pageNumber);
    }
  }

  const pages = Array.from(selected).sort((a, b) => a - b);

  if (!pages.length) {
    return { pages: [], error: "No pages found in the selected range." };
  }

  return { pages, error: null };
}

function buildTargetPlan(
  mode: TargetMode,
  pageCount: number,
  customRange: string,
  skipFirstPage: boolean,
): TargetPlan {
  if (pageCount <= 0) return { pages: [], error: null };

  let pages: number[];

  if (mode === "custom") {
    const parsed = parsePageRange(customRange, pageCount);
    if (parsed.error) return parsed;
    pages = parsed.pages;
  } else if (mode === "odd") {
    pages = createPageNumbers(pageCount).filter((pageNumber) => pageNumber % 2 === 1);
  } else if (mode === "even") {
    pages = createPageNumbers(pageCount).filter((pageNumber) => pageNumber % 2 === 0);
  } else {
    pages = createPageNumbers(pageCount);
  }

  if (skipFirstPage) {
    pages = pages.filter((pageNumber) => pageNumber !== 1);
  }

  if (!pages.length) {
    return { pages: [], error: "No pages selected for numbering." };
  }

  return { pages, error: null };
}

function resolveAffix(value: string, totalNumberedPages: number) {
  return value.replace(/\{total\}/gi, String(totalNumberedPages));
}

function buildNumberText(
  displayNumber: number,
  totalNumberedPages: number,
  prefix: string,
  suffix: string,
) {
  return `${resolveAffix(prefix, totalNumberedPages)}${displayNumber}${resolveAffix(suffix, totalNumberedPages)}`;
}

async function loadPdfForPreview(file: File) {
  validatePdfFile(file);
  configurePdfWorker();

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });

  return loadingTask.promise;
}

async function renderPdfPageToPng(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number,
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to create preview canvas.");
  }

  const outputScale = Math.min(window.devicePixelRatio || 1, 2);

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await page.render({ canvasContext: context, viewport }).promise;

  return canvas.toDataURL("image/png");
}

async function addAdvancedPageNumbers(
  file: File,
  options: AdvancedPageNumberOptions,
): Promise<PdfProcessingResult> {
  if (!Number.isInteger(options.startNumber) || options.startNumber < 0) {
    throw new PdfEngineError("PROCESSING_FAILED", "Start number must be 0 or higher.");
  }

  if (!options.targetPages.length) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "Select at least one page to number.");
  }

  const pdf = await loadPdfDocument(file);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = clamp(options.fontSize, 8, 72);
  const xPercent = clamp(options.position.xPercent, 4, 96);
  const yPercent = clamp(options.position.yPercent, 4, 96);
  const targetIndexByPage = new Map(options.targetPages.map((pageNumber, index) => [pageNumber, index]));
  const totalNumberedPages = options.targetPages.length;

  pdf.getPages().forEach((page, index) => {
    const documentPageNumber = index + 1;
    const targetIndex = targetIndexByPage.get(documentPageNumber);

    if (targetIndex === undefined) return;

    const { width, height } = page.getSize();
    const displayNumber = options.startNumber + targetIndex;
    const text = buildNumberText(displayNumber, totalNumberedPages, options.prefix, options.suffix);
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    const x = clamp((xPercent / 100) * width - textWidth / 2, 12, width - textWidth - 12);
    const y = clamp(height - (yPercent / 100) * height - fontSize / 2, 12, height - fontSize - 12);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(options.color[0], options.color[1], options.color[2]),
      opacity: 0.94,
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("page-numbers", file.name));
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = clamp(value, 0, 100);

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/75">
      <div
        className="h-full rounded-full bg-[var(--violet-600)] transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function PageNumbersPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRectRef = useRef<DOMRect | null>(null);
  const renderTokenRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);

  const [position, setPosition] = useState<NumberPosition>({ xPercent: 50, yPercent: 92 });
  const [positionPresetId, setPositionPresetId] = useState("bottom-center");
  const [isDragging, setIsDragging] = useState(false);

  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [customRange, setCustomRange] = useState("1-5");
  const [skipFirstPage, setSkipFirstPage] = useState(false);

  const [startNumber, setStartNumber] = useState(1);
  const [fontSize, setFontSize] = useState(13);
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [colorId, setColorId] = useState("slate");

  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 });
  const [exportProgress, setExportProgress] = useState(0);

  const [status, setStatus] = useState("Upload a PDF, place page numbers, choose target pages, then export.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const busy = busyMode !== "idle";

  const selectedColor = useMemo(
    () => NUMBER_COLORS.find((color) => color.id === colorId) ?? NUMBER_COLORS[0],
    [colorId],
  );

  const targetPlan = useMemo(
    () => buildTargetPlan(targetMode, pageCount, customRange, skipFirstPage),
    [customRange, pageCount, skipFirstPage, targetMode],
  );

  const targetPageSet = useMemo(() => new Set(targetPlan.pages), [targetPlan.pages]);

  const targetIndexByPage = useMemo(
    () => new Map(targetPlan.pages.map((pageNumber, index) => [pageNumber, index])),
    [targetPlan.pages],
  );

  const renderPercent = useMemo(() => {
    if (!renderProgress.total) return 0;
    return Math.round((renderProgress.done / renderProgress.total) * 100);
  }, [renderProgress.done, renderProgress.total]);

  const targetSummary = useMemo(() => {
    if (!file) return "No PDF loaded";
    if (targetPlan.error) return targetPlan.error;
    return `${targetPlan.pages.length} of ${pageCount} pages will receive numbers`;
  }, [file, pageCount, targetPlan.error, targetPlan.pages.length]);

  useEffect(() => {
    configurePdfWorker();
  }, []);

  useEffect(() => {
    function handlePointerMove(event: globalThis.PointerEvent) {
      if (!isDragging || !dragRectRef.current) return;

      const rect = dragRectRef.current;
      const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

      setPosition({
        xPercent: clamp(xPercent, 4, 96),
        yPercent: clamp(yPercent, 4, 96),
      });
      setPositionPresetId("custom");
    }

    function handlePointerUp() {
      if (!isDragging) return;

      setIsDragging(false);
      dragRectRef.current = null;
      setResult(null);
      setStatus("Page number position updated.");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  function getPreviewText(pageNumber: number) {
    const targetIndex = targetIndexByPage.get(pageNumber);

    if (targetIndex === undefined) return "";

    return buildNumberText(
      startNumber + targetIndex,
      targetPlan.pages.length,
      prefix,
      suffix,
    );
  }

  function setPresetPosition(preset: PositionPreset) {
    setPosition({ xPercent: preset.xPercent, yPercent: preset.yPercent });
    setPositionPresetId(preset.id);
    setResult(null);
    setStatus(`Position set to ${preset.label}.`);
  }

  function resetSettings() {
    setPosition({ xPercent: 50, yPercent: 92 });
    setPositionPresetId("bottom-center");
    setTargetMode("all");
    setCustomRange("1-5");
    setSkipFirstPage(false);
    setStartNumber(1);
    setFontSize(13);
    setPrefix("");
    setSuffix("");
    setColorId("slate");
    setResult(null);
    setStatus("Page number settings reset.");
  }

  function updatePositionFromPointer(event: PointerEvent<HTMLDivElement>) {
    const container = event.currentTarget.closest("[data-page-preview='true']") as HTMLElement | null;

    if (!container) return;

    dragRectRef.current = container.getBoundingClientRect();

    const rect = dragRectRef.current;
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

    setPosition({
      xPercent: clamp(xPercent, 4, 96),
      yPercent: clamp(yPercent, 4, 96),
    });
    setPositionPresetId("custom");
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (busy) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    updatePositionFromPointer(event);
    setIsDragging(true);
    setResult(null);
    setStatus("Dragging page number position...");
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile || busy) return;

    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    setBusyMode("rendering");
    setResult(null);
    setExportProgress(0);
    setPreviews([]);
    setFile(null);
    setPageCount(0);
    setRenderProgress({ done: 0, total: 0 });
    setStatus("Rendering PDF page previews...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfForPreview(selectedFile);
      const nextPreviews: PdfPagePreview[] = [];

      setFile(selectedFile);
      setPageCount(pdf.numPages);
      setRenderProgress({ done: 0, total: pdf.numPages });

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        if (renderTokenRef.current !== token) return;

        nextPreviews.push({
          pageNumber,
          previewUrl: await renderPdfPageToPng(pdf, pageNumber, 0.36),
        });

        if (renderTokenRef.current === token) {
          setPreviews([...nextPreviews]);
          setRenderProgress({ done: pageNumber, total: pdf.numPages });
        }
      }

      if (renderTokenRef.current === token) {
        setStatus(`PDF loaded with ${pdf.numPages} page${pdf.numPages > 1 ? "s" : ""}. Page numbers are ready to preview.`);
      }
    } catch (error) {
      renderTokenRef.current += 1;
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setResult(null);
      setRenderProgress({ done: 0, total: 0 });
      setStatus(getErrorMessage(error));
    } finally {
      if (renderTokenRef.current === token) {
        setBusyMode("idle");
      }
    }
  }

  function clearFile() {
    renderTokenRef.current += 1;
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setResult(null);
    setRenderProgress({ done: 0, total: 0 });
    setExportProgress(0);
    setBusyMode("idle");
    setStatus("Upload a PDF, place page numbers, choose target pages, then export.");
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!Number.isInteger(startNumber) || startNumber < 0) {
      setStatus("Start number must be 0 or higher.");
      return;
    }

    if (targetPlan.error || !targetPlan.pages.length) {
      setStatus(targetPlan.error ?? "Select at least one page to number.");
      return;
    }

    setBusyMode("exporting");
    setExportProgress(8);
    setResult(null);
    setStatus("Adding page numbers with PDFMantra engine...");

    try {
      setExportProgress(28);

      const output = await addAdvancedPageNumbers(file, {
        position,
        targetPages: targetPlan.pages,
        startNumber,
        fontSize,
        prefix,
        suffix,
        color: selectedColor.pdf,
      });

      setExportProgress(84);
      setResult(output);
      downloadBlob(output.blob, output.fileName);

      setExportProgress(100);
      setStatus("Page numbered PDF exported successfully. Download started.");
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
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("select at least") ||
    status.toLowerCase().includes("no pages") ||
    status.toLowerCase().includes("range");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Hash}
            eyebrow="PDFMantra Number Engine"
            title="Add page numbers with live preview."
            description="Upload one PDF, choose exact page-number placement, target only the pages you want, and export a numbered PDF."
            meta={
              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{file ? targetPlan.pages.length : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Numbered</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Output</div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] lg:grid-cols-[1fr_390px]">
            <section className="min-h-[680px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
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
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white">
                  {busyMode === "rendering" ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag one PDF to begin."}
                </div>

                {busyMode === "rendering" ? (
                  <div className="mx-auto mt-4 max-w-md">
                    <ProgressBar value={renderPercent} />
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      Rendering previews {renderProgress.done}/{renderProgress.total}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      <Eye size={14} />
                      Live preview board
                    </div>
                    <h2 className="display-font mt-3 text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Preview & Placement
                    </h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      Drag any visible number for fine placement. The same relative position is applied during export.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetSettings}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)] transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={15} />
                      Reset
                    </button>
                    {file ? (
                      <button
                        type="button"
                        onClick={clearFile}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    ) : null}
                  </div>
                </div>

                {busyMode === "rendering" && previews.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Rendering previews
                    </div>
                  </div>
                ) : previews.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF selected</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to place page numbers visually.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {previews.map((preview) => {
                      const isNumbered = targetPageSet.has(preview.pageNumber);
                      const previewText = getPreviewText(preview.pageNumber);

                      return (
                        <div
                          key={preview.pageNumber}
                          className={`overflow-hidden rounded-[1.35rem] border bg-white shadow-sm transition ${
                            isNumbered ? "border-[var(--violet-border)]" : "border-[var(--border-light)] opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-[var(--border-light)] bg-[var(--bg-base)] px-4 py-3">
                            <div>
                              <div className="text-sm font-bold text-[var(--text-primary)]">Page {preview.pageNumber}</div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                {isNumbered ? "Numbered" : "Skipped"}
                              </div>
                            </div>
                            {isNumbered ? (
                              <div className="rounded-full bg-[var(--violet-50)] px-3 py-1 text-xs font-bold text-[var(--violet-600)]">
                                {previewText}
                              </div>
                            ) : null}
                          </div>

                          <div
                            data-page-preview="true"
                            className="relative flex aspect-[3/4] items-center justify-center overflow-hidden bg-[var(--bg-base)] p-4"
                          >
                            <img
                              src={preview.previewUrl}
                              alt={`PDF page ${preview.pageNumber}`}
                              className="max-h-full max-w-full rounded border border-[var(--border-light)] bg-white shadow-sm"
                              draggable={false}
                            />

                            {isNumbered ? (
                              <div
                                onPointerDown={startDrag}
                                className={`absolute z-20 inline-flex touch-none select-none items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow-lg ring-4 ring-violet-100 ${selectedColor.previewClassName} ${
                                  isDragging ? "cursor-grabbing" : "cursor-move"
                                }`}
                                style={{
                                  left: `${position.xPercent}%`,
                                  top: `${position.yPercent}%`,
                                  transform: "translate(-50%, -50%)",
                                  fontSize: Math.max(9, Math.min(24, fontSize * 0.75)),
                                }}
                                title="Drag page number position"
                              >
                                <Grip size={12} />
                                {previewText}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Number Settings
                </h2>
                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Control placement, page range, starting number, styling, and output behavior.
                </p>

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--violet-600)]">
                    <MousePointer2 size={16} />
                    Position picker
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POSITION_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setPresetPosition(preset)}
                        disabled={busy}
                        className={`rounded-xl border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          positionPresetId === preset.id
                            ? "border-[var(--violet-600)] bg-white text-[var(--violet-600)] ring-4 ring-violet-100"
                            : "border-[var(--violet-border)] bg-white/80 text-[var(--text-secondary)] hover:bg-white"
                        }`}
                        title={preset.label}
                      >
                        {preset.shortLabel}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                    Current: X {position.xPercent.toFixed(1)}% • Y {position.yPercent.toFixed(1)}%
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--border-light)] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <ListFilter size={16} className="text-[var(--violet-600)]" />
                    Target pages
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "all", label: "All Pages" },
                      { id: "odd", label: "Odd Pages" },
                      { id: "even", label: "Even Pages" },
                      { id: "custom", label: "Custom" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTargetMode(item.id as TargetMode);
                          setResult(null);
                        }}
                        disabled={busy}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                          targetMode === item.id
                            ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                            : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {targetMode === "custom" ? (
                    <label className="mt-4 block">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Custom range</span>
                      <input
                        value={customRange}
                        onChange={(event) => {
                          setCustomRange(event.target.value);
                          setResult(null);
                        }}
                        placeholder="1-5, 8, 10-12"
                        disabled={busy}
                        className="input-premium mt-2"
                      />
                    </label>
                  ) : null}

                  <label className="mt-4 flex items-start gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)] p-3">
                    <input
                      type="checkbox"
                      checked={skipFirstPage}
                      disabled={busy}
                      onChange={(event) => {
                        setSkipFirstPage(event.target.checked);
                        setResult(null);
                      }}
                      className="mt-1 h-4 w-4 rounded border-[var(--border-light)] text-[var(--violet-600)]"
                    />
                    <span>
                      <span className="block text-sm font-bold text-[var(--text-primary)]">Skip first page</span>
                      <span className="block text-xs font-medium leading-5 text-[var(--text-secondary)]">
                        Useful when page 1 is a cover page.
                      </span>
                    </span>
                  </label>

                  <div className={`mt-4 rounded-2xl border p-3 text-sm font-semibold leading-6 ${
                    targetPlan.error ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                  }`}>
                    {targetSummary}
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-[var(--border-light)] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                    <Settings2 size={16} className="text-[var(--violet-600)]" />
                    Text style
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-[var(--text-primary)]">Start number</span>
                    <input
                      type="number"
                      min={0}
                      value={startNumber}
                      onChange={(event) => {
                        const nextValue = Number(event.target.value);
                        setStartNumber(Number.isFinite(nextValue) ? nextValue : 1);
                        setResult(null);
                      }}
                      disabled={busy}
                      className="input-premium mt-2"
                    />
                  </label>

                  <label className="mt-4 block">
                    <span className="flex justify-between text-sm font-semibold text-[var(--text-primary)]">
                      Font size <span>{fontSize}px</span>
                    </span>
                    <input
                      type="range"
                      min={8}
                      max={36}
                      value={fontSize}
                      onChange={(event) => {
                        setFontSize(Number(event.target.value));
                        setResult(null);
                      }}
                      disabled={busy}
                      className="mt-2 w-full"
                    />
                  </label>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Prefix</span>
                      <input
                        value={prefix}
                        onChange={(event) => {
                          setPrefix(event.target.value);
                          setResult(null);
                        }}
                        placeholder="Page "
                        disabled={busy}
                        className="input-premium mt-2"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Suffix</span>
                      <input
                        value={suffix}
                        onChange={(event) => {
                          setSuffix(event.target.value);
                          setResult(null);
                        }}
                        placeholder=" / {total}"
                        disabled={busy}
                        className="input-premium mt-2"
                      />
                    </label>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Number color</div>
                    <div className="grid grid-cols-2 gap-2">
                      {NUMBER_COLORS.map((color) => (
                        <button
                          key={color.id}
                          type="button"
                          onClick={() => {
                            setColorId(color.id);
                            setResult(null);
                          }}
                          disabled={busy}
                          className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            colorId === color.id
                              ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                              : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                          }`}
                        >
                          {color.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">Preview text</div>
                    <div className="mt-1 truncate text-xl font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                      {targetPlan.pages.length ? getPreviewText(targetPlan.pages[0]) : "-"}
                    </div>
                  </div>

                  {busyMode === "exporting" ? (
                    <div className="rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                        <span>Export progress</span>
                        <span>{exportProgress}%</span>
                      </div>
                      <ProgressBar value={exportProgress} />
                    </div>
                  ) : null}

                  {result ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                      <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Last output</div>
                      Numbered PDF: {formatFileSize(result.outputSize)}.
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={handleExport} disabled={busy || !file} className="btn-primary mt-5 w-full">
                  {busyMode === "exporting" ? (
                    <><Loader2 className="animate-spin" size={18} /><span>Exporting</span></>
                  ) : (
                    <><Download size={18} /><span>Export Numbered PDF</span></>
                  )}
                </button>
              </div>

              <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[var(--shadow-soft)] ${
                statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
              }`}>
                <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                {status}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-white p-4 shadow-[var(--shadow-soft)]">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                  <Sparkles size={16} className="text-[var(--violet-600)]" />
                  Smart tips
                </div>
                <div className="grid gap-2 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                  <div>Use suffix <span className="font-bold text-[var(--text-primary)]">/ {"{total}"}</span> to show total numbered pages.</div>
                  <div>Use Custom range for selected pages like <span className="font-bold text-[var(--text-primary)]">2-5, 8, 10-12</span>.</div>
                  <div>Drag any visible number on preview for precise placement.</div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
