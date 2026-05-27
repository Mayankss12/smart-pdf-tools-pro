import { StandardFonts, rgb } from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

export type PageNumberPosition = {
  xPercent: number;
  yPercent: number;
};

export type PageNumberOptions = {
  position: PageNumberPosition;
  startNumber: number;
  fontSize: number;
  prefix: string;
  suffix: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function addPageNumbersWithOptions(
  file: File,
  options: PageNumberOptions,
): Promise<PdfProcessingResult> {
  if (!Number.isInteger(options.startNumber) || options.startNumber < 0) {
    throw new PdfEngineError("PROCESSING_FAILED", "Start number must be 0 or higher.");
  }

  const pdf = await loadPdfDocument(file);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontSize = clamp(options.fontSize, 8, 72);
  const xPercent = clamp(options.position.xPercent, 4, 96);
  const yPercent = clamp(options.position.yPercent, 4, 96);

  pdf.getPages().forEach((page, index) => {
    const { width, height } = page.getSize();
    const pageNumber = options.startNumber + index;
    const text = `${options.prefix}${pageNumber}${options.suffix}`;
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    const x = clamp((xPercent / 100) * width - textWidth / 2, 12, width - textWidth - 12);
    const y = clamp(height - (yPercent / 100) * height - fontSize / 2, 12, height - fontSize - 12);

    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color: rgb(0.12, 0.14, 0.2),
      opacity: 0.92,
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("page-numbers", file.name));
}
