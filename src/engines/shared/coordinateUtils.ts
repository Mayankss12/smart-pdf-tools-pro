import type {
  NormalizedPoint,
  NormalizedRect,
  PageRotation,
  PdfPageGeometryContext,
  PdfPoint,
  PdfRect,
  Point2D,
  Rect2D,
  Size2D,
  ViewportPoint,
  ViewportRect,
} from "./types";

const EPSILON = 1e-9;

/**
 * Clamp any numeric value into an inclusive min/max range.
 */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

/**
 * Clamp a value into normalized coordinate range.
 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/**
 * Ensure page size is mathematically usable.
 */
function assertPositiveSize(size: Size2D, label: string): void {
  if (
    !Number.isFinite(size.width) ||
    !Number.isFinite(size.height) ||
    size.width <= 0 ||
    size.height <= 0
  ) {
    throw new RangeError(
      `${label} must contain positive finite width and height values.`,
    );
  }
}

/**
 * Ensure rotation is one of the supported quarter-turn values.
 */
function assertValidRotation(rotation: PageRotation): void {
  if (![0, 90, 180, 270].includes(rotation)) {
    throw new RangeError(
      "Page rotation must be one of: 0, 90, 180, 270.",
    );
  }
}

/**
 * Validate a page geometry context before coordinate conversion.
 */
export function assertValidPageGeometry(
  context: PdfPageGeometryContext,
): void {
  if (!Number.isInteger(context.pageIndex) || context.pageIndex < 0) {
    throw new RangeError("pageIndex must be a zero-based non-negative integer.");
  }

  if (!Number.isInteger(context.pageNumber) || context.pageNumber < 1) {
    throw new RangeError("pageNumber must be a one-based positive integer.");
  }

  assertValidRotation(context.rotation);
  assertPositiveSize(context.pdfSize, "pdfSize");
  assertPositiveSize(context.viewportSize, "viewportSize");
}

/**
 * Convert any rectangle into a canonical positive-width/positive-height form.
 *
 * Useful when a drag operation starts at bottom-right and ends at top-left.
 */
export function canonicalizeRect(rect: Rect2D): Rect2D {
  const rawX = Number.isFinite(rect.x) ? rect.x : 0;
  const rawY = Number.isFinite(rect.y) ? rect.y : 0;
  const rawWidth = Number.isFinite(rect.width) ? rect.width : 0;
  const rawHeight = Number.isFinite(rect.height) ? rect.height : 0;

  const x = rawWidth >= 0 ? rawX : rawX + rawWidth;
  const y = rawHeight >= 0 ? rawY : rawY + rawHeight;

  return {
    x,
    y,
    width: Math.abs(rawWidth),
    height: Math.abs(rawHeight),
  };
}

/**
 * Clamp a normalized point into the visible page.
 */
export function clampNormalizedPoint(
  point: NormalizedPoint,
): NormalizedPoint {
  return {
    x: clamp01(point.x),
    y: clamp01(point.y),
  };
}

/**
 * Clamp a normalized rectangle into the visible page.
 *
 * The rectangle is canonicalized before clipping.
 */
export function clampNormalizedRect(
  rect: NormalizedRect,
): NormalizedRect {
  const canonical = canonicalizeRect(rect);

  const left = clamp01(canonical.x);
  const top = clamp01(canonical.y);
  const right = clamp01(canonical.x + canonical.width);
  const bottom = clamp01(canonical.y + canonical.height);

  return {
    x: Math.min(left, right),
    y: Math.min(top, bottom),
    width: Math.abs(right - left),
    height: Math.abs(bottom - top),
  };
}

/**
 * Build a normalized rectangle from two drag points.
 */
export function createNormalizedRectFromPoints(
  start: NormalizedPoint,
  end: NormalizedPoint,
): NormalizedRect {
  const safeStart = clampNormalizedPoint(start);
  const safeEnd = clampNormalizedPoint(end);

  return {
    x: Math.min(safeStart.x, safeEnd.x),
    y: Math.min(safeStart.y, safeEnd.y),
    width: Math.abs(safeEnd.x - safeStart.x),
    height: Math.abs(safeEnd.y - safeStart.y),
  };
}

/**
 * Convert a viewport pixel point to normalized page space.
 */
export function viewportPointToNormalizedPoint(
  point: ViewportPoint,
  context: PdfPageGeometryContext,
): NormalizedPoint {
  assertValidPageGeometry(context);

  return clampNormalizedPoint({
    x: point.x / context.viewportSize.width,
    y: point.y / context.viewportSize.height,
  });
}

/**
 * Convert a viewport pixel rectangle to normalized page space.
 */
export function viewportRectToNormalizedRect(
  rect: ViewportRect,
  context: PdfPageGeometryContext,
): NormalizedRect {
  assertValidPageGeometry(context);

  const canonical = canonicalizeRect(rect);

  const topLeft = viewportPointToNormalizedPoint(
    {
      x: canonical.x,
      y: canonical.y,
    },
    context,
  );

  const bottomRight = viewportPointToNormalizedPoint(
    {
      x: canonical.x + canonical.width,
      y: canonical.y + canonical.height,
    },
    context,
  );

  return createNormalizedRectFromPoints(topLeft, bottomRight);
}

/**
 * Convert a normalized page point into viewport pixel coordinates.
 */
export function normalizedPointToViewportPoint(
  point: NormalizedPoint,
  context: PdfPageGeometryContext,
): ViewportPoint {
  assertValidPageGeometry(context);

  const safePoint = clampNormalizedPoint(point);

  return {
    x: safePoint.x * context.viewportSize.width,
    y: safePoint.y * context.viewportSize.height,
  };
}

/**
 * Convert a normalized page rectangle into viewport pixel coordinates.
 */
export function normalizedRectToViewportRect(
  rect: NormalizedRect,
  context: PdfPageGeometryContext,
): ViewportRect {
  assertValidPageGeometry(context);

  const safeRect = clampNormalizedRect(rect);

  return {
    x: safeRect.x * context.viewportSize.width,
    y: safeRect.y * context.viewportSize.height,
    width: safeRect.width * context.viewportSize.width,
    height: safeRect.height * context.viewportSize.height,
  };
}

/**
 * Convert visible normalized page space into unrotated top-left normalized space.
 *
 * Visual normalized space:
 * - page as displayed to the user
 *
 * Unrotated top-left normalized space:
 * - page normalized against its native PDF orientation
 */
function visualNormalizedToUnrotatedTopLeftNormalized(
  point: NormalizedPoint,
  rotation: PageRotation,
): NormalizedPoint {
  const safePoint = clampNormalizedPoint(point);

  switch (rotation) {
    case 0:
      return {
        x: safePoint.x,
        y: safePoint.y,
      };

    case 90:
      return {
        x: safePoint.y,
        y: 1 - safePoint.x,
      };

    case 180:
      return {
        x: 1 - safePoint.x,
        y: 1 - safePoint.y,
      };

    case 270:
      return {
        x: 1 - safePoint.y,
        y: safePoint.x,
      };

    default:
      return safePoint;
  }
}

/**
 * Convert unrotated top-left normalized space into visible normalized page space.
 */
function unrotatedTopLeftNormalizedToVisualNormalized(
  point: NormalizedPoint,
  rotation: PageRotation,
): NormalizedPoint {
  const safePoint = clampNormalizedPoint(point);

  switch (rotation) {
    case 0:
      return {
        x: safePoint.x,
        y: safePoint.y,
      };

    case 90:
      return {
        x: 1 - safePoint.y,
        y: safePoint.x,
      };

    case 180:
      return {
        x: 1 - safePoint.x,
        y: 1 - safePoint.y,
      };

    case 270:
      return {
        x: safePoint.y,
        y: 1 - safePoint.x,
      };

    default:
      return safePoint;
  }
}

/**
 * Convert normalized visual page space into native PDF point space.
 *
 * PDF coordinates:
 * - origin at bottom-left
 * - x grows right
 * - y grows upward
 */
export function normalizedPointToPdfPoint(
  point: NormalizedPoint,
  context: PdfPageGeometryContext,
): PdfPoint {
  assertValidPageGeometry(context);

  const unrotatedTopLeftPoint =
    visualNormalizedToUnrotatedTopLeftNormalized(point, context.rotation);

  return {
    x: unrotatedTopLeftPoint.x * context.pdfSize.width,
    y: (1 - unrotatedTopLeftPoint.y) * context.pdfSize.height,
  };
}

/**
 * Convert native PDF point space into normalized visual page space.
 */
export function pdfPointToNormalizedPoint(
  point: PdfPoint,
  context: PdfPageGeometryContext,
): NormalizedPoint {
  assertValidPageGeometry(context);

  const unrotatedTopLeftPoint: NormalizedPoint = clampNormalizedPoint({
    x: point.x / context.pdfSize.width,
    y: 1 - point.y / context.pdfSize.height,
  });

  return clampNormalizedPoint(
    unrotatedTopLeftNormalizedToVisualNormalized(
      unrotatedTopLeftPoint,
      context.rotation,
    ),
  );
}

/**
 * Return rectangle corners in consistent order:
 * - top-left
 * - top-right
 * - bottom-right
 * - bottom-left
 */
function getRectCorners(rect: Rect2D): readonly Point2D[] {
  const canonical = canonicalizeRect(rect);

  return [
    {
      x: canonical.x,
      y: canonical.y,
    },
    {
      x: canonical.x + canonical.width,
      y: canonical.y,
    },
    {
      x: canonical.x + canonical.width,
      y: canonical.y + canonical.height,
    },
    {
      x: canonical.x,
      y: canonical.y + canonical.height,
    },
  ];
}

/**
 * Build a bounding rectangle from an arbitrary set of points.
 */
function createBoundingRectFromPoints(points: readonly Point2D[]): Rect2D {
  if (points.length === 0) {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Convert a normalized visual page rectangle into native PDF rectangle space.
 */
export function normalizedRectToPdfRect(
  rect: NormalizedRect,
  context: PdfPageGeometryContext,
): PdfRect {
  assertValidPageGeometry(context);

  const safeRect = clampNormalizedRect(rect);

  const pdfCorners = getRectCorners(safeRect).map((corner) =>
    normalizedPointToPdfPoint(
      {
        x: corner.x,
        y: corner.y,
      },
      context,
    ),
  );

  const boundingRect = createBoundingRectFromPoints(pdfCorners);

  return {
    x: boundingRect.x,
    y: boundingRect.y,
    width: boundingRect.width,
    height: boundingRect.height,
  };
}

/**
 * Convert a native PDF rectangle into normalized visual page space.
 */
export function pdfRectToNormalizedRect(
  rect: PdfRect,
  context: PdfPageGeometryContext,
): NormalizedRect {
  assertValidPageGeometry(context);

  const canonical = canonicalizeRect(rect);

  const normalizedCorners = getRectCorners(canonical).map((corner) =>
    pdfPointToNormalizedPoint(
      {
        x: corner.x,
        y: corner.y,
      },
      context,
    ),
  );

  const boundingRect = createBoundingRectFromPoints(normalizedCorners);

  return clampNormalizedRect({
    x: boundingRect.x,
    y: boundingRect.y,
    width: boundingRect.width,
    height: boundingRect.height,
  });
}

/**
 * Rectangle area helper used later by:
 * - overlap merger
 * - hit testing
 * - deduplication logic
 */
export function getRectArea(rect: Rect2D): number {
  const canonical = canonicalizeRect(rect);

  return canonical.width * canonical.height;
}

/**
 * Test whether two rectangles intersect.
 */
export function rectsIntersect(
  first: Rect2D,
  second: Rect2D,
): boolean {
  const a = canonicalizeRect(first);
  const b = canonicalizeRect(second);

  return (
    a.x < b.x + b.width - EPSILON &&
    a.x + a.width > b.x + EPSILON &&
    a.y < b.y + b.height - EPSILON &&
    a.y + a.height > b.y + EPSILON
  );
}

/**
 * Return the precise intersection rectangle, or null if there is none.
 */
export function getRectIntersection(
  first: Rect2D,
  second: Rect2D,
): Rect2D | null {
  if (!rectsIntersect(first, second)) {
    return null;
  }

  const a = canonicalizeRect(first);
  const b = canonicalizeRect(second);

  const left = Math.max(a.x, b.x);
  const top = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * Return a union rectangle that fully contains both rectangles.
 */
export function getRectUnion(
  first: Rect2D,
  second: Rect2D,
): Rect2D {
  const a = canonicalizeRect(first);
  const b = canonicalizeRect(second);

  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.width, b.x + b.width);
  const bottom = Math.max(a.y + a.height, b.y + b.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

/**
 * Check whether a rectangle contains a point.
 */
export function rectContainsPoint(
  rect: Rect2D,
  point: Point2D,
): boolean {
  const canonical = canonicalizeRect(rect);

  return (
    point.x >= canonical.x &&
    point.x <= canonical.x + canonical.width &&
    point.y >= canonical.y &&
    point.y <= canonical.y + canonical.height
  );
}

/**
 * Compute overlap ratio based on the smaller of the two rectangles.
 *
 * This will be useful later for:
 * - highlight overlap deduplication
 * - avoiding same-color opacity stacking
 * - OCR/text-region merging
 */
export function getRectOverlapRatio(
  first: Rect2D,
  second: Rect2D,
): number {
  const intersection = getRectIntersection(first, second);

  if (!intersection) {
    return 0;
  }

  const intersectionArea = getRectArea(intersection);
  const smallerArea = Math.min(getRectArea(first), getRectArea(second));

  if (smallerArea <= EPSILON) {
    return 0;
  }

  return clamp(intersectionArea / smallerArea, 0, 1);
}
