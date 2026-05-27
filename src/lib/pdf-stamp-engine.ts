import { StandardFonts, degrees, rgb } from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

export type StampFontStyle = "regular" | "bold" | "italic" | "boldItalic";

export type TextStampOptions = {
  text: string;
  fontSize: number;
  opacity: number;
  angle: number;
  fontStyle: StampFontStyle;
};

const FONT_MAP: Record<StampFontStyle, StandardFonts> = {
  regular: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  italic: StandardFonts.HelveticaOblique,
  boldItalic: StandardFonts.HelveticaBoldOblique,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export async function addTextStampToPdf(
  file: File,
  options: TextStampOptions,
): Promise<PdfProcessingResult> {
  const text = options.text.trim();

  if (!text) {
    throw new PdfEngineError("PROCESSING_FAILED", "Enter text first.");
  }

  const pdf = await loadPdfDocument(file);
  const fontSize = clamp(options.fontSize, 8, 220);
  const opacity = clamp(options.opacity, 0.04, 0.85);
  const angle = clamp(options.angle, -90, 90);
  const font = await pdf.embedFont(FONT_MAP[options.fontStyle] ?? StandardFonts.HelveticaBold);

  pdf.getPages().forEach((page) => {
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, fontSize);

    page.drawText(text, {
      x: width / 2 - textWidth / 2,
      y: height / 2,
      size: fontSize,
      font,
      color: rgb(0.28, 0.2, 0.82),
      rotate: degrees(angle),
      opacity,
    });
  });

  return savePdfResult(pdf, file.size, createPdfFileName("stamped", file.name));
}
