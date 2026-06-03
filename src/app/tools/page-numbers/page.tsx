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
  ChevronDown,
  CircleHelp,
  Download,
  FileText,
  Grip,
  Hash,
  Loader2,
  MousePointer2,
  RotateCcw,
  Settings2,
  Upload,
  X,
} from "lucide-react";
import { StandardFonts, rgb } from "pdf-lib";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
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

  const { recordExport } = useEntitlement();

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

  const previewText = useMemo(() => {
    if (!targetPlan.pages.length) return "-";
    return buildNumberText(startNumber, targetPlan.pages.length, prefix, suffix);
  }, [prefix, startNumber, suffix, targetPlan.pages.length]);

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
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "page-numbers",
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
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("range");

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
                  <Hash size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Add page numbers with live preview.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Upload one PDF, place numbers visually, target exact pages, and export a numbered copy.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] rounded-[1.25rem] border border-[var(--border-light)] bg-white/92 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{file ? targetPlan.pages.length : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Numbered</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Output</div>
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
                  {busyMode === "rendering" ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
                </div>
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag one PDF to begin."}
                </div>

                {busyMode === "rendering" ? (
                  <div className="mx-auto mt-3 max-w-md">
                    <ProgressBar value={renderPercent} />
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      Rendering previews {renderProgress.done}/{renderProgress.total}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Drag any visible number for exact placement. Export applies the same position.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        Position
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <div className="grid grid-cols-3 gap-2">
                          {POSITION_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => setPresetPosition(preset)}
                              disabled={busy}
                              className={`rounded-xl border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                positionPresetId === preset.id
                                  ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                                  : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                              }`}
                              title={preset.label}
                            >
                              {preset.shortLabel}
                            </button>
                          ))}
                        </div>
                        <div className="mt-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                          X {position.xPercent.toFixed(1)}% · Y {position.yPercent.toFixed(1)}%
                        </div>
                      </div>
                    </details>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {targetMode === "all" ? "All pages" : targetMode === "odd" ? "Odd pages" : targetMode === "even" ? "Even pages" : "Custom range"}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        {[
                          { id: "all", label: "All Pages" },
                          { id: "odd", label: "Odd Pages" },
                          { id: "even", label: "Even Pages" },
                          { id: "custom", label: "Custom Range" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTargetMode(item.id as TargetMode);
                              setResult(null);
                            }}
                            disabled={busy}
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              targetMode === item.id
                                ? "bg-[var(--violet-50)] text-[var(--violet-600)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}

                        <label className="mt-2 flex items-start gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] p-3">
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
                          <span className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                            Skip first page
                          </span>
                        </label>
                      </div>
                    </details>

                    {targetMode === "custom" ? (
                      <input
                        value={customRange}
                        onChange={(event) => {
                          setCustomRange(event.target.value);
                          setResult(null);
                        }}
                        placeholder="1-5, 8, 10-12"
                        disabled={busy}
                        className="h-10 w-52 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : null}

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        Style
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Start number</span>
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

                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
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

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Prefix</span>
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
                            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Suffix</span>
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

                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {NUMBER_COLORS.map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => {
                                setColorId(color.id);
                                setResult(null);
                              }}
                              disabled={busy}
                              className={`rounded-xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
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
                    </details>

                    <button
                      type="button"
                      onClick={resetSettings}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <RotateCcw size={15} />
                      Reset
                    </button>

                    <div className="group relative">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)]"
                        aria-label="Help"
                      >
                        <CircleHelp size={17} />
                      </button>
                      <div className="pointer-events-none absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[var(--border-light)] bg-white p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-card)] transition group-hover:opacity-100">
                        Drag number chip to adjust placement.<br />
                        Use suffix <strong>/ {"{total}"}</strong> for total numbered pages.<br />
                        Custom range example: 1-5, 8, 10-12.<br />
                        {targetSummary}
                      </div>
                    </div>

                    <button type="button" onClick={handleExport} disabled={busy || !file} className="btn-primary px-4 py-2">
                      {busyMode === "exporting" ? (
                        <><Loader2 className="animate-spin" size={18} /><span>Exporting</span></>
                      ) : (
                        <><Download size={18} /><span>Export</span></>
                      )}
                    </button>

                    {file ? (
                      <button
                        type="button"
                        onClick={clearFile}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={15} />
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={`rounded-full border px-3 py-1.5 ${targetPlan.error ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"}`}>
                    {targetSummary}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    <Settings2 size={13} />
                    Preview: {previewText}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    <MousePointer2 size={13} />
                    X {position.xPercent.toFixed(1)}% · Y {position.yPercent.toFixed(1)}%
                  </span>
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
                    Numbered PDF: {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                {busyMode === "rendering" && previews.length === 0 ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Rendering previews
                    </div>
                  </div>
                ) : previews.length === 0 ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF selected</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to place page numbers visually.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {previews.map((preview) => {
                      const isNumbered = targetPageSet.has(preview.pageNumber);
                      const numberText = getPreviewText(preview.pageNumber);

                      return (
                        <div
                          key={preview.pageNumber}
                          className={`group overflow-hidden rounded-[1.25rem] border bg-white p-3 shadow-sm transition ${
                            isNumbered ? "border-[var(--violet-border)]" : "border-[var(--border-light)] opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                                {preview.pageNumber}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">Page {preview.pageNumber}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  {isNumbered ? "Numbered" : "Skipped"}
                                </div>
                              </div>
                            </div>

                            {isNumbered ? (
                              <span className="rounded-full bg-[var(--violet-50)] px-2 py-1 text-[10px] font-bold text-[var(--violet-600)]">
                                {numberText}
                              </span>
                            ) : null}
                          </div>

                          <div
                            data-page-preview="true"
                            className="relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)] p-3"
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
                                {numberText}
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
          </div>

          <div className={`mt-3 px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
            {status}
          </div>
        </section>
      </main>
    </>
  );
}
