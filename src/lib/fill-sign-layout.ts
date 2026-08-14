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

function safeAspectRatio(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function mediaWidthFromHeight(
  heightPercent: number,
  page: FillSignPageDimensions,
  aspectRatio: number,
) {
  const safe = safePage(page);
  const ratio = safeAspectRatio(aspectRatio);
  return heightPercent * ratio * (safe.height / safe.width);
}

function mediaHeightFromWidth(
  widthPercent: number,
  page: FillSignPageDimensions,
  aspectRatio: number,
) {
  const safe = safePage(page);
  const ratio = safeAspectRatio(aspectRatio);
  return widthPercent * (safe.width / safe.height) / ratio;
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

export function normalizeProportionalMediaBox({
  box,
  page,
  aspectRatio,
  minWidthPercent = 8,
  minHeightPercent = 4,
}: {
  readonly box: FillSignObjectBox;
  readonly page: FillSignPageDimensions;
  readonly aspectRatio: number;
  readonly minWidthPercent?: number;
  readonly minHeightPercent?: number;
}): FillSignObjectBox {
  const safe = safePage(page);
  const ratio = safeAspectRatio(aspectRatio);
  const centerX = box.xPercent + box.widthPercent / 2;
  const centerY = box.yPercent + box.heightPercent / 2;
  const maxHorizontal = Math.max(0.1, 2 * Math.min(centerX, 100 - centerX));
  const maxVerticalHeight = Math.max(0.1, 2 * Math.min(centerY, 100 - centerY));
  const maxWidth = Math.max(
    0.1,
    Math.min(86, maxHorizontal, mediaWidthFromHeight(Math.min(45, maxVerticalHeight), safe, ratio)),
  );
  const desiredMinWidth = Math.max(
    minWidthPercent,
    mediaWidthFromHeight(minHeightPercent, safe, ratio),
  );
  const widthPercent = clamp(
    Math.min(box.widthPercent, maxWidth),
    Math.min(desiredMinWidth, maxWidth),
    maxWidth,
  );
  const heightPercent = mediaHeightFromWidth(widthPercent, safe, ratio);

  return {
    xPercent: clamp(centerX - widthPercent / 2, 0, 100 - widthPercent),
    yPercent: clamp(centerY - heightPercent / 2, 0, 100 - heightPercent),
    widthPercent,
    heightPercent,
  };
}

export function resizeProportionalMediaBox({
  box,
  handle,
  deltaXPercent,
  deltaYPercent,
  page,
  aspectRatio,
  minWidthPercent = 8,
  minHeightPercent = 4,
}: {
  readonly box: FillSignObjectBox;
  readonly handle: FillSignResizeHandle;
  readonly deltaXPercent: number;
  readonly deltaYPercent: number;
  readonly page: FillSignPageDimensions;
  readonly aspectRatio: number;
  readonly minWidthPercent?: number;
  readonly minHeightPercent?: number;
}): FillSignObjectBox {
  const safe = safePage(page);
  const ratio = safeAspectRatio(aspectRatio);
  const start = normalizeProportionalMediaBox({
    box,
    page: safe,
    aspectRatio: ratio,
    minWidthPercent,
    minHeightPercent,
  });
  const horizontalWidth =
    start.widthPercent + (handle.includes("e") ? deltaXPercent : -deltaXPercent);
  const verticalHeight =
    start.heightPercent + (handle.includes("s") ? deltaYPercent : -deltaYPercent);
  const verticalWidth = mediaWidthFromHeight(verticalHeight, safe, ratio);
  const useHorizontal =
    Math.abs(deltaXPercent) * safe.width >= Math.abs(deltaYPercent) * safe.height;
  const maxHorizontal = handle.includes("e")
    ? 100 - start.xPercent
    : start.xPercent + start.widthPercent;
  const maxVerticalHeight = handle.includes("s")
    ? 100 - start.yPercent
    : start.yPercent + start.heightPercent;
  const maxWidth = Math.max(
    0.1,
    Math.min(
      86,
      maxHorizontal,
      mediaWidthFromHeight(Math.min(45, maxVerticalHeight), safe, ratio),
    ),
  );
  const desiredMinWidth = Math.max(
    minWidthPercent,
    mediaWidthFromHeight(minHeightPercent, safe, ratio),
  );
  const widthPercent = clamp(
    useHorizontal ? horizontalWidth : verticalWidth,
    Math.min(desiredMinWidth, maxWidth),
    maxWidth,
  );
  const heightPercent = mediaHeightFromWidth(widthPercent, safe, ratio);
  const right = start.xPercent + start.widthPercent;
  const bottom = start.yPercent + start.heightPercent;

  return {
    xPercent: handle.includes("w") ? right - widthPercent : start.xPercent,
    yPercent: handle.includes("n") ? bottom - heightPercent : start.yPercent,
    widthPercent,
    heightPercent,
  };
}

export function scaleProportionalMediaBox({
  box,
  deltaWidthPercent,
  page,
  aspectRatio,
  minWidthPercent = 8,
  minHeightPercent = 4,
}: {
  readonly box: FillSignObjectBox;
  readonly deltaWidthPercent: number;
  readonly page: FillSignPageDimensions;
  readonly aspectRatio: number;
  readonly minWidthPercent?: number;
  readonly minHeightPercent?: number;
}): FillSignObjectBox {
  const safe = safePage(page);
  const ratio = safeAspectRatio(aspectRatio);
  const start = normalizeProportionalMediaBox({
    box,
    page: safe,
    aspectRatio: ratio,
    minWidthPercent,
    minHeightPercent,
  });
  const centerX = start.xPercent + start.widthPercent / 2;
  const centerY = start.yPercent + start.heightPercent / 2;
  const maxHorizontal = Math.max(0.1, 2 * Math.min(centerX, 100 - centerX));
  const maxVerticalHeight = Math.max(0.1, 2 * Math.min(centerY, 100 - centerY));
  const maxWidth = Math.max(
    0.1,
    Math.min(
      86,
      maxHorizontal,
      mediaWidthFromHeight(Math.min(45, maxVerticalHeight), safe, ratio),
    ),
  );
  const desiredMinWidth = Math.max(
    minWidthPercent,
    mediaWidthFromHeight(minHeightPercent, safe, ratio),
  );
  const widthPercent = clamp(
    start.widthPercent + deltaWidthPercent,
    Math.min(desiredMinWidth, maxWidth),
    maxWidth,
  );
  const heightPercent = mediaHeightFromWidth(widthPercent, safe, ratio);

  return {
    xPercent: centerX - widthPercent / 2,
    yPercent: centerY - heightPercent / 2,
    widthPercent,
    heightPercent,
  };
}
