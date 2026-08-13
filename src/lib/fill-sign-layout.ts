import type { FillSignObjectBox, FillSignObjectKind } from "./fill-sign-engine";

export type FillSignResizeHandle = "nw" | "ne" | "sw" | "se";
export type FillSignPageDimensions = { readonly width: number; readonly height: number };

const MARK_KINDS = new Set<FillSignObjectKind>(["check", "cross", "dot"]);

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safePage(page: FillSignPageDimensions) {
  return { width: Math.max(1, page.width), height: Math.max(1, page.height) };
}

function widthFromHeight(heightPercent: number, page: FillSignPageDimensions) {
  const safe = safePage(page);
  return heightPercent * (safe.height / safe.width);
}

function heightFromWidth(widthPercent: number, page: FillSignPageDimensions) {
  const safe = safePage(page);
  return widthPercent * (safe.width / safe.height);
}

export function isProportionalFillSignMarkKind(
  kind: FillSignObjectKind,
): kind is "check" | "cross" | "dot" {
  return MARK_KINDS.has(kind);
}

export function normalizeProportionalMarkBox(
  box: FillSignObjectBox,
  page: FillSignPageDimensions,
): FillSignObjectBox {
  const centerX = box.xPercent + box.widthPercent / 2;
  const centerY = box.yPercent + box.heightPercent / 2;
  const maxWidth = Math.min(86, widthFromHeight(45, page));
  const widthPercent = clamp(box.widthPercent, 0.1, maxWidth);
  const heightPercent = heightFromWidth(widthPercent, page);

  return {
    xPercent: clamp(centerX - widthPercent / 2, 0, 100 - widthPercent),
    yPercent: clamp(centerY - heightPercent / 2, 0, 100 - heightPercent),
    widthPercent,
    heightPercent,
  };
}

export function resizeProportionalMarkBox({
  box,
  handle,
  deltaXPercent,
  deltaYPercent,
  page,
  minWidthPercent = 3.5,
  minHeightPercent = 3.5,
}: {
  readonly box: FillSignObjectBox;
  readonly handle: FillSignResizeHandle;
  readonly deltaXPercent: number;
  readonly deltaYPercent: number;
  readonly page: FillSignPageDimensions;
  readonly minWidthPercent?: number;
  readonly minHeightPercent?: number;
}): FillSignObjectBox {
  const safe = safePage(page);
  const start = normalizeProportionalMarkBox(box, safe);
  const horizontal = start.widthPercent + (handle.includes("e") ? deltaXPercent : -deltaXPercent);
  const verticalHeight = start.heightPercent + (handle.includes("s") ? deltaYPercent : -deltaYPercent);
  const vertical = widthFromHeight(verticalHeight, safe);
  const useHorizontal = Math.abs(deltaXPercent) * safe.width >= Math.abs(deltaYPercent) * safe.height;
  const maxHorizontal = handle.includes("e") ? 100 - start.xPercent : start.xPercent + start.widthPercent;
  const maxVerticalHeight = handle.includes("s") ? 100 - start.yPercent : start.yPercent + start.heightPercent;
  const maxWidth = Math.max(0.1, Math.min(86, widthFromHeight(45, safe), maxHorizontal, widthFromHeight(maxVerticalHeight, safe)));
  const desiredMin = Math.max(minWidthPercent, widthFromHeight(minHeightPercent, safe));
  const widthPercent = clamp(useHorizontal ? horizontal : vertical, Math.min(desiredMin, maxWidth), maxWidth);
  const heightPercent = heightFromWidth(widthPercent, safe);
  const right = start.xPercent + start.widthPercent;
  const bottom = start.yPercent + start.heightPercent;

  return {
    xPercent: handle.includes("w") ? right - widthPercent : start.xPercent,
    yPercent: handle.includes("n") ? bottom - heightPercent : start.yPercent,
    widthPercent,
    heightPercent,
  };
}

export function scaleProportionalMarkBox(
  box: FillSignObjectBox,
  deltaWidthPercent: number,
  page: FillSignPageDimensions,
): FillSignObjectBox {
  const safe = safePage(page);
  const start = normalizeProportionalMarkBox(box, safe);
  const centerX = start.xPercent + start.widthPercent / 2;
  const centerY = start.yPercent + start.heightPercent / 2;
  const maxHorizontal = Math.max(0.1, 2 * Math.min(centerX, 100 - centerX));
  const maxVertical = Math.max(0.1, 2 * Math.min(centerY, 100 - centerY));
  const maxWidth = Math.max(0.1, Math.min(86, widthFromHeight(45, safe), maxHorizontal, widthFromHeight(maxVertical, safe)));
  const minWidth = Math.min(Math.max(3.5, widthFromHeight(3.5, safe)), maxWidth);
  const widthPercent = clamp(start.widthPercent + deltaWidthPercent, minWidth, maxWidth);
  const heightPercent = heightFromWidth(widthPercent, safe);

  return {
    xPercent: centerX - widthPercent / 2,
    yPercent: centerY - heightPercent / 2,
    widthPercent,
    heightPercent,
  };
}
