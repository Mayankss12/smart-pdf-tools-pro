import type {
  NormalizedRect,
  PdfPageIndex,
  Rect2D,
} from "../shared/types";

import {
  clamp01,
  clampNormalizedRect,
  getRectIntersection,
  getRectUnion,
  rectsIntersect,
} from "../shared/coordinateUtils";

import type {
  HighlightLayer,
  HighlightLayerId,
  HighlightOpacity,
  HighlightStyle,
  SnappedRegionId,
} from "./types";

/**
 * PDFMantra Smart Highlight Overlap Merger
 * --------------------------------------------
 * Pure domain-level composition logic that prevents visual opacity stacking
 * when same-color highlight regions overlap.
 *
 * Important architecture decision:
 * - Stored HighlightLayer records remain untouched.
 * - This module creates a composited render/export projection.
 * - That preserves:
 *   - undo/redo history
 *   - backend event history
 *   - future layer-level delete/select behavior
 * - While still preventing same-color overlap darkening in UI/export.
 *
 * Composition rule:
 * - Regions with the same color on the same page may merge if they overlap
 *   and are visually aligned to the same text band/line.
 * - If their opacity differs, the merged composited region uses the strongest
 *   opacity, instead of stacking transparencies.
 */

const EPSILON = 1e-9;

/**
 * One final geometry region that should be rendered/exported once.
 *
 * It may represent:
 * - one untouched original highlight region
 * - multiple same-color overlapping highlight regions merged together
 */
export interface CompositedHighlightRegion {
  readonly pageIndex: PdfPageIndex;
  readonly bounds: NormalizedRect;
  readonly style: HighlightStyle;

  /**
   * All stored user highlight layers contributing to this composited region.
   */
  readonly sourceLayerIds: readonly HighlightLayerId[];

  /**
   * All stored snapped regions contributing to this composited region.
   */
  readonly sourceRegionIds: readonly SnappedRegionId[];

  /**
   * Stable render order within the page.
   */
  readonly renderOrder: number;
}

/**
 * Diagnostic summary of the composition pass.
 *
 * Useful later for:
 * - development tests
 * - debugging render/export behavior
 * - validating whether overlap optimization is working
 */
export interface HighlightCompositionResult {
  readonly regions: readonly CompositedHighlightRegion[];
  readonly inputLayerCount: number;
  readonly inputRegionCount: number;
  readonly compositedRegionCount: number;
  readonly mergedRegionReductionCount: number;
}

/**
 * Fine-tuning controls for overlap composition.
 */
export interface HighlightOverlapMergeOptions {
  /**
   * Minimum vertical overlap ratio required to consider two regions visually
   * part of the same text band.
   */
  readonly minVerticalOverlapRatio: number;

  /**
   * Alternate same-line test based on vertical center distance relative
   * to the larger region height.
   */
  readonly maxCenterDistanceToHeightRatio: number;

  /**
   * Minimum geometry dimensions retained after normalization.
   */
  readonly minRegionWidth: number;
  readonly minRegionHeight: number;
}

/**
 * Conservative defaults:
 * - strong enough to avoid combining separate text lines
 * - flexible enough to merge repeated highlight passes on the same text band
 */
export const DEFAULT_HIGHLIGHT_OVERLAP_MERGE_OPTIONS: HighlightOverlapMergeOptions =
  Object.freeze({
    minVerticalOverlapRatio: 0.28,
    maxCenterDistanceToHeightRatio: 0.58,
    minRegionWidth: 0.0005,
    minRegionHeight: 0.0005,
  });

/**
 * Internal flattened highlight piece before composition.
 */
interface HighlightAtom {
  readonly pageIndex: PdfPageIndex;
  readonly bounds: NormalizedRect;
  readonly colorKey: string;
  readonly color: string;
  readonly opacity: HighlightOpacity;
  readonly sourceLayerId: HighlightLayerId;
  readonly sourceRegionId: SnappedRegionId;
}

/**
 * Mutable internal working object used during merge passes.
 */
interface MutableCompositeRegion {
  pageIndex: PdfPageIndex;
  bounds: NormalizedRect;
  colorKey: string;
  color: string;
  opacity: HighlightOpacity;
  sourceLayerIds: Set<HighlightLayerId>;
  sourceRegionIds: Set<SnappedRegionId>;
}

/**
 * Resolve and validate configurable thresholds.
 */
function resolveOptions(
  options?: Partial<HighlightOverlapMergeOptions>,
): HighlightOverlapMergeOptions {
  const resolved: HighlightOverlapMergeOptions = {
    minVerticalOverlapRatio:
      options?.minVerticalOverlapRatio ??
      DEFAULT_HIGHLIGHT_OVERLAP_MERGE_OPTIONS.minVerticalOverlapRatio,

    maxCenterDistanceToHeightRatio:
      options?.maxCenterDistanceToHeightRatio ??
      DEFAULT_HIGHLIGHT_OVERLAP_MERGE_OPTIONS.maxCenterDistanceToHeightRatio,

    minRegionWidth:
      options?.minRegionWidth ??
      DEFAULT_HIGHLIGHT_OVERLAP_MERGE_OPTIONS.minRegionWidth,

    minRegionHeight:
      options?.minRegionHeight ??
      DEFAULT_HIGHLIGHT_OVERLAP_MERGE_OPTIONS.minRegionHeight,
  };

  assertValidOptions(resolved);

  return resolved;
}

/**
 * Validate merge thresholds early.
 */
function assertValidOptions(
  options: HighlightOverlapMergeOptions,
): void {
  if (
    !Number.isFinite(options.minVerticalOverlapRatio) ||
    options.minVerticalOverlapRatio < 0 ||
    options.minVerticalOverlapRatio > 1
  ) {
    throw new RangeError(
      "minVerticalOverlapRatio must be a finite number between 0 and 1.",
    );
  }

  if (
    !Number.isFinite(options.maxCenterDistanceToHeightRatio) ||
    options.maxCenterDistanceToHeightRatio < 0
  ) {
    throw new RangeError(
      "maxCenterDistanceToHeightRatio must be a finite non-negative number.",
    );
  }

  if (
    !Number.isFinite(options.minRegionWidth) ||
    options.minRegionWidth < 0 ||
    !Number.isFinite(options.minRegionHeight) ||
    options.minRegionHeight < 0
  ) {
    throw new RangeError(
      "minRegionWidth and minRegionHeight must be finite non-negative numbers.",
    );
  }
}

/**
 * Consistent color grouping key.
 *
 * Same-color regions should compose together even if caller casing differs.
 */
function createColorKey(color: string): string {
  return color.trim().toUpperCase();
}

/**
 * Ensure opacity stays render-safe.
 */
function normalizeOpacity(opacity: HighlightOpacity): HighlightOpacity {
  if (!Number.isFinite(opacity)) {
    return 0;
  }

  return clamp01(opacity);
}

/**
 * Flatten highlight layers into independent composable atoms.
 */
function flattenHighlightLayers(
  layers: readonly HighlightLayer[],
  options: HighlightOverlapMergeOptions,
): readonly HighlightAtom[] {
  const atoms: HighlightAtom[] = [];

  for (const layer of layers) {
    const color = layer.style.color.trim();

    if (color.length === 0) {
      continue;
    }

    const colorKey = createColorKey(color);
    const opacity = normalizeOpacity(layer.style.opacity);

    for (const region of layer.regions) {
      const bounds = clampNormalizedRect(region.bounds);

      if (
        bounds.width < options.minRegionWidth ||
        bounds.height < options.minRegionHeight
      ) {
        continue;
      }

      atoms.push({
        pageIndex: layer.pageIndex,
        bounds,
        colorKey,
        color: colorKey,
        opacity,
        sourceLayerId: layer.id,
        sourceRegionId: region.id,
      });
    }
  }

  return atoms.sort((first, second) => {
    if (first.pageIndex !== second.pageIndex) {
      return first.pageIndex - second.pageIndex;
    }

    if (first.bounds.y !== second.bounds.y) {
      return first.bounds.y - second.bounds.y;
    }

    return first.bounds.x - second.bounds.x;
  });
}

/**
 * Vertical overlap length between two rectangles.
 */
function getVerticalOverlapLength(
  first: Rect2D,
  second: Rect2D,
): number {
  const top = Math.max(first.y, second.y);
  const bottom = Math.min(
    first.y + first.height,
    second.y + second.height,
  );

  return Math.max(0, bottom - top);
}

/**
 * Ratio of vertical overlap based on the shorter region's height.
 */
function getVerticalOverlapRatio(
  first: Rect2D,
  second: Rect2D,
): number {
  const smallerHeight = Math.min(first.height, second.height);

  if (smallerHeight <= EPSILON) {
    return 0;
  }

  return clamp01(
    getVerticalOverlapLength(first, second) / smallerHeight,
  );
}

/**
 * Vertical center position of a rectangle.
 */
function getCenterY(rect: Rect2D): number {
  return rect.y + rect.height / 2;
}

/**
 * Determine whether two same-color regions should composite into one shape.
 *
 * Requirements:
 * 1. They must physically intersect.
 * 2. They must behave like the same text band/line, not separate rows.
 */
function shouldMergeRegions(
  first: NormalizedRect,
  second: NormalizedRect,
  options: HighlightOverlapMergeOptions,
): boolean {
  if (!rectsIntersect(first, second)) {
    return false;
  }

  const intersection = getRectIntersection(first, second);

  if (!intersection) {
    return false;
  }

  const verticalOverlapRatio = getVerticalOverlapRatio(first, second);

  if (verticalOverlapRatio >= options.minVerticalOverlapRatio) {
    return true;
  }

  const largerHeight = Math.max(first.height, second.height);

  if (largerHeight <= EPSILON) {
    return false;
  }

  const centerDistance = Math.abs(getCenterY(first) - getCenterY(second));

  return (
    centerDistance / largerHeight <=
    options.maxCenterDistanceToHeightRatio
  );
}

/**
 * Convert a single atom into a mutable composited region.
 */
function createCompositeFromAtom(
  atom: HighlightAtom,
): MutableCompositeRegion {
  return {
    pageIndex: atom.pageIndex,
    bounds: atom.bounds,
    colorKey: atom.colorKey,
    color: atom.color,
    opacity: atom.opacity,
    sourceLayerIds: new Set([atom.sourceLayerId]),
    sourceRegionIds: new Set([atom.sourceRegionId]),
  };
}

/**
 * Merge one atom into an existing composite region.
 */
function mergeAtomIntoComposite(
  composite: MutableCompositeRegion,
  atom: HighlightAtom,
): MutableCompositeRegion {
  composite.bounds = clampNormalizedRect(
    getRectUnion(composite.bounds, atom.bounds),
  );

  /**
   * Critical anti-darkening rule:
   * Use strongest opacity once, instead of stacking transparent overlays.
   */
  composite.opacity = Math.max(composite.opacity, atom.opacity);

  composite.sourceLayerIds.add(atom.sourceLayerId);
  composite.sourceRegionIds.add(atom.sourceRegionId);

  return composite;
}

/**
 * Merge one composite region into another.
 *
 * This is needed when a new atom bridges two already-created composites.
 */
function mergeCompositeIntoComposite(
  target: MutableCompositeRegion,
  source: MutableCompositeRegion,
): MutableCompositeRegion {
  target.bounds = clampNormalizedRect(
    getRectUnion(target.bounds, source.bounds),
  );

  target.opacity = Math.max(target.opacity, source.opacity);

  source.sourceLayerIds.forEach((id) => target.sourceLayerIds.add(id));
  source.sourceRegionIds.forEach((id) => target.sourceRegionIds.add(id));

  return target;
}

/**
 * Compose all atoms belonging to the same page + color group.
 */
function composeAtomGroup(
  atoms: readonly HighlightAtom[],
  options: HighlightOverlapMergeOptions,
): readonly MutableCompositeRegion[] {
  const composites: MutableCompositeRegion[] = [];

  for (const atom of atoms) {
    const matchingIndexes: number[] = [];

    composites.forEach((composite, index) => {
      if (
        shouldMergeRegions(composite.bounds, atom.bounds, options)
      ) {
        matchingIndexes.push(index);
      }
    });

    if (matchingIndexes.length === 0) {
      composites.push(createCompositeFromAtom(atom));
      continue;
    }

    const primaryIndex = matchingIndexes[0];
    const primaryComposite = composites[primaryIndex];

    mergeAtomIntoComposite(primaryComposite, atom);

    /**
     * If this atom connects multiple existing regions, collapse them into
     * the primary one so final render output stays deduplicated.
     */
    for (let index = matchingIndexes.length - 1; index >= 1; index -= 1) {
      const compositeIndex = matchingIndexes[index];
      const secondaryComposite = composites[compositeIndex];

      mergeCompositeIntoComposite(primaryComposite, secondaryComposite);
      composites.splice(compositeIndex, 1);
    }
  }

  return composites;
}

/**
 * Group atoms by page and color.
 *
 * Same color on the same page can safely be considered for composition.
 */
function groupAtomsByPageAndColor(
  atoms: readonly HighlightAtom[],
): ReadonlyMap<string, readonly HighlightAtom[]> {
  const groups = new Map<string, HighlightAtom[]>();

  for (const atom of atoms) {
    const groupKey = `${atom.pageIndex}::${atom.colorKey}`;
    const existing = groups.get(groupKey);

    if (existing) {
      existing.push(atom);
    } else {
      groups.set(groupKey, [atom]);
    }
  }

  return groups;
}

/**
 * Convert mutable internal composites into final immutable render regions.
 */
function finalizeCompositeRegions(
  composites: readonly MutableCompositeRegion[],
): readonly CompositedHighlightRegion[] {
  return [...composites]
    .sort((first, second) => {
      if (first.pageIndex !== second.pageIndex) {
        return first.pageIndex - second.pageIndex;
      }

      if (first.bounds.y !== second.bounds.y) {
        return first.bounds.y - second.bounds.y;
      }

      return first.bounds.x - second.bounds.x;
    })
    .map((composite, renderOrder) => ({
      pageIndex: composite.pageIndex,
      bounds: composite.bounds,
      style: {
        color: composite.color,
        opacity: composite.opacity,
      },
      sourceLayerIds: [...composite.sourceLayerIds].sort(),
      sourceRegionIds: [...composite.sourceRegionIds].sort(),
      renderOrder,
    }));
}

/**
 * Public engine entrypoint.
 *
 * Use this before:
 * - drawing highlight overlays in the browser
 * - exporting highlight rectangles into the PDF
 *
 * This function does not mutate original highlight layers.
 */
export function composeHighlightRegions(
  layers: readonly HighlightLayer[],
  options?: Partial<HighlightOverlapMergeOptions>,
): HighlightCompositionResult {
  const resolvedOptions = resolveOptions(options);

  const atoms = flattenHighlightLayers(layers, resolvedOptions);
  const groupedAtoms = groupAtomsByPageAndColor(atoms);

  const mutableComposites: MutableCompositeRegion[] = [];

  groupedAtoms.forEach((group) => {
    const groupComposites = composeAtomGroup(group, resolvedOptions);
    mutableComposites.push(...groupComposites);
  });

  const regions = finalizeCompositeRegions(mutableComposites);

  return {
    regions,
    inputLayerCount: layers.length,
    inputRegionCount: atoms.length,
    compositedRegionCount: regions.length,
    mergedRegionReductionCount: Math.max(
      0,
      atoms.length - regions.length,
    ),
  };
}
