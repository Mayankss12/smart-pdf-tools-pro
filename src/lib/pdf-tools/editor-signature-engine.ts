import type { PDFDocument, PDFPage } from "pdf-lib";

import {
  drawEditorImageObject,
  type EditorImageObjectLike,
} from "./editor-image-engine";
import type { EditorPageGeometry } from "./editor-page-geometry";

export type EditorSignatureObjectLike = EditorImageObjectLike;

export async function drawEditorSignatureObject({
  pdfDoc,
  page,
  object,
  geometry,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorSignatureObjectLike;
  readonly geometry: EditorPageGeometry;
}) {
  await drawEditorImageObject({
    pdfDoc,
    page,
    object,
    geometry,
  });
}
