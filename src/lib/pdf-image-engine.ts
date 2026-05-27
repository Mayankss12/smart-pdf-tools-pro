import { PDFDocument } from "pdf-lib";

import {
  PdfEngineError,
  getReductionPercent,
  safeFileBaseName,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

export type ImageToPdfOptions = {
  pageWidth?: number;
  pageHeight?: number;
  margin?: number;
  jpegQuality?: number;
  maxFiles?: number;
  maxFileSizeMb?: number;
};

export type ImageValidationResult = {
  accepted: File[];
  rejected: Array<{ fileName: string; reason: string }>;
};

type LoadedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const DEFAULT_MARGIN = 36;
const DEFAULT_JPEG_QUALITY = 0.92;
const DEFAULT_MAX_FILES = 80;
const DEFAULT_MAX_IMAGE_MB = 20;

function isAcceptedImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    file.type === "image/png" ||
    file.type === "image/webp" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
}

function isPngFile(file: File) {
  return file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
}

function isJpegFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type === "image/jpeg" || file.type === "image/jpg" || name.endsWith(".jpg") || name.endsWith(".jpeg");
}

async function readFileBytes(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  const url = URL.createObjectURL(file);

  try {
    const element = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Unable to read image."));
      image.src = url;
    });

    return {
      source: element,
      width: element.naturalWidth,
      height: element.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertToJpegBytes(image: LoadedImage, quality: number) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to process this image in the browser.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image.source, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", quality);
  });

  if (!blob) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to convert this image for PDF output.");
  }

  return new Uint8Array(await blob.arrayBuffer());
}

function calculateFitBox(imageWidth: number, imageHeight: number, pageWidth: number, pageHeight: number, margin: number) {
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;
  const scale = Math.min(availableWidth / imageWidth, availableHeight / imageHeight, 1);
  const width = imageWidth * scale;
  const height = imageHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

export function validateImageFiles(files: File[], options: ImageToPdfOptions = {}): ImageValidationResult {
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const maxFileSizeBytes = (options.maxFileSizeMb ?? DEFAULT_MAX_IMAGE_MB) * 1024 * 1024;
  const accepted: File[] = [];
  const rejected: ImageValidationResult["rejected"] = [];

  for (const file of files) {
    if (accepted.length >= maxFiles) {
      rejected.push({ fileName: file.name, reason: `Maximum ${maxFiles} images allowed at once.` });
      continue;
    }

    if (!isAcceptedImageFile(file)) {
      rejected.push({ fileName: file.name, reason: "Only JPG, PNG, and WebP images are supported." });
      continue;
    }

    if (file.size <= 0) {
      rejected.push({ fileName: file.name, reason: "Image file is empty." });
      continue;
    }

    if (file.size > maxFileSizeBytes) {
      rejected.push({
        fileName: file.name,
        reason: `Image is too large. Maximum allowed size is ${options.maxFileSizeMb ?? DEFAULT_MAX_IMAGE_MB} MB.`,
      });
      continue;
    }

    accepted.push(file);
  }

  return { accepted, rejected };
}

export function getImageToPdfRejectedSummary(rejected: ImageValidationResult["rejected"]) {
  if (rejected.length === 0) return "";
  if (rejected.length === 1) return `${rejected[0].fileName}: ${rejected[0].reason}`;
  return `${rejected.length} files were skipped because they are unsupported or too large.`;
}

export async function convertImagesToPdfEngine(files: File[], options: ImageToPdfOptions = {}): Promise<PdfProcessingResult> {
  const validation = validateImageFiles(files, options);

  if (validation.accepted.length === 0) {
    throw new PdfEngineError("NO_FILE", "Please upload at least one supported image file.");
  }

  const pageWidth = options.pageWidth ?? A4_WIDTH;
  const pageHeight = options.pageHeight ?? A4_HEIGHT;
  const margin = options.margin ?? DEFAULT_MARGIN;
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY;
  const pdf = await PDFDocument.create();
  let originalSize = 0;

  for (const file of validation.accepted) {
    originalSize += file.size;
    const image = await loadImage(file);

    try {
      const imageBytes = isPngFile(file) || isJpegFile(file) ? await readFileBytes(file) : await convertToJpegBytes(image, jpegQuality);
      const embeddedImage = isPngFile(file) ? await pdf.embedPng(imageBytes) : await pdf.embedJpg(imageBytes);
      const page = pdf.addPage([pageWidth, pageHeight]);
      const box = calculateFitBox(image.width, image.height, pageWidth, pageHeight, margin);

      page.drawImage(embeddedImage, box);
    } finally {
      image.close?.();
    }
  }

  const result = await savePdfResult(
    pdf,
    originalSize,
    `PDFMantra-images-${safeFileBaseName(validation.accepted[0].name)}.pdf`,
  );

  return {
    ...result,
    reductionPercent: getReductionPercent(originalSize, result.outputSize),
  };
}
