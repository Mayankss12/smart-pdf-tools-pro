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
  Droplets,
  FileImage,
  Grid2X2,
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
import type { StampFontStyle } from "@/lib/pdf-stamp-engine";

type BusyMode = "idle" | "rendering" | "exporting";
type WatermarkMode = "text" | "image" | "both";
type WatermarkLayout = "single" | "tile";
type TargetMode = "all" | "odd" | "even" | "custom";
type OpenPanel = "mode" | "style" | "position" | "pages" | "image" | "help" | null;
type PerRow = 1 | 2 | 3 | 4;

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
  const { width } = page.getSize();
  const imageWidth = clamp(width * (imageScale / 100), 60, width * 0.92);
  const imageHeight = imageWidth * (image.height / image.width);

  page.drawImage(image, {
    x: clamp(x - imageWidth / 2, -imageWidth * 0.2, width - imageWidth * 0.8),
    y: y - imageHeight / 2,
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

export default function WatermarkPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const dragRectRef = useRef<DOMRect | null>(null);
  const renderTokenRef = useRef(0);

  const { recordExport } = useEntitlement();

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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [perRow, setPerRow] = useState<PerRow>(3);

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
    function handlePointerDown(event: globalThis.PointerEvent) {
      if (!toolbarRef.current) return;
      if (event.target instanceof Node && toolbarRef.current.contains(event.target)) return;

      setOpenPanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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

  function togglePanel(nextPanel: OpenPanel) {
    setOpenPanel((current) => (current === nextPanel ? null : nextPanel));
  }

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
    setOpenPanel(null);
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
    setOpenPanel(null);
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

      setExportProgress(82);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "watermark",
        exportKind: "clean",
      });

      if (!exportRecord.allowed) {
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
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("upload a png");

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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => handleImageFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Stamp size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Watermark PDF</h1>
              <p className="text-sm text-slate-500">
                Add text, image, or tiled watermarks with live page preview.
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
                  {targetPlan.pages.length} stamped
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {watermarkMode === "text" ? "Text" : watermarkMode === "image" ? "Image" : "Text + Image"} ·{" "}
                  {watermarkLayout === "single" ? "Single" : "Tiled"}
                </span>
                {result ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Output {formatFileSize(result.outputSize)}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  label="Text mode"
                  icon={<Type size={16} />}
                  onClick={() => {
                    setWatermarkMode("text");
                    setResult(null);
                  }}
                  active={watermarkMode === "text"}
                  disabled={busy}
                />

                <IconButton
                  label="Image mode"
                  icon={<ImageIcon size={16} />}
                  onClick={() => {
                    setWatermarkMode("image");
                    setOpenPanel("image");
                    setResult(null);
                  }}
                  active={watermarkMode === "image"}
                  disabled={busy}
                />

                <IconButton
                  label="Text + image"
                  icon={<Grid2X2 size={16} />}
                  onClick={() => {
                    setWatermarkMode("both");
                    setOpenPanel("image");
                    setResult(null);
                  }}
                  active={watermarkMode === "both"}
                  disabled={busy}
                />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <button
                  type="button"
                  onClick={() => {
                    setWatermarkLayout((current) => (current === "single" ? "tile" : "single"));
                    setResult(null);
                  }}
                  disabled={busy}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Droplets size={15} />
                  {watermarkLayout === "single" ? "Single" : "Tiled"}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("style")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Settings2 size={15} />
                    Style
                  </button>

                  {openPanel === "style" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      {modeNeedsText ? (
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Watermark text
                          </span>
                          <input
                            value={watermarkText}
                            onChange={(event) => {
                              setWatermarkText(event.target.value);
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="CONFIDENTIAL"
                          />
                        </label>
                      ) : null}

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {FONT_OPTIONS.map((font) => (
                          <button
                            key={font.value}
                            type="button"
                            onClick={() => {
                              setFontStyle(font.value);
                              setResult(null);
                            }}
                            disabled={busy || !modeNeedsText}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              fontStyle === font.value
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-600 hover:bg-violet-50"
                            }`}
                          >
                            <span className={font.previewClass}>{font.label}</span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {WATERMARK_COLORS.map((color) => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => {
                              setColorId(color.id);
                              setResult(null);
                            }}
                            disabled={busy || !modeNeedsText}
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

                      <label className="mt-3 block">
                        <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Opacity <span>{Math.round(opacity * 100)}%</span>
                        </span>
                        <input
                          type="range"
                          min={4}
                          max={85}
                          value={Math.round(opacity * 100)}
                          onChange={(event) => {
                            setOpacity(Number(event.target.value) / 100);
                            setResult(null);
                          }}
                          disabled={busy}
                          className="mt-2 w-full"
                        />
                      </label>

                      <label className="mt-3 block">
                        <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                          Rotation <span>{angle}°</span>
                        </span>
                        <input
                          type="range"
                          min={-90}
                          max={90}
                          value={angle}
                          onChange={(event) => {
                            setAngle(Number(event.target.value));
                            setResult(null);
                          }}
                          disabled={busy}
                          className="mt-2 w-full"
                        />
                      </label>

                      {modeNeedsText ? (
                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Font size <span>{fontSize}px</span>
                          </span>
                          <input
                            type="range"
                            min={12}
                            max={120}
                            value={fontSize}
                            onChange={(event) => {
                              setFontSize(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 w-full"
                          />
                        </label>
                      ) : null}

                      {modeNeedsImage ? (
                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Image scale <span>{imageScale}%</span>
                          </span>
                          <input
                            type="range"
                            min={12}
                            max={80}
                            value={imageScale}
                            onChange={(event) => {
                              setImageScale(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 w-full"
                          />
                        </label>
                      ) : null}

                      {watermarkLayout === "tile" ? (
                        <label className="mt-3 block">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Tile gap <span>{tileGap}px</span>
                          </span>
                          <input
                            type="range"
                            min={140}
                            max={360}
                            value={tileGap}
                            onChange={(event) => {
                              setTileGap(Number(event.target.value));
                              setResult(null);
                            }}
                            disabled={busy}
                            className="mt-2 w-full"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("position")}
                    disabled={busy || watermarkLayout === "tile"}
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
                            disabled={busy || watermarkLayout === "tile"}
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
                        You can also drag the watermark directly on the page preview.
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

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("image")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FileImage size={15} />
                    Image
                  </button>

                  {openPanel === "image" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      {imagePreviewUrl ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <img
                            src={imagePreviewUrl}
                            alt="Watermark image"
                            className="mx-auto max-h-24 rounded-lg object-contain"
                          />
                          <p className="mt-2 truncate text-center text-xs font-semibold text-slate-500">
                            {imageFile?.name}
                          </p>
                        </div>
                      ) : (
                        <p className="rounded-xl border border-dashed border-violet-200 bg-violet-50 p-3 text-xs font-semibold leading-5 text-violet-700">
                          Upload a PNG or JPG logo/signature for image watermark.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={busy}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Upload size={15} />
                        {imagePreviewUrl ? "Replace image" : "Upload image"}
                      </button>

                      {imagePreviewUrl ? (
                        <button
                          type="button"
                          onClick={clearImageFile}
                          disabled={busy}
                          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <X size={15} />
                          Remove image
                        </button>
                      ) : null}
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
                  Single mode can be dragged directly on preview. Tiled mode repeats the watermark across selected pages.
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
                  Text watermark · Image watermark · Tiled watermark
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
                      <span>Applying watermark...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {result ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    Watermarked PDF created · {formatFileSize(result.outputSize)}
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
                                Watermark
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

                            {isTarget && watermarkLayout === "single" ? (
                              <div
                                onPointerDown={startDrag}
                                className={`absolute z-20 cursor-grab select-none active:cursor-grabbing ${
                                  isDragging ? "scale-105" : ""
                                }`}
                                style={{
                                  left: `${position.xPercent}%`,
                                  top: `${position.yPercent}%`,
                                  opacity,
                                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                                }}
                              >
                                <div className="flex flex-col items-center gap-2">
                                  {modeNeedsImage && imagePreviewUrl ? (
                                    <img
                                      src={imagePreviewUrl}
                                      alt="Watermark preview"
                                      className="max-h-20 max-w-28 object-contain"
                                      style={{ width: `${imageScale * 2.4}px` }}
                                      draggable={false}
                                    />
                                  ) : null}

                                  {modeNeedsText ? (
                                    <div
                                      className={`whitespace-nowrap rounded-lg border border-white/50 bg-white/35 px-2 py-1 text-center leading-none shadow-sm backdrop-blur-sm ${selectedColor.previewClassName} ${selectedFontPreviewClass}`}
                                      style={{ fontSize: `${Math.max(14, fontSize / 2)}px` }}
                                    >
                                      {watermarkText || "Watermark"}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ) : null}

                            {isTarget && watermarkLayout === "tile" ? (
                              <div className="pointer-events-none absolute inset-0 z-20 grid grid-cols-3 grid-rows-3 place-items-center opacity-80">
                                {Array.from({ length: 9 }, (_, index) => (
                                  <div
                                    key={index}
                                    className="flex rotate-[-32deg] flex-col items-center gap-1"
                                    style={{ opacity }}
                                  >
                                    {modeNeedsImage && imagePreviewUrl ? (
                                      <img
                                        src={imagePreviewUrl}
                                        alt=""
                                        className="max-h-12 max-w-16 object-contain"
                                        draggable={false}
                                      />
                                    ) : null}
                                    {modeNeedsText ? (
                                      <span
                                        className={`whitespace-nowrap text-sm font-bold ${selectedColor.previewClassName} ${selectedFontPreviewClass}`}
                                      >
                                        {watermarkText || "Watermark"}
                                      </span>
                                    ) : null}
                                  </div>
                                ))}
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

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusIsError ? "text-red-600" : "text-slate-500"}`}>
            {file && !statusIsError && busyMode === "idle"
              ? `${targetSummary} · ${watermarkLayout === "single" ? "single" : "tiled"} · ${Math.round(opacity * 100)}% opacity`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
