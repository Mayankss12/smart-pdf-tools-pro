import { PDFDocument, rgb, type PDFPage } from "pdf-lib";
import { pdfLiteralString } from "../pdf-string";
import type { ExistingTextEditSource } from "../editor/existing-text-edit";
import type { BundledUnicodeFontBytes } from "../pdf-unicode-fonts";
import type { OcrResult } from "../pdf-ocr-engine";
import { addSearchableTextLayer } from "../pdf-text-overlay";

import {
  createEditorFormFields,
  type EditorFormFieldConfig,
} from "./editor-form-engine";
import {
  drawEditorRichTextObject,
  embedEditorTextFonts,
  type EmbeddedTextFonts,
  type ExportTextRun,
} from "./editor-rich-text-engine";
import { drawEditorWhiteout } from "./editor-whiteout-engine";
import { drawEditorImageObject } from "./editor-image-engine";
import { appendEditorLinkAnnotation } from "./editor-link-engine";
import { drawEditorNoteObject } from "./editor-note-engine";
import { drawEditorSignatureObject } from "./editor-signature-engine";
import {
  drawEditorShapeObject,
  getEditorShapeLineEndpoints,
  getEditorShapeType,
} from "./editor-shape-engine";
import {
  drawEditorDrawObject,
  getEditorDrawStrokePoints,
} from "./editor-draw-engine";
import {
  appendEditorMarkupAnnotation,
  getEditorAnnotationQuadPoints,
  toEditorAnnotationColor,
  toEditorAnnotationText,
  type EditorAnnotationEntries,
  type EditorAnnotationPointMapper,
} from "./editor-annotation-engine";
import { drawEditorGeneratedStamp } from "./editor-stamp-engine";
import type {
  EditorStampFormat,
  EditorStampPreset,
} from "../editor/editor-stamp";
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
  readonly stampPreset?: EditorStampPreset;
  readonly stampFormat?: EditorStampFormat;
  readonly stampAuthorizedName?: string;
  readonly stampDate?: string;
  readonly stampColor?: string;
  readonly pathData?: string;
  readonly shapeType?: "rectangle" | "circle" | "line" | "arrow";
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly fillColor?: string;
  readonly lineStart?: EditorExportPoint;
  readonly lineEnd?: EditorExportPoint;
  readonly sourceTextEdit?: ExistingTextEditSource;
  readonly linkUrl?: string;
  readonly formField?: EditorFormFieldConfig;
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

// "annotations" keeps highlights, notes, shapes and ink editable in other PDF
// apps; "flatten" paints them into the page content.
export type EditorMarkupExportMode = "annotations" | "flatten";

const DEFAULT_HIGHLIGHT_COLOR = "#fde047";
const DEFAULT_NOTE_COLOR = "#fef3c7";
const DEFAULT_STROKE_COLOR = "#111827";
const ANNOTATION_PADDING = 8;

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
    if (!object.data.formField) {
      drawEditorShapeObject(page, object, geometry);
    }
    return;
  }

  if (object.type === "draw") {
    drawEditorDrawObject(page, object, geometry);
    return;
  }

  if (
    object.type === "stamp" &&
    !object.data.imageDataUrl
  ) {
    drawEditorGeneratedStamp(page, object, fonts, geometry);
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

function isMarkupAnnotationObject(object: EditorExportObject) {
  if (object.data.linkUrl) return false;
  if (object.type === "shape") return !object.data.formField;

  return (
    object.type === "highlight" ||
    object.type === "note" ||
    object.type === "draw"
  );
}

function getMarkupAnnotationSpec(
  object: EditorExportObject,
): {
  readonly subtype: "Highlight" | "FreeText" | "Square" | "Circle" | "Line" | "Ink";
  readonly padding: number;
  readonly entries: (
    mapPoint: EditorAnnotationPointMapper,
    geometry: EditorPageGeometry,
  ) => EditorAnnotationEntries;
} {
  const strokeEntries = (): EditorAnnotationEntries => ({
    C: toEditorAnnotationColor(object.data.strokeColor, DEFAULT_STROKE_COLOR),
    BS: { W: object.data.strokeWidth ?? 2, S: "S" },
  });

  if (object.type === "highlight") {
    return {
      subtype: "Highlight",
      padding: 0,
      entries: (mapPoint, geometry) => ({
        C: toEditorAnnotationColor(object.data.backgroundColor, DEFAULT_HIGHLIGHT_COLOR),
        QuadPoints: getEditorAnnotationQuadPoints(object.box, geometry, mapPoint),
      }),
    };
  }

  if (object.type === "note") {
    const fontSize = Number.isFinite(object.data.fontSize) ? Number(object.data.fontSize) : 14;
    return {
      subtype: "FreeText",
      padding: 1,
      entries: () => ({
        Contents: toEditorAnnotationText(object.data.text ?? ""),
        C: toEditorAnnotationColor(object.data.backgroundColor, DEFAULT_NOTE_COLOR),
        DA: pdfLiteralString(`/Helv ${fontSize} Tf 0 g`),
      }),
    };
  }

  if (object.type === "draw") {
    return {
      subtype: "Ink",
      padding: ANNOTATION_PADDING,
      entries: (mapPoint, geometry) => ({
        ...strokeEntries(),
        InkList: [
          getEditorDrawStrokePoints(object, geometry).flatMap((point) => [...mapPoint(point)]),
        ],
      }),
    };
  }

  const shapeType = getEditorShapeType(object);

  if (shapeType === "rectangle" || shapeType === "circle") {
    const fill = object.data.fillColor?.trim().toLowerCase();
    const hasFill = Boolean(fill && fill !== "none" && fill !== "transparent");
    return {
      subtype: shapeType === "rectangle" ? "Square" : "Circle",
      padding: ANNOTATION_PADDING,
      entries: () => ({
        ...strokeEntries(),
        ...(hasFill
          ? { IC: toEditorAnnotationColor(object.data.fillColor, DEFAULT_STROKE_COLOR) }
          : {}),
      }),
    };
  }

  return {
    subtype: "Line",
    padding: ANNOTATION_PADDING,
    entries: (mapPoint, geometry) => {
      const { start, end } = getEditorShapeLineEndpoints(object, geometry);
      return {
        ...strokeEntries(),
        L: [...mapPoint(start), ...mapPoint(end)],
        LE: ["None", shapeType === "arrow" ? "OpenArrow" : "None"],
      };
    },
  };
}

function getEditorTextSamples(objects: readonly EditorExportObject[]) {
  const samples: string[] = [];

  for (const object of objects) {
    if (object.data.text) samples.push(object.data.text);
    if (object.data.stampLabel) samples.push(object.data.stampLabel);
    if (object.data.stampPreset) samples.push(object.data.stampPreset);
    if (object.data.stampAuthorizedName) samples.push(object.data.stampAuthorizedName);
    object.data.textRuns?.forEach((run) => {
      if (run.text) samples.push(run.text);
    });
  }

  return samples;
}

export async function exportEditorPdfBytes({
  fileBytes,
  objects,
  ocrPages = [],
  unicodeFontBytes,
  markupMode = "annotations",
}: {
  readonly fileBytes: Uint8Array;
  readonly objects: readonly EditorExportObject[];
  readonly ocrPages?: readonly EditorExportOcrPage[];
  readonly unicodeFontBytes?: BundledUnicodeFontBytes;
  readonly markupMode?: EditorMarkupExportMode;
}) {
  const asAnnotation = (object: EditorExportObject) =>
    markupMode === "annotations" && isMarkupAnnotationObject(object);
  const pdfDoc = await PDFDocument.load(fileBytes);
  const fonts = await embedEditorTextFonts(
    pdfDoc,
    getEditorTextSamples(objects),
    unicodeFontBytes,
  );
  const pages = pdfDoc.getPages();

  for (const object of objects) {
    const sourceTextEdit = object.data.sourceTextEdit;
    if (!sourceTextEdit) continue;

    const page = pages[object.pageNumber - 1];
    if (!page) continue;
    const geometry = getEditorPageGeometry(page);

    await withEditorPageTransform(page, geometry, () => {
      drawEditorWhiteout(page, sourceTextEdit.coverBox, geometry, {
        opacity: 1,
      });
    });
  }

  for (const object of objects) {
    const page = pages[object.pageNumber - 1];
    if (!page || asAnnotation(object)) continue;
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

  for (const object of objects) {
    const page = pages[object.pageNumber - 1];
    if (!page || !asAnnotation(object)) continue;
    const spec = getMarkupAnnotationSpec(object);

    await appendEditorMarkupAnnotation({
      pdfDoc,
      page,
      id: object.id,
      subtype: spec.subtype,
      box: object.box,
      padding: spec.padding,
      entries: spec.entries,
      draw: (appearancePage, appearanceGeometry) =>
        drawEditorObject({
          pdfDoc,
          page: appearancePage,
          object,
          fonts,
          geometry: appearanceGeometry,
        }),
    });
  }

  for (const object of objects) {
    if (!object.data.linkUrl || object.data.formField) continue;

    const page = pages[object.pageNumber - 1];
    if (!page) continue;

    appendEditorLinkAnnotation({
      pdfDoc,
      page,
      box: object.box,
      geometry: getEditorPageGeometry(page),
      url: object.data.linkUrl,
    });
  }

  await createEditorFormFields({
    pdfDoc,
    objects,
    getGeometry: getEditorPageGeometry,
  });

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
