import {
  PDFArray,
  PDFDocument,
  PDFName,
  PDFString,
  type PDFPage,
} from "pdf-lib";

import type { EditorPageGeometry } from "./editor-page-geometry";

export type EditorLinkBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type EditorLinkRect = readonly [number, number, number, number];

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function normalizeEditorLinkUrl(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    const protocol = url.protocol.toLowerCase();

    if (protocol !== "http:" && protocol !== "https:" && protocol !== "mailto:") {
      return null;
    }

    if ((protocol === "http:" || protocol === "https:") && !url.hostname) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function transformPoint(
  x: number,
  y: number,
  geometry: EditorPageGeometry,
): readonly [number, number] {
  const { rotation, pdfWidth, pdfHeight, pdfOriginX, pdfOriginY } = geometry;

  if (rotation === 90) {
    return [pdfOriginX + pdfWidth - y, pdfOriginY + x];
  }

  if (rotation === 180) {
    return [pdfOriginX + pdfWidth - x, pdfOriginY + pdfHeight - y];
  }

  if (rotation === 270) {
    return [pdfOriginX + y, pdfOriginY + pdfHeight - x];
  }

  return [pdfOriginX + x, pdfOriginY + y];
}

export function getEditorLinkPdfRect(
  box: EditorLinkBox,
  geometry: EditorPageGeometry,
): EditorLinkRect {
  const width = clamp(box.width, 0, geometry.viewportWidth);
  const height = clamp(box.height, 0, geometry.viewportHeight);
  const x = clamp(box.x, 0, Math.max(0, geometry.viewportWidth - width));
  const top = clamp(box.y, 0, Math.max(0, geometry.viewportHeight - height));
  const bottom = geometry.viewportHeight - top - height;

  const points = [
    transformPoint(x, bottom, geometry),
    transformPoint(x + width, bottom, geometry),
    transformPoint(x, bottom + height, geometry),
    transformPoint(x + width, bottom + height, geometry),
  ];

  const xs = points.map(([pointX]) => pointX);
  const ys = points.map(([, pointY]) => pointY);

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function appendEditorLinkAnnotation({
  pdfDoc,
  page,
  box,
  geometry,
  url,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly box: EditorLinkBox;
  readonly geometry: EditorPageGeometry;
  readonly url: string | null | undefined;
}) {
  const normalizedUrl = normalizeEditorLinkUrl(url);
  if (!normalizedUrl) return false;

  const [x1, y1, x2, y2] = getEditorLinkPdfRect(box, geometry);
  if (x2 <= x1 || y2 <= y1) return false;

  const annotation = pdfDoc.context.obj({
    Type: PDFName.of("Annot"),
    Subtype: PDFName.of("Link"),
    Rect: [x1, y1, x2, y2],
    Border: [0, 0, 0],
    A: {
      Type: PDFName.of("Action"),
      S: PDFName.of("URI"),
      URI: PDFString.of(normalizedUrl),
    },
  });
  const annotationRef = pdfDoc.context.register(annotation);
  const annotsKey = PDFName.of("Annots");
  const existingAnnots = page.node.lookupMaybe(annotsKey, PDFArray);

  if (existingAnnots) {
    existingAnnots.push(annotationRef);
  } else {
    page.node.set(annotsKey, pdfDoc.context.obj([annotationRef]));
  }

  return true;
}
