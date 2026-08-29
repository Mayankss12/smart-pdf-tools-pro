import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";

export const PDF_COMPARE_MAX_FILE_MB = 100;
export const PDF_COMPARE_MAX_PAGES = 80;
const MAX_RENDER_PIXELS = 1_600_000;
const MAX_TEXT_TOKENS = 5_000;
const MAX_TEXT_LINES = 600;
const MAX_REPORTED_TOKENS = 80;
const MAX_REPORTED_LINE_CHANGES = 40;

export type TextLineChange = {
  readonly type: "added" | "removed" | "modified";
  readonly original: string | null;
  readonly revised: string | null;
  readonly similarity: number;
};

export type TextDifference = {
  readonly added: readonly string[];
  readonly removed: readonly string[];
  readonly unchangedTokens: number;
  readonly similarity: number;
  readonly changedLineCount: number;
  readonly lineChanges: readonly TextLineChange[];
};

export type PdfPageTextDescriptor = {
  readonly pageNumber: number;
  readonly text: string;
  readonly lines?: readonly string[];
};

export type PdfPageAlignment = {
  readonly originalPageNumber: number | null;
  readonly revisedPageNumber: number | null;
  readonly textSimilarity: number;
};

export type PdfPageComparison = {
  readonly pageNumber: number;
  readonly originalPageNumber: number | null;
  readonly revisedPageNumber: number | null;
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
  readonly comparedPagePairs: number;
  readonly unchangedPages: number;
  readonly changedPages: number;
  readonly addedPages: number;
  readonly removedPages: number;
  readonly averageTextSimilarity: number;
  readonly averageVisualDifferencePercent: number;
  readonly pages: readonly PdfPageComparison[];
  readonly generatedAt: string;
};

type ExtractedPageText = PdfPageTextDescriptor & {
  readonly lines: readonly string[];
};

function normalizeTokens(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .split(/\s+/)
    .map((token) => token.toLocaleLowerCase())
    .filter(Boolean)
    .slice(0, MAX_TEXT_TOKENS);
}

function normalizeLines(value: string | readonly string[]) {
  const source = typeof value === "string" ? value.split(/\r?\n/) : value;
  return source
    .map((line) => line.normalize("NFKC").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, MAX_TEXT_LINES);
}

function tokenCounts(tokens: readonly string[]) {
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return counts;
}

type TokenFingerprint = {
  readonly counts: ReadonlyMap<string, number>;
  readonly length: number;
};

function createTokenFingerprint(value: string): TokenFingerprint {
  const tokens = normalizeTokens(value);
  return { counts: tokenCounts(tokens), length: tokens.length };
}

function compareTokenFingerprints(
  original: TokenFingerprint,
  revised: TokenFingerprint,
) {
  if (!original.length && !revised.length) return 100;
  if (!original.length || !revised.length) return 0;
  let unchangedTokens = 0;
  for (const [token, count] of original.counts) {
    unchangedTokens += Math.min(count, revised.counts.get(token) ?? 0);
  }
  return (
    Math.round(
      (2 * unchangedTokens * 10_000) / (original.length + revised.length),
    ) / 100
  );
}

function calculateTokenSimilarity(original: string, revised: string) {
  return compareTokenFingerprints(
    createTokenFingerprint(original),
    createTokenFingerprint(revised),
  );
}

function buildLineChanges(
  originalValue: string | readonly string[],
  revisedValue: string | readonly string[],
) {
  const original = normalizeLines(originalValue);
  const revised = normalizeLines(revisedValue);
  const rows = original.length + 1;
  const columns = revised.length + 1;
  const lcs = Array.from({ length: rows }, () => new Uint16Array(columns));

  for (let first = original.length - 1; first >= 0; first -= 1) {
    for (let second = revised.length - 1; second >= 0; second -= 1) {
      lcs[first][second] =
        original[first].toLocaleLowerCase() === revised[second].toLocaleLowerCase()
          ? lcs[first + 1][second + 1] + 1
          : Math.max(lcs[first + 1][second], lcs[first][second + 1]);
    }
  }

  const raw: Array<{ type: "added" | "removed" | "same"; value: string }> = [];
  let first = 0;
  let second = 0;
  while (first < original.length || second < revised.length) {
    if (
      first < original.length &&
      second < revised.length &&
      original[first].toLocaleLowerCase() === revised[second].toLocaleLowerCase()
    ) {
      raw.push({ type: "same", value: original[first] });
      first += 1;
      second += 1;
    } else if (
      second < revised.length &&
      (first >= original.length || lcs[first][second + 1] >= lcs[first + 1][second])
    ) {
      raw.push({ type: "added", value: revised[second] });
      second += 1;
    } else if (first < original.length) {
      raw.push({ type: "removed", value: original[first] });
      first += 1;
    }
  }

  const allChanges: TextLineChange[] = [];
  for (let index = 0; index < raw.length; ) {
    if (raw[index].type === "same") {
      index += 1;
      continue;
    }
    const run: typeof raw = [];
    while (index < raw.length && raw[index].type !== "same") {
      run.push(raw[index]);
      index += 1;
    }
    const removed = run.filter((item) => item.type === "removed");
    const added = run.filter((item) => item.type === "added");
    const paired = Math.min(removed.length, added.length);
    for (let pair = 0; pair < paired; pair += 1) {
      const similarity = calculateTokenSimilarity(
        removed[pair].value,
        added[pair].value,
      );
      if (similarity >= 25) {
        allChanges.push({
          type: "modified",
          original: removed[pair].value,
          revised: added[pair].value,
          similarity,
        });
      } else {
        allChanges.push({
          type: "removed",
          original: removed[pair].value,
          revised: null,
          similarity: 0,
        });
        allChanges.push({
          type: "added",
          original: null,
          revised: added[pair].value,
          similarity: 0,
        });
      }
    }
    for (let offset = paired; offset < removed.length; offset += 1) {
      allChanges.push({
        type: "removed",
        original: removed[offset].value,
        revised: null,
        similarity: 0,
      });
    }
    for (let offset = paired; offset < added.length; offset += 1) {
      allChanges.push({
        type: "added",
        original: null,
        revised: added[offset].value,
        similarity: 0,
      });
    }
  }

  return {
    changes: allChanges.slice(0, MAX_REPORTED_LINE_CHANGES),
    total: allChanges.length,
  };
}

export function compareTextContent(
  original: string,
  revised: string,
  originalLines: readonly string[] = normalizeLines(original),
  revisedLines: readonly string[] = normalizeLines(revised),
): TextDifference {
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
    for (
      let index = shared;
      index < count && removed.length < MAX_REPORTED_TOKENS;
      index += 1
    ) {
      removed.push(token);
    }
  }
  for (const [token, count] of revisedCounts) {
    const shared = Math.min(count, originalCounts.get(token) ?? 0);
    for (
      let index = shared;
      index < count && added.length < MAX_REPORTED_TOKENS;
      index += 1
    ) {
      added.push(token);
    }
  }

  const lineDifference = buildLineChanges(originalLines, revisedLines);
  const denominator = Math.max(1, originalTokens.length + revisedTokens.length);
  return {
    added,
    removed,
    unchangedTokens,
    similarity:
      Math.round((2 * unchangedTokens * 10_000) / denominator) / 100,
    changedLineCount: lineDifference.total,
    lineChanges: lineDifference.changes,
  };
}

export function alignPdfPageTexts(
  original: readonly PdfPageTextDescriptor[],
  revised: readonly PdfPageTextDescriptor[],
): readonly PdfPageAlignment[] {
  const rows = original.length + 1;
  const columns = revised.length + 1;
  const scores = Array.from({ length: rows }, () => new Float64Array(columns));
  const similarities = Array.from(
    { length: rows },
    () => new Float64Array(columns),
  );
  const decisions = Array.from({ length: rows }, () => new Uint8Array(columns));
  const gapPenalty = -0.42;
  const originalFingerprints = original.map((page) =>
    createTokenFingerprint(page.text),
  );
  const revisedFingerprints = revised.map((page) =>
    createTokenFingerprint(page.text),
  );

  for (let first = 1; first < rows; first += 1) {
    scores[first][0] = first * gapPenalty;
    decisions[first][0] = 2;
  }
  for (let second = 1; second < columns; second += 1) {
    scores[0][second] = second * gapPenalty;
    decisions[0][second] = 3;
  }

  for (let first = 1; first < rows; first += 1) {
    for (let second = 1; second < columns; second += 1) {
      const similarity =
        compareTokenFingerprints(
          originalFingerprints[first - 1],
          revisedFingerprints[second - 1],
        ) / 100;
      similarities[first][second] = similarity * 100;
      const match = scores[first - 1][second - 1] + similarity * 1.2 - 0.4;
      const remove = scores[first - 1][second] + gapPenalty;
      const add = scores[first][second - 1] + gapPenalty;
      if (match >= remove && match >= add) {
        scores[first][second] = match;
        decisions[first][second] = 1;
      } else if (remove >= add) {
        scores[first][second] = remove;
        decisions[first][second] = 2;
      } else {
        scores[first][second] = add;
        decisions[first][second] = 3;
      }
    }
  }

  const alignment: PdfPageAlignment[] = [];
  let first = original.length;
  let second = revised.length;
  while (first > 0 || second > 0) {
    const decision = decisions[first][second];
    if (first > 0 && second > 0 && decision === 1) {
      alignment.push({
        originalPageNumber: original[first - 1].pageNumber,
        revisedPageNumber: revised[second - 1].pageNumber,
        textSimilarity: similarities[first][second],
      });
      first -= 1;
      second -= 1;
    } else if (first > 0 && (second === 0 || decision === 2)) {
      alignment.push({
        originalPageNumber: original[first - 1].pageNumber,
        revisedPageNumber: null,
        textSimilarity: 0,
      });
      first -= 1;
    } else {
      alignment.push({
        originalPageNumber: null,
        revisedPageNumber: revised[second - 1].pageNumber,
        textSimilarity: 0,
      });
      second -= 1;
    }
  }
  return alignment.reverse();
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("PDF comparison cancelled.", "AbortError");
  }
}

function collectPositionedLines(
  textContent: Awaited<
    ReturnType<import("pdfjs-dist").PDFPageProxy["getTextContent"]>
  >,
) {
  const items = textContent.items
    .flatMap((item) => {
      if (!("str" in item) || !item.str.trim() || !("transform" in item)) {
        return [];
      }
      return [
        { text: item.str.trim(), x: item.transform[4], y: item.transform[5] },
      ];
    })
    .sort((first, second) =>
      Math.abs(second.y - first.y) > 3
        ? second.y - first.y
        : first.x - second.x,
    );
  const lines: Array<{
    y: number;
    items: Array<{ text: string; x: number }>;
  }> = [];
  for (const item of items) {
    const line = lines.at(-1);
    if (line) line.items.push({ text: item.text, x: item.x });
    else lines.push({ y: item.y, items: [{ text: item.text, x: item.x }] });
  }
  return lines
    .sort((first, second) => second.y - first.y)
    .map((line) =>
      line.items
        .sort((first, second) => first.x - second.x)
        .map((item) => item.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

async function extractDocumentText(
  document: import("pdfjs-dist").PDFDocumentProxy,
  onPage: () => void,
  signal?: AbortSignal,
) {
  const pages: ExtractedPageText[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    assertNotAborted(signal);
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = collectPositionedLines(content);
    pages.push({ pageNumber, lines, text: lines.join("\n") });
    page.cleanup();
    onPage();
  }
  return pages;
}

async function renderPage(page: import("pdfjs-dist").PDFPageProxy) {
  const base = page.getViewport({ scale: 1 });
  const scale = Math.min(
    1.25,
    Math.sqrt(MAX_RENDER_PIXELS / Math.max(1, base.width * base.height)),
  );
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  const context = canvas.getContext("2d", {
    alpha: false,
    willReadFrequently: true,
  });
  if (!context) throw new Error("Unable to create the comparison canvas.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
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
  const differenceContext = difference.getContext("2d", {
    willReadFrequently: true,
  });
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
      const gray = Math.round(
        (firstPixels.data[offset] +
          firstPixels.data[offset + 1] +
          firstPixels.data[offset + 2]) /
          3,
      );
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
    readonly onProgress?: (
      completed: number,
      total: number,
      message: string,
    ) => void;
  } = {},
): Promise<PdfComparisonResult> {
  const pdfjs = await import("pdfjs-dist");
  configurePdfJsWorker(pdfjs);
  const [originalBytes, revisedBytes] = await Promise.all([
    readValidatedPdfBytes(originalFile, PDF_COMPARE_MAX_FILE_MB),
    readValidatedPdfBytes(revisedFile, PDF_COMPARE_MAX_FILE_MB),
  ]);
  const [original, revised] = await Promise.all([
    pdfjs.getDocument({ data: originalBytes.slice() }).promise,
    pdfjs.getDocument({ data: revisedBytes.slice() }).promise,
  ]);
  const originalPages = original.numPages;
  const revisedPages = revised.numPages;
  if (Math.max(originalPages, revisedPages) > PDF_COMPARE_MAX_PAGES) {
    await Promise.allSettled([original.destroy(), revised.destroy()]);
    throw new Error(
      `PDF comparison supports up to ${PDF_COMPARE_MAX_PAGES} pages per document.`,
    );
  }

  let completed = 0;
  const extractionTotal = originalPages + revisedPages;
  const reportProgress = (message: string, total = extractionTotal) =>
    options.onProgress?.(completed, total, message);
  try {
    reportProgress("Indexing original document…");
    const originalText = await extractDocumentText(
      original,
      () => {
        completed += 1;
        reportProgress(
          `Indexing original document · page ${completed} of ${originalPages}…`,
        );
      },
      options.signal,
    );
    reportProgress("Indexing revised document…");
    const revisedText = await extractDocumentText(
      revised,
      () => {
        completed += 1;
        reportProgress(
          `Indexing document text · ${completed} of ${extractionTotal} pages…`,
        );
      },
      options.signal,
    );
    const alignment = alignPdfPageTexts(originalText, revisedText);
    const totalWork = extractionTotal + alignment.length;
    const threshold =
      options.sensitivity === "strict"
        ? 10
        : options.sensitivity === "relaxed"
          ? 46
          : 24;
    const pages: PdfPageComparison[] = [];

    for (let index = 0; index < alignment.length; index += 1) {
      assertNotAborted(options.signal);
      const pair = alignment[index];
      const originalTextPage = pair.originalPageNumber
        ? originalText[pair.originalPageNumber - 1]
        : null;
      const revisedTextPage = pair.revisedPageNumber
        ? revisedText[pair.revisedPageNumber - 1]
        : null;
      options.onProgress?.(
        completed,
        totalWork,
        `Comparing aligned page ${index + 1} of ${alignment.length}…`,
      );

      const originalPage = pair.originalPageNumber
        ? await original.getPage(pair.originalPageNumber)
        : null;
      const revisedPage = pair.revisedPageNumber
        ? await revised.getPage(pair.revisedPageNumber)
        : null;
      if (!originalPage || !revisedPage) {
        const rendered = await renderPage((originalPage ?? revisedPage)!);
        pages.push({
          pageNumber: index + 1,
          originalPageNumber: pair.originalPageNumber,
          revisedPageNumber: pair.revisedPageNumber,
          status: originalPage ? "removed" : "added",
          visualDifferencePercent: 100,
          textDifference: compareTextContent(
            originalTextPage?.text ?? "",
            revisedTextPage?.text ?? "",
            originalTextPage?.lines ?? [],
            revisedTextPage?.lines ?? [],
          ),
          originalPreview: originalPage ? preview(rendered) : null,
          revisedPreview: revisedPage ? preview(rendered) : null,
          differencePreview: null,
        });
        rendered.width = rendered.height = 0;
        originalPage?.cleanup();
        revisedPage?.cleanup();
        completed += 1;
        continue;
      }

      const [originalCanvas, revisedCanvas] = await Promise.all([
        renderPage(originalPage),
        renderPage(revisedPage),
      ]);
      const visual = compareCanvases(originalCanvas, revisedCanvas, threshold);
      const textDifference = compareTextContent(
        originalTextPage?.text ?? "",
        revisedTextPage?.text ?? "",
        originalTextPage?.lines ?? [],
        revisedTextPage?.lines ?? [],
      );
      const changed =
        visual.percent >= 0.05 || textDifference.changedLineCount > 0;
      pages.push({
        pageNumber: index + 1,
        originalPageNumber: pair.originalPageNumber,
        revisedPageNumber: pair.revisedPageNumber,
        status: changed ? "changed" : "same",
        visualDifferencePercent: visual.percent,
        textDifference,
        originalPreview: preview(originalCanvas),
        revisedPreview: preview(revisedCanvas),
        differencePreview: visual.preview,
      });
      originalCanvas.width = originalCanvas.height = 0;
      revisedCanvas.width = revisedCanvas.height = 0;
      originalPage.cleanup();
      revisedPage.cleanup();
      completed += 1;
    }

    options.onProgress?.(totalWork, totalWork, "Comparison complete.");
    const paired = pages.filter(
      (page) => page.originalPageNumber && page.revisedPageNumber,
    );
    const changedPages = pages.filter(
      (page) => page.status === "changed",
    ).length;
    const unchangedPages = pages.filter(
      (page) => page.status === "same",
    ).length;
    const addedPages = pages.filter((page) => page.status === "added").length;
    const removedPages = pages.filter(
      (page) => page.status === "removed",
    ).length;
    return {
      originalName: originalFile.name,
      revisedName: revisedFile.name,
      originalPages,
      revisedPages,
      comparedPagePairs: paired.length,
      unchangedPages,
      changedPages,
      addedPages,
      removedPages,
      averageTextSimilarity:
        Math.round(
          (paired.reduce(
            (sum, page) => sum + page.textDifference.similarity,
            0,
          ) *
            100) /
            Math.max(1, paired.length),
        ) / 100,
      averageVisualDifferencePercent:
        Math.round(
          (paired.reduce(
            (sum, page) => sum + page.visualDifferencePercent,
            0,
          ) *
            100) /
            Math.max(1, paired.length),
        ) / 100,
      pages,
      generatedAt: new Date().toISOString(),
    };
  } finally {
    await Promise.allSettled([original.destroy(), revised.destroy()]);
  }
}

export function serializePdfComparison(result: PdfComparisonResult) {
  return JSON.stringify(
    {
      reportVersion: 2,
      ...result,
      pages: result.pages.map(
        ({
          originalPreview: _original,
          revisedPreview: _revised,
          differencePreview: _difference,
          ...page
        }) => page,
      ),
    },
    null,
    2,
  );
}

function csvCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function serializePdfComparisonCsv(result: PdfComparisonResult) {
  const header = [
    "Comparison row",
    "Original page",
    "Revised page",
    "Status",
    "Visual difference percent",
    "Text similarity percent",
    "Changed lines",
    "Added token sample",
    "Removed token sample",
  ];
  return [
    header.map(csvCell).join(","),
    ...result.pages.map((page) =>
      [
        page.pageNumber,
        page.originalPageNumber,
        page.revisedPageNumber,
        page.status,
        page.visualDifferencePercent,
        page.textDifference.similarity,
        page.textDifference.changedLineCount,
        page.textDifference.added.join(" "),
        page.textDifference.removed.join(" "),
      ]
        .map(csvCell)
        .join(","),
    ),
  ].join("\r\n");
}
