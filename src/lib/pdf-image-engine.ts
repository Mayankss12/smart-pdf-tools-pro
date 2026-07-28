import {
  PDFDocument,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFImage,
} from "pdf-lib";

import {
  PdfEngineError,
  safeFileBaseName,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { addSearchableTextLayer, type PdfImagePlacement } from "@/lib/pdf-text-overlay";
import type { OcrResult } from "@/lib/pdf-ocr-engine";

export type ImageToPdfPageSize =
  | "a4"
  | "letter"
  | "legal"
  | "a3"
  | "original"
  | "custom";
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
  backgroundColor?: string | null;
  customPageWidth?: number;
  customPageHeight?: number;
  outputFileName?: string;
  onProgress?: (progress: {
    completed: number;
    total: number;
  }) => void;
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

const MAX_IMAGE_SIZE_MB = 40;
const MAX_TOTAL_SIZE_MB = 180;
const MAX_IMAGE_PIXELS = 60_000_000;
const POINTS_PER_PIXEL_AT_96_DPI = 72 / 96;

const PAGE_SIZES: Record<
  Exclude<ImageToPdfPageSize, "original" | "custom">,
  [number, number]
> = {
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

type ExifOrientation = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type DrawBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type NormalizedImageToPdfOptions = Required<
  Omit<ImageToPdfOptions, "outputFileName" | "onProgress">
> & {
  outputFileName?: string;
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

    const pageMargin =
      normalizedOptions.pageSize === "original" ? 0 : normalizedOptions.margin;
    if (normalizedOptions.fitMode === "cover") {
      const safeMargin = clamp(
        pageMargin,
        0,
        Math.min(pageWidth, pageHeight) / 3,
      );
      page.pushOperators(
        pushGraphicsState(),
        rectangle(
          safeMargin,
          safeMargin,
          Math.max(1, pageWidth - safeMargin * 2),
          Math.max(1, pageHeight - safeMargin * 2),
        ),
        clip(),
        endPath(),
      );
    }

    page.drawImage(embeddedImage, {
      x: imageBox.x,
      y: imageBox.y,
      width: imageBox.width,
      height: imageBox.height,
    });

    if (normalizedOptions.fitMode === "cover") {
      page.pushOperators(popGraphicsState());
    }

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
    options.onProgress?.({
      completed: index + 1,
      total: validation.accepted.length,
    });
  }

  return {
    pdf,
    placements,
    originalSize,
    fileName,
  };
}

function normalizeOptions(
  options: ImageToPdfOptions,
): NormalizedImageToPdfOptions {
  return {
    pageSize: options.pageSize || "a4",
    orientation: options.orientation || "auto",
    fitMode: options.fitMode || "contain",
    margin: clamp(Number(options.margin ?? 28), 0, 120),
    backgroundColor:
      options.backgroundColor === null
        ? null
        : normalizeHexColor(options.backgroundColor || "#ffffff"),
    customPageWidth: clamp(
      Number(options.customPageWidth ?? 595.28),
      144,
      2200,
    ),
    customPageHeight: clamp(
      Number(options.customPageHeight ?? 841.89),
      144,
      2200,
    ),
    outputFileName: options.outputFileName,
  };
}

function normalizeImageMimeType(file: File): "image/png" | "image/jpeg" | "image/webp" | null {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (type === "image/png") return "image/png";
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/webp") return "image/webp";

  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if (name.endsWith(".webp")) return "image/webp";

  return null;
}

export function readJpegExifOrientation(bytes: Uint8Array): ExifOrientation {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return 1;

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 2;

  try {
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      if (marker === 0xda || marker === 0xd9) break;
      const segmentLength = view.getUint16(offset + 2, false);
      if (segmentLength < 2 || offset + 2 + segmentLength > bytes.length) break;

      if (
        marker === 0xe1 &&
        bytes[offset + 4] === 0x45 &&
        bytes[offset + 5] === 0x78 &&
        bytes[offset + 6] === 0x69 &&
        bytes[offset + 7] === 0x66 &&
        bytes[offset + 8] === 0x00 &&
        bytes[offset + 9] === 0x00
      ) {
        const tiffOffset = offset + 10;
        const littleEndian =
          bytes[tiffOffset] === 0x49 && bytes[tiffOffset + 1] === 0x49;
        const bigEndian =
          bytes[tiffOffset] === 0x4d && bytes[tiffOffset + 1] === 0x4d;
        if (!littleEndian && !bigEndian) return 1;
        if (view.getUint16(tiffOffset + 2, littleEndian) !== 42) return 1;

        const directoryOffset =
          tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
        const entryCount = view.getUint16(directoryOffset, littleEndian);
        for (let index = 0; index < entryCount; index += 1) {
          const entryOffset = directoryOffset + 2 + index * 12;
          if (entryOffset + 12 > bytes.length) return 1;
          if (view.getUint16(entryOffset, littleEndian) !== 0x0112) continue;
          const orientation = view.getUint16(entryOffset + 8, littleEndian);
          if (orientation === 1) return 1;
          if (orientation === 2) return 2;
          if (orientation === 3) return 3;
          if (orientation === 4) return 4;
          if (orientation === 5) return 5;
          if (orientation === 6) return 6;
          if (orientation === 7) return 7;
          if (orientation === 8) return 8;
          return 1;
        }
      }

      offset += 2 + segmentLength;
    }
  } catch {
    return 1;
  }

  return 1;
}

async function loadImageForPdf(file: File): Promise<LoadedImage> {
  const mimeType = normalizeImageMimeType(file);

  if (!mimeType) {
    throw new PdfEngineError("INVALID_FILE_TYPE", `${file.name} is not a supported image.`);
  }

  const sourceBytes = await file.arrayBuffer();
  const orientation =
    mimeType === "image/jpeg"
      ? readJpegExifOrientation(new Uint8Array(sourceBytes))
      : 1;

  if (mimeType === "image/webp" || orientation !== 1) {
    const converted = await convertImageToPng(file, orientation);

    return {
      file,
      bytes: converted.bytes,
      width: converted.width,
      height: converted.height,
      mimeType: "image/png",
    };
  }

  const dimensions = await getImageDimensions(file);

  return {
    file,
    bytes: sourceBytes,
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
  if (typeof createImageBitmap !== "function") {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This browser cannot decode image dimensions safely. Try a current Chrome, Edge, Firefox, or Safari release.",
    );
  }
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "none" });

    if (!bitmap.width || !bitmap.height) {
      throw new PdfEngineError("PROCESSING_FAILED", `${file.name} has invalid image dimensions.`);
    }
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        `${file.name} exceeds the safe ${MAX_IMAGE_PIXELS.toLocaleString()} pixel limit.`,
      );
    }

    return {
      width: bitmap.width,
      height: bitmap.height,
    };
  } catch (error) {
    if (error instanceof PdfEngineError) throw error;
    throw new PdfEngineError("PROCESSING_FAILED", `${file.name} could not be read as an image.`);
  } finally {
    bitmap?.close();
  }
}

async function convertImageToPng(
  file: File,
  orientation: ExifOrientation = 1,
) {
  if (typeof createImageBitmap !== "function") {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This browser cannot normalize this image safely. Try a current Chrome, Edge, Firefox, or Safari release.",
    );
  }
  let bitmap: ImageBitmap | null = null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "none" });
    if (bitmap.width * bitmap.height > MAX_IMAGE_PIXELS) {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        `${file.name} exceeds the safe ${MAX_IMAGE_PIXELS.toLocaleString()} pixel limit.`,
      );
    }
    const swapsAxes = orientation >= 5 && orientation <= 8;
    canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new PdfEngineError("PROCESSING_FAILED", "Unable to convert WebP image.");
    }

    canvas.width = swapsAxes ? bitmap.height : bitmap.width;
    canvas.height = swapsAxes ? bitmap.width : bitmap.height;

    if (orientation === 2) context.setTransform(-1, 0, 0, 1, bitmap.width, 0);
    else if (orientation === 3) {
      context.setTransform(-1, 0, 0, -1, bitmap.width, bitmap.height);
    } else if (orientation === 4) {
      context.setTransform(1, 0, 0, -1, 0, bitmap.height);
    } else if (orientation === 5) context.setTransform(0, 1, 1, 0, 0, 0);
    else if (orientation === 6) {
      context.setTransform(0, 1, -1, 0, bitmap.height, 0);
    } else if (orientation === 7) {
      context.setTransform(0, -1, -1, 0, bitmap.height, bitmap.width);
    } else if (orientation === 8) {
      context.setTransform(0, -1, 1, 0, 0, bitmap.width);
    }
    context.drawImage(bitmap, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((outputBlob) => {
        if (outputBlob) resolve(outputBlob);
        else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to convert WebP image."));
      }, "image/png");
    });

    const bytes = await blob.arrayBuffer();

    return {
      bytes,
      width: canvas.width,
      height: canvas.height,
    };
  } finally {
    bitmap?.close();
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
  }
}

function resolvePageSize(
  image: LoadedImage,
  options: NormalizedImageToPdfOptions,
): [number, number] {
  if (options.pageSize === "original") {
    return resolveOriginalImagePageSize(image, options.orientation);
  }

  const baseSize: [number, number] =
    options.pageSize === "custom"
      ? [options.customPageWidth, options.customPageHeight]
      : PAGE_SIZES[options.pageSize] || PAGE_SIZES.a4;
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
  color: string | null,
) {
  if (color === null) return;
  const parsed = parseHexColor(color);

  page.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: rgb(parsed.r, parsed.g, parsed.b),
  });
}

export function calculateImageDrawBox({
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
