import {
  PDFDocument,
  StandardFonts,
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import type { EditorPageGeometry } from "./editor-page-geometry";

export type EmbeddedTextFonts = {
  readonly regular: PDFFont;
  readonly bold: PDFFont;
  readonly italic: PDFFont;
  readonly boldItalic: PDFFont;
};

export type RichTextExportBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ExportTextStyle = {
  readonly fontWeight?: "normal" | "bold" | "700";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
  readonly color?: string;
};

export type ExportTextRun = {
  readonly text: string;
  readonly style?: ExportTextStyle;
  readonly fontWeight?: "normal" | "bold" | "700";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
  readonly color?: string;
};

export type RichTextExportData = {
  readonly text?: string;
  readonly textRuns?: readonly ExportTextRun[];
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "bold" | "700";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
  readonly color?: string;
  readonly opacity?: number;
};

export type EditorRichTextExportObject = {
  readonly box: RichTextExportBox;
  readonly data: RichTextExportData;
};

const TEXT_PADDING_X = 4;
const TEXT_PADDING_Y = 2;

export function getEditorTextClipBox(
  box: RichTextExportBox,
  geometry: EditorPageGeometry,
) {
  return {
    x: box.x,
    y: geometry.viewportHeight - box.y - box.height,
    width: Math.max(0, box.width),
    height: Math.max(0, box.height),
  };
}

export async function embedEditorTextFonts(pdfDoc: PDFDocument): Promise<EmbeddedTextFonts> {
  return {
    regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
    bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
    italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const fallback = { r: 17 / 255, g: 24 / 255, b: 39 / 255 };

  if (normalized.length !== 6) return fallback;

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  if ([r, g, b].some((value) => Number.isNaN(value))) return fallback;

  return { r, g, b };
}

function getSafeOpacity(opacity: number | undefined) {
  if (!Number.isFinite(opacity)) return 1;

  return Math.max(0, Math.min(1, Number(opacity)));
}

function getTextFontFromStyle(style: Required<ExportTextStyle>, fonts: EmbeddedTextFonts) {
  const bold = style.fontWeight === "bold" || style.fontWeight === "700";
  const italic = style.fontStyle === "italic";

  if (bold && italic) return fonts.boldItalic;
  if (bold) return fonts.bold;
  if (italic) return fonts.italic;

  return fonts.regular;
}

function getObjectBaseTextStyle(object: EditorRichTextExportObject): Required<ExportTextStyle> {
  return {
    fontWeight: object.data.fontWeight ?? "normal",
    fontStyle: object.data.fontStyle ?? "normal",
    textDecoration: object.data.textDecoration ?? "none",
    color: object.data.color ?? "#111827",
  };
}

function getRunTextStyle(
  object: EditorRichTextExportObject,
  run: ExportTextRun,
): Required<ExportTextStyle> {
  const baseStyle = getObjectBaseTextStyle(object);
  const runStyle = run.style ?? {};

  return {
    fontWeight: runStyle.fontWeight ?? run.fontWeight ?? baseStyle.fontWeight,
    fontStyle: runStyle.fontStyle ?? run.fontStyle ?? baseStyle.fontStyle,
    textDecoration: runStyle.textDecoration ?? run.textDecoration ?? baseStyle.textDecoration,
    color: runStyle.color ?? run.color ?? baseStyle.color,
  };
}

function getTextRuns(object: EditorRichTextExportObject): readonly ExportTextRun[] {
  if (object.data.textRuns && object.data.textRuns.length > 0) {
    return object.data.textRuns;
  }

  return [
    {
      text: object.data.text ?? "",
      style: getObjectBaseTextStyle(object),
    },
  ];
}

function replaceUnsupportedCharacters(text: string, font: PDFFont, fontSize: number) {
  return Array.from(text)
    .map((character) => {
      if (character === "\n" || character === "\r") return character;

      try {
        font.widthOfTextAtSize(character, fontSize);
        return character;
      } catch {
        return "?";
      }
    })
    .join("");
}

function measureTextSafely(text: string, font: PDFFont, fontSize: number) {
  try {
    return font.widthOfTextAtSize(text, fontSize);
  } catch {
    return Array.from(text).reduce((width, character) => {
      try {
        return width + font.widthOfTextAtSize(character, fontSize);
      } catch {
        return width;
      }
    }, 0);
  }
}

function breakLongToken(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  if (measureTextSafely(text, font, fontSize) <= maxWidth) {
    return [text];
  }

  const fragments: string[] = [];
  let fragment = "";

  Array.from(text).forEach((character) => {
    const candidate = fragment + character;

    if (fragment && measureTextSafely(candidate, font, fontSize) > maxWidth) {
      fragments.push(fragment);
      fragment = character;
      return;
    }

    fragment = candidate;
  });

  if (fragment) {
    fragments.push(fragment);
  }

  return fragments;
}

function drawTextSafely({
  page,
  text,
  x,
  y,
  fontSize,
  font,
  color,
  maxWidth,
  opacity,
}: {
  readonly page: PDFPage;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly font: PDFFont;
  readonly color: ReturnType<typeof rgb>;
  readonly maxWidth: number;
  readonly opacity: number;
}) {
  try {
    page.drawText(text, {
      x,
      y,
      size: fontSize,
      font,
      color,
      maxWidth,
      opacity,
    });
    return;
  } catch {
    // Fall back to drawing only characters that the selected font accepts.
  }

  let characterX = x;

  Array.from(text).forEach((character) => {
    try {
      const characterWidth = font.widthOfTextAtSize(character, fontSize);

      page.drawText(character, {
        x: characterX,
        y,
        size: fontSize,
        font,
        color,
        maxWidth,
        opacity,
      });

      characterX += characterWidth;
    } catch {
      // Skip a character if it still cannot be measured or encoded.
    }
  });
}

function drawUnderlineSegment({
  page,
  startX,
  endX,
  baselineY,
  fontSize,
  color,
  opacity,
}: {
  readonly page: PDFPage;
  readonly startX: number;
  readonly endX: number;
  readonly baselineY: number;
  readonly fontSize: number;
  readonly color: ReturnType<typeof rgb>;
  readonly opacity: number;
}) {
  if (endX <= startX) return;

  const underlineGap = Math.max(1.4, fontSize * 0.12);
  const underlineThickness = Math.max(0.6, fontSize * 0.055);

  page.drawLine({
    start: {
      x: startX,
      y: baselineY - underlineGap,
    },
    end: {
      x: endX,
      y: baselineY - underlineGap,
    },
    thickness: underlineThickness,
    color,
    opacity,
  });
}

export function drawEditorRichTextObject(
  page: PDFPage,
  object: EditorRichTextExportObject,
  fonts: EmbeddedTextFonts,
  geometry: EditorPageGeometry,
) {
  const fontSize = object.data.fontSize || 16;
  const opacity = getSafeOpacity(object.data.opacity);

  if (opacity <= 0) return;
  const clipBox = getEditorTextClipBox(object.box, geometry);
  if (clipBox.width <= 0 || clipBox.height <= 0) return;
  page.pushOperators(
    pushGraphicsState(),
    rectangle(clipBox.x, clipBox.y, clipBox.width, clipBox.height),
    clip(),
    endPath(),
  );

  const lineHeight = fontSize * 1.3;
  const startX = object.box.x + TEXT_PADDING_X;
  const maxX = Math.max(startX, object.box.x + object.box.width - TEXT_PADDING_X);
  const wrappingWidth = Math.max(1, maxX - startX);
  let cursorX = startX;
  let baselineY = geometry.viewportHeight - object.box.y - TEXT_PADDING_Y - fontSize;

  const moveToNextLine = () => {
    cursorX = startX;
    baselineY -= lineHeight;
  };

  getTextRuns(object).forEach((run) => {
    if (!run.text) return;

    const style = getRunTextStyle(object, run);
    const font = getTextFontFromStyle(style, fonts);
    const colorValue = hexToRgb(style.color);
    const textColor = rgb(colorValue.r, colorValue.g, colorValue.b);
    const safeText = replaceUnsupportedCharacters(run.text, font, fontSize);
    const tokens = safeText.split(/(\r\n|\n|\s+)/g).filter((token) => token.length > 0);

    tokens.forEach((token) => {
      if (token === "\n" || token === "\r\n") {
        moveToNextLine();
        return;
      }

      const isOnlyWhitespace = /^\s+$/.test(token);

      if (isOnlyWhitespace) {
        cursorX += measureTextSafely(token, font, fontSize);

        if (cursorX > maxX) {
          moveToNextLine();
        }
        return;
      }

      const fragments = breakLongToken(token, font, fontSize, wrappingWidth);

      fragments.forEach((fragment, fragmentIndex) => {
        const fragmentWidth = measureTextSafely(fragment, font, fontSize);

        if (cursorX > startX && cursorX + fragmentWidth > maxX) {
          moveToNextLine();
        }

        drawTextSafely({
          page,
          text: fragment,
          x: cursorX,
          y: baselineY,
          fontSize,
          font,
          color: textColor,
          maxWidth: wrappingWidth,
          opacity,
        });

        if (style.textDecoration === "underline") {
          drawUnderlineSegment({
            page,
            startX: cursorX,
            endX: cursorX + fragmentWidth,
            baselineY,
            fontSize,
            color: textColor,
            opacity,
          });
        }

        cursorX += fragmentWidth;

        if (fragmentIndex < fragments.length - 1) {
          moveToNextLine();
        }
      });
    });
  });
  page.pushOperators(popGraphicsState());
}
