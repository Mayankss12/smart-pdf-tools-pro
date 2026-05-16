import type {
  NormalizedRect,
  PdfPageIndex,
} from "../shared/types";

import type {
  HighlightLayer,
  HighlightLayerId,
  HighlightStyle,
  SnappedRegion,
  SnappedRegionId,
} from "./types";

import {
  createHighlightLayer,
} from "./highlightEngine";

import type {
  SnapTextHighlightResult,
  TextSnapRegionIdContext,
  TextSnapUnit,
  TextSnapperOptions,
} from "./textSnapper";

import {
  snapTextHighlight,
} from "./textSnapper";

import type {
  FreeformSnapRegionIdContext,
  FreeformSnapperOptions,
  SnapFreeformHighlightResult,
} from "./freeformSnapper";

import {
  snapFreeformHighlight,
} from "./freeformSnapper";

/**
 * PDFMantra Smart Highlight Orchestrator
 * --------------------------------------------
 * Pure engine-level coordination for highlight creation.
 *
 * This file is the clean entrypoint for future tool adapters:
 * - standalone /tools/highlight-pdf page
 * - future main editor plugin
 * - backend-aware autosave adapters
 *
 * It decides:
 * 1. whether smart text snapping can create precise highlight regions
 * 2. whether freeform fallback should be used
 * 3. how to produce a validated HighlightLayer record
 *
 * Architecture rules:
 * - No React
 * - No DOM
 * - No PDF.js
 * - No browser-only APIs
 * - No backend framework coupling
 * - Fully serializable output
 */

export type HighlightSnapStrategy =
  | "text-first-with-freeform-fallback"
  | "text-only"
  | "freeform-only";

export type HighlightOrchestrationStatus =
  | "created-from-text-snap"
  | "created-from-freeform-fallback"
  | "rejected-no-region";

export type HighlightOrchestrationFallbackReason =
  | "strategy-freeform-only"
  | "no-text-units"
  | "text-snap-returned-no-regions"
  | "text-snap-disabled"
  | "freeform-fallback-rejected"
  | null;

/**
 * Caller-owned layer ID factory.
 *
 * The orchestrator never creates random IDs internally.
 * This keeps it deterministic and compatible with:
 * - backend-issued IDs
 * - optimistic local frontend IDs
 * - unit/integration tests
 */
export type HighlightLayerIdFactory = () => HighlightLayerId;

/**
 * Unified orchestrator-owned region ID factory.
 *
 * Internally this is adapted into:
 * - text snapper region IDs
 * - freeform snapper region IDs
 */
export interface HighlightRegionIdContext {
  readonly pageIndex: PdfPageIndex;
  readonly source: "text-snap" | "freeform";
  readonly readingOrder?: number;
  readonly sourceLineIndex?: number;
  readonly sourceClusterIndex?: number;
}

export type HighlightRegionIdFactory = (
  context: HighlightRegionIdContext,
) => SnappedRegionId;

/**
 * Request payload for creating one logical highlight layer from a drag action.
 */
export interface CreateSmartHighlightRequest {
  readonly pageIndex: PdfPageIndex;
  readonly dragBounds: NormalizedRect;

  /**
   * Text units from a future PDF.js adapter.
   *
   * Empty or undefined text units automatically trigger fallback logic
   * when the selected strategy allows fallback.
   */
  readonly textUnits?: readonly TextSnapUnit[];

  /**
   * Controls which highlight path is allowed.
   */
  readonly strategy?: HighlightSnapStrategy;

  /**
   * Final visual style to persist with the HighlightLayer.
   */
  readonly style?: HighlightStyle;

  /**
   * Caller-owned deterministic ID factories.
   */
  readonly createLayerId: HighlightLayerIdFactory;
  readonly createRegionId: HighlightRegionIdFactory;

  /**
   * Fine-tuning passed into the existing pure sub-engines.
   */
  readonly textSnapperOptions?: Partial<TextSnapperOptions>;
  readonly freeformSnapperOptions?: Partial<FreeformSnapperOptions>;
}

/**
 * Result returned from the orchestration layer.
 *
 * - layer is null when no highlight should be created
 * - diagnostics preserve useful internal decisions for future UI feedback
 */
export interface CreateSmartHighlightResult {
  readonly status: HighlightOrchestrationStatus;
  readonly fallbackReason: HighlightOrchestrationFallbackReason;
  readonly layer: HighlightLayer | null;

  readonly selectedRegionCount: number;

  readonly textSnapResult: SnapTextHighlightResult | null;
  readonly freeformSnapResult: SnapFreeformHighlightResult | null;
}

/**
 * Resolve default strategy.
 *
 * This should be the normal production path for the standalone Smart Highlight tool.
 */
function resolveStrategy(
  strategy?: HighlightSnapStrategy,
): HighlightSnapStrategy {
  return strategy ?? "text-first-with-freeform-fallback";
}

/**
 * Validate core orchestrator request contract.
 */
function assertValidRequest(
  request: CreateSmartHighlightRequest,
): void {
  if (!Number.isInteger(request.pageIndex) || request.pageIndex < 0) {
    throw new RangeError(
      "CreateSmartHighlightRequest.pageIndex must be a zero-based non-negative integer.",
    );
  }

  if (typeof request.createLayerId !== "function") {
    throw new TypeError(
      "CreateSmartHighlightRequest.createLayerId must be a function.",
    );
  }

  if (typeof request.createRegionId !== "function") {
    throw new TypeError(
      "CreateSmartHighlightRequest.createRegionId must be a function.",
    );
  }
}

/**
 * Adapt the orchestrator's unified ID factory to the text snapper contract.
 */
function createTextRegionIdAdapter(
  createRegionId: HighlightRegionIdFactory,
): (context: TextSnapRegionIdContext) => SnappedRegionId {
  return (context) =>
    createRegionId({
      pageIndex: context.pageIndex,
      source: "text-snap",
      readingOrder: context.readingOrder,
      sourceLineIndex: context.sourceLineIndex,
      sourceClusterIndex: context.sourceClusterIndex,
    });
}

/**
 * Adapt the orchestrator's unified ID factory to the freeform snapper contract.
 */
function createFreeformRegionIdAdapter(
  createRegionId: HighlightRegionIdFactory,
): (context: FreeformSnapRegionIdContext) => SnappedRegionId {
  return (context) =>
    createRegionId({
      pageIndex: context.pageIndex,
      source: "freeform",
    });
}

/**
 * Create a validated HighlightLayer from snapped regions.
 */
function buildLayerFromRegions(input: {
  readonly createLayerId: HighlightLayerIdFactory;
  readonly pageIndex: PdfPageIndex;
  readonly creationSource: HighlightLayer["creationSource"];
  readonly style?: HighlightStyle;
  readonly regions: readonly SnappedRegion[];
}): HighlightLayer {
  return createHighlightLayer({
    id: input.createLayerId(),
    pageIndex: input.pageIndex,
    creationSource: input.creationSource,
    style: input.style,
    regions: input.regions,
  });
}

/**
 * Empty "no result" response.
 */
function createRejectedResult(input: {
  readonly fallbackReason: HighlightOrchestrationFallbackReason;
  readonly textSnapResult: SnapTextHighlightResult | null;
  readonly freeformSnapResult: SnapFreeformHighlightResult | null;
}): CreateSmartHighlightResult {
  return {
    status: "rejected-no-region",
    fallbackReason: input.fallbackReason,
    layer: null,
    selectedRegionCount: 0,
    textSnapResult: input.textSnapResult,
    freeformSnapResult: input.freeformSnapResult,
  };
}

/**
 * Attempt precise smart text snapping.
 */
function attemptTextSnap(
  request: CreateSmartHighlightRequest,
): SnapTextHighlightResult {
  return snapTextHighlight({
    pageIndex: request.pageIndex,
    dragBounds: request.dragBounds,
    units: request.textUnits ?? [],
    createRegionId: createTextRegionIdAdapter(request.createRegionId),
    options: request.textSnapperOptions,
  });
}

/**
 * Attempt freeform fallback region creation.
 */
function attemptFreeformSnap(
  request: CreateSmartHighlightRequest,
): SnapFreeformHighlightResult {
  return snapFreeformHighlight({
    pageIndex: request.pageIndex,
    dragBounds: request.dragBounds,
    createRegionId: createFreeformRegionIdAdapter(request.createRegionId),
    options: request.freeformSnapperOptions,
  });
}

/**
 * Public orchestration entrypoint.
 *
 * This is the future adapter-facing function that the Highlight PDF tool
 * should call after a user completes a drag gesture.
 */
export function createSmartHighlightFromDrag(
  request: CreateSmartHighlightRequest,
): CreateSmartHighlightResult {
  assertValidRequest(request);

  const strategy = resolveStrategy(request.strategy);
  const hasTextUnits = (request.textUnits?.length ?? 0) > 0;

  /**
   * Strategy: freeform only
   * Used later for:
   * - explicit fallback mode
   * - page detected as scanned/image-only
   * - user choosing rectangle highlight behavior
   */
  if (strategy === "freeform-only") {
    const freeformSnapResult = attemptFreeformSnap(request);

    if (!freeformSnapResult.region) {
      return createRejectedResult({
        fallbackReason: "freeform-fallback-rejected",
        textSnapResult: null,
        freeformSnapResult,
      });
    }

    const layer = buildLayerFromRegions({
      createLayerId: request.createLayerId,
      pageIndex: request.pageIndex,
      creationSource: "freeform-drag",
      style: request.style,
      regions: [freeformSnapResult.region],
    });

    return {
      status: "created-from-freeform-fallback",
      fallbackReason: "strategy-freeform-only",
      layer,
      selectedRegionCount: layer.regions.length,
      textSnapResult: null,
      freeformSnapResult,
    };
  }

  /**
   * Strategy: text-first / text-only
   */
  const textSnapResult = hasTextUnits
    ? attemptTextSnap(request)
    : null;

  if (textSnapResult && textSnapResult.regions.length > 0) {
    const layer = buildLayerFromRegions({
      createLayerId: request.createLayerId,
      pageIndex: request.pageIndex,
      creationSource: "text-drag-snap",
      style: request.style,
      regions: textSnapResult.regions,
    });

    return {
      status: "created-from-text-snap",
      fallbackReason: null,
      layer,
      selectedRegionCount: layer.regions.length,
      textSnapResult,
      freeformSnapResult: null,
    };
  }

  /**
   * Strategy: text only
   * If smart snapping fails, we intentionally do not create a rough rectangle.
   */
  if (strategy === "text-only") {
    return createRejectedResult({
      fallbackReason: hasTextUnits
        ? "text-snap-returned-no-regions"
        : "no-text-units",
      textSnapResult,
      freeformSnapResult: null,
    });
  }

  /**
   * Strategy: text-first with freeform fallback
   * This is the default production behavior.
   */
  const freeformSnapResult = attemptFreeformSnap(request);

  if (!freeformSnapResult.region) {
    return createRejectedResult({
      fallbackReason: "freeform-fallback-rejected",
      textSnapResult,
      freeformSnapResult,
    });
  }

  const layer = buildLayerFromRegions({
    createLayerId: request.createLayerId,
    pageIndex: request.pageIndex,
    creationSource: "freeform-drag",
    style: request.style,
    regions: [freeformSnapResult.region],
  });

  return {
    status: "created-from-freeform-fallback",
    fallbackReason: hasTextUnits
      ? "text-snap-returned-no-regions"
      : "no-text-units",
    layer,
    selectedRegionCount: layer.regions.length,
    textSnapResult,
    freeformSnapResult,
  };
}
