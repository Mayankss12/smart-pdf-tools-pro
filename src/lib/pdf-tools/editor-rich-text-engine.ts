import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

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

  return Math.max(0.1, Math.min(1, Number(opacity)));
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
) {
  const pageHeight = page.getHeight();
  const fontSize = object.data.fontSize || 16;
  const opacity = getSafeOpacity(object.data.opacity);
  const lineHeight = fontSize * 1.3;
  const startX = object.box.x;
  const maxX = object.box.x + object.box.width;
  let cursorX = startX;
  let baselineY = pageHeight - object.box.y - fontSize;

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
    const tokens = run.text.split(/(\r\n|\n|\s+)/g).filter((token) => token.length > 0);

    tokens.forEach((token) => {
      if (token === "\n" || token === "\r\n") {
        moveToNextLine();
        return;
      }

      const tokenWidth = font.widthOfTextAtSize(token, fontSize);
      const isOnlyWhitespace = /^\s+$/.test(token);

      if (!isOnlyWhitespace && cursorX > startX && cursorX + tokenWidth > maxX) {
        moveToNextLine();
      }

      if (!isOnlyWhitespace) {
        page.drawText(token, {
          x: cursorX,
          y: baselineY,
          size: fontSize,
          font,
          color: textColor,
          maxWidth: object.box.width,
          opacity,
        });

        if (style.textDecoration === "underline") {
          drawUnderlineSegment({
            page,
            startX: cursorX,
            endX: cursorX + tokenWidth,
            baselineY,
            fontSize,
            color: textColor,
            opacity,
          });
        }
      }

      cursorX += tokenWidth;

      if (isOnlyWhitespace && cursorX > maxX) {
        moveToNextLine();
      }
    });
  });
}
