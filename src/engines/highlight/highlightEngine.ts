import type {
  HighlightLayer,
  HighlightLayerId,
  HighlightOpacity,
  HighlightStyle,
  SnappedRegion,
} from "./types";

import {
  HIGHLIGHT_LAYER_SCHEMA_VERSION,
} from "./types";

import {
  clamp01,
  clampNormalizedRect,
} from "../shared/coordinateUtils";

/**
 * PDFMantra Smart Highlight Engine
 * --------------------------------------------
 * Pure domain-level logic for creating and maintaining highlight layers.
 *
 * Architecture rules:
 * - No React
 * - No DOM
 * - No browser APIs
 * - No PDF.js dependencies
 * - No backend framework assumptions
 * - Safe to reuse later in frontend adapters, APIs, tests, and persistence flows
 *
 * This file is intentionally responsible for:
 * - validating style data
 * - validating region structure
 * - enforcing single-page layer integrity
 * - producing clean deterministic highlight records
 *
 * It does NOT yet perform:
 * - text snapping
 * - OCR snapping
 * - overlap deduplication
 * - export rendering
 */

const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export const DEFAULT_HIGHLIGHT_STYLE: HighlightStyle = Object.freeze({
  color: "#FFE45E",
  opacity: 0.38,
});

/**
 * Internal guard used to prevent accidental invalid records from entering
 * engine state or backend persistence later.
 */
function assertNonEmptyString(value: string, fieldName: string): void {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} must be a non-empty string.`);
  }
}

/**
 * Validates a highlight color token.
 *
 * Current supported format:
 * - #RGB
 * - #RRGGBB
 * - #RRGGBBAA
 *
 * We keep color validation strict to avoid invalid style payloads entering
 * future backend/API storage.
 */
export function assertValidHighlightColor(color: string): void {
  if (!HEX_COLOR_PATTERN.test(color)) {
    throw new Error(
      "Highlight color must be a valid HEX value such as #FFE45E.",
    );
  }
}

/**
 * Ensures opacity is a finite normalized value.
 */
export function assertValidHighlightOpacity(
  opacity: HighlightOpacity,
): void {
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 1) {
    throw new Error("Highlight opacity must be a finite number between 0 and 1.");
  }
}

/**
 * Returns a safe normalized style object.
 *
 * Note:
 * - Invalid colors fail fast
 * - Opacity is clamped to 0..1 only after finite-number validation
 */
export function normalizeHighlightStyle(
  style: HighlightStyle,
): HighlightStyle {
  assertValidHighlightColor(style.color);
  assertValidHighlightOpacity(style.opacity);

  return {
    color: style.color.toUpperCase(),
    opacity: clamp01(style.opacity),
  };
}

/**
 * Validates one snapped region and returns a normalized safe copy.
 */
export function normalizeSnappedRegion(
  region: SnappedRegion,
): SnappedRegion {
  assertNonEmptyString(region.id, "SnappedRegion.id");

  if (!Number.isInteger(region.pageIndex) || region.pageIndex < 0) {
    throw new Error(
      "SnappedRegion.pageIndex must be a zero-based non-negative integer.",
    );
  }

  if (!Number.isInteger(region.readingOrder) || region.readingOrder < 0) {
    throw new Error(
      "SnappedRegion.readingOrder must be a non-negative integer.",
    );
  }

  if (
    typeof region.confidence !== "undefined" &&
    (!Number.isFinite(region.confidence) ||
      region.confidence < 0 ||
      region.confidence > 1)
  ) {
    throw new Error(
      "SnappedRegion.confidence must be between 0 and 1 when provided.",
    );
  }

  return {
    ...region,
    bounds: clampNormalizedRect(region.bounds),
    sourceBounds: region.sourceBounds
      ? clampNormalizedRect(region.sourceBounds)
      : undefined,
    text:
      typeof region.text === "string" && region.text.trim().length > 0
        ? region.text
        : undefined,
  };
}

/**
 * Creates a clean, production-safe HighlightLayer record.
 *
 * Important invariants:
 * - One layer belongs to exactly one page
 * - Every region must belong to the same page as the layer
 * - Region IDs must be unique inside the layer
 * - Regions are sorted deterministically by reading order
 */
export function createHighlightLayer(input: {
  id: HighlightLayerId;
  pageIndex: number;
  creationSource: HighlightLayer["creationSource"];
  style?: HighlightStyle;
  regions: readonly SnappedRegion[];
}): HighlightLayer {
  assertNonEmptyString(input.id, "HighlightLayer.id");

  if (!Number.isInteger(input.pageIndex) || input.pageIndex < 0) {
    throw new Error(
      "HighlightLayer.pageIndex must be a zero-based non-negative integer.",
    );
  }

  if (!Array.isArray(input.regions) || input.regions.length === 0) {
    throw new Error("HighlightLayer.regions must contain at least one region.");
  }

  const normalizedStyle = normalizeHighlightStyle(
    input.style ?? DEFAULT_HIGHLIGHT_STYLE,
  );

  const normalizedRegions = input.regions.map(normalizeSnappedRegion);

  const regionIds = new Set<string>();

  for (const region of normalizedRegions) {
    if (region.pageIndex !== input.pageIndex) {
      throw new Error(
        "Every SnappedRegion inside a HighlightLayer must belong to the same pageIndex.",
      );
    }

    if (regionIds.has(region.id)) {
      throw new Error(
        `Duplicate SnappedRegion id detected inside HighlightLayer: ${region.id}`,
      );
    }

    regionIds.add(region.id);
  }

  const sortedRegions = [...normalizedRegions].sort((first, second) => {
    if (first.readingOrder !== second.readingOrder) {
      return first.readingOrder - second.readingOrder;
    }

    if (first.bounds.y !== second.bounds.y) {
      return first.bounds.y - second.bounds.y;
    }

    return first.bounds.x - second.bounds.x;
  });

  return {
    schemaVersion: HIGHLIGHT_LAYER_SCHEMA_VERSION,
    id: input.id,
    kind: "highlight",
    pageIndex: input.pageIndex,
    creationSource: input.creationSource,
    style: normalizedStyle,
    regions: sortedRegions,
  };
}

/**
 * Safely update only the visual style of a highlight layer.
 *
 * Useful later for:
 * - color picker
 * - opacity slider
 * - inspector panel edits
 */
export function updateHighlightLayerStyle(
  layer: HighlightLayer,
  stylePatch: Partial<HighlightStyle>,
): HighlightLayer {
  const nextStyle = normalizeHighlightStyle({
    color: stylePatch.color ?? layer.style.color,
    opacity: stylePatch.opacity ?? layer.style.opacity,
  });

  return {
    ...layer,
    style: nextStyle,
  };
}

/**
 * Replace the region collection while preserving the layer identity.
 *
 * This will be useful later when:
 * - overlap merging refines regions
 * - OCR replaces a rough fallback area
 * - line targeting adjusts smart snap output
 */
export function replaceHighlightLayerRegions(
  layer: HighlightLayer,
  regions: readonly SnappedRegion[],
): HighlightLayer {
  return createHighlightLayer({
    id: layer.id,
    pageIndex: layer.pageIndex,
    creationSource: layer.creationSource,
    style: layer.style,
    regions,
  });
}

/**
 * Remove one snapped region from a layer.
 *
 * If it was the final remaining region, null is returned rather than allowing
 * an invalid empty highlight layer to exist.
 */
export function removeSnappedRegionFromLayer(
  layer: HighlightLayer,
  regionId: string,
): HighlightLayer | null {
  assertNonEmptyString(regionId, "regionId");

  const remainingRegions = layer.regions.filter(
    (region) => region.id !== regionId,
  );

  if (remainingRegions.length === layer.regions.length) {
    return layer;
  }

  if (remainingRegions.length === 0) {
    return null;
  }

  return replaceHighlightLayerRegions(layer, remainingRegions);
}
