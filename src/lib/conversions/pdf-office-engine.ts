import * as pdfjsLib from "pdfjs-dist";

import { PdfEngineError } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import {
  extractPdfTextContent,
  type PdfTextExtractionProgress,
} from "@/lib/conversions/pdf-text-engine";
import {
  createEditableLayoutDocx,
  createDocxFromPageImages,
  createDocxFromPdfText,
  createPptxFromPageImages,
  createXlsxFromPdfText,
  type DocxPageImage,
  type EditableDocxPage,
  type EditableDocxTextBox,
} from "@/lib/conversions/office-open-xml";
import {
  runOcrPipeline,
  type OcrLanguage,
  type OcrQuality,
} from "@/lib/pdf-ocr-engine";

export type PdfOfficeFormat = "docx" | "xlsx" | "pptx";
export type PdfDocxMode = "editable-layout" | "preserve-layout" | "editable-text";

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
        reject(new PdfEngineError("PROCESSING_FAILED", "Unable to render this PDF page for the Office document."));
        return;
      }
      void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
    }, "image/png");
  });
}

type PdfJsTextItem = {
  readonly str: string;
  readonly dir: string;
  readonly width: number;
  readonly height: number;
  readonly transform: readonly number[];
  readonly fontName: string;
};

type PdfJsFont = {
  readonly name?: string;
  readonly fallbackName?: string;
};

type PendingEditableTextBox = Omit<EditableDocxTextBox, "color">;

function median(values: readonly number[]) {
  if (values.length === 0) return 255;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function rgbHex(red: number, green: number, blue: number) {
  return [red, green, blue]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function pixelAt(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const offset = (y * width + x) * 4;
  return [data[offset], data[offset + 1], data[offset + 2]] as const;
}

function sampleBackgroundColor(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const reds: number[] = [];
  const greens: number[] = [];
  const blues: number[] = [];
  const add = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) return;
    const [red, green, blue] = pixelAt(data, canvasWidth, x, y);
    reds.push(red);
    greens.push(green);
    blues.push(blue);
  };
  const horizontalStep = Math.max(1, Math.floor((right - left) / 12));
  const verticalStep = Math.max(1, Math.floor((bottom - top) / 6));
  for (let x = left; x <= right; x += horizontalStep) {
    add(x, top - 2);
    add(x, bottom + 2);
  }
  for (let y = top; y <= bottom; y += verticalStep) {
    add(left - 2, y);
    add(right + 2, y);
  }
  return [median(reds), median(greens), median(blues)] as const;
}

function sampleTextColor(
  data: Uint8ClampedArray,
  canvasWidth: number,
  canvasHeight: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
) {
  const pixels: Array<{ red: number; green: number; blue: number; luminance: number }> = [];
  const step = Math.max(1, Math.floor(Math.min(right - left, bottom - top) / 8));
  for (let y = top; y <= bottom; y += step) {
    for (let x = left; x <= right; x += step) {
      if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) continue;
      const [red, green, blue] = pixelAt(data, canvasWidth, x, y);
      pixels.push({ red, green, blue, luminance: red * 0.2126 + green * 0.7152 + blue * 0.0722 });
    }
  }
  if (pixels.length === 0) return "111827";
  pixels.sort((leftPixel, rightPixel) => leftPixel.luminance - rightPixel.luminance);
  const darkest = pixels.slice(0, Math.max(1, Math.ceil(pixels.length * 0.12)));
  return rgbHex(
    median(darkest.map((pixel) => pixel.red)),
    median(darkest.map((pixel) => pixel.green)),
    median(darkest.map((pixel) => pixel.blue)),
  );
}

function eraseTextFromCanvas(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  textBoxes: readonly PendingEditableTextBox[],
  scale: number,
) {
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const colors: string[] = [];

  textBoxes.forEach((textBox) => {
    const padding = Math.max(1, Math.round(textBox.fontSize * scale * 0.08));
    const left = Math.max(0, Math.floor(textBox.x * scale) - padding);
    const top = Math.max(0, Math.floor(textBox.top * scale) - padding);
    const right = Math.min(canvas.width - 1, Math.ceil((textBox.x + textBox.width) * scale) + padding);
    const bottom = Math.min(canvas.height - 1, Math.ceil((textBox.top + textBox.height) * scale) + padding);
    colors.push(sampleTextColor(image.data, canvas.width, canvas.height, left, top, right, bottom));
    const [red, green, blue] = sampleBackgroundColor(
      image.data,
      canvas.width,
      canvas.height,
      left,
      top,
      right,
      bottom,
    );
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const offset = (y * canvas.width + x) * 4;
        image.data[offset] = red;
        image.data[offset + 1] = green;
        image.data[offset + 2] = blue;
        image.data[offset + 3] = 255;
      }
    }
  });

  context.putImageData(image, 0, 0);
  return colors;
}

function fontDetails(font: PdfJsFont | undefined, fallbackFamily: string) {
  const name = font?.name || fallbackFamily || "Arial";
  const clean = name.replace(/^[A-Z]{6}\+/, "");
  return {
    family: clean.replace(/-(Bold|Black|Semibold|Demi|Italic|Oblique|Regular).*$/i, "") || "Arial",
    bold: /(Bold|Black|Semibold|Demi)/i.test(clean),
    italic: /(Italic|Oblique)/i.test(clean),
  };
}

function nativeEditableTextBoxes(
  page: pdfjsLib.PDFPageProxy,
  content: Awaited<ReturnType<pdfjsLib.PDFPageProxy["getTextContent"]>>,
  pageHeight: number,
) {
  return content.items.flatMap((rawItem): PendingEditableTextBox[] => {
    if (!("str" in rawItem)) return [];
    const item = rawItem as PdfJsTextItem;
    if (!item.str.trim() || item.transform.length < 6) return [];
    const fontSize = Math.max(2, Math.hypot(item.transform[0], item.transform[1]) || item.height || 10);
    const rotation = Math.atan2(item.transform[1], item.transform[0]) * 180 / Math.PI;
    let font: PdfJsFont | undefined;
    try {
      font = page.commonObjs.get(item.fontName) as PdfJsFont;
    } catch {
      font = undefined;
    }
    const style = content.styles[item.fontName];
    const details = fontDetails(font, style?.fontFamily || "Arial");
    const height = Math.max(fontSize * 1.18, item.height || fontSize);
    const top = pageHeight - item.transform[5] - fontSize * 0.8;
    return [{
      text: item.str,
      x: item.transform[4],
      top: Math.max(0, top),
      width: Math.max(fontSize * 0.6, item.width + fontSize * 0.28),
      height,
      fontSize,
      fontFamily: details.family,
      bold: details.bold,
      italic: details.italic,
      direction: item.dir === "rtl" ? "rtl" : "ltr",
      rotation,
    }];
  });
}

function ocrEditableTextBoxes(
  words: Awaited<ReturnType<typeof runOcrPipeline>>[number]["words"],
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
) {
  return words.map((word): PendingEditableTextBox => {
    const x = word.bbox.x0 / imageWidth * pageWidth;
    const top = word.bbox.y0 / imageHeight * pageHeight;
    const width = Math.max(2, (word.bbox.x1 - word.bbox.x0) / imageWidth * pageWidth);
    const height = Math.max(3, (word.bbox.y1 - word.bbox.y0) / imageHeight * pageHeight);
    return {
      text: word.text,
      x,
      top,
      width: width + Math.max(1, height * 0.2),
      height: height * 1.15,
      fontSize: Math.max(4, height * 0.82),
      fontFamily: "Arial",
      bold: false,
      italic: false,
      direction: /[\u0590-\u08ff]/.test(word.text) ? "rtl" : "ltr",
      rotation: 0,
    };
  });
}

async function renderPdfPagesForEditableWord(
  file: File,
  options: {
    readonly ocrFallback: boolean;
    readonly ocrLanguage: OcrLanguage;
    readonly ocrQuality: OcrQuality;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfOfficeProgress) => void;
  },
) {
  configurePdfJsWorker(pdfjsLib);
  const bytes = await readValidatedPdfBytes(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const pages: EditableDocxPage[] = [];
  const targetScale = 300 / 72;
  const maxPixels = 20_000_000;
  const maxTotalImageBytes = 180 * 1024 * 1024;
  let totalImageBytes = 0;
  let ocrPageCount = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(options.signal);
      options.onProgress?.({
        completed: pageNumber - 1,
        total: pdf.numPages,
        message: `Reconstructing editable page ${pageNumber} of ${pdf.numPages}...`,
      });
      const page = await pdf.getPage(pageNumber);
      try {
        const pageViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          targetScale,
          Math.sqrt(maxPixels / Math.max(1, pageViewport.width * pageViewport.height)),
        );
        const viewport = page.getViewport({ scale });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        if (width * height > maxPixels) {
          throw new PdfEngineError("PROCESSING_FAILED", `Page ${pageNumber} is too large to reconstruct safely in this browser.`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
        if (!context) {
          throw new PdfEngineError("PROCESSING_FAILED", "This browser cannot create an editable Word page canvas.");
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        const renderTask = page.render({ canvasContext: context, viewport });
        const cancel = () => renderTask.cancel();
        options.signal?.addEventListener("abort", cancel, { once: true });
        try {
          const [, content] = await Promise.all([renderTask.promise, page.getTextContent()]);
          throwIfAborted(options.signal);
          await page.getOperatorList();
          let textBoxes = nativeEditableTextBoxes(page, content, pageViewport.height);
          const nativeTextLength = textBoxes.reduce((sum, textBox) => sum + textBox.text.trim().length, 0);

          if (options.ocrFallback && nativeTextLength < 12) {
            options.onProgress?.({
              completed: pageNumber - 1,
              total: pdf.numPages,
              message: `Locating editable OCR text on page ${pageNumber} of ${pdf.numPages}...`,
            });
            const image = await canvasToPng(canvas);
            const [ocrResult] = await runOcrPipeline([
              new File([image], `page-${pageNumber}.png`, { type: "image/png" }),
            ], {
              language: options.ocrLanguage,
              quality: options.ocrQuality,
              signal: options.signal,
            });
            if (ocrResult?.words.length) {
              textBoxes = ocrEditableTextBoxes(
                ocrResult.words,
                ocrResult.imageData.width,
                ocrResult.imageData.height,
                pageViewport.width,
                pageViewport.height,
              );
              ocrPageCount += 1;
            }
          }

          const colors = eraseTextFromCanvas(context, canvas, textBoxes, scale);
          const backgroundBytes = await canvasToPng(canvas);
          totalImageBytes += backgroundBytes.length;
          if (totalImageBytes > maxTotalImageBytes) {
            throw new PdfEngineError("PROCESSING_FAILED", "This PDF is too large to package safely in an editable-layout Word document.");
          }
          pages.push({
            background: {
              bytes: backgroundBytes,
              width,
              height,
              pageWidthPoints: pageViewport.width,
              pageHeightPoints: pageViewport.height,
            },
            textBoxes: textBoxes.map((textBox, index) => ({
              ...textBox,
              color: colors[index] || "111827",
            })),
          });
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
        message: `Prepared editable page ${pageNumber} of ${pdf.numPages}.`,
      });
    }
    return { pages, pageCount: pdf.numPages, ocrPageCount };
  } finally {
    await pdf.destroy();
  }
}

async function renderPdfPagesForOffice(
  file: File,
  purpose: "Word" | "PowerPoint",
  options: {
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfOfficeProgress) => void;
  },
) {
  configurePdfJsWorker(pdfjsLib);
  const bytes = await readValidatedPdfBytes(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const images: DocxPageImage[] = [];
  const targetScale = purpose === "Word" ? 300 / 72 : 1.45;
  const maxPixels = 20_000_000;
  const maxTotalImageBytes = 180 * 1024 * 1024;
  let totalImageBytes = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(options.signal);
      options.onProgress?.({
        completed: pageNumber - 1,
        total: pdf.numPages,
        message: `Rendering page ${pageNumber} of ${pdf.numPages} for ${purpose}...`,
      });
      const page = await pdf.getPage(pageNumber);
      try {
        const pageViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(
          targetScale,
          Math.sqrt(maxPixels / Math.max(1, pageViewport.width * pageViewport.height)),
        );
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
          const pngBytes = await canvasToPng(canvas);
          totalImageBytes += pngBytes.length;
          if (totalImageBytes > maxTotalImageBytes) {
            throw new PdfEngineError(
              "PROCESSING_FAILED",
              "This PDF is too large to package safely in a browser. Try a smaller file or the simple editable-text Word mode.",
            );
          }
          images.push({
            bytes: pngBytes,
            width,
            height,
            pageWidthPoints: pageViewport.width,
            pageHeightPoints: pageViewport.height,
          });
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
        message: `Prepared page ${pageNumber} of ${pdf.numPages} for ${purpose}.`,
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
    readonly docxMode?: PdfDocxMode;
    readonly ocrFallback: boolean;
    readonly ocrLanguage: OcrLanguage;
    readonly ocrQuality: OcrQuality;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfOfficeProgress) => void;
  },
): Promise<PdfOfficeResult> {
  if (format === "pptx") {
    const rendered = await renderPdfPagesForOffice(file, "PowerPoint", options);
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

  if (format === "docx" && (options.docxMode ?? "editable-layout") === "editable-layout") {
    const reconstructed = await renderPdfPagesForEditableWord(file, options);
    options.onProgress?.({
      completed: reconstructed.pageCount,
      total: reconstructed.pageCount,
      message: "Packaging editable text with the original page design...",
    });
    return {
      bytes: createEditableLayoutDocx(reconstructed.pages),
      pageCount: reconstructed.pageCount,
      ocrPageCount: reconstructed.ocrPageCount,
    };
  }

  if (format === "docx" && options.docxMode === "preserve-layout") {
    const rendered = await renderPdfPagesForOffice(file, "Word", options);
    options.onProgress?.({
      completed: rendered.pageCount,
      total: rendered.pageCount,
      message: "Packaging a layout-preserved Word document...",
    });
    return {
      bytes: createDocxFromPageImages(rendered.images),
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
