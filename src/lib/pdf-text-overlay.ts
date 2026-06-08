import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import { PdfEngineError } from "@/lib/pdf-engine";
import type { OcrResult, OcrWord } from "@/lib/pdf-ocr-engine";

export type PdfImagePlacement = {
  pageIndex: number;
  imageWidth: number;
  imageHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  pageWidth: number;
  pageHeight: number;
};

export type TextOverlayProgress = {
  stage: "overlay";
  pageIndex: number;
  totalPages: number;
  wordsProcessed: number;
  totalWords: number;
  percent: number;
  message: string;
};

export type TextOverlayOptions = {
  ocrResults: OcrResult[];
  placements: PdfImagePlacement[];
  onProgress?: (progress: TextOverlayProgress) => void;
  signal?: AbortSignal;
};

type TransformedWord = {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
};

const MIN_FONT_SIZE = 2.5;
const MAX_FONT_SIZE = 72;
const TEXT_OPACITY = 0.01;

export async function addSearchableTextLayer(
  pdf: PDFDocument,
  options: TextOverlayOptions,
) {
  const { ocrResults, placements, onProgress, signal } = options;

  if (!ocrResults.length) {
    throw new PdfEngineError("PROCESSING_FAILED", "No OCR results available for text overlay.");
  }

  if (!placements.length) {
    throw new PdfEngineError("PROCESSING_FAILED", "No image placement data available for OCR overlay.");
  }

  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const placementByPageIndex = new Map(placements.map((placement) => [placement.pageIndex, placement]));
  const totalWords = ocrResults.reduce((sum, result) => sum + result.words.length, 0);

  let processedWords = 0;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    throwIfAborted(signal);

    const ocrResult = ocrResults[pageIndex];
    const placement = placementByPageIndex.get(pageIndex);
    const page = pages[pageIndex];

    if (!ocrResult || !placement || !page) continue;

    const words = transformOcrWordsToPdfSpace(ocrResult.words, ocrResult.imageData, placement);

    for (const word of words) {
      throwIfAborted(signal);

      drawInvisibleSearchableWord(page, font, word);
      processedWords += 1;

      if (processedWords % 25 === 0 || processedWords === totalWords) {
        reportOverlayProgress(onProgress, {
          stage: "overlay",
          pageIndex: pageIndex + 1,
          totalPages: pages.length,
          wordsProcessed: processedWords,
          totalWords,
          percent: totalWords ? (processedWords / totalWords) * 100 : 100,
          message: `Adding searchable text layer: ${processedWords}/${totalWords} words...`,
        });
      }
    }
  }

  reportOverlayProgress(onProgress, {
    stage: "overlay",
    pageIndex: pages.length,
    totalPages: pages.length,
    wordsProcessed: processedWords,
    totalWords,
    percent: 100,
    message: "Searchable text layer added.",
  });

  return pdf;
}

export function transformOcrWordsToPdfSpace(
  words: OcrWord[],
  imageData: { width: number; height: number },
  placement: PdfImagePlacement,
): TransformedWord[] {
  const imageWidth = Math.max(1, imageData.width || placement.imageWidth);
  const imageHeight = Math.max(1, imageData.height || placement.imageHeight);
  const scaleX = placement.drawWidth / imageWidth;
  const scaleY = placement.drawHeight / imageHeight;

  return words
    .map((word) => {
      const safeText = sanitizePdfText(word.text);

      if (!safeText) return null;

      const bboxWidth = Math.max(1, word.bbox.x1 - word.bbox.x0);
      const bboxHeight = Math.max(1, word.bbox.y1 - word.bbox.y0);

      const x = placement.drawX + word.bbox.x0 * scaleX;
      const yFromTop = word.bbox.y1 * scaleY;
      const y = placement.drawY + placement.drawHeight - yFromTop;
      const width = bboxWidth * scaleX;
      const height = bboxHeight * scaleY;
      const fontSize = clamp(height * 0.82, MIN_FONT_SIZE, MAX_FONT_SIZE);

      return {
        text: safeText,
        confidence: word.confidence,
        x,
        y,
        width,
        height,
        fontSize,
      };
    })
    .filter((word): word is TransformedWord => Boolean(word));
}

function drawInvisibleSearchableWord(page: PDFPage, font: PDFFont, word: TransformedWord) {
  const pageSize = page.getSize();
  const safeX = clamp(word.x, 0, pageSize.width);
  const safeY = clamp(word.y, 0, pageSize.height);
  const safeFontSize = clamp(word.fontSize, MIN_FONT_SIZE, MAX_FONT_SIZE);

  if (!word.text.trim()) return;

  try {
    page.drawText(word.text, {
      x: safeX,
      y: safeY,
      size: safeFontSize,
      font,
      color: rgb(0, 0, 0),
      opacity: TEXT_OPACITY,
    });
  } catch {
    const fallbackText = word.text.replace(/[^\x20-\x7E]/g, "").trim();

    if (!fallbackText) return;

    page.drawText(fallbackText, {
      x: safeX,
      y: safeY,
      size: safeFontSize,
      font,
      color: rgb(0, 0, 0),
      opacity: TEXT_OPACITY,
    });
  }
}

function sanitizePdfText(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u0000/g, "")
    .trim();
}

function reportOverlayProgress(
  callback: ((progress: TextOverlayProgress) => void) | undefined,
  progress: TextOverlayProgress,
) {
  callback?.({
    ...progress,
    percent: Math.round(clamp(progress.percent, 0, 100)),
  });
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;

  throw new PdfEngineError("PROCESSING_FAILED", "OCR cancelled.");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
