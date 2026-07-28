import { rgb, type PDFPage } from "pdf-lib";

import type { EditorPageGeometry } from "./editor-page-geometry";

export type EditorWhiteoutBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type DrawEditorWhiteoutOptions = {
  readonly opacity?: number;
};

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function getSafeBox(box: EditorWhiteoutBox, geometry: EditorPageGeometry) {
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

export function drawEditorWhiteout(
  page: PDFPage,
  box: EditorWhiteoutBox,
  geometry: EditorPageGeometry,
  options: DrawEditorWhiteoutOptions = {},
) {
  const pageHeight = geometry.viewportHeight;
  const safeBox = getSafeBox(box, geometry);
  const opacity = clamp(options.opacity ?? 1, 0, 1);

  if (safeBox.width <= 0 || safeBox.height <= 0 || opacity <= 0) {
    return;
  }

  page.drawRectangle({
    x: safeBox.x,
    y: pageHeight - safeBox.y - safeBox.height,
    width: safeBox.width,
    height: safeBox.height,
    color: rgb(1, 1, 1),
    opacity,
    borderWidth: 0,
  });
}
