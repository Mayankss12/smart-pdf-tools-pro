"use client";

import {
  type DragEvent,
  type MouseEvent,
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
  FileImage,
  Grid2X2,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  MousePointer2,
  Settings2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { createZipBlob } from "@/lib/browser-zip";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  parsePageGroups,
  safeFileBaseName,
  validatePdfFile,
} from "@/lib/pdf-engine";

type ExportFormat = "png" | "jpeg" | "webp";
type TargetMode = "all" | "odd" | "even" | "custom" | "visual";
type BusyMode = "idle" | "reading" | "rendering" | "exporting";
type ThumbnailStatus = "idle" | "loading" | "ready" | "error";

type RenderedImage = {
  pageNumber: number;
  blob: Blob;
  fileName: string;
  previewUrl: string;
};

type PageThumbnail = {
  pageNumber: number;
  previewUrl: string;
};

type TargetPlan = {
  pages: number[];
  error: string | null;
};

type OpenDropdown = "format" | "dpi" | "pages" | "more" | "help" | null;
type PerRow = 1 | 2 | 3 | 4 | 5;

const DPI_PRESETS = [
  { id: 96, label: "96 DPI", description: "Fast preview" },
  { id: 150, label: "150 DPI", description: "Web quality" },
  { id: 200, label: "200 DPI", description: "Sharp sharing" },
  { id: 300, label: "300 DPI", description: "Print-ready" },
];

const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; description: string }> = [
  { id: "png", label: "PNG", description: "Crisp lossless images" },
  { id: "jpeg", label: "JPEG", description: "Smaller white-background files" },
  { id: "webp", label: "WEBP", description: "Modern compressed images" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Unable to convert this PDF into images. Please try another file.";
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

function getMimeType(format: ExportFormat) {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

function getExtension(format: ExportFormat) {
  if (format === "png") return "png";
  if (format === "webp") return "webp";
  return "jpg";
}

function getScaleFromDpi(dpi: number) {
  return clamp(dpi, 72, 450) / 72;
}

function formatPagesAsRange(pages: number[]) {
  const sortedPages = [...new Set(pages)].sort((a, b) => a - b);

  if (!sortedPages.length) return "";

  const ranges: string[] = [];
  let start = sortedPages[0];
  let previous = sortedPages[0];

  for (let index = 1; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index];

    if (pageNumber === previous + 1) {
      previous = pageNumber;
      continue;
    }

    ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
    start = pageNumber;
    previous = pageNumber;
  }

  ranges.push(start === previous ? `${start}` : `${start}-${previous}`);
  return ranges.join(", ");
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to create image output."));
      },
      getMimeType(format),
      format === "png" ? undefined : quality,
    );
  });
}

async function loadPdfJsDocument(file: File) {
  validatePdfFile(file);

  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });

  return loadingTask.promise;
}

async function renderPageToImage({
  pdf,
  pageNumber,
  format,
  dpi,
  quality,
  baseName,
}: {
  pdf: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  format: ExportFormat;
  dpi: number;
  quality: number;
  baseName: string;
}) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: getScaleFromDpi(dpi) });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: format === "png" });

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to prepare image rendering canvas.");
  }

  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  if (format === "jpeg" || format === "webp") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  await page.render({ canvasContext: context, viewport }).promise;

  const blob = await canvasToBlob(canvas, format, quality);
  const extension = getExtension(format);

  return {
    pageNumber,
    blob,
    fileName: `PDFMantra-${baseName}-page-${String(pageNumber).padStart(3, "0")}.${extension}`,
    previewUrl: URL.createObjectURL(blob),
  };
}

async function renderPageThumbnail(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: 0.36 });
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to prepare preview canvas.");
  }

  canvas.width = Math.ceil(viewport.width * pixelRatio);
  canvas.height = Math.ceil(viewport.height * pixelRatio);
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  await page.render({ canvasContext: context, viewport }).promise;

  return URL.createObjectURL(await canvasToBlob(canvas, "png", 1));
}

function buildTargetPlan(
  targetMode: TargetMode,
  pageInput: string,
  pageCount: number,
  visualPages: number[],
): TargetPlan {
  if (pageCount <= 0) return { pages: [], error: null };

  try {
    if (targetMode === "all") {
      return { pages: createPageNumbers(pageCount), error: null };
    }

    if (targetMode === "odd") {
      return {
        pages: createPageNumbers(pageCount).filter((pageNumber) => pageNumber % 2 === 1),
        error: null,
      };
    }

    if (targetMode === "even") {
      return {
        pages: createPageNumbers(pageCount).filter((pageNumber) => pageNumber % 2 === 0),
        error: null,
      };
    }

    if (targetMode === "visual") {
      if (!visualPages.length) {
        return { pages: [], error: "Select pages from the visual board first." };
      }

      return {
        pages: [...new Set(visualPages)].sort((a, b) => a - b),
        error: null,
      };
    }

    const groups = parsePageGroups(pageInput, pageCount);
    const pages = Array.from(new Set(groups.flatMap((group) => group.pages))).sort((a, b) => a - b);

    if (!pages.length) {
      return { pages: [], error: "No pages selected for image export." };
    }

    return { pages, error: null };
  } catch (error) {
    return { pages: [], error: getErrorMessage(error) };
  }
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

export default function PdfToImagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);

  const { recordExport } = useEntitlement();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [pageInput, setPageInput] = useState("1-3");
  const [targetMode, setTargetMode] = useState<TargetMode>("all");

  const [format, setFormat] = useState<ExportFormat>("png");
  const [dpi, setDpi] = useState(200);
  const [quality, setQuality] = useState(0.92);
  const [downloadAsZip, setDownloadAsZip] = useState(true);

  const [thumbnails, setThumbnails] = useState<PageThumbnail[]>([]);
  const [thumbnailStatus, setThumbnailStatus] = useState<ThumbnailStatus>("idle");
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<OpenDropdown>(null);
  const [perRow, setPerRow] = useState<PerRow>(4);

  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 });
  const [exportProgress, setExportProgress] = useState(0);

  const [status, setStatus] = useState("Upload a PDF to export pages as images.");
  const [outputs, setOutputs] = useState<RenderedImage[]>([]);

  const busy = busyMode !== "idle";

  const targetPlan = useMemo(
    () => buildTargetPlan(targetMode, pageInput, pageCount, selectedPages),
    [pageCount, pageInput, selectedPages, targetMode],
  );

  const targetPageSet = useMemo(() => new Set(targetPlan.pages), [targetPlan.pages]);
  const selectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);

  const outputSize = useMemo(
    () => outputs.reduce((sum, output) => sum + output.blob.size, 0),
    [outputs],
  );

  const renderPercent = useMemo(() => {
    if (!renderProgress.total) return 0;
    return Math.round((renderProgress.done / renderProgress.total) * 100);
  }, [renderProgress.done, renderProgress.total]);

  const targetSummary = useMemo(() => {
    if (!file) return "No PDF loaded";
    if (targetPlan.error) return targetPlan.error;
    return `${targetPlan.pages.length} of ${pageCount} pages selected for export`;
  }, [file, pageCount, targetPlan.error, targetPlan.pages.length]);

  const estimatedPixelText = useMemo(() => {
    const scale = getScaleFromDpi(dpi);
    return `${scale.toFixed(2)}x render scale`;
  }, [dpi]);

  useEffect(() => {
    configurePdfWorker();
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

  function clearOutputs() {
    setOutputs((current) => {
      current.forEach((output) => URL.revokeObjectURL(output.previewUrl));
      return [];
    });
  }

  function clearThumbnails() {
    setThumbnails((current) => {
      current.forEach((thumbnail) => URL.revokeObjectURL(thumbnail.previewUrl));
      return [];
    });
  }

  async function renderThumbnails(selectedFile: File, totalPages: number) {
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    setBusyMode("rendering");
    setThumbnailStatus("loading");
    clearThumbnails();
    setRenderProgress({ done: 0, total: totalPages });
    setStatus("Rendering real PDF page thumbnails...");

    try {
      configurePdfWorker();

      const pdf = await loadPdfJsDocument(selectedFile);
      const nextThumbnails: PageThumbnail[] = [];

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        if (renderTokenRef.current !== token) return;

        nextThumbnails.push({
          pageNumber,
          previewUrl: await renderPageThumbnail(pdf, pageNumber),
        });

        if (renderTokenRef.current === token) {
          setThumbnails([...nextThumbnails]);
          setRenderProgress({ done: pageNumber, total: totalPages });
        }
      }

      if (renderTokenRef.current === token) {
        setThumbnailStatus("ready");
        setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Choose export format, DPI, and pages.`);
      }
    } catch {
      if (renderTokenRef.current === token) {
        setThumbnailStatus("error");
        setStatus("PDF loaded, but thumbnails could not be rendered. You can still export by page range.");
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
    clearOutputs();
    clearThumbnails();
    setSelectedPages([]);
    setLastSelectedPage(null);
    setExportProgress(0);
    setThumbnailStatus("idle");
    setRenderProgress({ done: 0, total: 0 });
    setStatus("Reading PDF with PDFMantra render engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);
      setPageInput(totalPages === 1 ? "1" : `1-${Math.min(totalPages, 5)}`);
      setTargetMode("all");

      await renderThumbnails(selectedFile, totalPages);
    } catch (error) {
      renderTokenRef.current += 1;
      setFile(null);
      setPageCount(0);
      clearOutputs();
      clearThumbnails();
      setSelectedPages([]);
      setLastSelectedPage(null);
      setThumbnailStatus("idle");
      setRenderProgress({ done: 0, total: 0 });
      setStatus(getErrorMessage(error));
      setBusyMode("idle");
    }
  }

  function clearFile() {
    renderTokenRef.current += 1;
    setFile(null);
    setPageCount(0);
    setPageInput("1-3");
    setTargetMode("all");
    setSelectedPages([]);
    setLastSelectedPage(null);
    clearOutputs();
    clearThumbnails();
    setThumbnailStatus("idle");
    setRenderProgress({ done: 0, total: 0 });
    setExportProgress(0);
    setOpenDropdown(null);
    setBusyMode("idle");
    setStatus("Upload a PDF to export pages as images.");
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function handlePageSelect(pageNumber: number, event: MouseEvent<HTMLButtonElement>) {
    if (busy) return;

    if (event.shiftKey && lastSelectedPage !== null) {
      const start = Math.min(lastSelectedPage, pageNumber);
      const end = Math.max(lastSelectedPage, pageNumber);

      setSelectedPages(createPageNumbers(end - start + 1).map((offset) => start + offset - 1));
      setLastSelectedPage(pageNumber);
      setTargetMode("visual");
      clearOutputs();
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedPages((current) => {
        if (current.includes(pageNumber)) {
          return current.filter((selectedPage) => selectedPage !== pageNumber);
        }

        return [...current, pageNumber].sort((a, b) => a - b);
      });
      setLastSelectedPage(pageNumber);
      setTargetMode("visual");
      clearOutputs();
      return;
    }

    setSelectedPages([pageNumber]);
    setLastSelectedPage(pageNumber);
    setTargetMode("visual");
    clearOutputs();
  }

  function selectAllPages() {
    setSelectedPages(createPageNumbers(pageCount));
    setTargetMode("visual");
    clearOutputs();
    setStatus("All pages selected visually.");
  }

  function clearSelection() {
    setSelectedPages([]);
    setLastSelectedPage(null);
    if (targetMode === "visual") setTargetMode("all");
    clearOutputs();
    setStatus("Visual selection cleared.");
  }

  function applyCustomRange(range: string, label: string) {
    setTargetMode("custom");
    setPageInput(range);
    clearOutputs();
    setStatus(`Preset applied: ${label}.`);
  }

  function applyFirstPagesPreset(count: number) {
    const end = Math.min(pageCount || count, count);
    applyCustomRange(`1-${end}`, `first ${end} pages`);
  }

  function applyLastPagesPreset(count: number) {
    const safePageCount = pageCount || count;
    const start = Math.max(1, safePageCount - count + 1);
    applyCustomRange(`${start}-${safePageCount}`, `last ${Math.min(count, safePageCount)} pages`);
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Please upload a PDF first.");
      return;
    }

    if (targetPlan.error || !targetPlan.pages.length) {
      setStatus(targetPlan.error ?? "Select at least one page to export.");
      return;
    }

    setBusyMode("exporting");
    setExportProgress(8);
    clearOutputs();

    try {
      const pdf = await loadPdfJsDocument(file);
      const baseName = safeFileBaseName(file.name);
      const rendered: RenderedImage[] = [];
      const pages = targetPlan.pages;

      setStatus(`Rendering ${pages.length} page${pages.length > 1 ? "s" : ""} as ${format.toUpperCase()} at ${dpi} DPI...`);

      for (let index = 0; index < pages.length; index += 1) {
        const pageNumber = pages[index];

        const image = await renderPageToImage({
          pdf,
          pageNumber,
          format,
          dpi,
          quality,
          baseName,
        });

        rendered.push(image);
        setOutputs([...rendered]);
        setExportProgress(Math.round(((index + 1) / pages.length) * 70) + 12);
      }

      setExportProgress(86);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "pdf-to-images",
        exportKind: "clean",
      });

      if (!exportRecord.allowed) {
        clearOutputs();
        setExportProgress(0);

        const limitMessage =
          exportRecord.error ||
          (exportRecord.identityType === "guest"
            ? "Guest clean export limit reached for today. Sign in to get 5 clean exports/day."
            : `${exportRecord.planLabel} clean export limit reached for today.`);

        setStatus(limitMessage);
        return;
      }

      if (rendered.length === 1 && !downloadAsZip) {
        setExportProgress(94);
        downloadBlob(rendered[0].blob, rendered[0].fileName);
        setExportProgress(100);
        setStatus("Exported 1 image. Download started.");
      } else {
        setStatus(`Packaging ${rendered.length} image${rendered.length > 1 ? "s" : ""} into ZIP...`);

        const zipBlob = await createZipBlob(
          rendered.map((image) => ({
            fileName: image.fileName,
            blob: image.blob,
          })),
        );

        setExportProgress(94);
        downloadBlob(zipBlob, `PDFMantra-images-${baseName}.zip`);
        setExportProgress(100);
        setStatus(`Exported ${rendered.length} image${rendered.length > 1 ? "s" : ""} into one ZIP. Download started.`);
      }
    } catch (error) {
      clearOutputs();
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusyMode("idle");
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("select pages");

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
              <ImageIcon size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">PDF to Images</h1>
              <p className="text-sm text-slate-500">Export PDF pages as PNG, JPG, or WebP images.</p>
            </div>
          </div>

          {file ? (
            <div ref={toolbarRef} className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {pageCount} page{pageCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {targetPlan.pages.length} selected
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {outputs.length ? `Output ${formatFileSize(outputSize)}` : `${format.toUpperCase()} · ${dpi} DPI`}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton label="Select all" icon={<MousePointer2 size={16} />} onClick={selectAllPages} disabled={busy || !pageCount} />
                <IconButton label="Clear selection" icon={<X size={16} />} onClick={clearSelection} disabled={busy || !selectedPages.length} danger={selectedPages.length > 0} />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <button type="button" onClick={() => setFormat(format === "png" ? "jpeg" : format === "jpeg" ? "webp" : "png")} disabled={busy} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <FileImage size={15} />
                  {format.toUpperCase()}
                </button>

                <button type="button" onClick={() => setDpi(dpi === 96 ? 150 : dpi === 150 ? 200 : dpi === 200 ? 300 : 96)} disabled={busy} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <Settings2 size={15} />
                  {dpi} DPI
                </button>

                <button type="button" onClick={() => setTargetMode(targetMode === "all" ? "odd" : targetMode === "odd" ? "even" : targetMode === "even" ? "visual" : "all")} disabled={busy} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                  <Grid2X2 size={15} />
                  {targetMode === "all" ? "All" : targetMode === "odd" ? "Odd" : targetMode === "even" ? "Even" : targetMode === "visual" ? "Visual" : "Range"}
                </button>

                <div className="relative">
                  <IconButton label="More" icon={<MoreHorizontal size={17} />} onClick={() => toggleDropdown("more")} active={openDropdown === "more"} />

                  {openDropdown === "more" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <label className="block">
                        <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Quality <span>{Math.round(quality * 100)}%</span>
                        </span>
                        <input
                          type="range"
                          min={40}
                          max={100}
                          value={Math.round(quality * 100)}
                          onChange={(event) => {
                            setQuality(Number(event.target.value) / 100);
                            clearOutputs();
                          }}
                          disabled={busy || format === "png"}
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <input
                          type="checkbox"
                          checked={downloadAsZip}
                          onChange={(event) => setDownloadAsZip(event.target.checked)}
                          disabled={busy}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-violet-600"
                        />
                        <span className="text-xs font-semibold leading-5 text-slate-600">Package as one ZIP</span>
                      </label>

                      <button type="button" onClick={clearFile} disabled={!file || busy} className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                        <X size={15} />
                        Remove PDF
                      </button>
                    </div>
                  ) : null}
                </div>

                <IconButton label="Help" icon={<CircleHelp size={17} />} onClick={() => setStatus("PNG is best for sharp text. JPG/WebP are better for smaller files. Use 300 DPI for print.")} />

                <button type="button" onClick={handleExport} disabled={busy || !file} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {busyMode === "exporting" ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {busyMode === "exporting" ? "Exporting" : outputs.length ? "Export Again" : "Export"}
                </button>
              </div>
            </div>
          ) : null}

          <section onDrop={handleUploadDrop} onDragOver={(event) => event.preventDefault()} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {!file ? (
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDF here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse file or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  PDF supported · Browser-side rendering
                </div>
              </button>
            ) : (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/55 px-4 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[160px]">
                    <Upload size={16} />
                    Change PDF
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Per row</span>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([1, 2, 3, 4, 5] as PerRow[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPerRow(value)}
                          disabled={busy}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            perRow === value ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-white hover:text-violet-700"
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
                      <span>Rendering thumbnails {renderProgress.done}/{renderProgress.total}</span>
                      <span>{renderPercent}%</span>
                    </div>
                    <ProgressBar value={renderPercent} />
                  </div>
                ) : null}

                {busyMode === "exporting" ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Exporting selected pages...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {outputs.length ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    {outputs.length} image{outputs.length === 1 ? "" : "s"} created · {formatFileSize(outputSize)}
                  </div>
                ) : null}

                {targetPlan.error ? (
                  <div className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                    {targetPlan.error}
                  </div>
                ) : null}

                <div className={`grid ${getGridClass(perRow)} gap-4`}>
                  {thumbnails.length ? (
                    thumbnails.map((thumbnail) => {
                      const isSelected = selectedPageSet.has(thumbnail.pageNumber);
                      const isTarget = targetPageSet.has(thumbnail.pageNumber);

                      return (
                        <button
                          key={thumbnail.pageNumber}
                          type="button"
                          onClick={(event) => handlePageSelect(thumbnail.pageNumber, event)}
                          disabled={busy}
                          className={`group rounded-2xl border bg-white p-3 text-left shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isSelected ? "border-violet-500 ring-4 ring-violet-100" : isTarget ? "border-violet-200" : "border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                              {thumbnail.pageNumber}
                            </div>
                            {isTarget ? (
                              <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700">Export</span>
                            ) : null}
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className={`${perRow === 1 ? "min-h-[520px]" : "aspect-[3/4]"} flex items-center justify-center p-3`}>
                              <img src={thumbnail.previewUrl} alt={`Page ${thumbnail.pageNumber}`} className="max-h-full max-w-full rounded-xl object-contain shadow-sm" draggable={false} />
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                      <Loader2 className="animate-spin text-violet-600" size={24} />
                      <div className="mt-3 text-sm font-bold text-slate-700">Preparing page previews...</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-slate-500"}`}>
            {file && !statusLooksLikeError && busyMode === "idle"
              ? `${targetPlan.pages.length} of ${pageCount} page${pageCount === 1 ? "" : "s"} selected · ${format.toUpperCase()} · ${dpi} DPI`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
