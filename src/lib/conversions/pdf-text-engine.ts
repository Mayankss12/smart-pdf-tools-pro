import * as pdfjsLib from "pdfjs-dist";

import { PdfEngineError } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import {
  runOcrPipeline,
  type OcrLanguage,
  type OcrQuality,
} from "@/lib/pdf-ocr-engine";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

export interface ExtractedPdfLine {
  readonly text: string;
  readonly fontSize: number;
  readonly direction: "ltr" | "rtl";
}

export interface ExtractedPdfPage {
  readonly pageNumber: number;
  readonly lines: readonly ExtractedPdfLine[];
  readonly usedOcr: boolean;
}

export interface PdfTextExtractionResult {
  readonly pages: readonly ExtractedPdfPage[];
  readonly pageCount: number;
  readonly ocrPageCount: number;
}

export interface PdfTextExtractionProgress {
  readonly completed: number;
  readonly total: number;
  readonly stage: "extracting" | "ocr";
  readonly message: string;
}

type PositionedText = {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly direction: "ltr" | "rtl";
};

type PdfJsTextItem = {
  readonly str: string;
  readonly dir: string;
  readonly transform: readonly number[];
};

const OCR_RENDER_SCALE = 150 / 72;
const MAX_OCR_CANVAS_PIXELS = 24_000_000;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "PDF text conversion cancelled.",
    );
  }
}

function textItemToPositioned(
  item: PdfJsTextItem,
): PositionedText | null {
  const text = item.str.replace(/\u0000/g, "").trim();
  if (!text) return null;

  const fontSize = Math.max(
    1,
    Math.hypot(item.transform[0], item.transform[1]),
  );
  return {
    text,
    x: item.transform[4],
    y: item.transform[5],
    fontSize,
    direction: item.dir === "rtl" ? "rtl" : "ltr",
  };
}

function groupTextIntoLines(items: readonly PositionedText[]) {
  const sorted = [...items].sort((left, right) => {
    const verticalDifference = right.y - left.y;
    if (Math.abs(verticalDifference) > 3) return verticalDifference;
    return left.x - right.x;
  });
  const rows: Array<{ y: number; items: PositionedText[] }> = [];

  for (const item of sorted) {
    const row = rows.find(
      (candidate) =>
        Math.abs(candidate.y - item.y) <= Math.max(2.5, item.fontSize * 0.25),
    );
    if (row) {
      row.items.push(item);
      row.y = (row.y + item.y) / 2;
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row): ExtractedPdfLine => {
      const direction = row.items.some((item) => item.direction === "rtl")
        ? "rtl"
        : "ltr";
      const ordered =
        direction === "rtl"
          ? [...row.items].sort((left, right) => right.x - left.x)
          : [...row.items].sort((left, right) => left.x - right.x);

      return {
        text: ordered.map((item) => item.text).join(" ").replace(/\s+/g, " "),
        fontSize: Math.max(...ordered.map((item) => item.fontSize)),
        direction,
      };
    })
    .filter((line) => line.text.trim().length > 0);
}

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new PdfEngineError("PROCESSING_FAILED", "Unable to prepare the page for OCR."));
    }, "image/png");
  });
}

async function renderPageForOcr(
  page: pdfjsLib.PDFPageProxy,
  pageNumber: number,
  signal?: AbortSignal,
) {
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
  const pixelArea = Math.ceil(viewport.width) * Math.ceil(viewport.height);
  if (pixelArea > MAX_OCR_CANVAS_PIXELS) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      `Page ${pageNumber} is too large for safe browser OCR at 150 DPI.`,
    );
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) {
    canvas.width = 0;
    canvas.height = 0;
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This browser could not create an OCR canvas.",
    );
  }
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderTask = page.render({ canvasContext: context, viewport });
  const cancel = () => renderTask.cancel();
  signal?.addEventListener("abort", cancel, { once: true });

  try {
    await renderTask.promise;
    throwIfAborted(signal);
    const blob = await canvasToPng(canvas);
    return new File([blob], `page-${pageNumber}.png`, {
      type: "image/png",
    });
  } finally {
    signal?.removeEventListener("abort", cancel);
    canvas.width = 0;
    canvas.height = 0;
  }
}

export async function extractPdfTextContent(
  file: File,
  options: {
    readonly ocrFallback: boolean;
    readonly ocrLanguage: OcrLanguage;
    readonly ocrQuality: OcrQuality;
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: PdfTextExtractionProgress) => void;
  },
): Promise<PdfTextExtractionResult> {
  configurePdfJsWorker(pdfjsLib);
  const bytes = await readValidatedPdfBytes(file);
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await loadingTask.promise;
  const pages: ExtractedPdfPage[] = [];
  let ocrPageCount = 0;

  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      throwIfAborted(options.signal);
      options.onProgress?.({
        completed: pageNumber - 1,
        total: pdf.numPages,
        stage: "extracting",
        message: `Extracting native text from page ${pageNumber} of ${pdf.numPages}...`,
      });

      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const positioned = content.items
          .flatMap((item) =>
            "str" in item ? [textItemToPositioned(item)] : [],
          )
          .filter((item): item is PositionedText => item !== null);
        let lines = groupTextIntoLines(positioned);
        let usedOcr = false;
        const nativeLength = lines.reduce(
          (sum, line) => sum + line.text.length,
          0,
        );

        if (options.ocrFallback && nativeLength < 12) {
          options.onProgress?.({
            completed: pageNumber - 1,
            total: pdf.numPages,
            stage: "ocr",
            message: `Running OCR on scan-like page ${pageNumber} of ${pdf.numPages}...`,
          });
          const image = await renderPageForOcr(
            page,
            pageNumber,
            options.signal,
          );
          const [ocrResult] = await runOcrPipeline([image], {
            language: options.ocrLanguage,
            quality: options.ocrQuality,
            signal: options.signal,
          });
          const ocrLines = ocrResult?.fullText
            .split(/\r?\n/)
            .map((text) => text.replace(/\s+/g, " ").trim())
            .filter(Boolean)
            .map(
              (text): ExtractedPdfLine => ({
                text,
                fontSize: 12,
                direction: /[\u0590-\u08ff]/.test(text) ? "rtl" : "ltr",
              }),
            );
          if (ocrLines?.length) {
            lines = ocrLines;
            usedOcr = true;
            ocrPageCount += 1;
          }
        }

        pages.push({ pageNumber, lines, usedOcr });
      } finally {
        page.cleanup();
      }

      options.onProgress?.({
        completed: pageNumber,
        total: pdf.numPages,
        stage: "extracting",
        message: `Processed page ${pageNumber} of ${pdf.numPages}.`,
      });
    }

    return {
      pages,
      pageCount: pdf.numPages,
      ocrPageCount,
    };
  } finally {
    await pdf.destroy();
  }
}

export function createPlainTextOutput(
  result: PdfTextExtractionResult,
  separator: "heading" | "form-feed" | "blank-lines",
) {
  const output = result.pages.map((page) =>
    page.lines.map((line) => line.text).join("\n"),
  );
  if (separator === "form-feed") return output.join("\n\f\n");
  if (separator === "blank-lines") return output.join("\n\n\n");
  return output
    .map((text, index) => `--- Page ${index + 1} ---\n${text}`)
    .join("\n\n");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function createSafeHtmlOutput(
  result: PdfTextExtractionResult,
  mode: "simple" | "layout",
) {
  const body = result.pages
    .map((page) => {
      const lines = page.lines
        .map((line) => {
          const safe = escapeHtml(line.text);
          const direction = line.direction === "rtl" ? ' dir="rtl"' : "";
          const heading =
            line.fontSize >= 16 && line.text.length <= 120;
          if (heading) return `<h2${direction}>${safe}</h2>`;
          if (mode === "layout") {
            const size = Math.round(
              Math.max(9, Math.min(32, line.fontSize)),
            );
            return `<p${direction} style="font-size:${size}px">${safe}</p>`;
          }
          return `<p${direction}>${safe}</p>`;
        })
        .join("\n");
      return `<section class="pdf-page" data-page="${page.pageNumber}">\n<h1>Page ${page.pageNumber}</h1>\n${lines}\n</section>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>PDFMantra PDF export</title>
<style>body{max-width:900px;margin:0 auto;padding:32px;font-family:system-ui,sans-serif;color:#111827}.pdf-page{padding:24px 0;border-bottom:1px solid #ddd}.pdf-page>h1{font-size:12px;color:#6b7280;text-transform:uppercase}p{white-space:pre-wrap;line-height:1.55;margin:.5em 0}h2{margin:1.2em 0 .5em}</style>
</head>
<body>
${body}
</body>
</html>`;
}
