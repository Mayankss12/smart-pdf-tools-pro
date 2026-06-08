import { PDFDocument, rgb, type PDFImage } from "pdf-lib";

import {
  PdfEngineError,
  safeFileBaseName,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { addSearchableTextLayer, type PdfImagePlacement } from "@/lib/pdf-text-overlay";
import type { OcrResult } from "@/lib/pdf-ocr-engine";

export type ImageToPdfPageSize = "a4" | "letter" | "legal" | "a3" | "original";
export type ImageToPdfOrientation = "auto" | "portrait" | "landscape";
export type ImageToPdfFitMode = "contain" | "cover" | "stretch";

export type ImageToPdfInput = {
  file: File;
  rotation?: number;
};

export type ImageToPdfOptions = {
  pageSize?: ImageToPdfPageSize;
  orientation?: ImageToPdfOrientation;
  fitMode?: ImageToPdfFitMode;
  margin?: number;
  backgroundColor?: string;
  outputFileName?: string;
};

export type ImageValidationResult = {
  accepted: File[];
  rejected: Array<{
    file: File;
    reason: string;
  }>;
};

export type ImageToPdfBuildResult = {
  pdf: PDFDocument;
  placements: PdfImagePlacement[];
  originalSize: number;
  fileName: string;
};

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
]);

const MAX_IMAGE_SIZE_MB = 40;
const MAX_TOTAL_SIZE_MB = 180;
const POINTS_PER_PIXEL_AT_96_DPI = 72 / 96;

const PAGE_SIZES: Record<Exclude<ImageToPdfPageSize, "original">, [number, number]> = {
  a4: [595.28, 841.89],
  letter: [612, 792],
  legal: [612, 1008],
  a3: [841.89, 1190.55],
};

type LoadedImage = {
  file: File;
  bytes: ArrayBuffer;
  width: number;
  height: number;
  mimeType: "image/png" | "image/jpeg";
};

type DrawBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function validateImageFiles(files: File[]): ImageValidationResult {
  const accepted: File[] = [];
  const rejected: ImageValidationResult["rejected"] = [];

  let totalSize = 0;

  files.forEach((file) => {
    const normalizedType = normalizeImageMimeType(file);
    const maxImageBytes = MAX_IMAGE_SIZE_MB * 1024 * 1024;

    if (!normalizedType) {
      rejected.push({
        file,
        reason: "Unsupported format",
      });
      return;
    }

    if (file.size <= 0) {
      rejected.push({
        file,
        reason: "Empty file",
      });
      return;
    }

    if (file.size > maxImageBytes) {
      rejected.push({
        file,
        reason: `Image exceeds ${MAX_IMAGE_SIZE_MB} MB`,
      });
      return;
    }

    totalSize += file.size;
    accepted.push(file);
  });

  const maxTotalBytes = MAX_TOTAL_SIZE_MB * 1024 * 1024;

  if (totalSize > maxTotalBytes) {
    return {
      accepted: [],
      rejected: files.map((file) => ({
        file,
        reason: `Total image size exceeds ${MAX_TOTAL_SIZE_MB} MB`,
      })),
    };
  }

  return {
    accepted,
    rejected,
  };
}

export function getImageToPdfRejectedSummary(rejected: ImageValidationResult["rejected"]) {
  if (!rejected.length) return "";

  const grouped = new Map<string, number>();

  rejected.forEach((item) => {
    grouped.set(item.reason, (grouped.get(item.reason) || 0) + 1);
  });

  return Array.from(grouped.entries())
    .map(([reason, count]) => `${count} rejected: ${reason}`)
    .join(" · ");
}

export async function convertImagesToPdfEngine(
  files: File[],
  options: ImageToPdfOptions = {},
): Promise<PdfProcessingResult> {
  const build = await buildImagePdfDocument(files, options);

  return savePdfResult(build.pdf, build.originalSize, build.fileName);
}

export async function convertImagesToSearchablePdfEngine(
  files: File[],
  options: ImageToPdfOptions & {
    ocrResults: OcrResult[];
    onOverlayProgress?: Parameters<typeof addSearchableTextLayer>[1]["onProgress"];
    signal?: AbortSignal;
  },
): Promise<PdfProcessingResult> {
  const build = await buildImagePdfDocument(files, options);

  await addSearchableTextLayer(build.pdf, {
    ocrResults: options.ocrResults,
    placements: build.placements,
    onProgress: options.onOverlayProgress,
    signal: options.signal,
  });

  return savePdfResult(build.pdf, build.originalSize, build.fileName);
}

export async function buildImagePdfDocument(
  files: File[],
  options: ImageToPdfOptions = {},
): Promise<ImageToPdfBuildResult> {
  if (!files.length) {
    throw new PdfEngineError("NO_FILE", "Upload at least one image first.");
  }

  const validation = validateImageFiles(files);

  if (!validation.accepted.length) {
    throw new PdfEngineError("INVALID_FILE_TYPE", "No supported images found. Use JPG, PNG, or WebP.");
  }

  const pdf = await PDFDocument.create();
  const placements: PdfImagePlacement[] = [];
  const originalSize = validation.accepted.reduce((sum, file) => sum + file.size, 0);
  const normalizedOptions = normalizeOptions(options);
  const baseName = safeFileBaseName(validation.accepted[0]?.name || "images");
  const fileName = normalizedOptions.outputFileName || `PDFMantra-images-to-pdf-${baseName}.pdf`;

  pdf.setTitle("Images to PDF");
  pdf.setCreator("PDFMantra");
  pdf.setProducer("PDFMantra");

  for (let index = 0; index < validation.accepted.length; index += 1) {
    const file = validation.accepted[index];
    const loadedImage = await loadImageForPdf(file);
    const embeddedImage = await embedImage(pdf, loadedImage);
    const pageSize = resolvePageSize(loadedImage, normalizedOptions);
    const page = pdf.addPage(pageSize);
    const { width: pageWidth, height: pageHeight } = page.getSize();

    drawPageBackground(page, pageWidth, pageHeight, normalizedOptions.backgroundColor);

    const imageBox = calculateImageDrawBox({
      imageWidth: embeddedImage.width,
      imageHeight: embeddedImage.height,
      pageWidth,
      pageHeight,
      margin: normalizedOptions.pageSize === "original" ? 0 : normalizedOptions.margin,
      fitMode: normalizedOptions.fitMode,
    });

    page.drawImage(embeddedImage, {
      x: imageBox.x,
      y: imageBox.y,
      width: imageBox.width,
      height: imageBox.height,
    });

    placements.push({
      pageIndex: index,
      imageWidth: loadedImage.width,
      imageHeight: loadedImage.height,
      drawX: imageBox.x,
      drawY: imageBox.y,
      drawWidth: imageBox.width,
      drawHeight: imageBox.height,
      pageWidth,
      pageHeight,
    });
  }

  return {
    pdf,
    placements,
    originalSize,
    fileName,
  };
}

function normalizeOptions(options: ImageToPdfOptions): Required<Omit<ImageToPdfOptions, "outputFileName">> & {
  outputFileName?: string;
} {
  return {
    pageSize: options.pageSize || "a4",
    orientation: options.orientation || "auto",
    fitMode: options.fitMode || "contain",
    margin: clamp(Number(options.margin ?? 28), 0, 120),
    backgroundColor: normalizeHexColor(options.backgroundColor || "#ffffff"),
    outputFileName: options.outputFileName,
  };
}

function normalizeImageMimeType(file: File): "image/png" | "image/jpeg" | "image/webp" | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (SUPPORTED_IMAGE_TYPES.has(type)) {
    if (type === "image/jpg") return "image/jpeg";
    return type as "image/png" | "image/jpeg" | "image/webp";
  }

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";

  return null;
}

async function loadImageForPdf(file: File): Promise<LoadedImage> {
  const mimeType = normalizeImageMimeType(file);

  if (!mimeType) {
    throw new PdfEngineError("INVALID_FILE_TYPE", `${file.name} is not a supported image.`);
  }

  const dimensions = await getImageDimensions(file);

  if (mimeType === "image/webp") {
    const converted = await convertImageToPng(file);

    return {
      file,
      bytes: converted.bytes,
      width: converted.width,
      height: converted.height,
      mimeType: "image/png",
    };
  }

  return {
    file,
    bytes: await file.arrayBuffer(),
    width: dimensions.width,
    height: dimensions.height,
    mimeType,
  };
}

async function embedImage(pdf: PDFDocument, image: LoadedImage): Promise<PDFImage> {
  try {
    if (image.mimeType === "image/png") {
      return await pdf.embedPng(image.bytes);
    }

    return await pdf.embedJpg(image.bytes);
  } catch {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      `${image.file.name} could not be embedded into the PDF.`,
    );
  }
}

async function getImageDimensions(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await image.decode();

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new PdfEngineError("PROCESSING_FAILED", `${file.name} has invalid image dimensions.`);
    }

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    throw new PdfEngineError("PROCESSING_FAILED", `${file.name} could not be read as an image.`);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function convertImageToPng(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await image.decode();

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new PdfEngineError("PROCESSING_FAILED", "Unable to convert WebP image.");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((outputBlob) => {
        if (outputBlob) resolve(outputBlob);
        else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to convert WebP image."));
      }, "image/png");
    });

    const bytes = await blob.arrayBuffer();

    canvas.width = 0;
    canvas.height = 0;

    return {
      bytes,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resolvePageSize(
  image: LoadedImage,
  options: Required<Omit<ImageToPdfOptions, "outputFileName">>,
): [number, number] {
  if (options.pageSize === "original") {
    return resolveOriginalImagePageSize(image, options.orientation);
  }

  const baseSize = PAGE_SIZES[options.pageSize] || PAGE_SIZES.a4;
  const shouldUseLandscape =
    options.orientation === "landscape" ||
    (options.orientation === "auto" && image.width > image.height);

  const [shortSide, longSide] = [
    Math.min(baseSize[0], baseSize[1]),
    Math.max(baseSize[0], baseSize[1]),
  ];

  return shouldUseLandscape ? [longSide, shortSide] : [shortSide, longSide];
}

function resolveOriginalImagePageSize(
  image: LoadedImage,
  orientation: ImageToPdfOrientation,
): [number, number] {
  const nativeWidth = image.width * POINTS_PER_PIXEL_AT_96_DPI;
  const nativeHeight = image.height * POINTS_PER_PIXEL_AT_96_DPI;
  const scale = Math.min(1, 2200 / Math.max(nativeWidth, nativeHeight));
  let width = Math.max(144, nativeWidth * scale);
  let height = Math.max(144, nativeHeight * scale);

  if (orientation === "portrait" && width > height) {
    [width, height] = [height, width];
  }

  if (orientation === "landscape" && height > width) {
    [width, height] = [height, width];
  }

  return [width, height];
}

function drawPageBackground(
  page: ReturnType<PDFDocument["addPage"]>,
  width: number,
  height: number,
  color: string,
) {
  const parsed = parseHexColor(color);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(parsed.r, parsed.g, parsed.b),
  });
}

function calculateImageDrawBox({
  imageWidth,
  imageHeight,
  pageWidth,
  pageHeight,
  margin,
  fitMode,
}: {
  imageWidth: number;
  imageHeight: number;
  pageWidth: number;
  pageHeight: number;
  margin: number;
  fitMode: ImageToPdfFitMode;
}): DrawBox {
  const safeMargin = clamp(margin, 0, Math.min(pageWidth, pageHeight) / 3);
  const availableWidth = Math.max(1, pageWidth - safeMargin * 2);
  const availableHeight = Math.max(1, pageHeight - safeMargin * 2);

  if (fitMode === "stretch") {
    return {
      x: safeMargin,
      y: safeMargin,
      width: availableWidth,
      height: availableHeight,
    };
  }

  const imageRatio = imageWidth / imageHeight;
  const availableRatio = availableWidth / availableHeight;
  const shouldFitByWidth =
    fitMode === "contain"
      ? imageRatio >= availableRatio
      : imageRatio < availableRatio;

  const width = shouldFitByWidth ? availableWidth : availableHeight * imageRatio;
  const height = shouldFitByWidth ? availableWidth / imageRatio : availableHeight;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

function normalizeHexColor(color: string) {
  const trimmed = color.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;

  return "#ffffff";
}

function parseHexColor(color: string) {
  const normalized = normalizeHexColor(color).replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  return {
    r,
    g,
    b,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
