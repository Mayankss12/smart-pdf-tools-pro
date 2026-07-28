import { degrees, PDFDocument } from "pdf-lib";

import { getEditorPageGeometry } from "./editor-page-geometry";

export type EditorBlankPageSize = "a4" | "letter" | "same";
export type EditorPageInsertion = "before" | "after";
export type EditorPageRotationDirection = "clockwise" | "counter-clockwise";

export type EditorPageMutationResult = {
  readonly bytes: Uint8Array;
  readonly activePageNumber: number;
};

export type EditorRotatePageResult = EditorPageMutationResult & {
  readonly oldViewportWidth: number;
  readonly oldViewportHeight: number;
  readonly newViewportWidth: number;
  readonly newViewportHeight: number;
};

const A4_SIZE: readonly [number, number] = [595.28, 841.89];
const LETTER_SIZE: readonly [number, number] = [612, 792];

function assertPageNumber(pageNumber: number, totalPages: number) {
  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1 ||
    pageNumber > totalPages
  ) {
    throw new Error(`Page ${pageNumber} is outside this ${totalPages}-page PDF.`);
  }
}

function normalizeRotation(angle: number) {
  return ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
}

export async function addEditorBlankPage({
  fileBytes,
  currentPageNumber,
  insertion,
  size,
}: {
  readonly fileBytes: Uint8Array;
  readonly currentPageNumber: number;
  readonly insertion: EditorPageInsertion;
  readonly size: EditorBlankPageSize;
}): Promise<EditorPageMutationResult> {
  const pdf = await PDFDocument.load(fileBytes);
  const totalPages = pdf.getPageCount();
  assertPageNumber(currentPageNumber, totalPages);

  const currentPage = pdf.getPage(currentPageNumber - 1);
  const currentSize = currentPage.getSize();
  const pageSize: readonly [number, number] =
    size === "a4"
      ? A4_SIZE
      : size === "letter"
        ? LETTER_SIZE
        : [currentSize.width, currentSize.height];
  const insertionIndex =
    insertion === "before" ? currentPageNumber - 1 : currentPageNumber;
  const newPage = pdf.insertPage(insertionIndex, [...pageSize]);

  if (size === "same") {
    newPage.setRotation(currentPage.getRotation());
  }

  return {
    bytes: await pdf.save(),
    activePageNumber: insertionIndex + 1,
  };
}

function validatePageOrder(order: readonly number[], pageCount: number) {
  if (
    order.length !== pageCount ||
    new Set(order).size !== pageCount ||
    order.some(
      (pageNumber) =>
        !Number.isInteger(pageNumber) ||
        pageNumber < 1 ||
        pageNumber > pageCount,
    )
  ) {
    throw new Error("Page order must contain every page exactly once.");
  }
}

export async function reorderEditorPages({
  fileBytes,
  pageOrder,
  activePageNumber,
}: {
  readonly fileBytes: Uint8Array;
  readonly pageOrder: readonly number[];
  readonly activePageNumber: number;
}): Promise<EditorPageMutationResult> {
  const pdf = await PDFDocument.load(fileBytes);
  const pageCount = pdf.getPageCount();
  validatePageOrder(pageOrder, pageCount);
  assertPageNumber(activePageNumber, pageCount);

  const originalPages = pdf.getPages();

  for (let index = pageCount - 1; index >= 0; index -= 1) {
    pdf.removePage(index);
  }

  pageOrder.forEach((oldPageNumber) => {
    const page = originalPages[oldPageNumber - 1];
    if (page) pdf.addPage(page);
  });

  return {
    bytes: await pdf.save(),
    activePageNumber: pageOrder.indexOf(activePageNumber) + 1,
  };
}

export async function rotateEditorPage({
  fileBytes,
  pageNumber,
  direction,
}: {
  readonly fileBytes: Uint8Array;
  readonly pageNumber: number;
  readonly direction: EditorPageRotationDirection;
}): Promise<EditorRotatePageResult> {
  const pdf = await PDFDocument.load(fileBytes);
  const pageCount = pdf.getPageCount();
  assertPageNumber(pageNumber, pageCount);

  const page = pdf.getPage(pageNumber - 1);
  const oldGeometry = getEditorPageGeometry(page);
  const delta = direction === "clockwise" ? 90 : -90;
  const nextRotation = normalizeRotation(page.getRotation().angle + delta);

  page.setRotation(degrees(nextRotation));

  const newGeometry = getEditorPageGeometry(page);

  return {
    bytes: await pdf.save(),
    activePageNumber: pageNumber,
    oldViewportWidth: oldGeometry.viewportWidth,
    oldViewportHeight: oldGeometry.viewportHeight,
    newViewportWidth: newGeometry.viewportWidth,
    newViewportHeight: newGeometry.viewportHeight,
  };
}
