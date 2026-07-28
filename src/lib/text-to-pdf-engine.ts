import { PDFDocument, rgb } from "pdf-lib";

import {
  drawUnicodeTextLine,
  embedUnicodeFonts,
  measureUnicodeText,
  sanitizeUnicodeText,
  type BundledUnicodeFontBytes,
  type EmbeddedUnicodeFonts,
  type UnicodeBaseFont,
} from "@/lib/pdf-unicode-fonts";

export type TextPdfPageSize = {
  readonly width: number;
  readonly height: number;
};

export type TextToPdfOptions = {
  readonly text: string;
  readonly title: string;
  readonly pageSize: TextPdfPageSize;
  readonly font: UnicodeBaseFont;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly margin: number;
  readonly fontBytes?: BundledUnicodeFontBytes;
};

export type TextToPdfResult = {
  readonly bytes: Uint8Array;
  readonly pageCount: number;
  readonly replacementCount: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function splitLongWord(
  word: string,
  maxWidth: number,
  fonts: EmbeddedUnicodeFonts,
  fontSize: number,
  bold: boolean,
) {
  const parts: string[] = [];
  let current = "";

  for (const character of word) {
    const next = current + character;
    if (measureUnicodeText(next, fontSize, fonts, bold) <= maxWidth) {
      current = next;
    } else {
      if (current) parts.push(current);
      current = character;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function wrapTextLine(
  line: string,
  maxWidth: number,
  fonts: EmbeddedUnicodeFonts,
  fontSize: number,
  bold = false,
) {
  if (!line.trim()) return [""];

  const words = line.split(/\s+/);
  const wrapped: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (measureUnicodeText(candidate, fontSize, fonts, bold) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      wrapped.push(currentLine);
      currentLine = "";
    }

    if (measureUnicodeText(word, fontSize, fonts, bold) > maxWidth) {
      wrapped.push(
        ...splitLongWord(word, maxWidth, fonts, fontSize, bold),
      );
    } else {
      currentLine = word;
    }
  }

  if (currentLine) wrapped.push(currentLine);
  return wrapped;
}

export async function createTextPdf(
  options: TextToPdfOptions,
): Promise<TextToPdfResult> {
  const pdf = await PDFDocument.create();
  const fonts = await embedUnicodeFonts(pdf, options.font, options.fontBytes);
  const pageWidth = Math.max(144, options.pageSize.width);
  const pageHeight = Math.max(144, options.pageSize.height);
  const maximumMargin = Math.max(12, Math.min(pageWidth, pageHeight) / 3);
  const margin = clamp(options.margin, 12, maximumMargin);
  const fontSize = clamp(options.fontSize, 6, 72);
  const lineStep = Math.max(options.lineHeight, fontSize + 4);
  const usableWidth = Math.max(24, pageWidth - margin * 2);
  const sanitizedBody = sanitizeUnicodeText(options.text, fonts);
  const sanitizedTitle = sanitizeUnicodeText(options.title.trim(), fonts, true);
  let replacementCount =
    sanitizedBody.replacementCount + sanitizedTitle.replacementCount;

  pdf.setTitle(sanitizedTitle.text || "Text document");
  pdf.setCreator("PDFMantra");
  pdf.setProducer("PDFMantra");

  let page = pdf.addPage([pageWidth, pageHeight]);
  let cursorY = pageHeight - margin;

  if (sanitizedTitle.text) {
    const titleSize = Math.max(fontSize + 5, 16);
    const titleStep = titleSize + 7;
    const titleLines = wrapTextLine(
      sanitizedTitle.text,
      usableWidth,
      fonts,
      titleSize,
      true,
    );

    for (const line of titleLines) {
      if (cursorY < margin + titleStep) {
        page = pdf.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - margin;
      }
      drawUnicodeTextLine({
        page,
        text: line,
        x: margin,
        y: cursorY,
        size: titleSize,
        fonts,
        bold: true,
        color: rgb(0.08, 0.07, 0.18),
      });
      cursorY -= titleStep;
    }
    cursorY -= 8;
  }

  for (const rawLine of sanitizedBody.text.split("\n")) {
    const wrappedLines = wrapTextLine(
      rawLine,
      usableWidth,
      fonts,
      fontSize,
    );

    for (const line of wrappedLines) {
      if (cursorY < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        cursorY = pageHeight - margin;
      }

      if (line) {
        drawUnicodeTextLine({
          page,
          text: line,
          x: margin,
          y: cursorY,
          size: fontSize,
          fonts,
          color: rgb(0.12, 0.13, 0.18),
        });
      }
      cursorY -= lineStep;
    }
  }

  const pages = pdf.getPages();
  for (let index = 0; index < pages.length; index += 1) {
    const footer = `Page ${index + 1} of ${pages.length}`;
    const footerWidth = measureUnicodeText(footer, 9, fonts);
    drawUnicodeTextLine({
      page: pages[index],
      text: footer,
      x: pageWidth - margin - footerWidth,
      y: Math.max(22, margin / 2),
      size: 9,
      fonts,
      color: rgb(0.45, 0.45, 0.55),
    });
  }

  if (!Number.isFinite(replacementCount)) replacementCount = 0;

  return {
    bytes: await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
    }),
    pageCount: pages.length,
    replacementCount,
  };
}
