import { rgb, type PDFPage } from "pdf-lib";

type DrawPoint = { readonly x: number; readonly y: number };

type DrawObject = {
  readonly id: string;
  readonly type: string;
  readonly pageNumber: number;
  readonly box: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  readonly data: {
    readonly pathData?: string;
    readonly drawWidth?: number;
    readonly drawHeight?: number;
    readonly strokeColor?: string;
    readonly strokeWidth?: number;
    readonly opacity?: number;
  };
};

const DEFAULT_STROKE_COLOR = "#111827";
const DEFAULT_STROKE_WIDTH = 2;
const MIN_DRAW_DIMENSION = 1;

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hexValue: string | undefined) {
  const hex = typeof hexValue === "string" && /^#[0-9a-fA-F]{6}$/.test(hexValue)
    ? hexValue.slice(1)
    : DEFAULT_STROKE_COLOR.slice(1);

  return rgb(
    Number.parseInt(hex.slice(0, 2), 16) / 255,
    Number.parseInt(hex.slice(2, 4), 16) / 255,
    Number.parseInt(hex.slice(4, 6), 16) / 255,
  );
}

function parsePath(pathData: string | undefined): DrawPoint[] {
  if (!pathData) return [];

  const pieces = pathData.trim().split(/\s+/);
  const points: DrawPoint[] = [];

  for (let index = 0; index < pieces.length - 2; index += 3) {
    const command = pieces[index];
    const x = Number(pieces[index + 1]);
    const y = Number(pieces[index + 2]);

    if ((command === "M" || command === "L") && Number.isFinite(x) && Number.isFinite(y)) {
      points.push({ x, y });
    }
  }

  return points;
}

function getDrawDimension(value: unknown, fallback: number) {
  const dimension = Number(value);

  if (Number.isFinite(dimension) && dimension > 0) {
    return Math.max(MIN_DRAW_DIMENSION, dimension);
  }

  return Math.max(MIN_DRAW_DIMENSION, fallback);
}

function toPdfPoint(page: PDFPage, object: DrawObject, point: DrawPoint) {
  const drawWidth = getDrawDimension(object.data.drawWidth, object.box.width);
  const drawHeight = getDrawDimension(object.data.drawHeight, object.box.height);
  const scaleX = object.box.width / drawWidth;
  const scaleY = object.box.height / drawHeight;

  return {
    x: object.box.x + point.x * scaleX,
    y: page.getHeight() - (object.box.y + point.y * scaleY),
  };
}

function drawCap(page: PDFPage, object: DrawObject, point: DrawPoint, color: ReturnType<typeof rgb>, thickness: number, opacity: number) {
  const pdfPoint = toPdfPoint(page, object, point);

  page.drawEllipse({
    x: pdfPoint.x,
    y: pdfPoint.y,
    xScale: Math.max(0.5, thickness / 2),
    yScale: Math.max(0.5, thickness / 2),
    color,
    opacity,
  });
}

export function drawEditorDrawObject(page: PDFPage, object: DrawObject) {
  const points = parsePath(object.data.pathData);
  const thickness = clamp(Number(object.data.strokeWidth ?? DEFAULT_STROKE_WIDTH), 1, 12);
  const opacity = clamp(Number(object.data.opacity ?? 1), 0, 1);
  const color = hexToRgb(object.data.strokeColor);

  if (points.length === 0 || opacity <= 0) return;

  if (points.length === 1) {
    drawCap(page, object, points[0], color, thickness, opacity);
    return;
  }

  for (let index = 1; index < points.length; index += 1) {
    const start = toPdfPoint(page, object, points[index - 1]);
    const end = toPdfPoint(page, object, points[index]);

    page.drawLine({ start, end, thickness, color, opacity });
    drawCap(page, object, points[index - 1], color, thickness, opacity);
  }

  drawCap(page, object, points[points.length - 1], color, thickness, opacity);
}
