import {
  PDFDocument,
  PDFRef,
  StandardFonts,
  degrees,
  rgb,
  type PDFPage,
} from "pdf-lib";

import { createPdfFileName } from "@/lib/pdf-engine";

export const STAGE_ONE_MAX_FILE_SIZE_MB = 100;
export const STAGE_ONE_BATCH_MAX_FILES = 20;
export const STAGE_ONE_BATCH_MAX_TOTAL_MB = 250;

export type CropMargins = {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
};

export type MetadataUpdate = {
  readonly title?: string;
  readonly author?: string;
  readonly subject?: string;
  readonly keywords?: string;
  readonly creator?: string;
  readonly producer?: string;
  readonly clearAll?: boolean;
};

export type BatesPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type BatesOptions = {
  readonly prefix: string;
  readonly suffix: string;
  readonly startNumber: number;
  readonly digits: number;
  readonly position: BatesPosition;
  readonly fontSize: number;
  readonly margin: number;
  readonly pageNumbers?: readonly number[];
};

export type RedactionArea = {
  readonly pageNumber: number;
  readonly xRatio: number;
  readonly yRatio: number;
  readonly widthRatio: number;
  readonly heightRatio: number;
};

function assertFiniteNonNegative(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be a non-negative number.`);
  }
}

function cleanMetadataValue(value: string | undefined, maxLength: number) {
  return (value ?? "").replace(/\0/g, "").trim().slice(0, maxLength);
}

export async function updatePdfMetadata(
  input: Uint8Array,
  update: MetadataUpdate,
) {
  const document = await PDFDocument.load(input, { updateMetadata: false });

  if (update.clearAll) {
    const info = document.context.trailerInfo.Info;
    if (info instanceof PDFRef) document.context.delete(info);
    delete document.context.trailerInfo.Info;
  } else {
    document.setTitle(cleanMetadataValue(update.title, 512));
    document.setAuthor(cleanMetadataValue(update.author, 256));
    document.setSubject(cleanMetadataValue(update.subject, 512));
    document.setKeywords(
      cleanMetadataValue(update.keywords, 1024)
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean)
        .slice(0, 50),
    );
    document.setCreator(cleanMetadataValue(update.creator, 256));
    document.setProducer(cleanMetadataValue(update.producer, 256));
    document.setModificationDate(new Date());
  }

  return document.save({ useObjectStreams: true });
}

export async function readPdfMetadata(input: Uint8Array) {
  const document = await PDFDocument.load(input, { updateMetadata: false });
  return {
    title: document.getTitle() ?? "",
    author: document.getAuthor() ?? "",
    subject: document.getSubject() ?? "",
    keywords: document.getKeywords() ?? "",
    creator: document.getCreator() ?? "",
    producer: document.getProducer() ?? "",
    pageCount: document.getPageCount(),
  };
}

export async function cropPdf(
  input: Uint8Array,
  margins: CropMargins,
  pageNumbers?: readonly number[],
) {
  Object.entries(margins).forEach(([label, value]) =>
    assertFiniteNonNegative(value, `${label} margin`),
  );

  const document = await PDFDocument.load(input, { updateMetadata: false });
  const selected = pageNumbers ? new Set(pageNumbers) : null;

  document.getPages().forEach((page, index) => {
    if (selected && !selected.has(index + 1)) return;

    const box = page.getCropBox();
    const width = box.width - margins.left - margins.right;
    const height = box.height - margins.top - margins.bottom;
    if (width < 36 || height < 36) {
      throw new Error(`Crop margins leave page ${index + 1} smaller than 0.5 inch.`);
    }

    page.setCropBox(
      box.x + margins.left,
      box.y + margins.bottom,
      width,
      height,
    );
  });

  return document.save({ useObjectStreams: true });
}

function getBatesCoordinates(
  page: PDFPage,
  position: BatesPosition,
  textWidth: number,
  fontSize: number,
  margin: number,
) {
  const { width, height } = page.getSize();
  const horizontal = position.endsWith("left")
    ? margin
    : position.endsWith("right")
      ? width - margin - textWidth
      : (width - textWidth) / 2;
  const vertical = position.startsWith("top")
    ? height - margin - fontSize
    : margin;
  return { x: Math.max(0, horizontal), y: Math.max(0, vertical) };
}

export async function addBatesNumbers(
  input: Uint8Array,
  options: BatesOptions,
) {
  if (!Number.isInteger(options.startNumber) || options.startNumber < 0) {
    throw new Error("Starting Bates number must be a whole number of zero or higher.");
  }
  if (!Number.isInteger(options.digits) || options.digits < 1 || options.digits > 12) {
    throw new Error("Bates padding must be between 1 and 12 digits.");
  }
  if (!Number.isFinite(options.fontSize) || options.fontSize < 6 || options.fontSize > 48) {
    throw new Error("Bates font size must be between 6 and 48 points.");
  }

  const document = await PDFDocument.load(input, { updateMetadata: false });
  const font = await document.embedFont(StandardFonts.Helvetica);
  const selected = options.pageNumbers
    ? new Set(options.pageNumbers)
    : new Set(document.getPages().map((_, index) => index + 1));
  let sequence = options.startNumber;

  document.getPages().forEach((page, index) => {
    if (!selected.has(index + 1)) return;
    const number = String(sequence).padStart(options.digits, "0");
    const text = `${options.prefix}${number}${options.suffix}`.slice(0, 160);
    const textWidth = font.widthOfTextAtSize(text, options.fontSize);
    const point = getBatesCoordinates(
      page,
      options.position,
      textWidth,
      options.fontSize,
      options.margin,
    );
    page.drawText(text, {
      ...point,
      size: options.fontSize,
      font,
      color: rgb(0.08, 0.1, 0.16),
      opacity: 0.92,
    });
    sequence += 1;
  });

  return document.save({ useObjectStreams: true });
}

export async function splitPdfByApproximateSize(
  input: Uint8Array,
  targetBytes: number,
) {
  if (!Number.isFinite(targetBytes) || targetBytes < 64 * 1024) {
    throw new Error("Target size must be at least 64 KB.");
  }

  const source = await PDFDocument.load(input, { updateMetadata: false });
  const outputs: Uint8Array[] = [];
  let currentPages: number[] = [];

  async function build(indices: readonly number[]) {
    const output = await PDFDocument.create();
    const copied = await output.copyPages(source, [...indices]);
    copied.forEach((page) => output.addPage(page));
    return output.save({ useObjectStreams: true });
  }

  for (let pageIndex = 0; pageIndex < source.getPageCount(); pageIndex += 1) {
    const candidate = [...currentPages, pageIndex];
    const candidateBytes = await build(candidate);

    if (candidateBytes.byteLength > targetBytes && currentPages.length) {
      outputs.push(await build(currentPages));
      currentPages = [pageIndex];
    } else {
      currentPages = candidate;
    }
  }

  if (currentPages.length) outputs.push(await build(currentPages));
  return outputs;
}

export async function splitPdfAtPages(
  input: Uint8Array,
  starts: readonly number[],
) {
  const source = await PDFDocument.load(input, { updateMetadata: false });
  const pageCount = source.getPageCount();
  const normalized = [...new Set([1, ...starts])]
    .filter((page) => Number.isInteger(page) && page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const outputs: Uint8Array[] = [];

  for (let index = 0; index < normalized.length; index += 1) {
    const start = normalized[index] - 1;
    const end = (normalized[index + 1] ?? pageCount + 1) - 1;
    const pageIndices = Array.from({ length: end - start }, (_, offset) => start + offset);
    const output = await PDFDocument.create();
    const pages = await output.copyPages(source, pageIndices);
    pages.forEach((page) => output.addPage(page));
    outputs.push(await output.save({ useObjectStreams: true }));
  }

  return outputs;
}

export function stageOneOutputName(operation: string, sourceName: string) {
  return createPdfFileName(operation, sourceName);
}

export function normalizeRedactionArea(area: RedactionArea): RedactionArea {
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  const x = clamp(area.xRatio);
  const y = clamp(area.yRatio);
  return {
    pageNumber: Math.max(1, Math.floor(area.pageNumber)),
    xRatio: x,
    yRatio: y,
    widthRatio: Math.min(clamp(area.widthRatio), 1 - x),
    heightRatio: Math.min(clamp(area.heightRatio), 1 - y),
  };
}

export function rotatePageForPreview(page: PDFPage, angle: number) {
  page.setRotation(degrees(angle));
}
