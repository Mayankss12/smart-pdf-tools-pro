import type { TextOverlayItem } from "./types";

export type ExistingTextEditBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type ExistingTextEditSource = {
  readonly sourceItemId: string;
  readonly originalText: string;
  readonly fontName: string | null;
  readonly fontSize: number;
  readonly baselineOffset: number;
  readonly sourceBox: ExistingTextEditBox;
  readonly coverBox: ExistingTextEditBox;
};

export type ExistingTextPageSize = {
  readonly width: number;
  readonly height: number;
};

const COVER_PADDING = 1.25;
const MIN_EDIT_WIDTH = 10;
const MIN_EDIT_HEIGHT = 8;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getExistingTextSourceKey(pageNumber: number, sourceItemId: string) {
  return `${pageNumber}:${sourceItemId}`;
}

export function inferExistingTextStyle(fontName: string | null | undefined) {
  const normalized = (fontName ?? "").toLowerCase();

  return {
    fontWeight: /bold|black|heavy|semibold|demi/.test(normalized)
      ? ("bold" as const)
      : ("normal" as const),
    fontStyle: /italic|oblique/.test(normalized)
      ? ("italic" as const)
      : ("normal" as const),
  };
}

export function getExistingTextEditSource(
  item: TextOverlayItem,
  pageSize: ExistingTextPageSize,
): ExistingTextEditSource {
  const pageWidth = Math.max(1, pageSize.width);
  const pageHeight = Math.max(1, pageSize.height);
  const rawX = (item.leftPercent / 100) * pageWidth;
  const rawY = (item.topPercent / 100) * pageHeight;
  const rawWidth = (item.widthPercent / 100) * pageWidth;
  const rawHeight = (item.heightPercent / 100) * pageHeight;
  const fontSize = Math.max(5, Number(item.fontSizePdf || 0));
  const minimumWidth = Math.min(MIN_EDIT_WIDTH, pageWidth);
  const minimumHeight = Math.min(MIN_EDIT_HEIGHT, pageHeight);
  const anchorX = clamp(rawX, 0, pageWidth);
  const anchorY = clamp(rawY, 0, pageHeight);

  const width = clamp(
    Math.max(minimumWidth, rawWidth + 4),
    minimumWidth,
    Math.max(minimumWidth, pageWidth - anchorX),
  );
  const height = clamp(
    Math.max(minimumHeight, rawHeight + 2),
    minimumHeight,
    Math.max(minimumHeight, pageHeight - anchorY),
  );
  const sourceBox = {
    x: clamp(anchorX, 0, Math.max(0, pageWidth - width)),
    y: clamp(anchorY, 0, Math.max(0, pageHeight - height)),
    width,
    height,
  };

  const coverX = clamp(
    rawX - COVER_PADDING,
    0,
    Math.max(0, pageWidth - 1),
  );
  const coverY = clamp(
    rawY - COVER_PADDING,
    0,
    Math.max(0, pageHeight - 1),
  );
  const coverRight = clamp(
    rawX + Math.max(rawWidth, 1) + COVER_PADDING,
    Math.min(pageWidth, coverX + 1),
    pageWidth,
  );
  const coverBottom = clamp(
    rawY + Math.max(rawHeight, 1) + COVER_PADDING,
    Math.min(pageHeight, coverY + 1),
    pageHeight,
  );

  return {
    sourceItemId: item.id,
    originalText: item.text,
    fontName: item.fontName ?? null,
    fontSize,
    baselineOffset: clamp(Math.max(1, rawHeight), 1, sourceBox.height),
    sourceBox,
    coverBox: {
      x: coverX,
      y: coverY,
      width: Math.max(1, coverRight - coverX),
      height: Math.max(1, coverBottom - coverY),
    },
  };
}
