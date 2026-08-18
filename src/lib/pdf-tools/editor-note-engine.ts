import {
  clip,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  type PDFPage,
} from "pdf-lib";

import {
  drawEditorRichTextObject,
  type EmbeddedTextFonts,
} from "./editor-rich-text-engine";
import type { EditorPageGeometry } from "./editor-page-geometry";

type EditorNoteBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type EditorNoteData = {
  readonly text?: string;
  readonly fontSize?: number;
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly opacity?: number;
};

export type EditorNoteExportObject = {
  readonly box: EditorNoteBox;
  readonly data: EditorNoteData;
};

const DEFAULT_BACKGROUND_COLOR = "#fef3c7";
const DEFAULT_TEXT_COLOR = "#78350f";
const BORDER_COLOR = "#f59e0b";

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, value));
}

function hexToRgb(hex: string, fallback: string) {
  const normalized = hex.replace("#", "");
  const safeHex = /^[0-9a-fA-F]{6}$/.test(normalized)
    ? normalized
    : fallback.replace("#", "");

  return {
    r: Number.parseInt(safeHex.slice(0, 2), 16) / 255,
    g: Number.parseInt(safeHex.slice(2, 4), 16) / 255,
    b: Number.parseInt(safeHex.slice(4, 6), 16) / 255,
  };
}

function getSafeBox(box: EditorNoteBox, geometry: EditorPageGeometry) {
  const pageWidth = Math.max(geometry.viewportWidth, 1);
  const pageHeight = Math.max(geometry.viewportHeight, 1);
  const width = clamp(box.width, 0, pageWidth);
  const height = clamp(box.height, 0, pageHeight);

  return {
    x: clamp(box.x, 0, Math.max(0, pageWidth - width)),
    y: clamp(box.y, 0, Math.max(0, pageHeight - height)),
    width,
    height,
  };
}

export function drawEditorNoteObject(
  page: PDFPage,
  object: EditorNoteExportObject,
  fonts: EmbeddedTextFonts,
  geometry: EditorPageGeometry,
) {
  const safeBox = getSafeBox(object.box, geometry);
  const opacity = clamp(object.data.opacity ?? 1, 0, 1);

  if (safeBox.width <= 0 || safeBox.height <= 0 || opacity <= 0) {
    return;
  }

  const pageHeight = geometry.viewportHeight;
  const background = hexToRgb(
    object.data.backgroundColor ?? DEFAULT_BACKGROUND_COLOR,
    DEFAULT_BACKGROUND_COLOR,
  );
  const border = hexToRgb(BORDER_COLOR, BORDER_COLOR);
  const pdfY = pageHeight - safeBox.y - safeBox.height;
  const accentHeight = Math.min(5, safeBox.height);

  page.drawRectangle({
    x: safeBox.x,
    y: pdfY,
    width: safeBox.width,
    height: safeBox.height,
    color: rgb(background.r, background.g, background.b),
    borderColor: rgb(border.r, border.g, border.b),
    borderWidth: 1,
    opacity,
    borderOpacity: opacity,
  });

  page.drawRectangle({
    x: safeBox.x,
    y: pdfY + safeBox.height - accentHeight,
    width: safeBox.width,
    height: accentHeight,
    color: rgb(border.r, border.g, border.b),
    opacity: opacity * 0.7,
  });

  const fontSize = clamp(object.data.fontSize ?? 14, 8, 36);
  const padding = Math.min(10, safeBox.width / 5, safeBox.height / 5);
  const textBox = {
    x: safeBox.x + padding,
    y: safeBox.y + accentHeight + padding,
    width: safeBox.width - padding * 2,
    height: safeBox.height - padding * 2 - accentHeight,
  };

  if (textBox.width <= 0 || textBox.height <= 0) {
    return;
  }

  const clipY = pageHeight - textBox.y - textBox.height;

  page.pushOperators(
    pushGraphicsState(),
    rectangle(textBox.x, clipY, textBox.width, textBox.height),
    clip(),
    endPath(),
  );

  try {
    drawEditorRichTextObject(
      page,
      {
        box: textBox,
        data: {
          text: object.data.text ?? "",
          fontSize,
          color: object.data.color ?? DEFAULT_TEXT_COLOR,
          opacity,
        },
      },
      fonts,
      geometry,
    );
  } finally {
    page.pushOperators(popGraphicsState());
  }
}