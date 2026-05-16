/**
 * PDFMantra Engine Shared Types
 * --------------------------------------------
 * These types define the core geometric contract used by every future
 * browser-side PDF engine module.
 *
 * Architecture rules:
 * - Pure TypeScript only
 * - No React imports
 * - No UI state
 * - Serializable and backend-friendly
 * - Normalized page-space coordinates are the canonical storage format
 *
 * Coordinate spaces used in PDFMantra:
 *
 * 1. Normalized page space
 *    - Range: 0 to 1
 *    - Origin: top-left
 *    - x increases right
 *    - y increases downward
 *    - Used for persistent annotation storage
 *
 * 2. Viewport space
 *    - Pixel-based rendered page coordinates
 *    - Origin: top-left
 *    - Used by browser pointer interaction and PDF.js rendering
 *
 * 3. PDF space
 *    - PDF point coordinates
 *    - Origin: bottom-left
 *    - Used for export/render operations with PDF libraries
 */

export type PdfPageIndex = number;
export type PdfPageNumber = number;

export type PageRotation = 0 | 90 | 180 | 270;

/**
 * Base point structure.
 */
export interface Point2D {
  readonly x: number;
  readonly y: number;
}

/**
 * Base size structure.
 */
export interface Size2D {
  readonly width: number;
  readonly height: number;
}

/**
 * Base rectangle structure.
 *
 * x, y represent the top-left corner unless otherwise stated by the
 * coordinate-space-specific type.
 */
export interface Rect2D {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Normalized coordinates:
 * - Canonical storage space for engines
 * - Range should remain within 0..1
 * - Origin is top-left
 */
export interface NormalizedPoint extends Point2D {}

export interface NormalizedRect extends Rect2D {}

/**
 * Browser-rendered viewport coordinates:
 * - Pixel values
 * - Origin is top-left
 */
export interface ViewportPoint extends Point2D {}

export interface ViewportRect extends Rect2D {}

/**
 * PDF document coordinates:
 * - Values are in PDF points
 * - Origin is bottom-left
 */
export interface PdfPoint extends Point2D {}

export interface PdfRect extends Rect2D {}

/**
 * Geometry context for one rendered PDF page.
 *
 * This is intentionally shared across all future engines:
 * - highlight
 * - text editing
 * - object annotation
 * - signatures
 * - form placement
 * - OCR overlays
 *
 * Rotation semantics:
 * - rotation represents the visible/rendered clockwise rotation
 * - normalized coordinates are stored against the visually rendered page
 * - coordinate utilities use this value to map correctly back into PDF space
 */
export interface PdfPageGeometryContext {
  readonly pageIndex: PdfPageIndex;
  readonly pageNumber: PdfPageNumber;
  readonly rotation: PageRotation;
  readonly pdfSize: Size2D;
  readonly viewportSize: Size2D;
}
