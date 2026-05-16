import type {
  PageRotation,
  Size2D,
} from "@/engines/shared/types";

/**
 * PDFMantra PDF.js Adapter Types
 * --------------------------------------------
 * These are deliberately structural adapter contracts rather than direct
 * imports from pdfjs-dist internals.
 *
 * Why:
 * - PDF.js runtime objects can be passed in directly by the UI layer.
 * - The adapter stays less fragile across pdfjs-dist patch/minor changes.
 * - The core engines remain free of PDF.js dependencies.
 */

export type PdfJsAffineTransformLike = readonly number[];

/**
 * Minimal viewport shape required by PDFMantra adapters.
 */
export interface PdfJsViewportLike {
  readonly width: number;
  readonly height: number;
  readonly scale?: number;
  readonly rotation?: number;
  readonly transform: PdfJsAffineTransformLike;
}

/**
 * Minimal text item shape compatible with PDF.js getTextContent() items.
 */
export interface PdfJsTextItemLike {
  readonly str: string;
  readonly dir?: "ltr" | "rtl" | "ttb" | string;
  readonly width: number;
  readonly height: number;
  readonly transform: PdfJsAffineTransformLike;
  readonly fontName?: string;
  readonly hasEOL?: boolean;
}

/**
 * PDF.js text-content arrays can contain marked-content placeholders in
 * addition to actual text items. We model that explicitly so the extraction
 * adapter can skip them safely.
 */
export interface PdfJsMarkedContentLike {
  readonly type?: string;
  readonly id?: string;
}

export type PdfJsTextContentItemLike =
  | PdfJsTextItemLike
  | PdfJsMarkedContentLike;

export interface PdfJsTextContentLike {
  readonly items: readonly PdfJsTextContentItemLike[];
}

/**
 * Input payload for building a shared page geometry context from PDF.js data.
 *
 * pdfPageSize must represent the native unscaled PDF page size in PDF points,
 * not CSS pixels. The future UI adapter can derive it from an unrotated
 * scale-1 viewport or the PDF.js page view box.
 */
export interface PdfJsPageGeometrySource {
  readonly pageIndex: number;
  readonly pageNumber?: number;
  readonly rotation?: PageRotation;
  readonly pdfPageSize: Size2D;
  readonly viewport: PdfJsViewportLike;
}
