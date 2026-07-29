import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import type { OcrResult } from "../pdf-ocr-engine";
import { addSearchableTextLayer } from "../pdf-text-overlay";

import {
  drawEditorRichTextObject,
  embedEditorTextFonts,
  type EmbeddedTextFonts,
  type ExportTextRun,
} from "./editor-rich-text-engine";
import { drawEditorWhiteout } from "./editor-whiteout-engine";
import { drawEditorImageObject } from "./editor-image-engine";
import { drawEditorNoteObject } from "./editor-note-engine";
import { drawEditorSignatureObject } from "./editor-signature-engine";
import { drawEditorShapeObject } from "./editor-shape-engine";
import { drawEditorDrawObject } from "./editor-draw-engine";
import {
  getEditorPageGeometry,
  withEditorPageTransform,
  type EditorPageGeometry,
} from "./editor-page-geometry";

type EditorExportBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type EditorExportPoint = {
  readonly x: number;
  readonly y: number;
};

type EditorExportObjectData = {
  readonly text?: string;
  readonly textRuns?: readonly ExportTextRun[];
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "bold" | "700";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly opacity?: number;
  readonly imageDataUrl?: string;
  readonly stampLabel?: string;
  readonly pathData?: string;
  readonly shapeType?: "rectangle" | "circle" | "line" | "arrow";
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly fillColor?: string;
  readonly lineStart?: EditorExportPoint;
  readonly lineEnd?: EditorExportPoint;
};

export type EditorExportObject = {
  readonly id: string;
  readonly type: string;
  readonly pageNumber: number;
  readonly box: EditorExportBox;
  readonly data: EditorExportObjectData;
};

export type EditorExportOcrPage = {
  readonly pageNumber: number;
  readonly result: OcrResult;
};

const DEFAULT_HIGHLIGHT_COLOR = "#fde047";

export function safeEditedName(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `PDFMantra-edited-${cleanName}.pdf`;
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
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

function getSafeOpacity(opacity: number | undefined, fallback: number) {
  if (!Number.isFinite(opacity)) return fallback;

  return clamp(Number(opacity), 0, 1);
}

function drawHighlightObject(
  page: PDFPage,
  object: EditorExportObject,
  geometry: EditorPageGeometry,
) {
  const width = clamp(object.box.width, 0, geometry.viewportWidth);
  const height = clamp(object.box.height, 0, geometry.viewportHeight);
  const x = clamp(object.box.x, 0, Math.max(0, geometry.viewportWidth - width));
  const y = clamp(object.box.y, 0, Math.max(0, geometry.viewportHeight - height));
  const opacity = getSafeOpacity(object.data.opacity, 0.45);

  if (width <= 0 || height <= 0 || opacity <= 0) return;

  const color = hexToRgb(object.data.backgroundColor || DEFAULT_HIGHLIGHT_COLOR);

  page.drawRectangle({
    x,
    y: geometry.viewportHeight - y - height,
    width,
    height,
    color: rgb(color.r, color.g, color.b),
    opacity,
    borderWidth: 0,
  });
}

async function drawEditorObject({
  pdfDoc,
  page,
  object,
  fonts,
  geometry,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorExportObject;
  readonly fonts: EmbeddedTextFonts;
  readonly geometry: EditorPageGeometry;
}) {
  if (object.type === "text") {
    drawEditorRichTextObject(page, object, fonts, geometry);
    return;
  }

  if (object.type === "highlight") {
    drawHighlightObject(page, object, geometry);
    return;
  }

  if (object.type === "whiteout") {
    drawEditorWhiteout(page, object.box, geometry, {
      opacity: object.data.opacity ?? 1,
    });
    return;
  }

  if (object.type === "note") {
    drawEditorNoteObject(page, object, fonts, geometry);
    return;
  }

  if (object.type === "shape") {
    drawEditorShapeObject(page, object, geometry);
    return;
  }

  if (object.type === "draw") {
    drawEditorDrawObject(page, object, geometry);
    return;
  }

  if (
    object.type === "stamp" &&
    !object.data.imageDataUrl &&
    object.data.stampLabel
  ) {
    drawEditorRichTextObject(
      page,
      {
        box: object.box,
        data: {
          text: object.data.stampLabel,
          fontSize: Math.max(10, Math.min(28, object.box.height * 0.4)),
          fontWeight: "bold",
          color: object.data.color ?? "#92400e",
          opacity: object.data.opacity,
        },
      },
      fonts,
      geometry,
    );
    return;
  }

  if (object.type === "image" || object.type === "stamp") {
    await drawEditorImageObject({
      pdfDoc,
      page,
      object,
      geometry,
    });
    return;
  }

  if (object.type === "signature") {
    await drawEditorSignatureObject({
      pdfDoc,
      page,
      object,
      geometry,
    });
  }
}

export async function exportEditorPdfBytes({
  fileBytes,
  objects,
  ocrPages = [],
}: {
  readonly fileBytes: Uint8Array;
  readonly objects: readonly EditorExportObject[];
  readonly ocrPages?: readonly EditorExportOcrPage[];
}) {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const fonts = await embedEditorTextFonts(pdfDoc);
  const pages = pdfDoc.getPages();

  for (const object of objects) {
    const page = pages[object.pageNumber - 1];
    if (!page) continue;
    const geometry = getEditorPageGeometry(page);

    await withEditorPageTransform(page, geometry, () =>
      drawEditorObject({
        pdfDoc,
        page,
        object,
        fonts,
        geometry,
      }),
    );
  }

  if (ocrPages.length > 0) {
    const ocrResults: Array<OcrResult | undefined> = Array.from({
      length: pages.length,
    });
    const placements = ocrPages.flatMap(({ pageNumber, result }) => {
      const page = pages[pageNumber - 1];
      if (!page) return [];

      const geometry = getEditorPageGeometry(page);
      ocrResults[pageNumber - 1] = result;

      return [{
        pageIndex: pageNumber - 1,
        imageWidth: result.imageData.width,
        imageHeight: result.imageData.height,
        drawX: 0,
        drawY: 0,
        drawWidth: geometry.viewportWidth,
        drawHeight: geometry.viewportHeight,
        pageWidth: geometry.viewportWidth,
        pageHeight: geometry.viewportHeight,
      }];
    });

    await addSearchableTextLayer(pdfDoc, {
      ocrResults,
      placements,
    });
  }

  return pdfDoc.save();
}
