import { rgb, type PDFPage } from "pdf-lib";

import type { EditorPageGeometry } from "./editor-page-geometry";

type ShapeType = "rectangle" | "circle" | "line" | "arrow";

type EditorShapeBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type RelativePoint = {
  readonly x: number;
  readonly y: number;
};

type EditorShapeData = {
  readonly shapeType?: ShapeType;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly fillColor?: string;
  readonly opacity?: number;
  readonly lineStart?: RelativePoint;
  readonly lineEnd?: RelativePoint;
};

export type EditorShapeExportObject = {
  readonly id: string;
  readonly type: string;
  readonly pageNumber: number;
  readonly box: EditorShapeBox;
  readonly data: EditorShapeData;
};

const DEFAULT_STROKE_COLOR = "#111827";
const DEFAULT_FILL_COLOR = "#ede9fe";
const DEFAULT_STROKE_WIDTH = 2;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function normalizeShapeType(value: unknown): ShapeType {
  if (
    value === "rectangle" ||
    value === "circle" ||
    value === "line" ||
    value === "arrow"
  ) {
    return value;
  }

  return "rectangle";
}

function normalizeStrokeWidth(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_STROKE_WIDTH;
  }

  return clamp(Math.round(value), 1, 8);
}

function normalizeOpacity(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }

  return clamp(value, 0, 1);
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;

  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const r = trimmed[1];
    const g = trimmed[2];
    const b = trimmed[3];

    return `#${r}${r}${g}${g}${b}${b}`;
  }

  return fallback;
}

function toPdfRgb(hex: string) {
  const normalized = normalizeHexColor(hex, DEFAULT_STROKE_COLOR).replace("#", "");
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  if ([red, green, blue].some((value) => Number.isNaN(value))) {
    return rgb(17 / 255, 24 / 255, 39 / 255);
  }

  return rgb(red, green, blue);
}

function isNoFill(value: unknown) {
  if (typeof value !== "string") return true;

  const normalized = value.trim().toLowerCase();

  return !normalized || normalized === "none" || normalized === "transparent";
}

function getFillColor(data: EditorShapeData) {
  if (isNoFill(data.fillColor)) {
    return undefined;
  }

  return toPdfRgb(normalizeHexColor(data.fillColor, DEFAULT_FILL_COLOR));
}

function getSafeBox(box: EditorShapeBox, geometry: EditorPageGeometry) {
  const pageWidth = Math.max(geometry.viewportWidth, 1);
  const pageHeight = Math.max(geometry.viewportHeight, 1);

  const width = clamp(box.width, 0, pageWidth);
  const height = clamp(box.height, 0, pageHeight);
  const x = clamp(box.x, 0, Math.max(0, pageWidth - width));
  const y = clamp(box.y, 0, Math.max(0, pageHeight - height));

  return {
    x,
    y,
    width,
    height,
  };
}

function getCenteredSquareBox(box: EditorShapeBox): EditorShapeBox {
  const size = Math.max(0.01, Math.min(box.width, box.height));

  return {
    x: box.x + (box.width - size) / 2,
    y: box.y + (box.height - size) / 2,
    width: size,
    height: size,
  };
}

function getRelativePoint(
  point: RelativePoint | undefined,
  fallback: RelativePoint,
  width: number,
  height: number,
) {
  if (!point) return fallback;

  return {
    x: clamp(Number(point.x), 0, width),
    y: clamp(Number(point.y), 0, height),
  };
}

function toPdfPoint({
  geometry,
  box,
  point,
}: {
  readonly geometry: EditorPageGeometry;
  readonly box: EditorShapeBox;
  readonly point: RelativePoint;
}) {
  return {
    x: box.x + point.x,
    y: geometry.viewportHeight - (box.y + point.y),
  };
}

function getLinePoints({
  geometry,
  box,
  originalBox,
  data,
}: {
  readonly geometry: EditorPageGeometry;
  readonly box: EditorShapeBox;
  readonly originalBox: EditorShapeBox;
  readonly data: EditorShapeData;
}) {
  const originalStart = getRelativePoint(
    data.lineStart,
    { x: 0, y: 0 },
    originalBox.width,
    originalBox.height,
  );
  const originalEnd = getRelativePoint(
    data.lineEnd,
    { x: originalBox.width, y: originalBox.height },
    originalBox.width,
    originalBox.height,
  );
  const scaleX = box.width / Math.max(originalBox.width, 0.01);
  const scaleY = box.height / Math.max(originalBox.height, 0.01);
  const relativeStart = { x: originalStart.x * scaleX, y: originalStart.y * scaleY };
  const relativeEnd = { x: originalEnd.x * scaleX, y: originalEnd.y * scaleY };

  return {
    start: toPdfPoint({
      geometry,
      box,
      point: relativeStart,
    }),
    end: toPdfPoint({
      geometry,
      box,
      point: relativeEnd,
    }),
  };
}

function drawArrowHead({
  page,
  start,
  end,
  strokeColor,
  strokeWidth,
  opacity,
}: {
  readonly page: PDFPage;
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
  readonly strokeColor: ReturnType<typeof rgb>;
  readonly strokeWidth: number;
  readonly opacity: number;
}) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lineLength = Math.hypot(dx, dy);

  if (lineLength < 0.01) {
    return;
  }

  const angle = Math.atan2(dy, dx);
  const headLength = Math.min(Math.max(8, strokeWidth * 4.5), Math.max(8, lineLength * 0.45));
  const spread = Math.PI / 7;

  const left = {
    x: end.x - headLength * Math.cos(angle - spread),
    y: end.y - headLength * Math.sin(angle - spread),
  };
  const right = {
    x: end.x - headLength * Math.cos(angle + spread),
    y: end.y - headLength * Math.sin(angle + spread),
  };

  page.drawLine({
    start: end,
    end: left,
    thickness: strokeWidth,
    color: strokeColor,
    opacity,
  });

  page.drawLine({
    start: end,
    end: right,
    thickness: strokeWidth,
    color: strokeColor,
    opacity,
  });
}

function drawRectangleShape({
  page,
  geometry,
  box,
  data,
  strokeColor,
  strokeWidth,
  opacity,
}: {
  readonly page: PDFPage;
  readonly geometry: EditorPageGeometry;
  readonly box: EditorShapeBox;
  readonly data: EditorShapeData;
  readonly strokeColor: ReturnType<typeof rgb>;
  readonly strokeWidth: number;
  readonly opacity: number;
}) {
  const fillColor = getFillColor(data);

  page.drawRectangle({
    x: box.x,
    y: geometry.viewportHeight - box.y - box.height,
    width: box.width,
    height: box.height,
    color: fillColor,
    borderColor: strokeColor,
    borderWidth: strokeWidth,
    opacity: fillColor ? opacity : 0,
    borderOpacity: opacity,
  });
}

function drawCircleShape({
  page,
  geometry,
  box,
  data,
  strokeColor,
  strokeWidth,
  opacity,
}: {
  readonly page: PDFPage;
  readonly geometry: EditorPageGeometry;
  readonly box: EditorShapeBox;
  readonly data: EditorShapeData;
  readonly strokeColor: ReturnType<typeof rgb>;
  readonly strokeWidth: number;
  readonly opacity: number;
}) {
  const fillColor = getFillColor(data);
  const circleBox = getCenteredSquareBox(box);
  const radius = Math.max(0.01, circleBox.width / 2);

  page.drawEllipse({
    x: circleBox.x + radius,
    y: geometry.viewportHeight - circleBox.y - radius,
    xScale: radius,
    yScale: radius,
    color: fillColor,
    borderColor: strokeColor,
    borderWidth: strokeWidth,
    opacity: fillColor ? opacity : 0,
    borderOpacity: opacity,
  });
}

function drawLineShape({
  page,
  geometry,
  box,
  originalBox,
  data,
  strokeColor,
  strokeWidth,
  opacity,
  arrow,
}: {
  readonly page: PDFPage;
  readonly geometry: EditorPageGeometry;
  readonly box: EditorShapeBox;
  readonly originalBox: EditorShapeBox;
  readonly data: EditorShapeData;
  readonly strokeColor: ReturnType<typeof rgb>;
  readonly strokeWidth: number;
  readonly opacity: number;
  readonly arrow: boolean;
}) {
  const { start, end } = getLinePoints({
    geometry,
    box,
    originalBox,
    data,
  });

  if (Math.hypot(end.x - start.x, end.y - start.y) < 0.01) {
    return;
  }

  page.drawLine({
    start,
    end,
    thickness: strokeWidth,
    color: strokeColor,
    opacity,
  });

  if (arrow) {
    drawArrowHead({
      page,
      start,
      end,
      strokeColor,
      strokeWidth,
      opacity,
    });
  }
}

export function drawEditorShapeObject(
  page: PDFPage,
  object: EditorShapeExportObject,
  geometry: EditorPageGeometry,
) {
  const safeBox = getSafeBox(object.box, geometry);
  const shapeType = normalizeShapeType(object.data.shapeType);
  const strokeColor = toPdfRgb(
    normalizeHexColor(object.data.strokeColor, DEFAULT_STROKE_COLOR),
  );
  const strokeWidth = normalizeStrokeWidth(object.data.strokeWidth);
  const opacity = normalizeOpacity(object.data.opacity);

  if (safeBox.width <= 0 || safeBox.height <= 0 || opacity <= 0) {
    return;
  }

  if (shapeType === "rectangle") {
    drawRectangleShape({
      page,
      geometry,
      box: safeBox,
      data: object.data,
      strokeColor,
      strokeWidth,
      opacity,
    });
    return;
  }

  if (shapeType === "circle") {
    drawCircleShape({
      page,
      geometry,
      box: safeBox,
      data: object.data,
      strokeColor,
      strokeWidth,
      opacity,
    });
    return;
  }

  drawLineShape({
    page,
    geometry,
    box: safeBox,
    originalBox: object.box,
    data: object.data,
    strokeColor,
    strokeWidth,
    opacity,
    arrow: shapeType === "arrow",
  });
}
