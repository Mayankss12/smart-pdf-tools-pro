import * as pdfjsLib from "pdfjs-dist";

import { PdfEngineError } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import {
  extractPdfTextContent,
  type PdfTextExtractionProgress,
} from "@/lib/conversions/pdf-text-engine";
import {
  createDocxFromPdfText,
  createPptxFromPageImages,
  createXlsxFromPdfText,
  type PptxPageImage,
} from "@/lib/conversions/office-open-xml";
import type { OcrLanguage, OcrQuality } from "@/lib/pdf-ocr-engine";

export type PdfOfficeFormat = "docx" | "xlsx" | "pptx";

export type PdfOfficeProgress = {
  readonly completed: number;
  readonly total: number;
  readonly message: string;
};

export type PdfOfficeResult = {
  readonly bytes: Uint8Array;
  readonly pageCount: number;
  readonly ocrPageCount: number;
};

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PdfEngineError("PROCESSING_FAILED", "PDF Office conversion cancelled.");
  }
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new PdfEngineError("PROCESSING_FAILED", "Unable to render a PDF page for PowerPoint."));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png");
  });
}

async function renderPdfPagesForPptx(
  file: File,
  options: {
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfOfficeProgress) => void;
  },
) {
  configurePdfJsWorker(pdfjsLib);
  const bytes = await readValidatedPdfBytes(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const images: PptxPageImage[] = [];
  const scale = 1.45;
  const maxPixels = 20_000_000;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(options.signal);
      options.onProgress?.({
        completed: pageNumber - 1,
        total: pdf.numPages,
        message: `Rendering page ${pageNumber} of ${pdf.numPages} for PowerPoint...`,
      });
      const page = await pdf.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        if (width * height > maxPixels) {
          throw new PdfEngineError(
            "PROCESSING_FAILED",
            `Page ${pageNumber} is too large to render safely in this browser.`,
          );
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) {
          throw new PdfEngineError("PROCESSING_FAILED", "This browser cannot create a page canvas.");
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        const task = page.render({ canvasContext: context, viewport });
        const cancel = () => task.cancel();
        options.signal?.addEventListener("abort", cancel, { once: true });
        try {
          await task.promise;
          throwIfAborted(options.signal);
          images.push({ bytes: await canvasToPng(canvas), width, height });
        } finally {
          options.signal?.removeEventListener("abort", cancel);
          canvas.width = 0;
          canvas.height = 0;
        }
      } finally {
        page.cleanup();
      }
      options.onProgress?.({
        completed: pageNumber,
        total: pdf.numPages,
        message: `Prepared slide ${pageNumber} of ${pdf.numPages}.`,
      });
    }
    return { images, pageCount: pdf.numPages };
  } finally {
    await pdf.destroy();
  }
}

export async function convertPdfToOffice(
  file: File,
  format: PdfOfficeFormat,
  options: {
    readonly ocrFallback: boolean;
    readonly ocrLanguage: OcrLanguage;
    readonly ocrQuality: OcrQuality;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfOfficeProgress) => void;
  },
): Promise<PdfOfficeResult> {
  if (format === "pptx") {
    const rendered = await renderPdfPagesForPptx(file, options);
    options.onProgress?.({
      completed: rendered.pageCount,
      total: rendered.pageCount,
      message: "Packaging a valid PowerPoint presentation...",
    });
    return {
      bytes: createPptxFromPageImages(rendered.images),
      pageCount: rendered.pageCount,
      ocrPageCount: 0,
    };
  }

  const extracted = await extractPdfTextContent(file, {
    ocrFallback: options.ocrFallback,
    ocrLanguage: options.ocrLanguage,
    ocrQuality: options.ocrQuality,
    signal: options.signal,
    onProgress(progress: PdfTextExtractionProgress) {
      options.onProgress?.({
        completed: progress.completed,
        total: progress.total,
        message: progress.message,
      });
    },
  });
  throwIfAborted(options.signal);
  options.onProgress?.({
    completed: extracted.pageCount,
    total: extracted.pageCount,
    message: `Packaging a valid ${format.toUpperCase()} file...`,
  });
  return {
    bytes:
      format === "docx"
        ? createDocxFromPdfText(extracted)
        : createXlsxFromPdfText(extracted),
    pageCount: extracted.pageCount,
    ocrPageCount: extracted.ocrPageCount,
  };
}
