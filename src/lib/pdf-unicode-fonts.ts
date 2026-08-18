import "regenerator-runtime/runtime.js";

import fontkit from "@pdf-lib/fontkit";
import {
  StandardFonts,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "pdf-lib";

import { PdfEngineError } from "@/lib/pdf-errors";

export type UnicodeBaseFont = "helvetica" | "times" | "courier";

export type BundledUnicodeFontBytes = {
  readonly latin: Uint8Array;
  readonly devanagari: Uint8Array;
};

export type EmbeddedUnicodeFonts = {
  readonly base: PDFFont;
  readonly boldBase: PDFFont;
  readonly italicBase: PDFFont;
  readonly boldItalicBase: PDFFont;
  readonly latin: PDFFont;
  readonly devanagari: PDFFont;
  readonly replacement: string;
  readonly supportedCodePoints: {
    readonly base: ReadonlySet<number>;
    readonly boldBase: ReadonlySet<number>;
    readonly italicBase: ReadonlySet<number>;
    readonly boldItalicBase: ReadonlySet<number>;
    readonly latin: ReadonlySet<number>;
    readonly devanagari: ReadonlySet<number>;
  };
};

export type SanitizedUnicodeText = {
  readonly text: string;
  readonly replacementCount: number;
};

type FontRun = {
  readonly text: string;
  readonly font: PDFFont;
};

const BASE_FONT_MAP: Record<
  UnicodeBaseFont,
  {
    readonly regular: StandardFonts;
    readonly bold: StandardFonts;
    readonly italic: StandardFonts;
    readonly boldItalic: StandardFonts;
  }
> = {
  helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    boldItalic: StandardFonts.HelveticaBoldOblique,
  },
  times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    boldItalic: StandardFonts.TimesRomanBoldItalic,
  },
  courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    boldItalic: StandardFonts.CourierBoldOblique,
  },
};

let bundledFontPromise: Promise<BundledUnicodeFontBytes> | null = null;

async function fetchFont(path: string) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      `Required Unicode font asset could not be loaded (${path}).`,
    );
  }
  return new Uint8Array(await response.arrayBuffer());
}

export function loadBundledUnicodeFontBytes() {
  bundledFontPromise ??= Promise.all([
    fetchFont("/fonts/NotoSans-Regular.ttf"),
    fetchFont("/fonts/NotoSansDevanagari-Regular.ttf"),
  ]).then(([latin, devanagari]) => ({ latin, devanagari }));

  return bundledFontPromise;
}

export async function embedUnicodeFonts(
  pdf: PDFDocument,
  baseFont: UnicodeBaseFont,
  bytes?: BundledUnicodeFontBytes,
): Promise<EmbeddedUnicodeFonts> {
  const fontBytes = bytes ?? (await loadBundledUnicodeFontBytes());
  pdf.registerFontkit(fontkit);

  const [base, boldBase, italicBase, boldItalicBase, latin, devanagari] = await Promise.all([
    pdf.embedFont(BASE_FONT_MAP[baseFont].regular),
    pdf.embedFont(BASE_FONT_MAP[baseFont].bold),
    pdf.embedFont(BASE_FONT_MAP[baseFont].italic),
    pdf.embedFont(BASE_FONT_MAP[baseFont].boldItalic),
    pdf.embedFont(fontBytes.latin, { subset: true }),
    pdf.embedFont(fontBytes.devanagari, { subset: true }),
  ]);
  const supportedCodePoints = {
    base: new Set(base.getCharacterSet()),
    boldBase: new Set(boldBase.getCharacterSet()),
    italicBase: new Set(italicBase.getCharacterSet()),
    boldItalicBase: new Set(boldItalicBase.getCharacterSet()),
    latin: new Set(latin.getCharacterSet()),
    devanagari: new Set(devanagari.getCharacterSet()),
  };
  const replacement = supportedCodePoints.latin.has(0x25a1) ? "□" : "?";

  return {
    base,
    boldBase,
    italicBase,
    boldItalicBase,
    latin,
    devanagari,
    replacement,
    supportedCodePoints,
  };
}

function isControlCharacter(codePoint: number) {
  return (
    codePoint === 0 ||
    (codePoint < 0x20 && codePoint !== 0x09 && codePoint !== 0x0a)
  );
}

function getBaseFontSelection(
  fonts: EmbeddedUnicodeFonts,
  bold: boolean,
  italic: boolean,
) {
  if (bold && italic) {
    return {
      font: fonts.boldItalicBase,
      supported: fonts.supportedCodePoints.boldItalicBase,
    };
  }
  if (bold) {
    return { font: fonts.boldBase, supported: fonts.supportedCodePoints.boldBase };
  }
  if (italic) {
    return { font: fonts.italicBase, supported: fonts.supportedCodePoints.italicBase };
  }
  return { font: fonts.base, supported: fonts.supportedCodePoints.base };
}

function supportsCharacter(
  character: string,
  fonts: EmbeddedUnicodeFonts,
  bold: boolean,
  italic = false,
) {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) return false;
  const base = getBaseFontSelection(fonts, bold, italic);

  return (
    base.supported.has(codePoint) ||
    fonts.supportedCodePoints.latin.has(codePoint) ||
    fonts.supportedCodePoints.devanagari.has(codePoint)
  );
}

export function sanitizeUnicodeText(
  value: string,
  fonts: EmbeddedUnicodeFonts,
  bold = false,
  italic = false,
): SanitizedUnicodeText {
  let text = "";
  let replacementCount = 0;

  for (const character of value.replace(/\r\n?/g, "\n")) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined || isControlCharacter(codePoint)) continue;

    if (
      character === "\n" ||
      character === "\t" ||
      supportsCharacter(character, fonts, bold, italic)
    ) {
      text += character === "\t" ? "    " : character;
      continue;
    }

    text += fonts.replacement;
    replacementCount += 1;
  }

  return { text, replacementCount };
}

function getFontForCharacter(
  character: string,
  fonts: EmbeddedUnicodeFonts,
  bold: boolean,
  italic: boolean,
) {
  const codePoint = character.codePointAt(0) ?? 0;
  if (
    codePoint >= 0x0900 &&
    codePoint <= 0x097f &&
    fonts.supportedCodePoints.devanagari.has(codePoint)
  ) {
    return fonts.devanagari;
  }

  const base = getBaseFontSelection(fonts, bold, italic);
  if (base.supported.has(codePoint)) return base.font;
  if (fonts.supportedCodePoints.latin.has(codePoint)) return fonts.latin;
  return fonts.latin;
}

function splitFontRuns(
  text: string,
  fonts: EmbeddedUnicodeFonts,
  bold: boolean,
  italic: boolean,
) {
  const runs: FontRun[] = [];

  for (const character of text) {
    const font = getFontForCharacter(character, fonts, bold, italic);
    const previous = runs.at(-1);
    if (previous?.font === font) {
      runs[runs.length - 1] = {
        text: previous.text + character,
        font,
      };
    } else {
      runs.push({ text: character, font });
    }
  }

  return runs;
}

export function measureUnicodeText(
  text: string,
  size: number,
  fonts: EmbeddedUnicodeFonts,
  bold = false,
  italic = false,
) {
  return splitFontRuns(text, fonts, bold, italic).reduce(
    (width, run) => width + run.font.widthOfTextAtSize(run.text, size),
    0,
  );
}

export function drawUnicodeTextLine({
  page,
  text,
  x,
  y,
  size,
  fonts,
  bold = false,
  italic = false,
  color,
  opacity = 1,
}: {
  readonly page: PDFPage;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly fonts: EmbeddedUnicodeFonts;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly color: RGB;
  readonly opacity?: number;
}) {
  let cursorX = x;

  for (const run of splitFontRuns(text, fonts, bold, italic)) {
    try {
      const width = run.font.widthOfTextAtSize(run.text, size);
      page.drawText(run.text, {
        x: cursorX,
        y,
        size,
        font: run.font,
        color,
        opacity,
      });
      cursorX += width;
    } catch {
      for (const character of run.text) {
        const fallback =
          supportsCharacter(character, fonts, bold, italic)
            ? character
            : fonts.replacement;
        try {
          const fallbackFont = getFontForCharacter(
            fallback,
            fonts,
            bold,
            italic,
          );
          const width = fallbackFont.widthOfTextAtSize(fallback, size);
          page.drawText(fallback, {
            x: cursorX,
            y,
            size,
            font: fallbackFont,
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

  return cursorX;
}