import type {
  NormalizedRect,
  PdfPageIndex,
} from "../shared/types";

import {
  clampNormalizedRect,
  getRectArea,
} from "../shared/coordinateUtils";

import type {
  SnappedRegion,
  SnappedRegionId,
} from "./types";

/**
 * PDFMantra Smart Highlight Freeform Snapper
 * --------------------------------------------
 * Pure engine fallback logic for cases where precise text snapping is not
 * available yet.
 *
 * This will be used for:
 * - scanned PDFs
 * - image-only PDFs
 * - pages with no reliable PDF text layer
 * - cases where text snapping intentionally returns no region
 *
 * Architecture rules:
 * - No React
 * - No DOM
 * - No PDF.js
 * - No OCR dependency yet
 * - Normalized 0..1 page-space only
 * - Safe to persist through frontend/backend contracts later
 */

const EPSILON = 1e-9;

/**
 * Caller-owned ID generation context.
 *
 * The engine intentionally does not generate random IDs internally.
 * That keeps this deterministic and compatible with:
 * - frontend optimistic IDs
 * - backend-issued IDs
 * - test fixtures
 */
export interface FreeformSnapRegionIdContext {
  readonly pageIndex: PdfPageIndex;
}

/**
 * Caller-owned freeform region ID factory.
 */
export type FreeformSnapRegionIdFactory = (
  context: FreeformSnapRegionIdContext,
) => SnappedRegionId;

/**
 * Tunable freeform fallback thresholds.
 */
export interface FreeformSnapperOptions {
  /**
   * Minimum accepted region width in normalized page-space.
   */
  readonly minRegionWidth: number;

  /**
   * Minimum accepted region height in normalized page-space.
   */
  readonly minRegionHeight: number;

  /**
   * Minimum accepted region area in normalized page-space.
   *
   * Helps reject accidental micro-drags.
   */
  readonly minRegionArea: number;
}

/**
 * Conservative defaults:
 * - small enough to allow normal highlight gestures
 * - large enough to avoid creating accidental nearly invisible annotations
 */
export const DEFAULT_FREEFORM_SNAPPER_OPTIONS: FreeformSnapperOptions =
  Object.freeze({
    minRegionWidth: 0.002,
    minRegionHeight: 0.002,
    minRegionArea: 0.00001,
  });

/**
 * Request payload for creating a freeform fallback region.
 */
export interface SnapFreeformHighlightRequest {
  readonly pageIndex: PdfPageIndex;
  readonly dragBounds: NormalizedRect;
  readonly createRegionId: FreeformSnapRegionIdFactory;
  readonly options?: Partial<FreeformSnapperOptions>;
}

/**
 * Why freeform fallback succeeded or failed.
 *
 * This is useful for tool adapters later when showing honest UI feedback.
 */
export type FreeformSnapStatus =
  | "created"
  | "rejected-empty-drag"
  | "rejected-too-small";

/**
 * Result returned by the freeform snapper.
 */
export interface SnapFreeformHighlightResult {
  readonly status: FreeformSnapStatus;
  readonly region: SnappedRegion | null;
}

/**
 * Merge caller options with stable engine defaults.
 */
function resolveOptions(
  options?: Partial<FreeformSnapperOptions>,
): FreeformSnapperOptions {
  const resolved: FreeformSnapperOptions = {
    minRegionWidth:
      options?.minRegionWidth ??
      DEFAULT_FREEFORM_SNAPPER_OPTIONS.minRegionWidth,

    minRegionHeight:
      options?.minRegionHeight ??
      DEFAULT_FREEFORM_SNAPPER_OPTIONS.minRegionHeight,

    minRegionArea:
      options?.minRegionArea ??
      DEFAULT_FREEFORM_SNAPPER_OPTIONS.minRegionArea,
  };

  assertValidOptions(resolved);

  return resolved;
}

/**
 * Validate all threshold values before use.
 */
function assertValidOptions(options: FreeformSnapperOptions): void {
  if (
    !Number.isFinite(options.minRegionWidth) ||
    options.minRegionWidth < 0
  ) {
    throw new RangeError(
      "minRegionWidth must be a finite non-negative number.",
    );
  }

  if (
    !Number.isFinite(options.minRegionHeight) ||
    options.minRegionHeight < 0
  ) {
    throw new RangeError(
      "minRegionHeight must be a finite non-negative number.",
    );
  }

  if (
    !Number.isFinite(options.minRegionArea) ||
    options.minRegionArea < 0
  ) {
    throw new RangeError(
      "minRegionArea must be a finite non-negative number.",
    );
  }
}

/**
 * Validate public request contract.
 */
function assertValidRequest(
  request: SnapFreeformHighlightRequest,
): void {
  if (!Number.isInteger(request.pageIndex) || request.pageIndex < 0) {
    throw new RangeError(
      "SnapFreeformHighlightRequest.pageIndex must be a zero-based non-negative integer.",
    );
  }

  if (typeof request.createRegionId !== "function") {
    throw new TypeError(
      "SnapFreeformHighlightRequest.createRegionId must be a function.",
    );
  }
}

/**
 * Check whether a normalized drag box is mathematically usable.
 */
function isEmptyDrag(bounds: NormalizedRect): boolean {
  return bounds.width <= EPSILON || bounds.height <= EPSILON;
}

/**
 * Check whether a drag box should be rejected as too small for a meaningful
 * highlight annotation.
 */
function isRegionTooSmall(
  bounds: NormalizedRect,
  options: FreeformSnapperOptions,
): boolean {
  return (
    bounds.width < options.minRegionWidth ||
    bounds.height < options.minRegionHeight ||
    getRectArea(bounds) < options.minRegionArea
  );
}

/**
 * Public engine entrypoint.
 *
 * This produces one clean freeform SnappedRegion or returns a rejection result.
 *
 * Future usage:
 * - scanned/image page fallback
 * - text snapper failed to identify a reliable target
 * - OCR not yet available or explicitly disabled
 */
export function snapFreeformHighlight(
  request: SnapFreeformHighlightRequest,
): SnapFreeformHighlightResult {
  assertValidRequest(request);

  const options = resolveOptions(request.options);
  const safeBounds = clampNormalizedRect(request.dragBounds);

  if (isEmptyDrag(safeBounds)) {
    return {
      status: "rejected-empty-drag",
      region: null,
    };
  }

  if (isRegionTooSmall(safeBounds, options)) {
    return {
      status: "rejected-too-small",
      region: null,
    };
  }

  return {
    status: "created",
    region: {
      id: request.createRegionId({
        pageIndex: request.pageIndex,
      }),
      pageIndex: request.pageIndex,
      bounds: safeBounds,
      sourceBounds: safeBounds,
      source: "freeform",
      granularity: "freeform",
      readingOrder: 0,
    },
  };
}
