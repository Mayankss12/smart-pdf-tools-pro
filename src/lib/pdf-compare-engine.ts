import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";

export const PDF_COMPARE_MAX_FILE_MB = 100;
export const PDF_COMPARE_MAX_PAGES = 80;
const MAX_RENDER_PIXELS = 1_600_000;

export type TextDifference = {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly unchangedTokens: number;
  readonly similarity: number;
};

export type PdfPageComparison = {
  readonly pageNumber: number;
  readonly status: "same" | "changed" | "added" | "removed";
  readonly visualDifferencePercent: number;
  readonly textDifference: TextDifference;
  readonly originalPreview: string | null;
  readonly revisedPreview: string | null;
  readonly differencePreview: string | null;
};

export type PdfComparisonResult = {
  readonly originalName: string;
  readonly revisedName: string;
  readonly originalPages: number;
  readonly revisedPages: number;
  readonly changedPages: number;
  readonly averageVisualDifferencePercent: number;
  readonly pages: readonly PdfPageComparison[];
  readonly generatedAt: string;
};

function normalizeTokens(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => token.toLocaleLowerCase())
    .filter(Boolean)
    .slice(0, 5_000);
}

function tokenCounts(tokens: readonly string[]) {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

export function compareTextContent(original: string, revised: string): TextDifference {
  const originalTokens = normalizeTokens(original);
  const revisedTokens = normalizeTokens(revised);
  const originalCounts = tokenCounts(originalTokens);
  const revisedCounts = tokenCounts(revisedTokens);
  const added: string[] = [];
  const removed: string[] = [];
  let unchangedTokens = 0;

  for (const [token, count] of originalCounts) {
    const shared = Math.min(count, revisedCounts.get(token) ?? 0);
    unchangedTokens += shared;
    for (let index = shared; index < count && removed.length < 80; index += 1) removed.push(token);
  }
  for (const [token, count] of revisedCounts) {
    const shared = Math.min(count, originalCounts.get(token) ?? 0);
    for (let index = shared; index < count && added.length < 80; index += 1) added.push(token);
  }

  const denominator = Math.max(1, originalTokens.length + revisedTokens.length);
  return {
    added,
    removed,
    unchangedTokens,
    similarity: Math.round((2 * unchangedTokens * 10_000) / denominator) / 100,
  };
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("PDF comparison cancelled.", "AbortError");
}

async function renderPage(page: import("pdfjs-dist").PDFPageProxy) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(1.25, Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, base.width * base.height)));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", { alpha: false, willReadFrequently: true });
  if (!context) throw new Error("Unable to create the comparison canvas.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  const text = (await page.getTextContent()).items
    .flatMap((item) => ("str" in item ? [item.str] : []))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return { canvas, text };
}

function preview(canvas: HTMLCanvasElement, type = "image/jpeg") {
  return canvas.toDataURL(type, type === "image/jpeg" ? 0.78 : undefined);
}

function compareCanvases(
  original: HTMLCanvasElement,
  revised: HTMLCanvasElement,
  threshold: number,
) {
  const width = Math.max(original.width, revised.width);
  const height = Math.max(original.height, revised.height);
  const first = document.createElement("canvas");
  const second = document.createElement("canvas");
  const difference = document.createElement("canvas");
  for (const canvas of [first, second, difference]) {
    canvas.width = width;
    canvas.height = height;
  }
  const firstContext = first.getContext("2d", { willReadFrequently: true });
  const secondContext = second.getContext("2d", { willReadFrequently: true });
  const differenceContext = difference.getContext("2d", { willReadFrequently: true });
  if (!firstContext || !secondContext || !differenceContext) {
    throw new Error("Unable to compare these PDF pages.");
  }
  firstContext.fillStyle = secondContext.fillStyle = "#ffffff";
  firstContext.fillRect(0, 0, width, height);
  secondContext.fillRect(0, 0, width, height);
  firstContext.drawImage(original, 0, 0);
  secondContext.drawImage(revised, 0, 0);
  const firstPixels = firstContext.getImageData(0, 0, width, height);
  const secondPixels = secondContext.getImageData(0, 0, width, height);
  const output = differenceContext.createImageData(width, height);
  let changed = 0;
  const total = width * height;

  for (let offset = 0; offset < firstPixels.data.length; offset += 4) {
    const delta = Math.max(
      Math.abs(firstPixels.data[offset] - secondPixels.data[offset]),
      Math.abs(firstPixels.data[offset + 1] - secondPixels.data[offset + 1]),
      Math.abs(firstPixels.data[offset + 2] - secondPixels.data[offset + 2]),
    );
    if (delta > threshold) {
      changed += 1;
      output.data[offset] = 225;
      output.data[offset + 1] = 29;
      output.data[offset + 2] = 72;
      output.data[offset + 3] = 220;
    } else {
      const gray = Math.round((firstPixels.data[offset] + firstPixels.data[offset + 1] + firstPixels.data[offset + 2]) / 3);
      output.data[offset] = gray;
      output.data[offset + 1] = gray;
      output.data[offset + 2] = gray;
      output.data[offset + 3] = 70;
    }
  }
  differenceContext.putImageData(output, 0, 0);
  return {
    percent: Math.round((changed * 10_000) / Math.max(1, total)) / 100,
    preview: preview(difference, "image/png"),
  };
}

export async function comparePdfFiles(
  originalFile: File,
  revisedFile: File,
  options: {
    readonly sensitivity?: "strict" | "balanced" | "relaxed";
    readonly signal?: AbortSignal;
    readonly onProgress?: (completed: number, total: number, message: string) => void;
  } = {},
): Promise<PdfComparisonResult> {
  const pdfjs = await import("pdfjs-dist");
  configurePdfJsWorker(pdfjs);
  const [originalBytes, revisedBytes] = await Promise.all([
    readValidatedPdfBytes(originalFile, PDF_COMPARE_MAX_FILE_MB),
    readValidatedPdfBytes(revisedFile, PDF_COMPARE_MAX_FILE_MB),
  ]);
  const originalTask = pdfjs.getDocument({ data: originalBytes.slice() });
  const revisedTask = pdfjs.getDocument({ data: revisedBytes.slice() });
  const [original, revised] = await Promise.all([originalTask.promise, revisedTask.promise]);
  const originalPages = original.numPages;
  const revisedPages = revised.numPages;
  const total = Math.max(originalPages, revisedPages);
  if (total > PDF_COMPARE_MAX_PAGES) {
    await Promise.allSettled([original.destroy(), revised.destroy()]);
    throw new Error(`PDF comparison supports up to ${PDF_COMPARE_MAX_PAGES} pages per document.`);
  }
  const threshold = options.sensitivity === "strict" ? 10 : options.sensitivity === "relaxed" ? 46 : 24;
  const pages: PdfPageComparison[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= total; pageNumber += 1) {
      assertNotAborted(options.signal);
      options.onProgress?.(pageNumber - 1, total, `Comparing page ${pageNumber} of ${total}…`);
      const originalPage = pageNumber <= originalPages ? await original.getPage(pageNumber) : null;
      const revisedPage = pageNumber <= revisedPages ? await revised.getPage(pageNumber) : null;
      if (!originalPage || !revisedPage) {
        const rendered = await renderPage((originalPage ?? revisedPage)!);
        pages.push({
          pageNumber,
          status: originalPage ? "removed" : "added",
          visualDifferencePercent: 100,
          textDifference: compareTextContent(originalPage ? rendered.text : "", revisedPage ? rendered.text : ""),
          originalPreview: originalPage ? preview(rendered.canvas) : null,
          revisedPreview: revisedPage ? preview(rendered.canvas) : null,
          differencePreview: null,
        });
        rendered.canvas.width = rendered.canvas.height = 0;
        originalPage?.cleanup();
        revisedPage?.cleanup();
        continue;
      }
      const [originalRendered, revisedRendered] = await Promise.all([
        renderPage(originalPage),
        renderPage(revisedPage),
      ]);
      const visual = compareCanvases(originalRendered.canvas, revisedRendered.canvas, threshold);
      const textDifference = compareTextContent(originalRendered.text, revisedRendered.text);
      const changed = visual.percent >= 0.05 || textDifference.added.length > 0 || textDifference.removed.length > 0;
      pages.push({
        pageNumber,
        status: changed ? "changed" : "same",
        visualDifferencePercent: visual.percent,
        textDifference,
        originalPreview: preview(originalRendered.canvas),
        revisedPreview: preview(revisedRendered.canvas),
        differencePreview: visual.preview,
      });
      originalRendered.canvas.width = originalRendered.canvas.height = 0;
      revisedRendered.canvas.width = revisedRendered.canvas.height = 0;
      originalPage.cleanup();
      revisedPage.cleanup();
    }
  } finally {
    await Promise.allSettled([original.destroy(), revised.destroy()]);
  }
  options.onProgress?.(total, total, "Comparison complete.");
  const changedPages = pages.filter((page) => page.status !== "same").length;
  return {
    originalName: originalFile.name,
    revisedName: revisedFile.name,
    originalPages,
    revisedPages,
    changedPages,
    averageVisualDifferencePercent:
      Math.round((pages.reduce((sum, page) => sum + page.visualDifferencePercent, 0) * 100) / Math.max(1, pages.length)) / 100,
    pages,
    generatedAt: new Date().toISOString(),
  };
}

export function serializePdfComparison(result: PdfComparisonResult) {
  return JSON.stringify(
    {
      ...result,
      pages: result.pages.map(({ originalPreview: _original, revisedPreview: _revised, differencePreview: _difference, ...page }) => page),
    },
    null,
    2,
  );
}
