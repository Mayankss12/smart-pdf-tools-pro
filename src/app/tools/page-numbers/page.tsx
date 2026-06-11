"use client";

import {
  type DragEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  CheckCircle2,
  CircleHelp,
  Download,
  Grid2X2,
  Hash,
  Loader2,
  MousePointer2,
  Palette,
  RotateCcw,
  Settings2,
  Type,
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
type OpenPanel = "style" | "position" | "pages" | "help" | null;
type PerRow = 1 | 2 | 3 | 4;

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
  const parts = cleanedInput
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

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
  if (perRow === 2) return "grid-cols-1 md:grid-cols-2";
  if (perRow === 3) return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
  return "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";
}

export default function PageNumbersPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [perRow, setPerRow] = useState<PerRow>(3);

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
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!toolbarRef.current) return;
      if (event.target instanceof Node && toolbarRef.current.contains(event.target)) return;

      setOpenPanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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

  function togglePanel(nextPanel: OpenPanel) {
    setOpenPanel((current) => (current === nextPanel ? null : nextPanel));
  }

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
    setOpenPanel(null);
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
    setOpenPanel(null);
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

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Hash size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Page Numbers PDF</h1>
              <p className="text-sm text-slate-500">
                Add page numbers with live preview, custom position, range, prefix, and suffix.
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
                  {targetPlan.pages.length} numbered
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  Starts at {startNumber}
                </span>
                {result ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Output {formatFileSize(result.outputSize)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("style")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Type size={15} />
                    Style
                  </button>

                  {openPanel === "style" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Start number
                          </span>
                          <input
                            type="number"
                            min={0}
                            value={startNumber}
                            onChange={(event) => {
                              setStartNumber(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Font size
                          </span>
                          <input
                            type="number"
                            min={8}
                            max={72}
                            value={fontSize}
                            onChange={(event) => {
                              setFontSize(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                          />
                        </label>
                      </div>

                      <label className="mt-3 block">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Prefix
                        </span>
                        <input
                          value={prefix}
                          onChange={(event) => {
                            setPrefix(event.target.value);
                            setResult(null);
                          }}
                          placeholder="Page "
                          disabled={busy}
                          className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>

                      <label className="mt-3 block">
                        <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Suffix
                        </span>
                        <input
                          value={suffix}
                          onChange={(event) => {
                            setSuffix(event.target.value);
                            setResult(null);
                          }}
                          placeholder=" of {total}"
                          disabled={busy}
                          className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </label>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {NUMBER_COLORS.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => {
                              setColorId(color.id);
                              setResult(null);
                            }}
                            disabled={busy}
                            className={`rounded-xl border px-2 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              colorId === color.id
                                ? "border-violet-500 bg-violet-50"
                                : "border-slate-200 hover:bg-violet-50"
                            } ${color.previewClassName}`}
                          >
                            {color.label}
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold text-slate-500">
                        Preview: <span className="font-bold text-slate-900">{previewText}</span>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("position")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MousePointer2 size={15} />
                    Position
                  </button>

                  {openPanel === "position" ? (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="grid grid-cols-3 gap-2">
                        {POSITION_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setPresetPosition(preset)}
                            disabled={busy}
                            title={preset.label}
                            className={`h-12 rounded-xl border text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              positionPresetId === preset.id
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-500 hover:bg-violet-50"
                            }`}
                          >
                            {preset.shortLabel}
                          </button>
                        ))}
                      </div>
                      <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
                        Drag the number directly on the page preview for custom placement.
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("pages")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Grid2X2 size={15} />
                    {targetMode === "all"
                      ? "All"
                      : targetMode === "odd"
                        ? "Odd"
                        : targetMode === "even"
                          ? "Even"
                          : "Range"}
                  </button>

                  {openPanel === "pages" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "all", label: "All pages" },
                          { id: "odd", label: "Odd pages" },
                          { id: "even", label: "Even pages" },
                          { id: "custom", label: "Custom range" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTargetMode(item.id as TargetMode);
                              setResult(null);
                            }}
                            disabled={busy}
                            className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              targetMode === item.id
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-600 hover:bg-violet-50"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {targetMode === "custom" ? (
                        <input
                          value={customRange}
                          onChange={(event) => {
                            setCustomRange(event.target.value);
                            setResult(null);
                          }}
                          placeholder="1-5, 8, 10-12"
                          disabled={busy}
                          className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      ) : null}

                      <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={skipFirstPage}
                          onChange={(event) => {
                            setSkipFirstPage(event.target.checked);
                            setResult(null);
                          }}
                          disabled={busy}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600"
                        />
                        <span className="text-xs font-semibold leading-5 text-slate-600">
                          Skip first page
                        </span>
                      </label>
                    </div>
                  ) : null}
                </div>

                <IconButton
                  label="Reset"
                  icon={<RotateCcw size={16} />}
                  onClick={resetSettings}
                  disabled={busy}
                />

                <IconButton
                  label="Help"
                  icon={<CircleHelp size={16} />}
                  onClick={() => togglePanel("help")}
                  active={openPanel === "help"}
                />

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={busy || !file}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyMode === "exporting" ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {busyMode === "exporting" ? "Exporting" : result ? "Export Again" : "Export"}
                </button>
              </div>

              {openPanel === "help" ? (
                <div className="absolute right-3 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                  Use suffix <span className="font-bold text-slate-900">{" of {total}"}</span> to create numbering like{" "}
                  <span className="font-bold text-slate-900">Page 1 of 10</span>. Drag the badge on preview to place it manually.
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
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {busyMode === "rendering" ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDF here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse file or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  Custom numbering · Page range · Live placement
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
                    Change PDF
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Per row
                    </span>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([1, 2, 3, 4] as PerRow[]).map((value) => (
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

                {busyMode === "rendering" ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Rendering previews {renderProgress.done}/{renderProgress.total}</span>
                      <span>{renderPercent}%</span>
                    </div>
                    <ProgressBar value={renderPercent} />
                  </div>
                ) : null}

                {busyMode === "exporting" ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Adding page numbers...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    Numbered PDF created · {formatFileSize(result.outputSize)}
                  </div>
                ) : null}

                {targetPlan.error ? (
                  <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {targetPlan.error}
                  </div>
                ) : null}

                <div className={`grid ${getGridClass(perRow)} gap-4`}>
                  {previews.length ? (
                    previews.map((preview) => {
                      const isTarget = targetPageSet.has(preview.pageNumber);
                      const pageText = getPreviewText(preview.pageNumber);

                      return (
                        <div
                          key={preview.pageNumber}
                          className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                            isTarget ? "border-violet-200" : "border-slate-200 opacity-60"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                              {preview.pageNumber}
                            </div>
                            {isTarget ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">
                                Numbered
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                                Skipped
                              </span>
                            )}
                          </div>

                          <div
                            data-page-preview="true"
                            className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
                          >
                            <div className={`${perRow === 1 ? "min-h-[560px]" : "aspect-[3/4]"} flex items-center justify-center p-3`}>
                              <img
                                src={preview.previewUrl}
                                alt={`Page ${preview.pageNumber}`}
                                className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
                                draggable={false}
                              />
                            </div>

                            {isTarget ? (
                              <div
                                onPointerDown={startDrag}
                                className="absolute z-20 cursor-grab select-none active:cursor-grabbing"
                                style={{
                                  left: `${position.xPercent}%`,
                                  top: `${position.yPercent}%`,
                                  transform: "translate(-50%, -50%)",
                                }}
                              >
                                <div
                                  className={`rounded-full border px-2.5 py-1 text-center text-[11px] font-bold leading-none shadow-sm ${selectedColor.previewClassName}`}
                                  style={{ fontSize: `${Math.max(10, Math.min(20, fontSize))}px` }}
                                >
                                  {pageText}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                      <Loader2 className="animate-spin text-violet-600" size={24} />
                      <div className="mt-3 text-sm font-bold text-slate-700">
                        Preparing page previews...
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-slate-500"}`}>
            {file && !statusLooksLikeError && busyMode === "idle"
              ? `${targetSummary} · starts at ${startNumber} · ${previewText}`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
