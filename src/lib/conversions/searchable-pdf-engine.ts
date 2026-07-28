import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument } from "pdf-lib";

import { PdfEngineError } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import {
  runOcrPipeline,
  type OcrLanguage,
  type OcrQuality,
  type OcrResult,
} from "@/lib/pdf-ocr-engine";
import {
  addSearchableTextLayer,
  type PdfImagePlacement,
} from "@/lib/pdf-text-overlay";
import { getEditorPageGeometry } from "@/lib/pdf-tools/editor-page-geometry";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

export interface SearchablePdfProgress {
  readonly stage: "render" | "ocr" | "overlay";
  readonly completed: number;
  readonly total: number;
  readonly message: string;
}

const OCR_SCALE = 150 / 72;
const MAX_CANVAS_PIXELS = 24_000_000;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "Searchable PDF conversion cancelled.",
    );
  }
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to prepare a PDF page for OCR."));
    }, "image/png");
  });
}

async function renderPage(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  signal?: AbortSignal,
) {
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: OCR_SCALE });
    const pixelArea = Math.ceil(viewport.width) * Math.ceil(viewport.height);
    if (pixelArea > MAX_CANVAS_PIXELS) {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        `Page ${pageNumber} exceeds the safe browser OCR pixel limit.`,
      );
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) {
      canvas.width = 0;
      canvas.height = 0;
      throw new PdfEngineError("PROCESSING_FAILED", "Unable to create the OCR rendering canvas.");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const renderTask = page.render({ canvasContext: context, viewport });
    const cancel = () => renderTask.cancel();
    signal?.addEventListener("abort", cancel, { once: true });
    try {
      await renderTask.promise;
      throwIfAborted(signal);
      const blob = await canvasToBlob(canvas);
      return new File([blob], `pdf-page-${pageNumber}.png`, {
        type: "image/png",
      });
    } finally {
      signal?.removeEventListener("abort", cancel);
      canvas.width = 0;
      canvas.height = 0;
    }
  } finally {
    page.cleanup();
  }
}

export async function createSearchablePdf(
  file: File,
  options: {
    readonly targetPages: readonly number[];
    readonly language: OcrLanguage;
    readonly quality: OcrQuality;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: SearchablePdfProgress) => void;
  },
) {
  if (!options.targetPages.length) {
    throw new PdfEngineError(
      "INVALID_PAGE_RANGE",
      "Select at least one page for OCR.",
    );
  }

  configurePdfJsWorker(pdfjsLib);
  const bytes = await readValidatedPdfBytes(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const renderPdf = await loadingTask.promise;
  const targetPages = [...new Set(options.targetPages)].sort(
    (left, right) => left - right,
  );
  const invalidPage = targetPages.find(
    (pageNumber) =>
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > renderPdf.numPages,
  );
  if (invalidPage !== undefined) {
    await renderPdf.destroy();
    throw new PdfEngineError(
      "INVALID_PAGE_RANGE",
      `Page ${invalidPage} is outside this PDF's page range.`,
    );
  }

  const images: File[] = [];
  try {
    for (let index = 0; index < targetPages.length; index += 1) {
      throwIfAborted(options.signal);
      const pageNumber = targetPages[index];
      options.onProgress?.({
        stage: "render",
        completed: index,
        total: targetPages.length,
        message: `Rendering page ${pageNumber} for OCR...`,
      });
      images.push(await renderPage(renderPdf, pageNumber, options.signal));
      options.onProgress?.({
        stage: "render",
        completed: index + 1,
        total: targetPages.length,
        message: `Rendered ${index + 1} of ${targetPages.length} pages.`,
      });
    }
  } finally {
    await renderPdf.destroy();
  }

  const selectedResults = await runOcrPipeline(images, {
    language: options.language,
    quality: options.quality,
    signal: options.signal,
    onProgress(progress) {
      options.onProgress?.({
        stage: "ocr",
        completed: progress.imageIndex,
        total: progress.totalImages,
        message: progress.message,
      });
    },
  });

  throwIfAborted(options.signal);
  const outputPdf = await PDFDocument.load(bytes);
  const pages = outputPdf.getPages();
  const ocrResults: Array<OcrResult | undefined> = Array.from({
    length: pages.length,
  });
  const placements: PdfImagePlacement[] = [];

  for (let index = 0; index < targetPages.length; index += 1) {
    const pageIndex = targetPages[index] - 1;
    const result = selectedResults[index];
    const page = pages[pageIndex];
    if (!result || !page) continue;
    const geometry = getEditorPageGeometry(page);
    ocrResults[pageIndex] = result;
    placements.push({
      pageIndex,
      imageWidth: result.imageData.width,
      imageHeight: result.imageData.height,
      drawX: 0,
      drawY: 0,
      drawWidth: geometry.viewportWidth,
      drawHeight: geometry.viewportHeight,
      pageWidth: page.getWidth(),
      pageHeight: page.getHeight(),
    });
  }

  await addSearchableTextLayer(outputPdf, {
    ocrResults,
    placements,
    signal: options.signal,
    onProgress(progress) {
      options.onProgress?.({
        stage: "overlay",
        completed: progress.wordsProcessed,
        total: Math.max(1, progress.totalWords),
        message: progress.message,
      });
    },
  });

  const outputBytes = await outputPdf.save();
  return {
    bytes: outputBytes,
    pageCount: pages.length,
    ocrPageCount: targetPages.length,
    wordCount: selectedResults.reduce(
      (sum, result) => sum + result.words.length,
      0,
    ),
  };
}
