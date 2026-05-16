import type {
  PdfPageGeometryContext,
  PdfPageIndex,
  PdfPageNumber,
  PdfRect,
  NormalizedRect,
} from "../shared/types";

import {
  assertValidPageGeometry,
  clamp01,
  normalizedRectToPdfRect,
} from "../shared/coordinateUtils";

import type {
  HighlightLayer,
  HighlightLayerId,
  HighlightOpacity,
  SnappedRegionId,
} from "./types";

import type {
  HighlightOverlapMergeOptions,
  CompositedHighlightRegion,
} from "./overlapMerger";

import {
  composeHighlightRegions,
} from "./overlapMerger";

/**
 * PDFMantra Smart Highlight Export Planner
 * --------------------------------------------
 * Pure engine logic that converts persisted highlight layers into a clean,
 * export-ready geometry plan.
 *
 * This file does NOT write into a PDF directly.
 *
 * It prepares:
 * - deduplicated non-darkening highlight render regions
 * - page-index grouped export commands
 * - PDF-space rectangles
 * - RGB colors usable later by pdf-lib / backend render services
 * - final opacity after combining explicit style opacity + optional HEX alpha
 *
 * Architecture rules:
 * - No React
 * - No DOM
 * - No PDF.js
 * - No pdf-lib dependency yet
 * - No backend framework coupling
 * - Fully serializable output
 */

const EPSILON = 1e-9;
const HEX_COLOR_PATTERN = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * RGB color normalized to 0..1.
 *
 * This format maps cleanly to:
 * - pdf-lib rgb(r, g, b)
 * - backend rendering service payloads
 */
export interface ExportRgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Parsed HEX result.
 *
 * alpha is kept separate because highlight styles already have their own
 * explicit opacity setting.
 *
 * Final export opacity = style.opacity × color.alpha
 */
export interface ParsedHighlightExportColor {
  readonly rgb: ExportRgbColor;
  readonly alpha: number;
}

/**
 * One final PDF draw instruction for a highlight rectangle.
 *
 * Important:
 * - This instruction is generated after overlap composition.
 * - It should be rendered once.
 * - Rendering this once prevents translucent darkening caused by stacking.
 */
export interface HighlightPdfDrawCommand {
  readonly pageIndex: PdfPageIndex;
  readonly pageNumber: PdfPageNumber;

  /**
   * Original normalized browser-safe bounds.
   */
  readonly normalizedBounds: NormalizedRect;

  /**
   * Final native PDF coordinate rectangle.
   */
  readonly pdfBounds: PdfRect;

  readonly color: ExportRgbColor;
  readonly opacity: HighlightOpacity;

  readonly sourceLayerIds: readonly HighlightLayerId[];
  readonly sourceRegionIds: readonly SnappedRegionId[];

  readonly renderOrder: number;
}

/**
 * Draw instructions grouped per PDF page.
 */
export interface HighlightExportPagePlan {
  readonly pageIndex: PdfPageIndex;
  readonly pageNumber: PdfPageNumber;
  readonly commands: readonly HighlightPdfDrawCommand[];
}

/**
 * Diagnostic summary of the export planning pass.
 *
 * This is intentionally explicit so later:
 * - UI can show honest export status
 * - tests can validate correctness
 * - backend adapters can log skipped/missing geometry safely
 */
export interface HighlightExportDiagnostics {
  readonly inputLayerCount: number;
  readonly inputRegionCount: number;
  readonly compositedRegionCount: number;
  readonly exportedCommandCount: number;

  readonly skippedMissingGeometryCount: number;
  readonly skippedInvalidColorCount: number;
  readonly skippedInvisibleOpacityCount: number;
  readonly skippedZeroAreaPdfRectCount: number;

  readonly missingGeometryPageIndexes: readonly PdfPageIndex[];
}

/**
 * Final export plan consumed later by PDF writing logic.
 */
export interface HighlightExportPlan {
  readonly pages: readonly HighlightExportPagePlan[];
  readonly flatCommands: readonly HighlightPdfDrawCommand[];
  readonly diagnostics: HighlightExportDiagnostics;
}

/**
 * Public request contract for export planning.
 */
export interface PrepareHighlightExportPlanRequest {
  readonly layers: readonly HighlightLayer[];
  readonly pageGeometryContexts: readonly PdfPageGeometryContext[];
  readonly overlapMergeOptions?: Partial<HighlightOverlapMergeOptions>;
}

/**
 * Internal mutable diagnostics collector.
 */
interface MutableExportDiagnostics {
  inputLayerCount: number;
  inputRegionCount: number;
  compositedRegionCount: number;
  exportedCommandCount: number;

  skippedMissingGeometryCount: number;
  skippedInvalidColorCount: number;
  skippedInvisibleOpacityCount: number;
  skippedZeroAreaPdfRectCount: number;

  missingGeometryPageIndexes: Set<PdfPageIndex>;
}

/**
 * Parse a decimal HEX channel into a normalized 0..1 value.
 */
function hexChannelToNormalized(channel: string): number {
  return parseInt(channel, 16) / 255;
}

/**
 * Expand a short #RGB hex color to six-digit RGB form.
 */
function expandShortHex(hex: string): string {
  return hex
    .split("")
    .map((character) => `${character}${character}`)
    .join("");
}

/**
 * Parse supported highlight HEX tokens into export-ready RGB + alpha.
 *
 * Supported:
 * - #RGB
 * - #RRGGBB
 * - #RRGGBBAA
 */
export function parseHighlightExportColor(
  color: string,
): ParsedHighlightExportColor | null {
  if (typeof color !== "string") {
    return null;
  }

  const normalized = color.trim().toUpperCase();

  if (!HEX_COLOR_PATTERN.test(normalized)) {
    return null;
  }

  const hex = normalized.slice(1);

  if (hex.length === 3) {
    const expanded = expandShortHex(hex);

    return {
      rgb: {
        r: hexChannelToNormalized(expanded.slice(0, 2)),
        g: hexChannelToNormalized(expanded.slice(2, 4)),
        b: hexChannelToNormalized(expanded.slice(4, 6)),
      },
      alpha: 1,
    };
  }

  if (hex.length === 6) {
    return {
      rgb: {
        r: hexChannelToNormalized(hex.slice(0, 2)),
        g: hexChannelToNormalized(hex.slice(2, 4)),
        b: hexChannelToNormalized(hex.slice(4, 6)),
      },
      alpha: 1,
    };
  }

  return {
    rgb: {
      r: hexChannelToNormalized(hex.slice(0, 2)),
      g: hexChannelToNormalized(hex.slice(2, 4)),
      b: hexChannelToNormalized(hex.slice(4, 6)),
    },
    alpha: hexChannelToNormalized(hex.slice(6, 8)),
  };
}

/**
 * Calculate the true final render/export opacity.
 *
 * This supports both:
 * - explicit style opacity
 * - optional 8-digit HEX alpha channels
 */
function resolveFinalOpacity(
  styleOpacity: HighlightOpacity,
  colorAlpha: number,
): HighlightOpacity {
  const safeStyleOpacity = Number.isFinite(styleOpacity)
    ? clamp01(styleOpacity)
    : 0;

  const safeColorAlpha = Number.isFinite(colorAlpha)
    ? clamp01(colorAlpha)
    : 0;

  return clamp01(safeStyleOpacity * safeColorAlpha);
}

/**
 * Validate and index page geometry by pageIndex.
 *
 * Duplicate pageIndex entries are rejected because export mapping must remain
 * deterministic.
 */
function buildPageGeometryMap(
  contexts: readonly PdfPageGeometryContext[],
): ReadonlyMap<PdfPageIndex, PdfPageGeometryContext> {
  const geometryMap = new Map<PdfPageIndex, PdfPageGeometryContext>();

  for (const context of contexts) {
    assertValidPageGeometry(context);

    if (geometryMap.has(context.pageIndex)) {
      throw new Error(
        `Duplicate PdfPageGeometryContext found for pageIndex ${context.pageIndex}.`,
      );
    }

    geometryMap.set(context.pageIndex, context);
  }

  return geometryMap;
}

/**
 * Ensure a PDF rectangle contains meaningful drawable area.
 */
function isDrawablePdfRect(rect: PdfRect): boolean {
  return rect.width > EPSILON && rect.height > EPSILON;
}

/**
 * Convert one composited region into one export draw command.
 *
 * Returns null when the region cannot safely be exported.
 */
function buildDrawCommand(input: {
  readonly region: CompositedHighlightRegion;
  readonly geometryMap: ReadonlyMap<PdfPageIndex, PdfPageGeometryContext>;
  readonly diagnostics: MutableExportDiagnostics;
}): HighlightPdfDrawCommand | null {
  const geometry = input.geometryMap.get(input.region.pageIndex);

  if (!geometry) {
    input.diagnostics.skippedMissingGeometryCount += 1;
    input.diagnostics.missingGeometryPageIndexes.add(input.region.pageIndex);
    return null;
  }

  const parsedColor = parseHighlightExportColor(input.region.style.color);

  if (!parsedColor) {
    input.diagnostics.skippedInvalidColorCount += 1;
    return null;
  }

  const opacity = resolveFinalOpacity(
    input.region.style.opacity,
    parsedColor.alpha,
  );

  if (opacity <= EPSILON) {
    input.diagnostics.skippedInvisibleOpacityCount += 1;
    return null;
  }

  const pdfBounds = normalizedRectToPdfRect(
    input.region.bounds,
    geometry,
  );

  if (!isDrawablePdfRect(pdfBounds)) {
    input.diagnostics.skippedZeroAreaPdfRectCount += 1;
    return null;
  }

  return {
    pageIndex: geometry.pageIndex,
    pageNumber: geometry.pageNumber,
    normalizedBounds: input.region.bounds,
    pdfBounds,
    color: parsedColor.rgb,
    opacity,
    sourceLayerIds: input.region.sourceLayerIds,
    sourceRegionIds: input.region.sourceRegionIds,
    renderOrder: input.region.renderOrder,
  };
}

/**
 * Group flat commands by page.
 */
function buildPagePlans(
  commands: readonly HighlightPdfDrawCommand[],
): readonly HighlightExportPagePlan[] {
  const pages = new Map<PdfPageIndex, HighlightPdfDrawCommand[]>();

  for (const command of commands) {
    const existing = pages.get(command.pageIndex);

    if (existing) {
      existing.push(command);
    } else {
      pages.set(command.pageIndex, [command]);
    }
  }

  return [...pages.entries()]
    .sort(([firstPageIndex], [secondPageIndex]) => firstPageIndex - secondPageIndex)
    .map(([pageIndex, pageCommands]) => {
      const sortedCommands = [...pageCommands].sort(
        (first, second) => first.renderOrder - second.renderOrder,
      );

      return {
        pageIndex,
        pageNumber: sortedCommands[0].pageNumber,
        commands: sortedCommands,
      };
    });
}

/**
 * Finalize diagnostics into a readonly serializable object.
 */
function finalizeDiagnostics(
  diagnostics: MutableExportDiagnostics,
): HighlightExportDiagnostics {
  return {
    inputLayerCount: diagnostics.inputLayerCount,
    inputRegionCount: diagnostics.inputRegionCount,
    compositedRegionCount: diagnostics.compositedRegionCount,
    exportedCommandCount: diagnostics.exportedCommandCount,

    skippedMissingGeometryCount: diagnostics.skippedMissingGeometryCount,
    skippedInvalidColorCount: diagnostics.skippedInvalidColorCount,
    skippedInvisibleOpacityCount: diagnostics.skippedInvisibleOpacityCount,
    skippedZeroAreaPdfRectCount: diagnostics.skippedZeroAreaPdfRectCount,

    missingGeometryPageIndexes: [
      ...diagnostics.missingGeometryPageIndexes,
    ].sort((first, second) => first - second),
  };
}

/**
 * Public engine entrypoint.
 *
 * This should be called before the actual PDF writing layer.
 *
 * Later usage:
 * - browser pdf-lib exporter
 * - Java backend render/export service adapter
 * - export verification tests
 */
export function prepareHighlightExportPlan(
  request: PrepareHighlightExportPlanRequest,
): HighlightExportPlan {
  const composition = composeHighlightRegions(
    request.layers,
    request.overlapMergeOptions,
  );

  const geometryMap = buildPageGeometryMap(
    request.pageGeometryContexts,
  );

  const diagnostics: MutableExportDiagnostics = {
    inputLayerCount: composition.inputLayerCount,
    inputRegionCount: composition.inputRegionCount,
    compositedRegionCount: composition.compositedRegionCount,
    exportedCommandCount: 0,

    skippedMissingGeometryCount: 0,
    skippedInvalidColorCount: 0,
    skippedInvisibleOpacityCount: 0,
    skippedZeroAreaPdfRectCount: 0,

    missingGeometryPageIndexes: new Set<PdfPageIndex>(),
  };

  const flatCommands = composition.regions
    .map((region) =>
      buildDrawCommand({
        region,
        geometryMap,
        diagnostics,
      }),
    )
    .filter(
      (command): command is HighlightPdfDrawCommand =>
        command !== null,
    )
    .sort((first, second) => {
      if (first.pageIndex !== second.pageIndex) {
        return first.pageIndex - second.pageIndex;
      }

      return first.renderOrder - second.renderOrder;
    });

  diagnostics.exportedCommandCount = flatCommands.length;

  return {
    pages: buildPagePlans(flatCommands),
    flatCommands,
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}
