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

  const width = clamp(
    Math.max(MIN_EDIT_WIDTH, rawWidth + 4),
    MIN_EDIT_WIDTH,
    Math.max(MIN_EDIT_WIDTH, pageWidth - rawX),
  );
  const height = clamp(
    Math.max(MIN_EDIT_HEIGHT, rawHeight + 2),
    MIN_EDIT_HEIGHT,
    Math.max(MIN_EDIT_HEIGHT, pageHeight - rawY),
  );
  const sourceBox = {
    x: clamp(rawX, 0, Math.max(0, pageWidth - width)),
    y: clamp(rawY, 0, Math.max(0, pageHeight - height)),
    width,
    height,
  };

  const coverX = Math.max(0, rawX - COVER_PADDING);
  const coverY = Math.max(0, rawY - COVER_PADDING);
  const coverRight = Math.min(pageWidth, rawX + Math.max(rawWidth, 1) + COVER_PADDING);
  const coverBottom = Math.min(pageHeight, rawY + Math.max(rawHeight, fontSize) + COVER_PADDING);

  return {
    sourceItemId: item.id,
    originalText: item.text,
    fontName: item.fontName ?? null,
    fontSize,
    baselineOffset: Math.max(fontSize, rawHeight * 0.9),
    sourceBox,
    coverBox: {
      x: coverX,
      y: coverY,
      width: Math.max(1, coverRight - coverX),
      height: Math.max(1, coverBottom - coverY),
    },
  };
}
