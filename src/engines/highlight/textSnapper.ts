import type {
  NormalizedRect,
  PdfPageIndex,
  Rect2D,
} from "../shared/types";

import {
  clamp,
  clampNormalizedRect,
  getRectArea,
  getRectIntersection,
  getRectUnion,
  rectsIntersect,
} from "../shared/coordinateUtils";

import type {
  SnappedRegion,
  SnappedRegionGranularity,
  SnappedRegionId,
} from "./types";

/**
 * PDFMantra Smart Highlight Text Snapper
 * --------------------------------------------
 * Pure engine logic for converting a user's rough drag box into precise
 * highlight regions on text-based PDFs.
 *
 * This module is intentionally:
 * - UI-free
 * - React-free
 * - PDF.js-free
 * - backend-safe
 * - deterministic
 *
 * It expects a page adapter to provide normalized text units extracted from
 * the PDF text layer. A future PDF.js adapter will convert raw text content
 * into these normalized units before calling this engine.
 *
 * Responsibilities:
 * - group text units into visual lines
 * - detect the intended line(s) from a drag rectangle
 * - prevent accidental neighboring-line capture
 * - select only relevant text units inside the horizontal drag range
 * - merge nearby selected units into precise highlight rectangles
 * - return clean SnappedRegion[] records
 */

const EPSILON = 1e-9;

/**
 * Smallest reusable text unit accepted by the text snapper.
 *
 * In the future, the frontend extraction adapter may choose to provide:
 * - word-level units
 * - token-level units
 * - split text chunks derived from PDF.js items
 *
 * The snapper does not care where these units came from as long as:
 * - bounds are normalized page-space rectangles
 * - pageIndex is correct
 * - text is preserved
 */
export interface TextSnapUnit {
  readonly id: string;
  readonly pageIndex: PdfPageIndex;
  readonly text: string;
  readonly bounds: NormalizedRect;
}

/**
 * Additional metadata passed into region-id creation.
 *
 * The snapper intentionally does not create random IDs internally.
 * This keeps the engine deterministic and lets the caller decide whether IDs
 * come from:
 * - crypto.randomUUID()
 * - backend-issued IDs
 * - test fixtures
 * - optimistic local IDs
 */
export interface TextSnapRegionIdContext {
  readonly pageIndex: PdfPageIndex;
  readonly readingOrder: number;
  readonly sourceLineIndex: number;
  readonly sourceClusterIndex: number;
}

/**
 * Caller-owned region ID factory.
 */
export type TextSnapRegionIdFactory = (
  context: TextSnapRegionIdContext,
) => SnappedRegionId;

/**
 * Tuning values for smart text highlighting behavior.
 *
 * Defaults are intentionally conservative:
 * - nearby line grazing should not accidentally capture a second line
 * - multi-line selection should require clearer vertical intent
 * - horizontally touched words/items should still snap naturally
 */
export interface TextSnapperOptions {
  /**
   * Minimum visible vertical overlap with a line for it to be considered.
   */
  readonly minCandidateLineVerticalOverlapRatio: number;

  /**
   * Strong line confidence threshold.
   * If two or more lines satisfy this, multi-line mode is allowed.
   */
  readonly strongLineVerticalOverlapRatio: number;

  /**
   * Extra threshold used for the dominant line.
   * If no valid multi-line intent exists, the strongest line wins.
   */
  readonly dominantLineMinimumScore: number;

  /**
   * Text unit horizontal overlap needed to capture that unit.
   */
  readonly minUnitHorizontalOverlapRatio: number;

  /**
   * Text unit area overlap needed to capture that unit.
   */
  readonly minUnitAreaOverlapRatio: number;

  /**
   * If a selected cluster covers this much line width, label it as line-level.
   */
  readonly fullLineCoverageRatio: number;

  /**
   * Gap allowed when joining neighboring selected units into one highlight box.
   * Actual gap uses line height × this factor.
   */
  readonly maxMergeGapToLineHeightRatio: number;

  /**
   * Minimum generated rectangle width.
   */
  readonly minRegionWidth: number;

  /**
   * Minimum generated rectangle height.
   */
  readonly minRegionHeight: number;
}

/**
 * Default text-snapping behavior.
 *
 * These numbers are not UI values.
 * They are engine-level heuristics and can be refined later after real PDF
 * testing without changing the rest of the architecture.
 */
export const DEFAULT_TEXT_SNAPPER_OPTIONS: TextSnapperOptions = Object.freeze({
  minCandidateLineVerticalOverlapRatio: 0.22,
  strongLineVerticalOverlapRatio: 0.52,
  dominantLineMinimumScore: 0.18,
  minUnitHorizontalOverlapRatio: 0.16,
  minUnitAreaOverlapRatio: 0.08,
  fullLineCoverageRatio: 0.82,
  maxMergeGapToLineHeightRatio: 0.7,
  minRegionWidth: 0.0005,
  minRegionHeight: 0.0005,
});

/**
 * Request payload for smart snapping.
 */
export interface SnapTextHighlightRequest {
  readonly pageIndex: PdfPageIndex;
  readonly dragBounds: NormalizedRect;
  readonly units: readonly TextSnapUnit[];
  readonly createRegionId: TextSnapRegionIdFactory;
  readonly options?: Partial<TextSnapperOptions>;
}

/**
 * Line capture mode selected by the snapper.
 */
export type TextSnapSelectionMode =
  | "none"
  | "single-line"
  | "multi-line";

/**
 * Result returned by smart text snapping.
 */
export interface SnapTextHighlightResult {
  readonly mode: TextSnapSelectionMode;
  readonly regions: readonly SnappedRegion[];
  readonly matchedLineCount: number;
  readonly matchedUnitCount: number;
  readonly candidateLineCount: number;
}

/**
 * Internal normalized text unit.
 */
interface PreparedTextUnit extends TextSnapUnit {
  readonly bounds: NormalizedRect;
  readonly centerX: number;
  readonly centerY: number;
}

/**
 * Internal grouped visual line.
 */
interface TextLine {
  readonly lineIndex: number;
  readonly bounds: NormalizedRect;
  readonly units: readonly PreparedTextUnit[];
  readonly centerY: number;
  readonly averageHeight: number;
}

/**
 * Internal candidate-line scoring record.
 */
interface CandidateLine {
  readonly line: TextLine;
  readonly verticalOverlapRatio: number;
  readonly horizontalOverlapRatio: number;
  readonly lineCenterInsideDrag: boolean;
  readonly score: number;
}

/**
 * Internal unit-selection record.
 */
interface SelectedTextUnit {
  readonly unit: PreparedTextUnit;
  readonly horizontalOverlapRatio: number;
  readonly areaOverlapRatio: number;
}

/**
 * Internal region cluster created from adjacent selected text units.
 */
interface HighlightCluster {
  readonly bounds: NormalizedRect;
  readonly units: readonly PreparedTextUnit[];
}

/**
 * Merge user options safely with default options.
 */
function resolveOptions(
  options?: Partial<TextSnapperOptions>,
): TextSnapperOptions {
  return {
    minCandidateLineVerticalOverlapRatio:
      options?.minCandidateLineVerticalOverlapRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.minCandidateLineVerticalOverlapRatio,

    strongLineVerticalOverlapRatio:
      options?.strongLineVerticalOverlapRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.strongLineVerticalOverlapRatio,

    dominantLineMinimumScore:
      options?.dominantLineMinimumScore ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.dominantLineMinimumScore,

    minUnitHorizontalOverlapRatio:
      options?.minUnitHorizontalOverlapRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.minUnitHorizontalOverlapRatio,

    minUnitAreaOverlapRatio:
      options?.minUnitAreaOverlapRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.minUnitAreaOverlapRatio,

    fullLineCoverageRatio:
      options?.fullLineCoverageRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.fullLineCoverageRatio,

    maxMergeGapToLineHeightRatio:
      options?.maxMergeGapToLineHeightRatio ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.maxMergeGapToLineHeightRatio,

    minRegionWidth:
      options?.minRegionWidth ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.minRegionWidth,

    minRegionHeight:
      options?.minRegionHeight ??
      DEFAULT_TEXT_SNAPPER_OPTIONS.minRegionHeight,
  };
}

/**
 * Guard against invalid option tuning values.
 */
function assertValidOptions(options: TextSnapperOptions): void {
  const boundedRatios: readonly (keyof TextSnapperOptions)[] = [
    "minCandidateLineVerticalOverlapRatio",
    "strongLineVerticalOverlapRatio",
    "dominantLineMinimumScore",
    "minUnitHorizontalOverlapRatio",
    "minUnitAreaOverlapRatio",
    "fullLineCoverageRatio",
  ];

  for (const key of boundedRatios) {
    const value = options[key];

    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new RangeError(`${key} must be a finite number between 0 and 1.`);
    }
  }

  if (
    !Number.isFinite(options.maxMergeGapToLineHeightRatio) ||
    options.maxMergeGapToLineHeightRatio < 0
  ) {
    throw new RangeError(
      "maxMergeGapToLineHeightRatio must be a finite non-negative number.",
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
 * Convert one raw unit into a safe prepared unit.
 */
function prepareTextUnit(
  unit: TextSnapUnit,
  requestedPageIndex: PdfPageIndex,
): PreparedTextUnit | null {
  if (unit.pageIndex !== requestedPageIndex) {
    return null;
  }

  if (typeof unit.id !== "string" || unit.id.trim().length === 0) {
    return null;
  }

  if (typeof unit.text !== "string" || unit.text.trim().length === 0) {
    return null;
  }

  const bounds = clampNormalizedRect(unit.bounds);

  if (bounds.width <= EPSILON || bounds.height <= EPSILON) {
    return null;
  }

  return {
    ...unit,
    text: unit.text.trim(),
    bounds,
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
  };
}

/**
 * Prepare and sort valid text units for line grouping.
 */
function prepareTextUnits(
  units: readonly TextSnapUnit[],
  pageIndex: PdfPageIndex,
): readonly PreparedTextUnit[] {
  return units
    .map((unit) => prepareTextUnit(unit, pageIndex))
    .filter((unit): unit is PreparedTextUnit => unit !== null)
    .sort((first, second) => {
      if (Math.abs(first.centerY - second.centerY) > EPSILON) {
        return first.centerY - second.centerY;
      }

      return first.bounds.x - second.bounds.x;
    });
}

/**
 * Rectangle overlap length on x-axis.
 */
function getHorizontalOverlapLength(first: Rect2D, second: Rect2D): number {
  const left = Math.max(first.x, second.x);
  const right = Math.min(first.x + first.width, second.x + second.width);

  return Math.max(0, right - left);
}

/**
 * Rectangle overlap length on y-axis.
 */
function getVerticalOverlapLength(first: Rect2D, second: Rect2D): number {
  const top = Math.max(first.y, second.y);
  const bottom = Math.min(first.y + first.height, second.y + second.height);

  return Math.max(0, bottom - top);
}

/**
 * Overlap ratio measured against the first rectangle's width.
 */
function getHorizontalCoverageRatio(
  subject: Rect2D,
  selector: Rect2D,
): number {
  if (subject.width <= EPSILON) {
    return 0;
  }

  return clamp(
    getHorizontalOverlapLength(subject, selector) / subject.width,
    0,
    1,
  );
}

/**
 * Overlap ratio measured against the first rectangle's height.
 */
function getVerticalCoverageRatio(
  subject: Rect2D,
  selector: Rect2D,
): number {
  if (subject.height <= EPSILON) {
    return 0;
  }

  return clamp(
    getVerticalOverlapLength(subject, selector) / subject.height,
    0,
    1,
  );
}

/**
 * Area overlap ratio measured against the subject rectangle.
 */
function getAreaCoverageRatio(subject: Rect2D, selector: Rect2D): number {
  const intersection = getRectIntersection(subject, selector);

  if (!intersection) {
    return 0;
  }

  const subjectArea = getRectArea(subject);

  if (subjectArea <= EPSILON) {
    return 0;
  }

  return clamp(getRectArea(intersection) / subjectArea, 0, 1);
}

/**
 * Check whether a unit visually belongs to an existing line.
 *
 * We use a combination of:
 * - vertical center proximity
 * - direct vertical overlap with the current line bounds
 *
 * This handles common PDF cases where separate text chunks in the same line
 * have very small y-coordinate differences.
 */
function shouldJoinLine(unit: PreparedTextUnit, line: TextLine): boolean {
  const maxReferenceHeight = Math.max(
    unit.bounds.height,
    line.averageHeight,
  );

  const centerDistance = Math.abs(unit.centerY - line.centerY);
  const centerDistanceThreshold = maxReferenceHeight * 0.68;

  const verticalOverlapRatio = getVerticalCoverageRatio(
    unit.bounds,
    line.bounds,
  );

  return (
    centerDistance <= centerDistanceThreshold ||
    verticalOverlapRatio >= 0.42
  );
}

/**
 * Build a new line from one unit.
 */
function createInitialLine(
  lineIndex: number,
  unit: PreparedTextUnit,
): TextLine {
  return {
    lineIndex,
    bounds: unit.bounds,
    units: [unit],
    centerY: unit.centerY,
    averageHeight: unit.bounds.height,
  };
}

/**
 * Add a unit to an existing line and recalculate line geometry.
 */
function addUnitToLine(line: TextLine, unit: PreparedTextUnit): TextLine {
  const units = [...line.units, unit].sort(
    (first, second) => first.bounds.x - second.bounds.x,
  );

  const bounds = units.reduce<NormalizedRect>(
    (accumulator, current) =>
      clampNormalizedRect(getRectUnion(accumulator, current.bounds)),
    units[0].bounds,
  );

  const averageHeight =
    units.reduce((sum, current) => sum + current.bounds.height, 0) /
    units.length;

  const centerY =
    units.reduce((sum, current) => sum + current.centerY, 0) /
    units.length;

  return {
    ...line,
    bounds,
    units,
    centerY,
    averageHeight,
  };
}

/**
 * Group prepared text units into ordered visual lines.
 */
function groupUnitsIntoLines(
  units: readonly PreparedTextUnit[],
): readonly TextLine[] {
  const lines: TextLine[] = [];

  for (const unit of units) {
    const matchingLineIndex = lines.findIndex((line) =>
      shouldJoinLine(unit, line),
    );

    if (matchingLineIndex === -1) {
      lines.push(createInitialLine(lines.length, unit));
      continue;
    }

    lines[matchingLineIndex] = addUnitToLine(
      lines[matchingLineIndex],
      unit,
    );
  }

  return lines
    .sort((first, second) => {
      if (Math.abs(first.bounds.y - second.bounds.y) > EPSILON) {
        return first.bounds.y - second.bounds.y;
      }

      return first.bounds.x - second.bounds.x;
    })
    .map((line, index) => ({
      ...line,
      lineIndex: index,
    }));
}

/**
 * Compute line relevance score against the user drag rectangle.
 */
function createCandidateLine(
  line: TextLine,
  dragBounds: NormalizedRect,
  options: TextSnapperOptions,
): CandidateLine | null {
  if (!rectsIntersect(line.bounds, dragBounds)) {
    return null;
  }

  const verticalOverlapRatio = getVerticalCoverageRatio(
    line.bounds,
    dragBounds,
  );

  if (
    verticalOverlapRatio <
    options.minCandidateLineVerticalOverlapRatio
  ) {
    return null;
  }

  const horizontalOverlapRatio = getHorizontalCoverageRatio(
    line.bounds,
    dragBounds,
  );

  const lineCenterInsideDrag =
    line.centerY >= dragBounds.y &&
    line.centerY <= dragBounds.y + dragBounds.height;

  /**
   * Line score prioritizes vertical user intent.
   * Horizontal factor matters, but not enough to let a barely touched line win.
   */
  const score = clamp(
    verticalOverlapRatio * 0.72 +
      horizontalOverlapRatio * 0.18 +
      (lineCenterInsideDrag ? 0.1 : 0),
    0,
    1,
  );

  return {
    line,
    verticalOverlapRatio,
    horizontalOverlapRatio,
    lineCenterInsideDrag,
    score,
  };
}

/**
 * Identify all plausible line candidates under the drag box.
 */
function collectCandidateLines(
  lines: readonly TextLine[],
  dragBounds: NormalizedRect,
  options: TextSnapperOptions,
): readonly CandidateLine[] {
  return lines
    .map((line) => createCandidateLine(line, dragBounds, options))
    .filter((candidate): candidate is CandidateLine => candidate !== null)
    .sort((first, second) => {
      if (Math.abs(second.score - first.score) > EPSILON) {
        return second.score - first.score;
      }

      return first.line.lineIndex - second.line.lineIndex;
    });
}

/**
 * Decide whether the user clearly intended a multi-line highlight.
 *
 * The principle:
 * - one strong line + weak grazed neighboring line => single-line
 * - two or more meaningfully captured lines => multi-line
 */
function selectTargetLines(
  candidates: readonly CandidateLine[],
  options: TextSnapperOptions,
): {
  readonly mode: TextSnapSelectionMode;
  readonly selected: readonly CandidateLine[];
} {
  if (candidates.length === 0) {
    return {
      mode: "none",
      selected: [],
    };
  }

  const dominant = candidates[0];

  if (dominant.score < options.dominantLineMinimumScore) {
    return {
      mode: "none",
      selected: [],
    };
  }

  const strongLines = candidates.filter(
    (candidate) =>
      candidate.verticalOverlapRatio >=
        options.strongLineVerticalOverlapRatio ||
      candidate.lineCenterInsideDrag,
  );

  if (strongLines.length >= 2) {
    return {
      mode: "multi-line",
      selected: [...strongLines].sort(
        (first, second) =>
          first.line.lineIndex - second.line.lineIndex,
      ),
    };
  }

  return {
    mode: "single-line",
    selected: [dominant],
  };
}

/**
 * Select only units that the drag box actually targets horizontally.
 */
function selectUnitsWithinLine(
  line: TextLine,
  dragBounds: NormalizedRect,
  options: TextSnapperOptions,
): readonly SelectedTextUnit[] {
  return line.units
    .filter((unit) => rectsIntersect(unit.bounds, dragBounds))
    .map((unit) => ({
      unit,
      horizontalOverlapRatio: getHorizontalCoverageRatio(
        unit.bounds,
        dragBounds,
      ),
      areaOverlapRatio: getAreaCoverageRatio(unit.bounds, dragBounds),
    }))
    .filter(
      (selection) =>
        selection.horizontalOverlapRatio >=
          options.minUnitHorizontalOverlapRatio ||
        selection.areaOverlapRatio >= options.minUnitAreaOverlapRatio ||
        (selection.unit.centerX >= dragBounds.x &&
          selection.unit.centerX <= dragBounds.x + dragBounds.width),
    )
    .sort((first, second) => first.unit.bounds.x - second.unit.bounds.x);
}

/**
 * Create precise contiguous highlight clusters within one visual line.
 *
 * Example:
 * - highlighted words close together => one region
 * - distant word groups separated by a large gap => separate regions
 */
function clusterSelectedUnits(
  selectedUnits: readonly SelectedTextUnit[],
  line: TextLine,
  options: TextSnapperOptions,
): readonly HighlightCluster[] {
  if (selectedUnits.length === 0) {
    return [];
  }

  const maxMergeGap =
    Math.max(line.averageHeight, EPSILON) *
    options.maxMergeGapToLineHeightRatio;

  const clusters: HighlightCluster[] = [];

  for (const selection of selectedUnits) {
    const currentUnit = selection.unit;
    const previousCluster = clusters[clusters.length - 1];

    if (!previousCluster) {
      clusters.push({
        bounds: currentUnit.bounds,
        units: [currentUnit],
      });

      continue;
    }

    const previousBounds = previousCluster.bounds;
    const previousRight = previousBounds.x + previousBounds.width;
    const currentLeft = currentUnit.bounds.x;
    const horizontalGap = Math.max(0, currentLeft - previousRight);

    if (horizontalGap <= maxMergeGap) {
      const mergedUnits = [...previousCluster.units, currentUnit];

      clusters[clusters.length - 1] = {
        bounds: clampNormalizedRect(
          getRectUnion(previousCluster.bounds, currentUnit.bounds),
        ),
        units: mergedUnits,
      };

      continue;
    }

    clusters.push({
      bounds: currentUnit.bounds,
      units: [currentUnit],
    });
  }

  return clusters;
}

/**
 * Determine semantic granularity of a generated region.
 */
function resolveRegionGranularity(
  cluster: HighlightCluster,
  line: TextLine,
  options: TextSnapperOptions,
): SnappedRegionGranularity {
  if (cluster.units.length === 1) {
    return "word";
  }

  const lineCoverageRatio =
    line.bounds.width <= EPSILON
      ? 0
      : cluster.bounds.width / line.bounds.width;

  if (lineCoverageRatio >= options.fullLineCoverageRatio) {
    return "line";
  }

  return "selection";
}

/**
 * Merge selected unit text into a readable preview string.
 */
function getClusterText(cluster: HighlightCluster): string | undefined {
  const joined = cluster.units
    .map((unit) => unit.text.trim())
    .filter((text) => text.length > 0)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return joined.length > 0 ? joined : undefined;
}

/**
 * Convert all chosen lines into engine-level snapped regions.
 */
function createSnappedRegions(
  selectedLines: readonly CandidateLine[],
  dragBounds: NormalizedRect,
  createRegionId: TextSnapRegionIdFactory,
  options: TextSnapperOptions,
): {
  readonly regions: readonly SnappedRegion[];
  readonly matchedUnitCount: number;
} {
  const regions: SnappedRegion[] = [];
  let readingOrder = 0;
  let matchedUnitCount = 0;

  for (const candidate of selectedLines) {
    const selectedUnits = selectUnitsWithinLine(
      candidate.line,
      dragBounds,
      options,
    );

    if (selectedUnits.length === 0) {
      continue;
    }

    matchedUnitCount += selectedUnits.length;

    const clusters = clusterSelectedUnits(
      selectedUnits,
      candidate.line,
      options,
    );

    clusters.forEach((cluster, clusterIndex) => {
      const safeBounds = clampNormalizedRect(cluster.bounds);

      if (
        safeBounds.width < options.minRegionWidth ||
        safeBounds.height < options.minRegionHeight
      ) {
        return;
      }

      regions.push({
        id: createRegionId({
          pageIndex: candidate.line.units[0].pageIndex,
          readingOrder,
          sourceLineIndex: candidate.line.lineIndex,
          sourceClusterIndex: clusterIndex,
        }),
        pageIndex: candidate.line.units[0].pageIndex,
        bounds: safeBounds,
        sourceBounds: dragBounds,
        source: "pdf-text",
        granularity: resolveRegionGranularity(
          cluster,
          candidate.line,
          options,
        ),
        readingOrder,
        text: getClusterText(cluster),
      });

      readingOrder += 1;
    });
  }

  return {
    regions,
    matchedUnitCount,
  };
}

/**
 * Public engine entrypoint.
 *
 * This is the pure function the future highlight UI/tool adapter will call.
 */
export function snapTextHighlight(
  request: SnapTextHighlightRequest,
): SnapTextHighlightResult {
  if (!Number.isInteger(request.pageIndex) || request.pageIndex < 0) {
    throw new RangeError(
      "SnapTextHighlightRequest.pageIndex must be a zero-based non-negative integer.",
    );
  }

  if (typeof request.createRegionId !== "function") {
    throw new TypeError(
      "SnapTextHighlightRequest.createRegionId must be a function.",
    );
  }

  const options = resolveOptions(request.options);
  assertValidOptions(options);

  const dragBounds = clampNormalizedRect(request.dragBounds);

  if (
    dragBounds.width <= EPSILON ||
    dragBounds.height <= EPSILON ||
    request.units.length === 0
  ) {
    return {
      mode: "none",
      regions: [],
      matchedLineCount: 0,
      matchedUnitCount: 0,
      candidateLineCount: 0,
    };
  }

  const preparedUnits = prepareTextUnits(
    request.units,
    request.pageIndex,
  );

  if (preparedUnits.length === 0) {
    return {
      mode: "none",
      regions: [],
      matchedLineCount: 0,
      matchedUnitCount: 0,
      candidateLineCount: 0,
    };
  }

  const lines = groupUnitsIntoLines(preparedUnits);

  const candidateLines = collectCandidateLines(
    lines,
    dragBounds,
    options,
  );

  const targetSelection = selectTargetLines(candidateLines, options);

  if (targetSelection.selected.length === 0) {
    return {
      mode: "none",
      regions: [],
      matchedLineCount: 0,
      matchedUnitCount: 0,
      candidateLineCount: candidateLines.length,
    };
  }

  const snapped = createSnappedRegions(
    targetSelection.selected,
    dragBounds,
    request.createRegionId,
    options,
  );

  return {
    mode: snapped.regions.length > 0 ? targetSelection.mode : "none",
    regions: snapped.regions,
    matchedLineCount:
      snapped.regions.length > 0 ? targetSelection.selected.length : 0,
    matchedUnitCount: snapped.matchedUnitCount,
    candidateLineCount: candidateLines.length,
  };
}
