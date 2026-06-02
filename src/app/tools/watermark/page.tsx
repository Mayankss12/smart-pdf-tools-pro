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
  FileImage,
  FileText,
  Grid2X2,
  Grip,
  ImageIcon,
  Loader2,
  MousePointer2,
  RotateCcw,
  Settings2,
  Stamp,
  Type,
  Upload,
  X,
} from "lucide-react";
import {
  StandardFonts,
  degrees,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import { Header } from "@/components/Header";
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
import type { StampFontStyle } from "@/lib/pdf-stamp-engine";

type BusyMode = "idle" | "rendering" | "exporting";
type WatermarkMode = "text" | "image" | "both";
type WatermarkLayout = "single" | "tile";
type TargetMode = "all" | "odd" | "even" | "custom";

type PagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type PositionPreset = {
  id: string;
  label: string;
  shortLabel: string;
  xPercent: number;
  yPercent: number;
};

type WatermarkColor = {
  id: string;
  label: string;
  previewClassName: string;
  pdf: [number, number, number];
};

type TargetPlan = {
  pages: number[];
  error: string | null;
};

type WatermarkExportOptions = {
  mode: WatermarkMode;
  layout: WatermarkLayout;
  targetPages: number[];
  text: string;
  fontSize: number;
  opacity: number;
  angle: number;
  fontStyle: StampFontStyle;
  color: [number, number, number];
  position: {
    xPercent: number;
    yPercent: number;
  };
  tileGap: number;
  imageFile: File | null;
  imageScale: number;
};

const FONT_OPTIONS: Array<{ value: StampFontStyle; label: string; previewClass: string }> = [
  { value: "regular", label: "Regular", previewClass: "font-medium not-italic" },
  { value: "bold", label: "Bold", previewClass: "font-semibold not-italic" },
  { value: "italic", label: "Italic", previewClass: "font-medium italic" },
  { value: "boldItalic", label: "Bold Italic", previewClass: "font-semibold italic" },
];

const FONT_MAP: Record<StampFontStyle, StandardFonts> = {
  regular: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  italic: StandardFonts.HelveticaOblique,
  boldItalic: StandardFonts.HelveticaBoldOblique,
};

const POSITION_PRESETS: PositionPreset[] = [
  { id: "top-left", label: "Top Left", shortLabel: "TL", xPercent: 16, yPercent: 12 },
  { id: "top-center", label: "Top Center", shortLabel: "TC", xPercent: 50, yPercent: 12 },
  { id: "top-right", label: "Top Right", shortLabel: "TR", xPercent: 84, yPercent: 12 },
  { id: "middle-left", label: "Middle Left", shortLabel: "ML", xPercent: 16, yPercent: 50 },
  { id: "middle-center", label: "Center", shortLabel: "C", xPercent: 50, yPercent: 50 },
  { id: "middle-right", label: "Middle Right", shortLabel: "MR", xPercent: 84, yPercent: 50 },
  { id: "bottom-left", label: "Bottom Left", shortLabel: "BL", xPercent: 16, yPercent: 88 },
  { id: "bottom-center", label: "Bottom Center", shortLabel: "BC", xPercent: 50, yPercent: 88 },
  { id: "bottom-right", label: "Bottom Right", shortLabel: "BR", xPercent: 84, yPercent: 88 },
];

const WATERMARK_COLORS: WatermarkColor[] = [
  {
    id: "violet",
    label: "Violet",
    previewClassName: "text-violet-700",
    pdf: [0.28, 0.2, 0.82],
  },
  {
    id: "indigo",
    label: "Indigo",
    previewClassName: "text-indigo-700",
    pdf: [0.25, 0.25, 0.86],
  },
  {
    id: "slate",
    label: "Slate",
    previewClassName: "text-slate-800",
    pdf: [0.12, 0.14, 0.2],
  },
  {
    id: "red",
    label: "Red",
    previewClassName: "text-red-700",
    pdf: [0.75, 0.12, 0.12],
  },
];

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Watermark export failed. This PDF may be encrypted, damaged, or unsupported.";
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
    return { pages: [], error: "No pages selected for watermark." };
  }

  return { pages, error: null };
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

function isSupportedImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg")
  );
}

function getTileCenters(width: number, height: number, gap: number) {
  const safeGap = clamp(gap, 120, 420);
  const centers: Array<{ x: number; y: number }> = [];

  for (let y = -height * 0.1; y <= height * 1.1; y += safeGap) {
    for (let x = -width * 0.1; x <= width * 1.1; x += safeGap) {
      centers.push({ x, y });
    }
  }

  return centers;
}

function drawWatermarkText({
  page,
  font,
  text,
  fontSize,
  opacity,
  angle,
  color,
  x,
  y,
}: {
  page: PDFPage;
  font: PDFFont;
  text: string;
  fontSize: number;
  opacity: number;
  angle: number;
  color: [number, number, number];
  x: number;
  y: number;
}) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const { width, height } = page.getSize();

  page.drawText(text, {
    x: clamp(x - textWidth / 2, 10, Math.max(12, width - textWidth - 10)),
    y: clamp(y - fontSize / 2, 10, Math.max(12, height - fontSize - 10)),
    size: fontSize,
    font,
    color: rgb(color[0], color[1], color[2]),
    rotate: degrees(angle),
    opacity,
  });
}

function drawWatermarkImage({
  page,
  image,
  imageScale,
  opacity,
  angle,
  x,
  y,
}: {
  page: PDFPage;
  image: PDFImage;
  imageScale: number;
  opacity: number;
  angle: number;
  x: number;
  y: number;
}) {
  const { width, height } = page.getSize();
  const imageWidth = clamp(width * (imageScale / 100), 60, width * 0.92);
  const imageHeight = imageWidth * (image.height / image.width);

  page.drawImage(image, {
    x: clamp(x - imageWidth / 2, -imageWidth * 0.2, width - imageWidth * 0.8),
    y: clamp(y - imageHeight / 2, -imageHeight * 0.2, height - imageHeight * 0.8),
    width: imageWidth,
    height: imageHeight,
    rotate: degrees(angle),
    opacity,
  });
}

async function applyAdvancedWatermark(
  file: File,
  options: WatermarkExportOptions,
): Promise<PdfProcessingResult> {
  const text = options.text.trim();
  const needsText = options.mode === "text" || options.mode === "both";
  const needsImage = options.mode === "image" || options.mode === "both";

  if (needsText && !text) {
    throw new PdfEngineError("PROCESSING_FAILED", "Enter watermark text first.");
  }

  if (needsImage && !options.imageFile) {
    throw new PdfEngineError("PROCESSING_FAILED", "Upload a PNG or JPG watermark image first.");
  }

  if (!options.targetPages.length) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "Select at least one target page.");
  }

  const pdf = await loadPdfDocument(file);
  const pages = pdf.getPages();
  const targetPageSet = new Set(options.targetPages);
  const opacity = clamp(options.opacity, 0.04, 0.85);
  const angle = clamp(options.angle, -90, 90);
  const fontSize = clamp(options.fontSize, 8, 220);
  const xPercent = clamp(options.position.xPercent, 4, 96);
  const yPercent = clamp(options.position.yPercent, 4, 96);
  const font = needsText ? await pdf.embedFont(FONT_MAP[options.fontStyle] ?? StandardFonts.HelveticaBold) : null;

  let embeddedImage: PDFImage | null = null;

  if (needsImage && options.imageFile) {
    const imageBytes = await options.imageFile.arrayBuffer();
    const lowerName = options.imageFile.name.toLowerCase();
    const isPng = options.imageFile.type === "image/png" || lowerName.endsWith(".png");

    embeddedImage = isPng ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
  }

  pages.forEach((page, index) => {
    const pageNumber = index + 1;

    if (!targetPageSet.has(pageNumber)) return;

    const { width, height } = page.getSize();
    const centers =
      options.layout === "tile"
        ? getTileCenters(width, height, options.tileGap)
        : [
            {
              x: (xPercent / 100) * width,
              y: height - (yPercent / 100) * height,
            },
          ];

    centers.forEach((center) => {
      if (needsText && font) {
        drawWatermarkText({
          page,
          font,
          text,
          fontSize,
          opacity,
          angle,
          color: options.color,
          x: center.x,
          y: center.y,
        });
      }

      if (needsImage && embeddedImage) {
        drawWatermarkImage({
          page,
          image: embeddedImage,
          imageScale: options.imageScale,
          opacity,
          angle,
          x: center.x,
          y: center.y,
        });
      }
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("watermarked", file.name));
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

export default function WatermarkPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const dragRectRef = useRef<DOMRect | null>(null);
  const renderTokenRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PagePreview[]>([]);

  const [watermarkMode, setWatermarkMode] = useState<WatermarkMode>("text");
  const [watermarkLayout, setWatermarkLayout] = useState<WatermarkLayout>("single");
  const [watermarkText, setWatermarkText] = useState("PDFMantra");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.18);
  const [angle, setAngle] = useState(-32);
  const [fontStyle, setFontStyle] = useState<StampFontStyle>("bold");
  const [colorId, setColorId] = useState("violet");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageScale, setImageScale] = useState(36);

  const [position, setPosition] = useState({ xPercent: 50, yPercent: 50 });
  const [positionPresetId, setPositionPresetId] = useState("middle-center");
  const [isDragging, setIsDragging] = useState(false);
  const [tileGap, setTileGap] = useState(220);

  const [targetMode, setTargetMode] = useState<TargetMode>("all");
  const [customRange, setCustomRange] = useState("1-5");
  const [skipFirstPage, setSkipFirstPage] = useState(false);

  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 });
  const [exportProgress, setExportProgress] = useState(0);

  const [status, setStatus] = useState("Upload a PDF to add watermark.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const busy = busyMode !== "idle";

  const selectedFontPreviewClass = useMemo(() => {
    return FONT_OPTIONS.find((font) => font.value === fontStyle)?.previewClass || FONT_OPTIONS[0].previewClass;
  }, [fontStyle]);

  const selectedColor = useMemo(() => {
    return WATERMARK_COLORS.find((color) => color.id === colorId) ?? WATERMARK_COLORS[0];
  }, [colorId]);

  const targetPlan = useMemo(
    () => buildTargetPlan(targetMode, pageCount, customRange, skipFirstPage),
    [customRange, pageCount, skipFirstPage, targetMode],
  );

  const targetPageSet = useMemo(() => new Set(targetPlan.pages), [targetPlan.pages]);

  const renderPercent = useMemo(() => {
    if (!renderProgress.total) return 0;
    return Math.round((renderProgress.done / renderProgress.total) * 100);
  }, [renderProgress.done, renderProgress.total]);

  const targetSummary = useMemo(() => {
    if (!file) return "No PDF loaded";
    if (targetPlan.error) return targetPlan.error;
    return `${targetPlan.pages.length} of ${pageCount} pages will receive watermark`;
  }, [file, pageCount, targetPlan.error, targetPlan.pages.length]);

  const modeNeedsImage = watermarkMode === "image" || watermarkMode === "both";
  const modeNeedsText = watermarkMode === "text" || watermarkMode === "both";

  useEffect(() => {
    configurePdfWorker();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

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
      setStatus("Watermark position updated.");
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging]);

  function setPresetPosition(preset: PositionPreset) {
    setPosition({ xPercent: preset.xPercent, yPercent: preset.yPercent });
    setPositionPresetId(preset.id);
    setResult(null);
    setStatus(`Position set to ${preset.label}.`);
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
    if (busy || watermarkLayout === "tile") return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);

    updatePositionFromPointer(event);
    setIsDragging(true);
    setResult(null);
    setStatus("Dragging watermark position...");
  }

  function applyPreset(nextText: string, nextAngle: number, nextOpacity: number, nextLayout: WatermarkLayout = "single") {
    setWatermarkMode("text");
    setWatermarkText(nextText);
    setAngle(nextAngle);
    setOpacity(nextOpacity);
    setWatermarkLayout(nextLayout);
    setFontStyle(nextText === "APPROVED" ? "bold" : "boldItalic");
    setResult(null);
    setStatus(`Preset applied: ${nextText}.`);
  }

  function resetSettings() {
    setWatermarkMode("text");
    setWatermarkLayout("single");
    setWatermarkText("PDFMantra");
    setFontSize(48);
    setOpacity(0.18);
    setAngle(-32);
    setFontStyle("bold");
    setColorId("violet");
    setImageScale(36);
    setPosition({ xPercent: 50, yPercent: 50 });
    setPositionPresetId("middle-center");
    setTileGap(220);
    setTargetMode("all");
    setCustomRange("1-5");
    setSkipFirstPage(false);
    setResult(null);
    setStatus("Watermark settings reset.");
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

      const pdfDocument = await loadPdfDocument(selectedFile);
      const totalPages = pdfDocument.getPageCount();
      const pdf = await pdfjsLib.getDocument({ data: await selectedFile.arrayBuffer() }).promise;
      const nextPreviews: PagePreview[] = [];

      setFile(selectedFile);
      setPageCount(totalPages);
      setRenderProgress({ done: 0, total: totalPages });

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        if (renderTokenRef.current !== token) return;

        nextPreviews.push({
          pageNumber,
          previewUrl: await renderPdfPageToPng(pdf, pageNumber, 0.36),
        });

        if (renderTokenRef.current === token) {
          setPreviews([...nextPreviews]);
          setRenderProgress({ done: pageNumber, total: totalPages });
        }
      }

      if (renderTokenRef.current === token) {
        setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Adjust watermark settings.`);
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

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function handleImageFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isSupportedImageFile(selectedFile)) {
      setStatus("Upload a PNG or JPG image for image watermark.");
      return;
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(selectedFile);
    setImagePreviewUrl(URL.createObjectURL(selectedFile));
    setWatermarkMode((current) => (current === "text" ? "both" : current));
    setResult(null);
    setStatus("Image watermark uploaded.");
  }

  function clearImageFile() {
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
    }

    setImageFile(null);
    setImagePreviewUrl(null);
    setWatermarkMode((current) => (current === "image" || current === "both" ? "text" : current));
    setResult(null);
    setStatus("Image watermark removed.");
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
    setStatus("Upload a PDF to add watermark.");
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (modeNeedsText && !watermarkText.trim()) {
      setStatus("Enter watermark text first.");
      return;
    }

    if (modeNeedsImage && !imageFile) {
      setStatus("Upload a PNG or JPG watermark image first.");
      return;
    }

    if (targetPlan.error || !targetPlan.pages.length) {
      setStatus(targetPlan.error ?? "Select at least one page to watermark.");
      return;
    }

    setBusyMode("exporting");
    setExportProgress(8);
    setResult(null);
    setStatus("Applying watermark with PDFMantra engine...");

    try {
      setExportProgress(28);

      const output = await applyAdvancedWatermark(file, {
        mode: watermarkMode,
        layout: watermarkLayout,
        targetPages: targetPlan.pages,
        text: watermarkText.trim(),
        fontSize,
        opacity,
        angle,
        fontStyle,
        color: selectedColor.pdf,
        position,
        tileGap,
        imageFile,
        imageScale,
      });

      setExportProgress(84);
      setResult(output);
      downloadBlob(output.blob, output.fileName);

      setExportProgress(100);
      setStatus("Watermarked PDF exported successfully. Download started.");
    } catch (error) {
      setResult(null);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusyMode("idle");
    }
  }

  const statusIsError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("select at least") ||
    status.toLowerCase().includes("range") ||
    status.toLowerCase().includes("upload a png");

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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => handleImageFile(event.target.files?.[0])}
          />

          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-5 sm:py-6 lg:px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.14)_0%,rgba(101,80,232,0.05)_38%,transparent_72%)]"
            />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_34px_rgba(101,80,232,0.18)]">
                  <Stamp size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Add watermark with live preview.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Add text, image, or tiled watermark, target exact pages, and export a clean watermarked PDF.
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
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Stamped</div>
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
                    Drag watermark in single mode. Tiled mode repeats across each target page.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {watermarkMode === "text" ? "Text" : watermarkMode === "image" ? "Image" : "Text + Image"}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        {[
                          { id: "text", label: "Text", icon: Type },
                          { id: "image", label: "Image", icon: ImageIcon },
                          { id: "both", label: "Text + Image", icon: Grid2X2 },
                        ].map((item) => {
                          const Icon = item.icon;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setWatermarkMode(item.id as WatermarkMode);
                                setResult(null);
                              }}
                              disabled={busy}
                              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                                watermarkMode === item.id
                                  ? "bg-[var(--violet-50)] text-[var(--violet-600)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                              }`}
                            >
                              <Icon size={15} />
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </details>

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {watermarkLayout === "single" ? "Single" : "Tiled"}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-48 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        {[
                          { id: "single", label: "Single" },
                          { id: "tile", label: "Tiled" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setWatermarkLayout(item.id as WatermarkLayout);
                              setResult(null);
                            }}
                            disabled={busy}
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              watermarkLayout === item.id
                                ? "bg-[var(--violet-50)] text-[var(--violet-600)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </details>

                    {modeNeedsText ? (
                      <input
                        value={watermarkText}
                        onChange={(event) => {
                          setWatermarkText(event.target.value);
                          setResult(null);
                        }}
                        placeholder="Watermark text"
                        disabled={busy}
                        className="h-10 w-52 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : null}

                    {modeNeedsImage ? (
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <FileImage size={15} />
                        {imageFile ? "Change Image" : "Add Image"}
                      </button>
                    ) : null}

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        Target
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
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

                      <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-card)]">
                        <div className="grid grid-cols-3 gap-2">
                          <button type="button" onClick={() => applyPreset("CONFIDENTIAL", -32, 0.16)} disabled={busy} className="rounded-xl border border-[var(--border-light)] px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Confidential</button>
                          <button type="button" onClick={() => applyPreset("DRAFT", -25, 0.18, "tile")} disabled={busy} className="rounded-xl border border-[var(--border-light)] px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Draft Tile</button>
                          <button type="button" onClick={() => applyPreset("APPROVED", 0, 0.2)} disabled={busy} className="rounded-xl border border-[var(--border-light)] px-2 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Approved</button>
                        </div>

                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Font size <span>{fontSize}px</span></span>
                          <input type="range" min={16} max={140} value={fontSize} onChange={(event) => { setFontSize(Number(event.target.value)); setResult(null); }} disabled={busy} className="mt-2 w-full" />
                        </label>

                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Opacity <span>{Math.round(opacity * 100)}%</span></span>
                          <input type="range" min={4} max={85} value={Math.round(opacity * 100)} onChange={(event) => { setOpacity(Number(event.target.value) / 100); setResult(null); }} disabled={busy} className="mt-2 w-full" />
                        </label>

                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Angle <span>{angle}°</span></span>
                          <input type="range" min={-90} max={90} value={angle} onChange={(event) => { setAngle(Number(event.target.value)); setResult(null); }} disabled={busy} className="mt-2 w-full" />
                        </label>

                        {modeNeedsText ? (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Font</span>
                              <select
                                value={fontStyle}
                                onChange={(event) => {
                                  setFontStyle(event.target.value as StampFontStyle);
                                  setResult(null);
                                }}
                                disabled={busy}
                                className="input-premium mt-2"
                              >
                                {FONT_OPTIONS.map((font) => (
                                  <option key={font.value} value={font.value}>{font.label}</option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Color</span>
                              <select
                                value={colorId}
                                onChange={(event) => {
                                  setColorId(event.target.value);
                                  setResult(null);
                                }}
                                disabled={busy}
                                className="input-premium mt-2"
                              >
                                {WATERMARK_COLORS.map((color) => (
                                  <option key={color.id} value={color.id}>{color.label}</option>
                                ))}
                              </select>
                            </label>
                          </div>
                        ) : null}

                        {modeNeedsImage ? (
                          <label className="mt-3 block">
                            <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Image size <span>{imageScale}%</span></span>
                            <input type="range" min={8} max={80} value={imageScale} onChange={(event) => { setImageScale(Number(event.target.value)); setResult(null); }} disabled={busy} className="mt-2 w-full" />
                          </label>
                        ) : null}

                        {watermarkLayout === "tile" ? (
                          <label className="mt-3 block">
                            <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Tile gap <span>{tileGap}px</span></span>
                            <input type="range" min={120} max={420} value={tileGap} onChange={(event) => { setTileGap(Number(event.target.value)); setResult(null); }} disabled={busy} className="mt-2 w-full" />
                          </label>
                        ) : null}
                      </div>
                    </details>

                    {watermarkLayout === "single" ? (
                      <details className="group relative">
                        <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                          Position
                          <ChevronDown size={15} className="transition group-open:rotate-180" />
                        </summary>

                        <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-card)]">
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
                    ) : null}

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
                        Drag watermark in single mode.<br />
                        Use tiled mode for draft/confidential documents.<br />
                        PNG/JPG image watermarks supported.<br />
                        Custom range example: 2-5, 8, 10-12.
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
                    {watermarkMode === "both" ? "Text + Image" : watermarkMode === "image" ? "Image" : "Text"} · {watermarkLayout}
                  </span>
                  {imageFile ? (
                    <button
                      type="button"
                      onClick={clearImageFile}
                      disabled={busy}
                      className="rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Remove image
                    </button>
                  ) : null}
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
                    Watermarked PDF: {formatFileSize(result.outputSize)}
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
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to preview the watermark on real pages.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {previews.map((preview) => {
                      const isTargeted = targetPageSet.has(preview.pageNumber);

                      return (
                        <div
                          key={preview.pageNumber}
                          className={`group overflow-hidden rounded-[1.25rem] border bg-white p-3 shadow-sm transition ${
                            isTargeted ? "border-[var(--violet-border)]" : "border-[var(--border-light)] opacity-70"
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
                                  {isTargeted ? "Watermarked" : "Skipped"}
                                </div>
                              </div>
                            </div>

                            {isTargeted ? (
                              <span className="rounded-full bg-[var(--violet-50)] px-2 py-1 text-[10px] font-bold text-[var(--violet-600)]">
                                {watermarkLayout === "tile" ? "Tile" : "Single"}
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

                            {isTargeted && watermarkLayout === "tile" ? (
                              <div
                                className="pointer-events-none absolute inset-0 overflow-hidden"
                                style={{ opacity }}
                              >
                                {Array.from({ length: 12 }).map((_, index) => (
                                  <div
                                    key={index}
                                    className={`absolute whitespace-nowrap font-bold ${selectedFontPreviewClass} ${selectedColor.previewClassName}`}
                                    style={{
                                      left: `${(index % 3) * 38 + 4}%`,
                                      top: `${Math.floor(index / 3) * 26 + 4}%`,
                                      transform: `rotate(${angle}deg)`,
                                      fontSize: Math.max(11, fontSize * 0.22),
                                    }}
                                  >
                                    {modeNeedsImage && imagePreviewUrl ? (
                                      <img
                                        src={imagePreviewUrl}
                                        alt="Image watermark preview"
                                        className="max-w-[88px] object-contain"
                                        draggable={false}
                                      />
                                    ) : watermarkText.trim() ? (
                                      watermarkText
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            {isTargeted && watermarkLayout === "single" ? (
                              <div
                                onPointerDown={startDrag}
                                className={`absolute z-20 inline-flex touch-none select-none items-center justify-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ring-4 ring-violet-100 ${
                                  isDragging ? "cursor-grabbing" : "cursor-move"
                                }`}
                                style={{
                                  left: `${position.xPercent}%`,
                                  top: `${position.yPercent}%`,
                                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                  opacity,
                                  fontSize: Math.max(10, fontSize * 0.26),
                                }}
                              >
                                <Grip size={12} />

                                {modeNeedsImage && imagePreviewUrl ? (
                                  <img
                                    src={imagePreviewUrl}
                                    alt="Image watermark preview"
                                    className="object-contain"
                                    style={{ width: `${imageScale * 1.8}px`, maxWidth: "150px" }}
                                    draggable={false}
                                  />
                                ) : null}

                                {modeNeedsText && watermarkText.trim() ? (
                                  <span className={`${selectedFontPreviewClass} ${selectedColor.previewClassName}`}>
                                    {watermarkText}
                                  </span>
                                ) : null}
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

          <div className={`mt-3 px-1 text-sm font-medium ${statusIsError ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
            {status}
          </div>
        </section>
      </main>
    </>
  );
}
