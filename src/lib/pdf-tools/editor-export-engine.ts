import { PDFDocument, rgb, type PDFPage } from "pdf-lib";

import { createHighlightLayer } from "../../engines/highlight/highlightEngine";
import { prepareHighlightExportPlan } from "../../engines/highlight/highlightExporter";
import type { PdfPageGeometryContext } from "../../engines/shared/types";
import {
  drawEditorRichTextObject,
  embedEditorTextFonts,
  type EmbeddedTextFonts,
  type ExportTextRun,
} from "./editor-rich-text-engine";
import { drawEditorWhiteout } from "./editor-whiteout-engine";
import { drawEditorImageObject } from "./editor-image-engine";
import { drawEditorSignatureObject } from "./editor-signature-engine";
import { drawEditorShapeObject } from "./editor-shape-engine";

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

const DEFAULT_HIGHLIGHT_COLOR = "#FDE047";
const HIGHLIGHT_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

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

function getSafeHighlightColor(color: string | undefined) {
  if (!color || !HIGHLIGHT_COLOR_PATTERN.test(color)) {
    return DEFAULT_HIGHLIGHT_COLOR;
  }

  return color.toUpperCase();
}

function getSafeOpacity(opacity: number | undefined, fallback: number) {
  if (!Number.isFinite(opacity)) return fallback;

  return clamp(Number(opacity), 0, 1);
}

function getPageGeometryContext(page: PDFPage, pageIndex: number): PdfPageGeometryContext {
  const width = Math.max(page.getWidth(), 1);
  const height = Math.max(page.getHeight(), 1);

  return {
    pageIndex,
    pageNumber: pageIndex + 1,
    rotation: 0,
    pdfSize: {
      width,
      height,
    },
    viewportSize: {
      width,
      height,
    },
  };
}

function getNormalizedEditorBox(object: EditorExportObject, page: PDFPage) {
  const pageWidth = Math.max(page.getWidth(), 1);
  const pageHeight = Math.max(page.getHeight(), 1);

  const left = clamp(object.box.x / pageWidth, 0, 1);
  const top = clamp(object.box.y / pageHeight, 0, 1);
  const right = clamp((object.box.x + object.box.width) / pageWidth, 0, 1);
  const bottom = clamp((object.box.y + object.box.height) / pageHeight, 0, 1);

  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

function drawLegacyHighlightFallback(page: PDFPage, object: EditorExportObject) {
  const pageHeight = page.getHeight();
  const color = hexToRgb(object.data.backgroundColor || "#fde047");

  page.drawRectangle({
    x: object.box.x,
    y: pageHeight - object.box.y - object.box.height,
    width: object.box.width,
    height: object.box.height,
    color: rgb(color.r, color.g, color.b),
    opacity: object.data.opacity ?? 0.45,
  });
}

function drawHighlightObjectWithSharedEngine(page: PDFPage, object: EditorExportObject, pageIndex: number) {
  try {
    const geometry = getPageGeometryContext(page, pageIndex);
    const normalizedBounds = getNormalizedEditorBox(object, page);

    const layer = createHighlightLayer({
      id: object.id,
      pageIndex,
      creationSource: "freeform-drag",
      style: {
        color: getSafeHighlightColor(object.data.backgroundColor),
        opacity: getSafeOpacity(object.data.opacity, 0.45),
      },
      regions: [
        {
          id: `${object.id}-region`,
          pageIndex,
          bounds: normalizedBounds,
          source: "freeform",
          granularity: "freeform",
          readingOrder: 0,
        },
      ],
    });

    const plan = prepareHighlightExportPlan({
      layers: [layer],
      pageGeometryContexts: [geometry],
    });

    for (const command of plan.flatCommands) {
      page.drawRectangle({
        x: command.pdfBounds.x,
        y: command.pdfBounds.y,
        width: command.pdfBounds.width,
        height: command.pdfBounds.height,
        color: rgb(command.color.r, command.color.g, command.color.b),
        opacity: command.opacity,
        borderWidth: 0,
      });
    }
  } catch {
    drawLegacyHighlightFallback(page, object);
  }
}

async function drawEditorObject({
  pdfDoc,
  page,
  object,
  fonts,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorExportObject;
  readonly fonts: EmbeddedTextFonts;
}) {
  const pageIndex = object.pageNumber - 1;

  if (object.type === "text") {
    drawEditorRichTextObject(page, object, fonts);
    return;
  }

  if (object.type === "highlight") {
    drawHighlightObjectWithSharedEngine(page, object, pageIndex);
    return;
  }

  if (object.type === "whiteout") {
    drawEditorWhiteout(page, object.box, {
      opacity: object.data.opacity ?? 1,
    });
    return;
  }

  if (object.type === "shape") {
    drawEditorShapeObject(page, object);
    return;
  }

  if (object.type === "image") {
    await drawEditorImageObject({
      pdfDoc,
      page,
      object,
    });
    return;
  }

  if (object.type === "signature") {
    await drawEditorSignatureObject({
      pdfDoc,
      page,
      object,
    });
  }
}

export async function exportEditorPdfBytes({
  fileBytes,
  objects,
}: {
  readonly fileBytes: Uint8Array;
  readonly objects: readonly EditorExportObject[];
}) {
  const pdfDoc = await PDFDocument.load(fileBytes);
  const fonts = await embedEditorTextFonts(pdfDoc);
  const pages = pdfDoc.getPages();

  for (const object of objects) {
    const page = pages[object.pageNumber - 1];
    if (!page) continue;

    await drawEditorObject({
      pdfDoc,
      page,
      object,
      fonts,
    });
  }

  return pdfDoc.save();
}
