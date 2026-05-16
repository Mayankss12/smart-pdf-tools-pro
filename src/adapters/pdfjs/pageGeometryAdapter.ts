import type {
  PageRotation,
  PdfPageGeometryContext,
} from "@/engines/shared/types";

import type {
  PdfJsPageGeometrySource,
  PdfJsViewportLike,
} from "./types";

/**
 * PDFMantra PDF.js Page Geometry Adapter
 * --------------------------------------------
 * Bridges PDF.js runtime page information into the shared engine geometry
 * contract used by highlights, exports, OCR overlays, and future tools.
 *
 * Architecture rules:
 * - Adapter layer only
 * - No React
 * - No engine mutation
 * - No dependency on old editor types
 * - Output is the pure serializable PdfPageGeometryContext model
 */

function assertPositiveFinite(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${fieldName} must be a positive finite number.`);
  }
}

function assertValidPageIndex(pageIndex: number): void {
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    throw new RangeError("pageIndex must be a zero-based non-negative integer.");
  }
}

function assertValidPageNumber(pageNumber: number): void {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new RangeError("pageNumber must be a one-based positive integer.");
  }
}

function assertViewport(viewport: PdfJsViewportLike): void {
  assertPositiveFinite(viewport.width, "viewport.width");
  assertPositiveFinite(viewport.height, "viewport.height");

  if (!Array.isArray(viewport.transform) || viewport.transform.length !== 6) {
    throw new RangeError(
      "viewport.transform must be a six-number affine transform array.",
    );
  }

  viewport.transform.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      throw new RangeError(
        `viewport.transform[${index}] must be a finite number.`,
      );
    }
  });
}

/**
 * Normalize arbitrary PDF.js rotation input into a strict quarter-turn
 * PageRotation value.
 */
export function normalizePdfJsRotation(rotation?: number): PageRotation {
  const safeRotation = Number.isFinite(rotation) ? Number(rotation) : 0;
  const normalized = ((safeRotation % 360) + 360) % 360;

  if (
    normalized !== 0 &&
    normalized !== 90 &&
    normalized !== 180 &&
    normalized !== 270
  ) {
    throw new RangeError(
      "PDF.js rotation must normalize to one of: 0, 90, 180, 270.",
    );
  }

  return normalized as PageRotation;
}

/**
 * Create the shared engine geometry context from PDF.js page data.
 */
export function createPageGeometryContextFromPdfJs(
  source: PdfJsPageGeometrySource,
): PdfPageGeometryContext {
  assertValidPageIndex(source.pageIndex);

  const pageNumber = source.pageNumber ?? source.pageIndex + 1;
  assertValidPageNumber(pageNumber);

  assertPositiveFinite(source.pdfPageSize.width, "pdfPageSize.width");
  assertPositiveFinite(source.pdfPageSize.height, "pdfPageSize.height");
  assertViewport(source.viewport);

  return {
    pageIndex: source.pageIndex,
    pageNumber,
    rotation: normalizePdfJsRotation(
      source.rotation ?? source.viewport.rotation ?? 0,
    ),
    pdfSize: {
      width: source.pdfPageSize.width,
      height: source.pdfPageSize.height,
    },
    viewportSize: {
      width: source.viewport.width,
      height: source.viewport.height,
    },
  };
}
