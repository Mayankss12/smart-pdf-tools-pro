import type { PDFDocument, PDFPage } from "pdf-lib";

import {
  drawEditorImageObject,
  type EditorImageObjectLike,
} from "./editor-image-engine";

export type EditorSignatureObjectLike = EditorImageObjectLike;

export async function drawEditorSignatureObject({
  pdfDoc,
  page,
  object,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorSignatureObjectLike;
}) {
  await drawEditorImageObject({
    pdfDoc,
    page,
    object,
  });
}
