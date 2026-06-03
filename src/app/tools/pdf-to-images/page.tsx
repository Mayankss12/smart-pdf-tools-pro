"use client";

import {
  type DragEvent,
  type MouseEvent,
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
  FileArchive,
  FileImage,
  FileText,
  Grid2X2,
  Image as ImageIcon,
  Loader2,
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

export default function PdfToImagesPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
                  <FileImage size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Convert PDF pages to images.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Preview real PDF pages, choose format and DPI, then export selected pages as PNG, JPEG, or WEBP.
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
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{outputs.length ? formatFileSize(outputSize) : "-"}</div>
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
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
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
                      Rendering thumbnails {renderProgress.done}/{renderProgress.total}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Click pages to export visually. Shift selects ranges, Ctrl toggles pages.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {format.toUpperCase()}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-64 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        {FORMAT_OPTIONS.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => {
                              setFormat(option.id);
                              clearOutputs();
                            }}
                            disabled={busy}
                            className={`w-full rounded-xl px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              format === option.id
                                ? "bg-[var(--violet-50)] text-[var(--violet-600)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                            }`}
                          >
                            <div className="text-sm font-bold">{option.label}</div>
                            <div className="text-xs font-medium">{option.description}</div>
                          </button>
                        ))}
                      </div>
                    </details>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {dpi} DPI
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <div className="grid grid-cols-2 gap-2">
                          {DPI_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => {
                                setDpi(preset.id);
                                clearOutputs();
                              }}
                              disabled={busy}
                              className={`rounded-xl border px-3 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                dpi === preset.id
                                  ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                                  : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                              }`}
                            >
                              <div className="text-sm font-bold">{preset.label}</div>
                              <div className="text-[11px] font-medium">{preset.description}</div>
                            </button>
                          ))}
                        </div>

                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                            Custom DPI <span>{dpi}</span>
                          </span>
                          <input
                            type="range"
                            min={72}
                            max={450}
                            step={6}
                            value={dpi}
                            onChange={(event) => {
                              setDpi(Number(event.target.value));
                              clearOutputs();
                            }}
                            disabled={busy}
                            className="mt-2 w-full"
                          />
                          <span className="mt-1 block text-xs font-semibold text-[var(--text-muted)]">{estimatedPixelText}</span>
                        </label>

                        {format !== "png" ? (
                          <label className="mt-3 block">
                            <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
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
                              disabled={busy}
                              className="mt-2 w-full"
                            />
                          </label>
                        ) : null}
                      </div>
                    </details>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {targetMode === "all"
                          ? "All pages"
                          : targetMode === "odd"
                            ? "Odd pages"
                            : targetMode === "even"
                              ? "Even pages"
                              : targetMode === "visual"
                                ? "Visual pick"
                                : "Custom range"}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        {[
                          { id: "all", label: "All Pages" },
                          { id: "odd", label: "Odd Pages" },
                          { id: "even", label: "Even Pages" },
                          { id: "custom", label: "Custom Range" },
                          { id: "visual", label: "Visual Pick" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setTargetMode(item.id as TargetMode);
                              clearOutputs();
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

                        <button
                          type="button"
                          onClick={() => applyFirstPagesPreset(5)}
                          disabled={busy || !file}
                          className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          First 5
                        </button>
                        <button
                          type="button"
                          onClick={() => applyLastPagesPreset(5)}
                          disabled={busy || !file}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Last 5
                        </button>
                      </div>
                    </details>

                    {targetMode === "custom" ? (
                      <input
                        value={pageInput}
                        onChange={(event) => {
                          setPageInput(event.target.value);
                          clearOutputs();
                        }}
                        placeholder="1-5, 8, 10-12"
                        disabled={busy}
                        className="h-10 w-52 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : null}

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        More options
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        <button
                          type="button"
                          onClick={selectAllPages}
                          disabled={busy || !pageCount}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <MousePointer2 size={15} />
                          Select all visually
                        </button>
                        <button
                          type="button"
                          onClick={clearSelection}
                          disabled={busy || !selectedPages.length}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Clear selection
                        </button>
                        <label className="mt-2 flex items-start gap-3 rounded-xl border border-[var(--border-light)] bg-[var(--bg-base)] p-3">
                          <input
                            type="checkbox"
                            checked={downloadAsZip}
                            onChange={(event) => setDownloadAsZip(event.target.checked)}
                            disabled={busy}
                            className="mt-1 h-4 w-4 rounded border-[var(--border-light)] text-[var(--violet-600)]"
                          />
                          <span className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                            Package as one ZIP
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={clearFile}
                          disabled={!file || busy}
                          className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Remove PDF
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
                        PNG is best for sharp text.<br />
                        JPEG/WEBP are better for smaller files.<br />
                        Use 300 DPI for print and 150 DPI for sharing.<br />
                        Custom range example: 1-5, 8, 10-12.
                      </div>
                    </div>

                    <button type="button" onClick={handleExport} disabled={busy || !file} className="btn-primary px-4 py-2">
                      {busyMode === "exporting" ? (
                        <><Loader2 className="animate-spin" size={18} /><span>Exporting</span></>
                      ) : (
                        <><Download size={18} /><span>Export</span></>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={`rounded-full border px-3 py-1.5 ${targetPlan.error ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"}`}>
                    {targetSummary}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    <Settings2 size={13} />
                    {format.toUpperCase()} · {dpi} DPI
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--border-light)] bg-white px-3 py-1.5 text-[var(--text-secondary)]">
                    <FileArchive size={13} />
                    {downloadAsZip ? "ZIP" : "Single direct download"}
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

                {outputs.length > 0 ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    {outputs.length} image{outputs.length > 1 ? "s" : ""} exported · {formatFileSize(outputSize)}
                  </div>
                ) : null}

                {busyMode === "reading" ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : thumbnails.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {thumbnails.map((thumbnail) => {
                      const isTargeted = targetPageSet.has(thumbnail.pageNumber);
                      const isSelected = selectedPageSet.has(thumbnail.pageNumber);

                      return (
                        <button
                          key={thumbnail.pageNumber}
                          type="button"
                          onClick={(event) => handlePageSelect(thumbnail.pageNumber, event)}
                          disabled={busy}
                          className={`group overflow-hidden rounded-[1.25rem] border bg-white p-3 text-left shadow-sm outline-none transition hover:border-[var(--violet-border)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                            isSelected
                              ? "border-[var(--violet-600)] ring-4 ring-violet-100"
                              : isTargeted
                                ? "border-[var(--violet-border)]"
                                : "border-[var(--border-light)] opacity-75"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                                {thumbnail.pageNumber}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">Page {thumbnail.pageNumber}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  {isTargeted ? "Will export" : "Skipped"}
                                </div>
                              </div>
                            </div>

                            {isTargeted ? (
                              <span className="rounded-full bg-[var(--violet-50)] px-2 py-1 text-[10px] font-bold text-[var(--violet-600)]">
                                {format.toUpperCase()}
                              </span>
                            ) : null}
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)]">
                            <div className="flex aspect-[3/4] items-center justify-center p-3">
                              <img
                                src={thumbnail.previewUrl}
                                alt={`PDF page ${thumbnail.pageNumber}`}
                                className="h-full w-full rounded border border-[var(--border-light)] bg-white object-contain shadow-sm"
                                draggable={false}
                              />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : thumbnailStatus === "error" && file ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-amber-200 bg-amber-50 text-center">
                    <div>
                      <FileText className="mx-auto text-amber-500" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-amber-950">Preview unavailable</div>
                      <p className="mt-1 text-sm font-medium text-amber-800">Use the range controls to export images.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <ImageIcon className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to preview and export pages as images.</p>
                    </div>
                  </div>
                )}

                {outputs.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {outputs.slice(0, 12).map((output) => (
                      <div key={output.fileName} className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-white shadow-sm">
                        <img src={output.previewUrl} alt={`Exported page ${output.pageNumber}`} className="aspect-[3/4] w-full object-contain" />
                        <div className="border-t border-[var(--border-light)] bg-[var(--bg-base)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)]">
                          Page {output.pageNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
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
