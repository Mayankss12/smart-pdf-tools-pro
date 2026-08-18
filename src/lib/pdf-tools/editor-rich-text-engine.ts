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

import type { ExistingTextEditSource } from "../editor/existing-text-edit";
import {
  embedUnicodeFonts,
  type BundledUnicodeFontBytes,
  type EmbeddedUnicodeFonts,
} from "../pdf-unicode-fonts";
import type { EditorPageGeometry } from "./editor-page-geometry";

export type EmbeddedTextFonts = {
  readonly regular: PDFFont;
  readonly bold: PDFFont;
  readonly italic: PDFFont;
  readonly boldItalic: PDFFont;
  readonly unicode?: EmbeddedUnicodeFonts;
  readonly supportedCodePoints: {
    readonly regular: ReadonlySet<number>;
    readonly bold: ReadonlySet<number>;
    readonly italic: ReadonlySet<number>;
    readonly boldItalic: ReadonlySet<number>;
  };
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
  readonly sourceTextEdit?: ExistingTextEditSource;
};

export type EditorRichTextExportObject = {
  readonly box: RichTextExportBox;
  readonly data: RichTextExportData;
};

type FontRun = {
  readonly text: string;
  readonly font: PDFFont;
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

function isControlCharacter(codePoint: number) {
  return (
    codePoint === 0 ||
    (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a && codePoint !== 0x0d)
  );
}

function needsUnicodeFonts(
  textSamples: readonly string[],
  supportedCodePoints: ReadonlySet<number>,
) {
  return textSamples.some((text) =>
    Array.from(text).some((character) => {
      if (character === "\n" || character === "\r" || character === "\t") return false;
      const codePoint = character.codePointAt(0);
      return codePoint !== undefined && !isControlCharacter(codePoint) && !supportedCodePoints.has(codePoint);
    }),
  );
}

export async function embedEditorTextFonts(
  pdfDoc: PDFDocument,
  textSamples: readonly string[] = [],
  unicodeFontBytes?: BundledUnicodeFontBytes,
): Promise<EmbeddedTextFonts> {
  const [regular, bold, italic, boldItalic] = await Promise.all([
    pdfDoc.embedFont(StandardFonts.Helvetica),
    pdfDoc.embedFont(StandardFonts.HelveticaBold),
    pdfDoc.embedFont(StandardFonts.HelveticaOblique),
    pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
  ]);
  const supportedCodePoints = {
    regular: new Set(regular.getCharacterSet()),
    bold: new Set(bold.getCharacterSet()),
    italic: new Set(italic.getCharacterSet()),
    boldItalic: new Set(boldItalic.getCharacterSet()),
  };
  let unicode: EmbeddedUnicodeFonts | undefined;

  if (needsUnicodeFonts(textSamples, supportedCodePoints.regular)) {
    try {
      unicode = await embedUnicodeFonts(pdfDoc, "helvetica", unicodeFontBytes);
    } catch (error) {
      if (unicodeFontBytes) throw error;
      // Browser exports keep working with safe replacement glyphs if bundled fonts cannot load.
    }
  }

  return {
    regular,
    bold,
    italic,
    boldItalic,
    unicode,
    supportedCodePoints,
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

function isBoldStyle(style: Required<ExportTextStyle>) {
  return style.fontWeight === "bold" || style.fontWeight === "700";
}

function getStandardFontFromStyle(
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
) {
  const bold = isBoldStyle(style);
  const italic = style.fontStyle === "italic";

  if (bold && italic) {
    return {
      font: fonts.boldItalic,
      supported: fonts.supportedCodePoints.boldItalic,
    };
  }
  if (bold) {
    return { font: fonts.bold, supported: fonts.supportedCodePoints.bold };
  }
  if (italic) {
    return { font: fonts.italic, supported: fonts.supportedCodePoints.italic };
  }

  return { font: fonts.regular, supported: fonts.supportedCodePoints.regular };
}

function getFontForCharacter(
  character: string,
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
): PDFFont | null {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined || isControlCharacter(codePoint)) return null;

  const standard = getStandardFontFromStyle(style, fonts);
  if (standard.supported.has(codePoint)) return standard.font;

  const unicode = fonts.unicode;
  if (!unicode) return null;

  if (
    codePoint >= 0x0900 &&
    codePoint <= 0x097f &&
    unicode.supportedCodePoints.devanagari.has(codePoint)
  ) {
    return unicode.devanagari;
  }

  if (unicode.supportedCodePoints.latin.has(codePoint)) {
    return unicode.latin;
  }

  if (unicode.supportedCodePoints.devanagari.has(codePoint)) {
    return unicode.devanagari;
  }

  return null;
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

function replaceUnsupportedCharacters(
  text: string,
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
) {
  const replacement = fonts.unicode?.replacement ?? "?";

  return Array.from(text)
    .map((character) => {
      if (character === "\n" || character === "\r" || character === "\t") return character;
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined || isControlCharacter(codePoint)) return "";
      return getFontForCharacter(character, style, fonts) ? character : replacement;
    })
    .join("");
}

function splitFontRuns(
  text: string,
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
) {
  const runs: FontRun[] = [];
  const replacement = fonts.unicode?.replacement ?? "?";

  for (const character of text) {
    const font =
      getFontForCharacter(character, style, fonts) ??
      getFontForCharacter(replacement, style, fonts) ??
      fonts.regular;
    const safeCharacter = getFontForCharacter(character, style, fonts)
      ? character
      : replacement;
    const previous = runs.at(-1);

    if (previous?.font === font) {
      runs[runs.length - 1] = { text: previous.text + safeCharacter, font };
    } else {
      runs.push({ text: safeCharacter, font });
    }
  }

  return runs;
}

function measureTextSafely(
  text: string,
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
  fontSize: number,
) {
  return splitFontRuns(text, style, fonts).reduce((width, run) => {
    try {
      return width + run.font.widthOfTextAtSize(run.text, fontSize);
    } catch {
      return (
        width +
        Array.from(run.text).reduce((characterWidth, character) => {
          try {
            return characterWidth + run.font.widthOfTextAtSize(character, fontSize);
          } catch {
            return characterWidth;
          }
        }, 0)
      );
    }
  }, 0);
}

function breakLongToken(
  text: string,
  style: Required<ExportTextStyle>,
  fonts: EmbeddedTextFonts,
  fontSize: number,
  maxWidth: number,
) {
  if (measureTextSafely(text, style, fonts, fontSize) <= maxWidth) {
    return [text];
  }

  const fragments: string[] = [];
  let fragment = "";

  Array.from(text).forEach((character) => {
    const candidate = fragment + character;

    if (
      fragment &&
      measureTextSafely(candidate, style, fonts, fontSize) > maxWidth
    ) {
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
  fonts,
  style,
  color,
  opacity,
}: {
  readonly page: PDFPage;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fonts: EmbeddedTextFonts;
  readonly style: Required<ExportTextStyle>;
  readonly color: ReturnType<typeof rgb>;
  readonly opacity: number;
}) {
  let cursorX = x;

  for (const run of splitFontRuns(text, style, fonts)) {
    try {
      const width = run.font.widthOfTextAtSize(run.text, fontSize);
      page.drawText(run.text, {
        x: cursorX,
        y,
        size: fontSize,
        font: run.font,
        color,
        opacity,
      });
      cursorX += width;
    } catch {
      for (const character of run.text) {
        try {
          const width = run.font.widthOfTextAtSize(character, fontSize);
          page.drawText(character, {
            x: cursorX,
            y,
            size: fontSize,
            font: run.font,
            color,
            opacity,
          });
          cursorX += width;
        } catch {
          // A single unusable glyph is skipped so it cannot fail the document.
        }
      }
    }
  }
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
  const sourceTextEdit = object.data.sourceTextEdit;

  if (opacity <= 0) return;
  const clipBox = getEditorTextClipBox(object.box, geometry);
  if (clipBox.width <= 0 || clipBox.height <= 0) return;
  page.pushOperators(
    pushGraphicsState(),
    rectangle(clipBox.x, clipBox.y, clipBox.width, clipBox.height),
    clip(),
    endPath(),
  );

  try {
    const paddingX = sourceTextEdit ? 0 : TEXT_PADDING_X;
    const paddingY = sourceTextEdit ? 0 : TEXT_PADDING_Y;
    const lineHeight = fontSize * (sourceTextEdit ? 1.12 : 1.3);
    const startX = object.box.x + paddingX;
    const maxX = Math.max(startX, object.box.x + object.box.width - paddingX);
    const wrappingWidth = Math.max(1, maxX - startX);
    let cursorX = startX;
    let baselineY = sourceTextEdit
      ? geometry.viewportHeight -
        object.box.y -
        Math.max(fontSize, sourceTextEdit.baselineOffset)
      : geometry.viewportHeight - object.box.y - paddingY - fontSize;

    const moveToNextLine = () => {
      cursorX = startX;
      baselineY -= lineHeight;
    };

    getTextRuns(object).forEach((run) => {
      if (!run.text) return;

      const style = getRunTextStyle(object, run);
      const colorValue = hexToRgb(style.color);
      const textColor = rgb(colorValue.r, colorValue.g, colorValue.b);
      const safeText = replaceUnsupportedCharacters(run.text, style, fonts);
      const tokens = safeText.split(/(\r\n|\n|\s+)/g).filter((token) => token.length > 0);

      tokens.forEach((token) => {
        if (token === "\n" || token === "\r\n") {
          moveToNextLine();
          return;
        }

        const isOnlyWhitespace = /^\s+$/.test(token);

        if (isOnlyWhitespace) {
          cursorX += measureTextSafely(token, style, fonts, fontSize);

          if (cursorX > maxX) {
            moveToNextLine();
          }
          return;
        }

        const fragments = breakLongToken(
          token,
          style,
          fonts,
          fontSize,
          wrappingWidth,
        );

        fragments.forEach((fragment, fragmentIndex) => {
          const fragmentWidth = measureTextSafely(
            fragment,
            style,
            fonts,
            fontSize,
          );

          if (cursorX > startX && cursorX + fragmentWidth > maxX) {
            moveToNextLine();
          }

          drawTextSafely({
            page,
            text: fragment,
            x: cursorX,
            y: baselineY,
            fontSize,
            fonts,
            style,
            color: textColor,
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
  } finally {
    page.pushOperators(popGraphicsState());
  }
}
