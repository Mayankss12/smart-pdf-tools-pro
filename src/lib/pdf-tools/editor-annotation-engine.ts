import {
  PDFArray,
  PDFContentStream,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFRef,
  PDFStream,
  PDFString,
  decodePDFRawStream,
  type PDFObject,
  type PDFPage,
} from "pdf-lib";

import {
  getEditorPageGeometry,
  getViewportToPdfMatrix,
  type EditorPageGeometry,
  type TransformationMatrix,
} from "./editor-page-geometry";

export type EditorAnnotationBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type EditorAnnotationPoint = {
  readonly x: number;
  readonly y: number;
};

export type EditorAnnotationRect = readonly [number, number, number, number];

// Converts a bottom-up viewport point to the page's PDF user space.
export type EditorAnnotationPointMapper = (
  point: EditorAnnotationPoint,
) => readonly [number, number];

// Plain strings become PDF names; wrap text values in PDFString/PDFHexString.
export type EditorAnnotationLiteral =
  | PDFObject
  | string
  | number
  | boolean
  | EditorAnnotationLiteral[]
  | { [key: string]: EditorAnnotationLiteral };

export type EditorAnnotationEntries = { [key: string]: EditorAnnotationLiteral };

const ANNOTATION_AUTHOR = "PDFMantra";
const PRINT_FLAG = 4;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function applyMatrix(
  matrix: TransformationMatrix,
  point: EditorAnnotationPoint,
): readonly [number, number] {
  const [a, b, c, d, e, f] = matrix;
  return [a * point.x + c * point.y + e, b * point.x + d * point.y + f];
}

export function createEditorAnnotationPointMapper(
  geometry: EditorPageGeometry,
): EditorAnnotationPointMapper {
  const matrix = getViewportToPdfMatrix(geometry);
  return (point) => applyMatrix(matrix, point);
}

// Moves an oversized or overhanging box back onto the page the same way the
// drawing engines do, so the appearance bounds cover what they paint.
function getPageSafeBox(
  box: EditorAnnotationBox,
  geometry: EditorPageGeometry,
): EditorAnnotationBox {
  const width = clamp(box.width, 0, geometry.viewportWidth);
  const height = clamp(box.height, 0, geometry.viewportHeight);

  return {
    x: clamp(box.x, 0, Math.max(0, geometry.viewportWidth - width)),
    y: clamp(box.y, 0, Math.max(0, geometry.viewportHeight - height)),
    width,
    height,
  };
}

// Bottom-up viewport bounds of a top-down editor box, grown by padding and kept on the page.
function getAppearanceBounds(
  sourceBox: EditorAnnotationBox,
  geometry: EditorPageGeometry,
  padding: number,
): EditorAnnotationRect {
  const box = getPageSafeBox(sourceBox, geometry);
  const left = clamp(box.x - padding, 0, geometry.viewportWidth);
  const right = clamp(box.x + box.width + padding, left, geometry.viewportWidth);
  const top = clamp(box.y - padding, 0, geometry.viewportHeight);
  const bottom = clamp(box.y + box.height + padding, top, geometry.viewportHeight);

  return [
    left,
    geometry.viewportHeight - bottom,
    right,
    geometry.viewportHeight - top,
  ];
}

function getPdfRect(
  bounds: EditorAnnotationRect,
  mapPoint: EditorAnnotationPointMapper,
): EditorAnnotationRect {
  const [x1, y1, x2, y2] = bounds;
  const points = [
    mapPoint({ x: x1, y: y1 }),
    mapPoint({ x: x2, y: y1 }),
    mapPoint({ x: x1, y: y2 }),
    mapPoint({ x: x2, y: y2 }),
  ];
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);

  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

// QuadPoints in the order viewers expect: top-left, top-right, bottom-left, bottom-right.
export function getEditorAnnotationQuadPoints(
  box: EditorAnnotationBox,
  geometry: EditorPageGeometry,
  mapPoint: EditorAnnotationPointMapper,
) {
  const [left, bottom, right, top] = getAppearanceBounds(box, geometry, 0);

  return [
    ...mapPoint({ x: left, y: top }),
    ...mapPoint({ x: right, y: top }),
    ...mapPoint({ x: left, y: bottom }),
    ...mapPoint({ x: right, y: bottom }),
  ];
}

function readStreamBytes(stream: PDFStream) {
  if (stream instanceof PDFContentStream) return stream.getUnencodedContents();
  if (stream instanceof PDFRawStream) return decodePDFRawStream(stream).decode();
  return stream.getContents();
}

function joinBytes(parts: readonly Uint8Array[]) {
  const total = parts.reduce((size, part) => size + part.length + 1, 0);
  const joined = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
    joined[offset] = 0x0a;
    offset += 1;
  }

  return joined;
}

// Paints with the regular editor engines on a throwaway page, then reuses its
// operators and resources as the annotation's appearance stream so the
// annotation looks exactly like the flattened export.
async function createAppearanceStream({
  pdfDoc,
  geometry,
  bounds,
  draw,
}: {
  readonly pdfDoc: PDFDocument;
  readonly geometry: EditorPageGeometry;
  readonly bounds: EditorAnnotationRect;
  readonly draw: (
    page: PDFPage,
    geometry: EditorPageGeometry,
  ) => void | Promise<void>;
}) {
  const scratch = pdfDoc.addPage([geometry.viewportWidth, geometry.viewportHeight]);
  const scratchIndex = pdfDoc.getPageCount() - 1;

  try {
    await draw(scratch, getEditorPageGeometry(scratch));

    const contents = scratch.node.Contents();
    const contentRefs: PDFRef[] = [];
    const parts: Uint8Array[] = [];

    if (contents instanceof PDFArray) {
      for (let index = 0; index < contents.size(); index += 1) {
        const ref = contents.get(index);
        if (ref instanceof PDFRef) contentRefs.push(ref);
        const stream = contents.lookup(index, PDFStream);
        parts.push(readStreamBytes(stream));
      }
    } else if (contents instanceof PDFStream) {
      parts.push(readStreamBytes(contents));
    }

    contentRefs.forEach((ref) => pdfDoc.context.delete(ref));

    if (parts.length === 0) return null;

    const appearance = pdfDoc.context.flateStream(joinBytes(parts), {
      Type: "XObject",
      Subtype: "Form",
      FormType: 1,
      BBox: [...bounds],
      Matrix: [...getViewportToPdfMatrix(geometry)],
      Resources: scratch.node.Resources() ?? pdfDoc.context.obj({}),
    });

    return pdfDoc.context.register(appearance);
  } finally {
    pdfDoc.removePage(scratchIndex);
    pdfDoc.context.delete(scratch.ref);
  }
}

export function appendPageAnnotation(
  pdfDoc: PDFDocument,
  page: PDFPage,
  annotationRef: PDFRef,
) {
  const annotsKey = PDFName.of("Annots");
  const existingAnnots = page.node.lookupMaybe(annotsKey, PDFArray);

  if (existingAnnots) {
    existingAnnots.push(annotationRef);
  } else {
    page.node.set(annotsKey, pdfDoc.context.obj([annotationRef]));
  }
}

export function toEditorAnnotationColor(hex: string | undefined, fallback: string) {
  const value = typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex.trim())
    ? hex.trim()
    : fallback;

  return [1, 3, 5].map((start) => Number.parseInt(value.slice(start, start + 2), 16) / 255);
}

export function toEditorAnnotationText(value: string) {
  return PDFHexString.fromText(value);
}

export async function appendEditorMarkupAnnotation({
  pdfDoc,
  page,
  id,
  subtype,
  box,
  padding,
  draw,
  entries,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly id: string;
  readonly subtype: "Highlight" | "FreeText" | "Square" | "Circle" | "Line" | "Ink";
  readonly box: EditorAnnotationBox;
  readonly padding: number;
  // Opacity is painted into the appearance stream rather than set as /CA, so
  // viewers that honour /CA and viewers that ignore it render the same result.
  readonly draw: (
    page: PDFPage,
    geometry: EditorPageGeometry,
  ) => void | Promise<void>;
  readonly entries?: (
    mapPoint: EditorAnnotationPointMapper,
    geometry: EditorPageGeometry,
  ) => EditorAnnotationEntries;
}) {
  const geometry = getEditorPageGeometry(page);
  const bounds = getAppearanceBounds(box, geometry, padding);

  if (bounds[2] <= bounds[0] || bounds[3] <= bounds[1]) return false;

  const appearanceRef = await createAppearanceStream({
    pdfDoc,
    geometry,
    bounds,
    draw,
  });

  if (!appearanceRef) return false;

  const mapPoint = createEditorAnnotationPointMapper(geometry);
  const annotation = pdfDoc.context.obj({
    Type: "Annot",
    Subtype: subtype,
    Rect: [...getPdfRect(bounds, mapPoint)],
    F: PRINT_FLAG,
    NM: PDFString.of(id),
    T: PDFHexString.fromText(ANNOTATION_AUTHOR),
    M: PDFString.fromDate(new Date()),
    P: page.ref,
    AP: { N: appearanceRef },
    ...entries?.(mapPoint, geometry),
  });

  appendPageAnnotation(pdfDoc, page, pdfDoc.context.register(annotation));
  return true;
}
