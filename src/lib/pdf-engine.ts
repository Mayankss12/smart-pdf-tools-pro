import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";

export type PdfEngineErrorCode =
  | "NO_FILE"
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "ENCRYPTED_OR_UNSUPPORTED"
  | "INVALID_PAGE_RANGE"
  | "PROCESSING_FAILED";

export class PdfEngineError extends Error {
  readonly code: PdfEngineErrorCode;

  constructor(code: PdfEngineErrorCode, message: string) {
    super(message);
    this.name = "PdfEngineError";
    this.code = code;
  }
}

export type PdfProcessingResult = {
  blob: Blob;
  fileName: string;
  originalSize: number;
  outputSize: number;
  reductionPercent: number;
};

export type PdfValidationOptions = {
  maxSizeMb?: number;
  allowEmpty?: boolean;
};

export type PageGroup = {
  label: string;
  pages: number[];
};

export type RotationMap = Record<number, number>;

const DEFAULT_MAX_SIZE_MB = 80;

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function safeFileBaseName(fileName: string) {
  const withoutExtension = fileName.replace(/\.pdf$/i, "").trim() || "document";

  return (
    withoutExtension
      .replace(/[^a-zA-Z0-9-_ ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "document"
  );
}

export function createPdfFileName(prefix: string, sourceName: string) {
  return `PDFMantra-${prefix}-${safeFileBaseName(sourceName)}.pdf`;
}

export function getReductionPercent(originalSize: number, outputSize: number) {
  if (originalSize <= 0) return 0;
  return Math.max(0, Math.round((1 - outputSize / originalSize) * 100));
}

export function normalizePdfRotation(value: number) {
  return ((value % 360) + 360) % 360;
}

export function validatePdfFile(file: File | null | undefined, options: PdfValidationOptions = {}) {
  if (!file) {
    throw new PdfEngineError("NO_FILE", "Please upload a PDF file first.");
  }

  if (!options.allowEmpty && file.size <= 0) {
    throw new PdfEngineError("EMPTY_FILE", "This file is empty. Please choose another PDF.");
  }

  if (!isPdfFile(file)) {
    throw new PdfEngineError("INVALID_FILE_TYPE", "Please upload a valid PDF file.");
  }

  const maxSizeMb = options.maxSizeMb ?? DEFAULT_MAX_SIZE_MB;
  const maxBytes = maxSizeMb * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new PdfEngineError(
      "FILE_TOO_LARGE",
      `This PDF is too large for browser processing. Maximum allowed size is ${maxSizeMb} MB.`,
    );
  }
}

export function validatePdfFiles(files: File[], options: PdfValidationOptions = {}) {
  if (files.length === 0) {
    throw new PdfEngineError("NO_FILE", "Please upload at least one PDF file.");
  }

  files.forEach((file) => validatePdfFile(file, options));
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function loadPdfDocument(file: File, options: PdfValidationOptions = {}) {
  validatePdfFile(file, options);

  try {
    return await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  } catch {
    throw new PdfEngineError(
      "ENCRYPTED_OR_UNSUPPORTED",
      "This PDF could not be opened. It may be encrypted, damaged, or unsupported.",
    );
  }
}

export async function savePdfResult(
  pdf: PDFDocument,
  originalSize: number,
  fileName: string,
): Promise<PdfProcessingResult> {
  const bytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });
  const blob = new Blob([bytes], { type: "application/pdf" });

  return {
    blob,
    fileName,
    originalSize,
    outputSize: blob.size,
    reductionPercent: getReductionPercent(originalSize, blob.size),
  };
}

export async function optimizePdfStructure(file: File): Promise<PdfProcessingResult> {
  const pdf = await loadPdfDocument(file);

  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("PDFMantra");
  pdf.setCreator("PDFMantra");

  return savePdfResult(pdf, file.size, createPdfFileName("compressed", file.name));
}

export async function mergePdfFiles(files: File[]): Promise<PdfProcessingResult> {
  validatePdfFiles(files);

  if (files.length < 2) {
    throw new PdfEngineError("NO_FILE", "Please upload at least two PDFs to merge.");
  }

  const outputPdf = await PDFDocument.create();
  let originalSize = 0;

  for (const file of files) {
    originalSize += file.size;
    const sourcePdf = await loadPdfDocument(file);
    const copiedPages = await outputPdf.copyPages(sourcePdf, sourcePdf.getPageIndices());
    copiedPages.forEach((page) => outputPdf.addPage(page));
  }

  return savePdfResult(outputPdf, originalSize, "PDFMantra-merged.pdf");
}

function uniqueSortedNumbers(numbers: number[]) {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

export function parsePageGroups(input: string, totalPages: number): PageGroup[] {
  const cleaned = input.trim().replace(/\s+/g, "");

  if (!cleaned) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "Enter page groups first. Example: 1-4,5-8");
  }

  return cleaned
    .split(",")
    .filter(Boolean)
    .map((groupText) => {
      const pages: number[] = [];

      if (groupText.includes("-")) {
        const [startText, endText] = groupText.split("-");
        const start = Number(startText);
        const end = Number(endText);

        if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0 || start > end) {
          throw new PdfEngineError("INVALID_PAGE_RANGE", `Invalid page range: ${groupText}`);
        }

        if (end > totalPages) {
          throw new PdfEngineError(
            "INVALID_PAGE_RANGE",
            `Page ${end} is outside this PDF. Total pages: ${totalPages}.`,
          );
        }

        for (let page = start; page <= end; page += 1) pages.push(page);
      } else {
        const page = Number(groupText);

        if (!Number.isInteger(page) || page <= 0 || page > totalPages) {
          throw new PdfEngineError("INVALID_PAGE_RANGE", `Invalid page number: ${groupText}`);
        }

        pages.push(page);
      }

      return { label: groupText, pages: uniqueSortedNumbers(pages) };
    });
}

export async function splitPdfIntoGroups(file: File, groups: PageGroup[]) {
  const sourcePdf = await loadPdfDocument(file);
  const cleanBaseName = safeFileBaseName(file.name);

  return Promise.all(
    groups.map(async (group, index) => {
      const outputPdf = await PDFDocument.create();
      const copiedPages = await outputPdf.copyPages(
        sourcePdf,
        group.pages.map((pageNumber) => pageNumber - 1),
      );

      copiedPages.forEach((page) => outputPdf.addPage(page));

      return savePdfResult(
        outputPdf,
        file.size,
        `PDFMantra-${cleanBaseName}-split-${index + 1}-${group.label}.pdf`,
      );
    }),
  );
}

export async function rotatePdfPages(file: File, rotation: 90 | 180 | 270): Promise<PdfProcessingResult> {
  const pdf = await loadPdfDocument(file);
  pdf.getPages().forEach((page) => page.setRotation(degrees(rotation)));
  return savePdfResult(pdf, file.size, createPdfFileName(`rotated-${rotation}`, file.name));
}

export async function rotatePdfWithMap(file: File, rotationMap: RotationMap): Promise<PdfProcessingResult> {
  const pdf = await loadPdfDocument(file);

  pdf.getPages().forEach((page, index) => {
    const pageNumber = index + 1;
    const existingRotation = page.getRotation().angle || 0;
    const extraRotation = rotationMap[pageNumber] || 0;
    const finalRotation = normalizePdfRotation(existingRotation + extraRotation);

    page.setRotation(degrees(finalRotation));
  });

  return savePdfResult(pdf, file.size, createPdfFileName("rotated", file.name));
}

export async function addTextWatermark(file: File, text: string): Promise<PdfProcessingResult> {
  const watermarkText = text.trim();

  if (!watermarkText) {
    throw new PdfEngineError("PROCESSING_FAILED", "Enter watermark text first.");
  }

  const pdf = await loadPdfDocument(file);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const size = Math.max(24, Math.min(width, height) / 9);
    const textWidth = font.widthOfTextAtSize(watermarkText, size);

    page.drawText(watermarkText, {
      x: (width - textWidth) / 2,
      y: height / 2,
      size,
      font,
      color: rgb(0.35, 0.2, 0.7),
      rotate: degrees(-35),
      opacity: 0.18,
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("watermarked", file.name));
}

export async function addPageNumbersToPdf(file: File): Promise<PdfProcessingResult> {
  const pdf = await loadPdfDocument(file);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const total = pdf.getPageCount();

  pdf.getPages().forEach((page, index) => {
    const { width } = page.getSize();
    const text = `${index + 1} / ${total}`;
    const size = 11;
    const textWidth = font.widthOfTextAtSize(text, size);

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 20,
      size,
      font,
      color: rgb(0.2, 0.2, 0.25),
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("numbered", file.name));
}
