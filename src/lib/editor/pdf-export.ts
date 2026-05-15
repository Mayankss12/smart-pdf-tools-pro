import {
  PDFDocument,
  PDFImage,
  PDFPage,
  rgb,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";

export type PdfExportMode = "all" | "current" | "range";

export type PdfExportRange = {
  from: number;
  to: number;
};

export type ExportTextLayer = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  opacity?: number;
};

export type ExportImageLayer = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  opacity?: number;
};

export type ExportSignatureLayer = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src?: string;
  dataUrl?: string;
  opacity?: number;
};

export type ExportHighlightLayer = {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
};

export type PdfExportInput = {
  originalPdfBytes: ArrayBuffer | Uint8Array;
  mode: PdfExportMode;
  currentPage?: number;
  range?: PdfExportRange;
  textLayers?: ExportTextLayer[];
  imageLayers?: ExportImageLayer[];
  signatureLayers?: ExportSignatureLayer[];
  highlightLayers?: ExportHighlightLayer[];
};

const DEFAULT_HIGHLIGHT_COLOR = "#fff176";
const DEFAULT_TEXT_COLOR = "#111827";

function normalizeBytes(bytes: ArrayBuffer | Uint8Array): Uint8Array {
  if (bytes instanceof Uint8Array) return bytes;
  return new Uint8Array(bytes);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex?: string) {
  const safeHex = (hex || DEFAULT_TEXT_COLOR).replace("#", "");

  if (safeHex.length !== 6) {
    return rgb(0.067, 0.094, 0.153);
  }

  const r = parseInt(safeHex.slice(0, 2), 16) / 255;
  const g = parseInt(safeHex.slice(2, 4), 16) / 255;
  const b = parseInt(safeHex.slice(4, 6), 16) / 255;

  return rgb(r, g, b);
}

function getPagesToExport(
  totalPages: number,
  mode: PdfExportMode,
  currentPage?: number,
  range?: PdfExportRange
): number[] {
  if (mode === "current") {
    const page = clamp(currentPage || 1, 1, totalPages);
    return [page];
  }

  if (mode === "range" && range) {
    const from = clamp(Math.min(range.from, range.to), 1, totalPages);
    const to = clamp(Math.max(range.from, range.to), 1, totalPages);

    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
  }

  return Array.from({ length: totalPages }, (_, index) => index + 1);
}

function browserYToPdfY(page: PDFPage, browserY: number, elementHeight = 0): number {
  return page.getHeight() - browserY - elementHeight;
}

async function embedImageFromDataUrl(
  pdfDoc: PDFDocument,
  dataUrl: string
): Promise<PDFImage | null> {
  try {
    if (dataUrl.startsWith("data:image/png")) {
      return await pdfDoc.embedPng(dataUrl);
    }

    if (
      dataUrl.startsWith("data:image/jpeg") ||
      dataUrl.startsWith("data:image/jpg")
    ) {
      return await pdfDoc.embedJpg(dataUrl);
    }

    return null;
  } catch {
    return null;
  }
}

function getFontName(layer: ExportTextLayer): StandardFonts {
  if (layer.bold && layer.italic) return StandardFonts.HelveticaBoldOblique;
  if (layer.bold) return StandardFonts.HelveticaBold;
  if (layer.italic) return StandardFonts.HelveticaOblique;

  return StandardFonts.Helvetica;
}

async function drawHighlights(
  page: PDFPage,
  highlights: ExportHighlightLayer[]
): Promise<void> {
  for (const highlight of highlights) {
    page.drawRectangle({
      x: highlight.x,
      y: browserYToPdfY(page, highlight.y, highlight.height),
      width: highlight.width,
      height: highlight.height,
      color: hexToRgb(highlight.color || DEFAULT_HIGHLIGHT_COLOR),
      opacity: highlight.opacity ?? 0.35,
      borderOpacity: 0,
    });
  }
}

async function drawTextLayers(
  pdfDoc: PDFDocument,
  page: PDFPage,
  textLayers: ExportTextLayer[],
  fontCache: Map<StandardFonts, PDFFont>
): Promise<void> {
  for (const layer of textLayers) {
    const fontName = getFontName(layer);

    let font = fontCache.get(fontName);

    if (!font) {
      font = await pdfDoc.embedFont(fontName);
      fontCache.set(fontName, font);
    }

    const fontSize = layer.fontSize || 16;
    const lineHeight = fontSize * 1.25;
    const textColor = hexToRgb(layer.color || DEFAULT_TEXT_COLOR);
    const lines = layer.text.split("\n");

    lines.forEach((line, index) => {
      page.drawText(line, {
        x: layer.x,
        y: browserYToPdfY(page, layer.y + index * lineHeight, fontSize),
        size: fontSize,
        font,
        color: textColor,
        opacity: layer.opacity ?? 1,
        maxWidth: layer.width,
        lineHeight,
      });
    });
  }
}

async function drawImageLayers(
  pdfDoc: PDFDocument,
  page: PDFPage,
  imageLayers: ExportImageLayer[]
): Promise<void> {
  for (const layer of imageLayers) {
    const image = await embedImageFromDataUrl(pdfDoc, layer.src);

    if (!image) continue;

    page.drawImage(image, {
      x: layer.x,
      y: browserYToPdfY(page, layer.y, layer.height),
      width: layer.width,
      height: layer.height,
      opacity: layer.opacity ?? 1,
    });
  }
}

async function drawSignatureLayers(
  pdfDoc: PDFDocument,
  page: PDFPage,
  signatureLayers: ExportSignatureLayer[]
): Promise<void> {
  for (const layer of signatureLayers) {
    const source = layer.src || layer.dataUrl;

    if (!source) continue;

    const image = await embedImageFromDataUrl(pdfDoc, source);

    if (!image) continue;

    page.drawImage(image, {
      x: layer.x,
      y: browserYToPdfY(page, layer.y, layer.height),
      width: layer.width,
      height: layer.height,
      opacity: layer.opacity ?? 1,
    });
  }
}

export async function exportEditedPdf(input: PdfExportInput): Promise<Uint8Array> {
  const sourcePdf = await PDFDocument.load(normalizeBytes(input.originalPdfBytes));
  const outputPdf = await PDFDocument.create();

  const totalPages = sourcePdf.getPageCount();
  const pagesToExport = getPagesToExport(
    totalPages,
    input.mode,
    input.currentPage,
    input.range
  );

  const copiedPages = await outputPdf.copyPages(
    sourcePdf,
    pagesToExport.map((pageNumber) => pageNumber - 1)
  );

  copiedPages.forEach((page) => outputPdf.addPage(page));

  const fontCache = new Map<StandardFonts, PDFFont>();

  for (let index = 0; index < pagesToExport.length; index += 1) {
    const originalPageNumber = pagesToExport[index];
    const page = outputPdf.getPage(index);

    const pageHighlights =
      input.highlightLayers?.filter(
        (layer) => layer.pageNumber === originalPageNumber
      ) || [];

    const pageTextLayers =
      input.textLayers?.filter((layer) => layer.pageNumber === originalPageNumber) ||
      [];

    const pageImageLayers =
      input.imageLayers?.filter(
        (layer) => layer.pageNumber === originalPageNumber
      ) || [];

    const pageSignatureLayers =
      input.signatureLayers?.filter(
        (layer) => layer.pageNumber === originalPageNumber
      ) || [];

    await drawHighlights(page, pageHighlights);
    await drawImageLayers(outputPdf, page, pageImageLayers);
    await drawSignatureLayers(outputPdf, page, pageSignatureLayers);
    await drawTextLayers(outputPdf, page, pageTextLayers, fontCache);
  }

  return outputPdf.save();
}

export function downloadPdfFile(bytes: Uint8Array, filename = "edited-pdf.pdf") {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
}
