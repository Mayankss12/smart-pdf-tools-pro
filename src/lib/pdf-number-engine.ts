import { StandardFonts, rgb } from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import {
  drawUnicodeTextLine,
  embedUnicodeFonts,
  measureUnicodeText,
  sanitizeUnicodeText,
  type BundledUnicodeFontBytes,
  type EmbeddedUnicodeFonts,
} from "@/lib/pdf-unicode-fonts";
import {
  getEditorPageGeometry,
  withEditorPageTransform,
} from "@/lib/pdf-tools/editor-page-geometry";

export type PageNumberFont = "helvetica" | "times" | "courier";

export type PageNumberPosition = {
  readonly xPercent: number;
  readonly yPercent: number;
};

export type PageNumberOptions = {
  readonly position: PageNumberPosition;
  readonly targetPages: readonly number[];
  readonly startNumber: number;
  readonly fontSize: number;
  readonly font: PageNumberFont;
  readonly opacity: number;
  readonly prefix: string;
  readonly suffix: string;
  readonly color: readonly [number, number, number];
  readonly unicodeFontBytes?: BundledUnicodeFontBytes;
  readonly onProgress?: (progress: {
    readonly completed: number;
    readonly total: number;
  }) => void;
};

const FONT_MAP: Record<PageNumberFont, StandardFonts> = {
  helvetica: StandardFonts.HelveticaBold,
  times: StandardFonts.TimesRomanBold,
  courier: StandardFonts.CourierBold,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function resolveAffix(value: string, totalNumberedPages: number) {
  return value.replace(/\{total\}/gi, String(totalNumberedPages));
}

function textNeedsUnicode(text: string, supported: ReadonlySet<number>) {
  return Array.from(text).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && !supported.has(codePoint);
  });
}

function preparePageNumberText(
  text: string,
  unicodeFonts: EmbeddedUnicodeFonts | null,
) {
  return unicodeFonts ? sanitizeUnicodeText(text, unicodeFonts, true).text : text;
}

function measurePageNumberText(
  text: string,
  size: number,
  font: Awaited<ReturnType<ReturnType<typeof loadPdfDocument>["embedFont"]>>,
  unicodeFonts: EmbeddedUnicodeFonts | null,
) {
  return unicodeFonts
    ? measureUnicodeText(text, size, unicodeFonts, true)
    : font.widthOfTextAtSize(text, size);
}

export async function addPageNumbersWithOptions(
  file: File,
  options: PageNumberOptions,
): Promise<PdfProcessingResult> {
  if (!Number.isInteger(options.startNumber) || options.startNumber < 0) {
    throw new PdfEngineError("PROCESSING_FAILED", "Start number must be 0 or higher.");
  }

  if (!options.targetPages.length) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "Select at least one page to number.");
  }

  const pdf = await loadPdfDocument(file);
  const pages = pdf.getPages();
  const invalidTarget = options.targetPages.find(
    (pageNumber) =>
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pages.length,
  );
  if (invalidTarget !== undefined) {
    throw new PdfEngineError(
      "INVALID_PAGE_RANGE",
      `Page ${invalidTarget} is outside this PDF's page range.`,
    );
  }

  const font = await pdf.embedFont(FONT_MAP[options.font]);
  const supportedCodePoints = new Set(font.getCharacterSet());
  const totalNumberedPages = new Set(options.targetPages).size;
  const affixSample =
    resolveAffix(options.prefix, totalNumberedPages) +
    resolveAffix(options.suffix, totalNumberedPages);
  const unicodeFonts = textNeedsUnicode(affixSample, supportedCodePoints)
    ? await embedUnicodeFonts(pdf, options.font, options.unicodeFontBytes)
    : null;
  const requestedFontSize = clamp(options.fontSize, 8, 72);
  const opacity = clamp(options.opacity, 0, 1);
  const xPercent = clamp(options.position.xPercent, 4, 96);
  const yPercent = clamp(options.position.yPercent, 4, 96);
  const targetIndexByPage = new Map(
    options.targetPages.map((pageNumber, index) => [pageNumber, index]),
  );
  let completedPages = 0;

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index];
    const targetIndex = targetIndexByPage.get(index + 1);
    if (targetIndex === undefined) continue;

    const geometry = getEditorPageGeometry(page);
    const displayNumber = options.startNumber + targetIndex;
    const text = preparePageNumberText(
      `${resolveAffix(options.prefix, totalNumberedPages)}` +
        `${displayNumber}` +
        `${resolveAffix(options.suffix, totalNumberedPages)}`,
      unicodeFonts,
    );
    const widthAtOnePoint = Math.max(
      0.01,
      measurePageNumberText(text, 1, font, unicodeFonts),
    );
    const fontSize = Math.min(
      requestedFontSize,
      Math.max(1, (geometry.viewportWidth - 24) / widthAtOnePoint),
    );
    const textWidth = measurePageNumberText(text, fontSize, font, unicodeFonts);
    const maximumX = Math.max(12, geometry.viewportWidth - textWidth - 12);
    const maximumY = Math.max(12, geometry.viewportHeight - fontSize - 12);
    const x = clamp(
      (xPercent / 100) * geometry.viewportWidth - textWidth / 2,
      12,
      maximumX,
    );
    const y = clamp(
      geometry.viewportHeight -
        (yPercent / 100) * geometry.viewportHeight -
        fontSize / 2,
      12,
      maximumY,
    );
    const color = rgb(options.color[0], options.color[1], options.color[2]);

    await withEditorPageTransform(page, geometry, () => {
      if (unicodeFonts) {
        drawUnicodeTextLine({
          page,
          text,
          x,
          y,
          size: fontSize,
          fonts: unicodeFonts,
          bold: true,
          color,
          opacity,
        });
        return;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color,
        opacity,
      });
    });
    completedPages += 1;
    options.onProgress?.({ completed: completedPages, total: totalNumberedPages });
  }

  return savePdfResult(
    pdf,
    file.size,
    createPdfFileName("page-numbers", file.name),
  );
}