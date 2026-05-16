import type {
  NormalizedRect,
  PdfPageIndex,
} from "@/engines/shared/types";

import {
  clamp,
  clampNormalizedRect,
} from "@/engines/shared/coordinateUtils";

import type {
  TextSnapUnit,
} from "@/engines/highlight/textSnapper";

import type {
  PdfJsAffineTransformLike,
  PdfJsTextContentItemLike,
  PdfJsTextContentLike,
  PdfJsTextItemLike,
  PdfJsViewportLike,
} from "./types";

/**
 * PDFMantra PDF.js Text Content Adapter
 * --------------------------------------------
 * Converts PDF.js getTextContent() payloads into normalized TextSnapUnit[]
 * records that the pure Smart Highlight engine can consume.
 *
 * Architecture rules:
 * - Adapter layer only
 * - No React
 * - No DOM usage
 * - No old editor type reuse
 * - No engine mutation
 * - Output is normalized 0..1 page-space geometry
 *
 * Precision note:
 * PDF.js exposes text items rather than semantic words. This adapter can keep
 * each raw text item as one unit or split text items into word-level units using
 * proportional geometry. Word splitting is the preferred default for precise
 * highlight snapping, while item-level extraction remains available when a page
 * adapter wants the raw PDF.js grouping.
 */

const EPSILON = 1e-9;

export type PdfJsTextSnapGranularity = "word" | "item";

export interface PdfJsTextSnapExtractionOptions {
  /**
   * Preferred Smart Highlight unit granularity.
   */
  readonly granularity: PdfJsTextSnapGranularity;

  /**
   * Lower geometry guardrails in rendered pixels before normalization.
   */
  readonly minWidthPx: number;
  readonly minHeightPx: number;

  /**
   * Some PDF.js text items have very tight glyph heights. A small visual
   * expansion keeps highlight snapping aligned with what users perceive as a
   * readable text band.
   */
  readonly textHeightMultiplier: number;

  /**
   * Spaces visually consume less width than visible characters when a text item
   * is split into word units. This weight improves proportional word boxes.
   */
  readonly whitespaceWidthWeight: number;

  /**
   * Empty/whitespace-only content should never become highlight targets.
   */
  readonly discardWhitespaceOnlyItems: boolean;
}

export const DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS: PdfJsTextSnapExtractionOptions =
  Object.freeze({
    granularity: "word",
    minWidthPx: 1,
    minHeightPx: 4,
    textHeightMultiplier: 1.12,
    whitespaceWidthWeight: 0.38,
    discardWhitespaceOnlyItems: true,
  });

export interface BuildTextSnapUnitsFromPdfJsRequest {
  readonly pageIndex: PdfPageIndex;
  readonly textContent: PdfJsTextContentLike;
  readonly viewport: PdfJsViewportLike;
  readonly options?: Partial<PdfJsTextSnapExtractionOptions>;
}

export interface PdfJsTextSnapExtractionDiagnostics {
  readonly sourceItemCount: number;
  readonly acceptedTextItemCount: number;
  readonly skippedNonTextItemCount: number;
  readonly skippedEmptyTextItemCount: number;
  readonly skippedInvalidTransformCount: number;
  readonly skippedDegenerateBoundsCount: number;
  readonly emittedUnitCount: number;
  readonly emittedWordUnitCount: number;
  readonly emittedItemUnitCount: number;
}

export interface PdfJsTextSnapExtractionResult {
  readonly units: readonly TextSnapUnit[];
  readonly diagnostics: PdfJsTextSnapExtractionDiagnostics;
}

interface MutableDiagnostics {
  sourceItemCount: number;
  acceptedTextItemCount: number;
  skippedNonTextItemCount: number;
  skippedEmptyTextItemCount: number;
  skippedInvalidTransformCount: number;
  skippedDegenerateBoundsCount: number;
  emittedUnitCount: number;
  emittedWordUnitCount: number;
  emittedItemUnitCount: number;
}

interface PreparedPdfJsTextItem {
  readonly sourceIndex: number;
  readonly text: string;
  readonly direction: string;
  readonly bounds: NormalizedRect;
}

interface WeightedTextSpan {
  readonly text: string;
  readonly startIndex: number;
  readonly endIndex: number;
  readonly startWeight: number;
  readonly endWeight: number;
}

function resolveOptions(
  options?: Partial<PdfJsTextSnapExtractionOptions>,
): PdfJsTextSnapExtractionOptions {
  const resolved: PdfJsTextSnapExtractionOptions = {
    granularity:
      options?.granularity ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.granularity,
    minWidthPx:
      options?.minWidthPx ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.minWidthPx,
    minHeightPx:
      options?.minHeightPx ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.minHeightPx,
    textHeightMultiplier:
      options?.textHeightMultiplier ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.textHeightMultiplier,
    whitespaceWidthWeight:
      options?.whitespaceWidthWeight ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.whitespaceWidthWeight,
    discardWhitespaceOnlyItems:
      options?.discardWhitespaceOnlyItems ??
      DEFAULT_PDFJS_TEXT_SNAP_EXTRACTION_OPTIONS.discardWhitespaceOnlyItems,
  };

  assertValidOptions(resolved);
  return resolved;
}

function assertValidOptions(
  options: PdfJsTextSnapExtractionOptions,
): void {
  if (options.granularity !== "word" && options.granularity !== "item") {
    throw new RangeError("granularity must be either 'word' or 'item'.");
  }

  const positiveFields: readonly (keyof PdfJsTextSnapExtractionOptions)[] = [
    "minWidthPx",
    "minHeightPx",
    "textHeightMultiplier",
  ];

  for (const field of positiveFields) {
    const value = options[field];

    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      throw new RangeError(`${field} must be a positive finite number.`);
    }
  }

  if (
    !Number.isFinite(options.whitespaceWidthWeight) ||
    options.whitespaceWidthWeight < 0 ||
    options.whitespaceWidthWeight > 1
  ) {
    throw new RangeError(
      "whitespaceWidthWeight must be a finite number between 0 and 1.",
    );
  }
}

function assertValidRequest(
  request: BuildTextSnapUnitsFromPdfJsRequest,
): void {
  if (!Number.isInteger(request.pageIndex) || request.pageIndex < 0) {
    throw new RangeError("pageIndex must be a zero-based non-negative integer.");
  }

  if (!request.textContent || !Array.isArray(request.textContent.items)) {
    throw new TypeError("textContent.items must be an array.");
  }

  if (
    !Number.isFinite(request.viewport.width) ||
    request.viewport.width <= 0 ||
    !Number.isFinite(request.viewport.height) ||
    request.viewport.height <= 0
  ) {
    throw new RangeError(
      "viewport width and height must be positive finite numbers.",
    );
  }

  if (!isAffineTransform(request.viewport.transform)) {
    throw new RangeError(
      "viewport.transform must be a six-number affine transform array.",
    );
  }
}

function isAffineTransform(
  transform: PdfJsAffineTransformLike | undefined,
): transform is readonly [number, number, number, number, number, number] {
  return (
    Array.isArray(transform) &&
    transform.length === 6 &&
    transform.every((value) => Number.isFinite(value))
  );
}

function isTextItem(
  item: PdfJsTextContentItemLike,
): item is PdfJsTextItemLike {
  return (
    typeof (item as PdfJsTextItemLike).str === "string" &&
    typeof (item as PdfJsTextItemLike).width === "number" &&
    typeof (item as PdfJsTextItemLike).height === "number" &&
    isAffineTransform((item as PdfJsTextItemLike).transform)
  );
}

/**
 * Matrix multiplication matching PDF.js Util.transform(a, b).
 */
function multiplyAffineTransforms(
  first: readonly [number, number, number, number, number, number],
  second: readonly [number, number, number, number, number, number],
): readonly [number, number, number, number, number, number] {
  return [
    first[0] * second[0] + first[2] * second[1],
    first[1] * second[0] + first[3] * second[1],
    first[0] * second[2] + first[2] * second[3],
    first[1] * second[2] + first[3] * second[3],
    first[0] * second[4] + first[2] * second[5] + first[4],
    first[1] * second[4] + first[3] * second[5] + first[5],
  ];
}

function resolveViewportScale(viewport: PdfJsViewportLike): number {
  if (Number.isFinite(viewport.scale) && Number(viewport.scale) > 0) {
    return Number(viewport.scale);
  }

  if (!isAffineTransform(viewport.transform)) {
    return 1;
  }

  const xScale = Math.hypot(viewport.transform[0], viewport.transform[1]);
  const yScale = Math.hypot(viewport.transform[2], viewport.transform[3]);
  const resolved = Math.max(xScale, yScale);

  return Number.isFinite(resolved) && resolved > EPSILON ? resolved : 1;
}

function createNormalizedBounds(input: {
  readonly leftPx: number;
  readonly topPx: number;
  readonly widthPx: number;
  readonly heightPx: number;
  readonly viewport: PdfJsViewportLike;
}): NormalizedRect {
  return clampNormalizedRect({
    x: input.leftPx / input.viewport.width,
    y: input.topPx / input.viewport.height,
    width: input.widthPx / input.viewport.width,
    height: input.heightPx / input.viewport.height,
  });
}

function prepareTextItem(input: {
  readonly item: PdfJsTextItemLike;
  readonly sourceIndex: number;
  readonly viewport: PdfJsViewportLike;
  readonly options: PdfJsTextSnapExtractionOptions;
}): PreparedPdfJsTextItem | null {
  const { item, sourceIndex, viewport, options } = input;

  if (!isAffineTransform(viewport.transform) || !isAffineTransform(item.transform)) {
    return null;
  }

  const transformed = multiplyAffineTransforms(
    viewport.transform,
    item.transform,
  );

  const fontSizePx = Math.max(
    options.minHeightPx,
    Math.hypot(transformed[2], transformed[3]),
  );

  const viewportScale = resolveViewportScale(viewport);
  const widthPx = Math.max(
    options.minWidthPx,
    Math.abs(item.width) * viewportScale,
  );

  const heightPx = Math.max(
    options.minHeightPx,
    fontSizePx * options.textHeightMultiplier,
  );

  const leftPx = transformed[4];
  const topPx = transformed[5] - heightPx;
  const bounds = createNormalizedBounds({
    leftPx,
    topPx,
    widthPx,
    heightPx,
    viewport,
  });

  if (bounds.width <= EPSILON || bounds.height <= EPSILON) {
    return null;
  }

  return {
    sourceIndex,
    text: item.str,
    direction: item.dir ?? "ltr",
    bounds,
  };
}

function getCharacterWeight(
  character: string,
  whitespaceWidthWeight: number,
): number {
  return /\s/.test(character) ? whitespaceWidthWeight : 1;
}

function buildWeightedWordSpans(
  text: string,
  whitespaceWidthWeight: number,
): readonly WeightedTextSpan[] {
  const matches = Array.from(text.matchAll(/\S+/g));

  if (matches.length === 0) {
    return [];
  }

  const prefixWeights: number[] = [0];

  for (const character of text) {
    const previous = prefixWeights[prefixWeights.length - 1] ?? 0;
    prefixWeights.push(
      previous + getCharacterWeight(character, whitespaceWidthWeight),
    );
  }

  return matches.map((match) => {
    const startIndex = match.index ?? 0;
    const endIndex = startIndex + match[0].length;

    return {
      text: match[0],
      startIndex,
      endIndex,
      startWeight: prefixWeights[startIndex] ?? 0,
      endWeight: prefixWeights[endIndex] ?? prefixWeights[prefixWeights.length - 1] ?? 0,
    };
  });
}

function createItemUnit(input: {
  readonly pageIndex: PdfPageIndex;
  readonly item: PreparedPdfJsTextItem;
}): TextSnapUnit {
  return {
    id: `pdfjs-page-${input.pageIndex}-item-${input.item.sourceIndex}`,
    pageIndex: input.pageIndex,
    text: input.item.text.trim(),
    bounds: input.item.bounds,
  };
}

function createWordUnits(input: {
  readonly pageIndex: PdfPageIndex;
  readonly item: PreparedPdfJsTextItem;
  readonly options: PdfJsTextSnapExtractionOptions;
}): readonly TextSnapUnit[] {
  const spans = buildWeightedWordSpans(
    input.item.text,
    input.options.whitespaceWidthWeight,
  );

  if (spans.length === 0) {
    return [];
  }

  const totalWeight = spans.reduce((maxWeight, span) => {
    return Math.max(maxWeight, span.endWeight);
  }, 0);

  if (totalWeight <= EPSILON) {
    return [createItemUnit({ pageIndex: input.pageIndex, item: input.item })];
  }

  return spans.map((span, wordIndex) => {
    const startRatio = clamp(span.startWeight / totalWeight, 0, 1);
    const endRatio = clamp(span.endWeight / totalWeight, 0, 1);
    const widthRatio = Math.max(0, endRatio - startRatio);

    const isRtl = input.item.direction.toLowerCase() === "rtl";
    const xRatio = isRtl ? 1 - endRatio : startRatio;

    return {
      id: `pdfjs-page-${input.pageIndex}-item-${input.item.sourceIndex}-word-${wordIndex}`,
      pageIndex: input.pageIndex,
      text: span.text,
      bounds: clampNormalizedRect({
        x: input.item.bounds.x + input.item.bounds.width * xRatio,
        y: input.item.bounds.y,
        width: input.item.bounds.width * widthRatio,
        height: input.item.bounds.height,
      }),
    } satisfies TextSnapUnit;
  }).filter((unit) => unit.bounds.width > EPSILON && unit.bounds.height > EPSILON);
}

function finalizeDiagnostics(
  diagnostics: MutableDiagnostics,
): PdfJsTextSnapExtractionDiagnostics {
  return {
    sourceItemCount: diagnostics.sourceItemCount,
    acceptedTextItemCount: diagnostics.acceptedTextItemCount,
    skippedNonTextItemCount: diagnostics.skippedNonTextItemCount,
    skippedEmptyTextItemCount: diagnostics.skippedEmptyTextItemCount,
    skippedInvalidTransformCount: diagnostics.skippedInvalidTransformCount,
    skippedDegenerateBoundsCount: diagnostics.skippedDegenerateBoundsCount,
    emittedUnitCount: diagnostics.emittedUnitCount,
    emittedWordUnitCount: diagnostics.emittedWordUnitCount,
    emittedItemUnitCount: diagnostics.emittedItemUnitCount,
  };
}

/**
 * Public adapter entrypoint.
 *
 * Future standalone Highlight PDF pages should pass PDF.js textContent and the
 * exact rendered viewport into this function, then pass result.units into the
 * pure Smart Highlight orchestrator.
 */
export function buildTextSnapUnitsFromPdfJs(
  request: BuildTextSnapUnitsFromPdfJsRequest,
): PdfJsTextSnapExtractionResult {
  assertValidRequest(request);

  const options = resolveOptions(request.options);
  const diagnostics: MutableDiagnostics = {
    sourceItemCount: request.textContent.items.length,
    acceptedTextItemCount: 0,
    skippedNonTextItemCount: 0,
    skippedEmptyTextItemCount: 0,
    skippedInvalidTransformCount: 0,
    skippedDegenerateBoundsCount: 0,
    emittedUnitCount: 0,
    emittedWordUnitCount: 0,
    emittedItemUnitCount: 0,
  };

  const units: TextSnapUnit[] = [];

  request.textContent.items.forEach((rawItem, sourceIndex) => {
    if (!isTextItem(rawItem)) {
      diagnostics.skippedNonTextItemCount += 1;
      return;
    }

    if (options.discardWhitespaceOnlyItems && !rawItem.str.trim()) {
      diagnostics.skippedEmptyTextItemCount += 1;
      return;
    }

    if (!isAffineTransform(rawItem.transform)) {
      diagnostics.skippedInvalidTransformCount += 1;
      return;
    }

    const preparedItem = prepareTextItem({
      item: rawItem,
      sourceIndex,
      viewport: request.viewport,
      options,
    });

    if (!preparedItem) {
      diagnostics.skippedDegenerateBoundsCount += 1;
      return;
    }

    diagnostics.acceptedTextItemCount += 1;

    if (options.granularity === "item") {
      units.push(
        createItemUnit({
          pageIndex: request.pageIndex,
          item: preparedItem,
        }),
      );

      diagnostics.emittedItemUnitCount += 1;
      return;
    }

    const wordUnits = createWordUnits({
      pageIndex: request.pageIndex,
      item: preparedItem,
      options,
    });

    if (wordUnits.length === 0) {
      units.push(
        createItemUnit({
          pageIndex: request.pageIndex,
          item: preparedItem,
        }),
      );
      diagnostics.emittedItemUnitCount += 1;
      return;
    }

    units.push(...wordUnits);
    diagnostics.emittedWordUnitCount += wordUnits.length;
  });

  diagnostics.emittedUnitCount = units.length;

  return {
    units,
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}
