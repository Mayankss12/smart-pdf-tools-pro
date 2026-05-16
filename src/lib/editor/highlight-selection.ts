import type { DraftBox, PdfLayer, TextOverlayItem } from "@/lib/editor/types";

export type HighlightColorDefinition = {
  label: string;
  css: string;
  r: number;
  g: number;
  b: number;
};

export type HighlightSelectionMode = "text-lines" | "freeform-area";

export type HighlightSelectionResult = {
  mode: HighlightSelectionMode;
  layers: PdfLayer[];
  matchedTextItems: number;
};

type PercentRect = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type HighlightSelectionInput = {
  page: number;
  dragBox: DraftBox;
  textOverlay: TextOverlayItem[];
  color: HighlightColorDefinition;
  colorIndex: number;
  opacity?: number;
};

type TextLineGroup = {
  items: TextOverlayItem[];
  centerY: number;
  maxHeight: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function roundPercent(value: number) {
  return Number(value.toFixed(4));
}

function normalizeRect(rect: PercentRect): PercentRect {
  const xPercent = clamp(rect.xPercent, 0, 100);
  const yPercent = clamp(rect.yPercent, 0, 100);
  const widthPercent = clamp(rect.widthPercent, 0, 100 - xPercent);
  const heightPercent = clamp(rect.heightPercent, 0, 100 - yPercent);

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
  };
}

function getTextItemRect(item: TextOverlayItem): PercentRect {
  return normalizeRect({
    xPercent: item.leftPercent,
    yPercent: item.topPercent,
    widthPercent: item.widthPercent,
    heightPercent: item.heightPercent,
  });
}

function getRectRight(rect: PercentRect) {
  return rect.xPercent + rect.widthPercent;
}

function getRectBottom(rect: PercentRect) {
  return rect.yPercent + rect.heightPercent;
}

function getRectArea(rect: PercentRect) {
  return Math.max(0, rect.widthPercent) * Math.max(0, rect.heightPercent);
}

function getIntersectionRect(
  a: PercentRect,
  b: PercentRect
): PercentRect | null {
  const left = Math.max(a.xPercent, b.xPercent);
  const top = Math.max(a.yPercent, b.yPercent);
  const right = Math.min(getRectRight(a), getRectRight(b));
  const bottom = Math.min(getRectBottom(a), getRectBottom(b));

  if (right <= left || bottom <= top) {
    return null;
  }

  return {
    xPercent: left,
    yPercent: top,
    widthPercent: right - left,
    heightPercent: bottom - top,
  };
}

function getRectCenterY(rect: PercentRect) {
  return rect.yPercent + rect.heightPercent / 2;
}

function dragLikelyTargetsText(
  dragRect: PercentRect,
  textRect: PercentRect
) {
  const intersection = getIntersectionRect(dragRect, textRect);

  if (!intersection) {
    return false;
  }

  const intersectionArea = getRectArea(intersection);
  const textArea = Math.max(getRectArea(textRect), 0.0001);
  const overlapRatio = intersectionArea / textArea;

  const textCenterX = textRect.xPercent + textRect.widthPercent / 2;
  const textCenterY = textRect.yPercent + textRect.heightPercent / 2;

  const centerIsInsideDrag =
    textCenterX >= dragRect.xPercent &&
    textCenterX <= getRectRight(dragRect) &&
    textCenterY >= dragRect.yPercent &&
    textCenterY <= getRectBottom(dragRect);

  return centerIsInsideDrag || overlapRatio >= 0.12;
}

function buildTextLineGroups(items: TextOverlayItem[]): TextLineGroup[] {
  const sortedItems = [...items].sort((a, b) => {
    if (Math.abs(a.topPercent - b.topPercent) > 0.15) {
      return a.topPercent - b.topPercent;
    }

    return a.leftPercent - b.leftPercent;
  });

  const groups: TextLineGroup[] = [];

  for (const item of sortedItems) {
    const itemRect = getTextItemRect(item);
    const itemCenterY = getRectCenterY(itemRect);
    const itemHeight = Math.max(item.heightPercent, 0.25);

    const existingGroup = groups.find((group) => {
      const verticalTolerance = Math.max(
        0.55,
        Math.min(2.2, Math.max(group.maxHeight, itemHeight) * 0.65)
      );

      return Math.abs(group.centerY - itemCenterY) <= verticalTolerance;
    });

    if (existingGroup) {
      existingGroup.items.push(item);
      existingGroup.centerY =
        existingGroup.items.reduce((sum, groupedItem) => {
          const groupedRect = getTextItemRect(groupedItem);
          return sum + getRectCenterY(groupedRect);
        }, 0) / existingGroup.items.length;

      existingGroup.maxHeight = Math.max(existingGroup.maxHeight, itemHeight);
      continue;
    }

    groups.push({
      items: [item],
      centerY: itemCenterY,
      maxHeight: itemHeight,
    });
  }

  return groups;
}

function createHighlightLayer({
  page,
  rect,
  color,
  colorIndex,
  opacity,
}: {
  page: number;
  rect: PercentRect;
  color: HighlightColorDefinition;
  colorIndex: number;
  opacity: number;
}): PdfLayer {
  const safeRect = normalizeRect(rect);

  return {
    id: crypto.randomUUID(),
    page,
    type: "highlight",
    xPercent: roundPercent(safeRect.xPercent),
    yPercent: roundPercent(safeRect.yPercent),
    widthPercent: roundPercent(safeRect.widthPercent),
    heightPercent: roundPercent(safeRect.heightPercent),
    opacity,
    highlightColorIndex: colorIndex,
    highlightColorCss: color.css,
    highlightColorR: color.r,
    highlightColorG: color.g,
    highlightColorB: color.b,
  };
}

function createLineHighlightRect(line: TextLineGroup): PercentRect {
  const rects = line.items.map(getTextItemRect);

  const left = Math.min(...rects.map((rect) => rect.xPercent));
  const top = Math.min(...rects.map((rect) => rect.yPercent));
  const right = Math.max(...rects.map((rect) => getRectRight(rect)));
  const bottom = Math.max(...rects.map((rect) => getRectBottom(rect)));

  const rawHeight = Math.max(bottom - top, line.maxHeight, 0.45);
  const horizontalPadding = clamp(rawHeight * 0.11, 0.08, 0.38);
  const verticalInset = clamp(rawHeight * 0.14, 0.05, rawHeight * 0.22);

  return normalizeRect({
    xPercent: left - horizontalPadding,
    yPercent: top + verticalInset,
    widthPercent: right - left + horizontalPadding * 2,
    heightPercent: Math.max(rawHeight - verticalInset * 2, 0.35),
  });
}

function createFreeformHighlightRect(dragBox: DraftBox): PercentRect {
  const rawRect = normalizeRect({
    xPercent: dragBox.xPercent,
    yPercent: dragBox.yPercent,
    widthPercent: dragBox.widthPercent,
    heightPercent: dragBox.heightPercent,
  });

  return normalizeRect({
    xPercent: rawRect.xPercent,
    yPercent: rawRect.yPercent,
    widthPercent: rawRect.widthPercent,
    heightPercent: Math.max(rawRect.heightPercent, 0.45),
  });
}

export function buildHighlightLayersFromDrag({
  page,
  dragBox,
  textOverlay,
  color,
  colorIndex,
  opacity = 0.5,
}: HighlightSelectionInput): HighlightSelectionResult {
  const dragRect = normalizeRect({
    xPercent: dragBox.xPercent,
    yPercent: dragBox.yPercent,
    widthPercent: dragBox.widthPercent,
    heightPercent: dragBox.heightPercent,
  });

  const matchedTextItems = textOverlay.filter((item) =>
    dragLikelyTargetsText(dragRect, getTextItemRect(item))
  );

  if (matchedTextItems.length > 0) {
    const lineGroups = buildTextLineGroups(matchedTextItems);

    const layers = lineGroups
      .map((line) =>
        createHighlightLayer({
          page,
          rect: createLineHighlightRect(line),
          color,
          colorIndex,
          opacity,
        })
      )
      .filter(
        (layer) =>
          layer.widthPercent > 0.15 &&
          layer.heightPercent > 0.15
      );

    if (layers.length > 0) {
      return {
        mode: "text-lines",
        layers,
        matchedTextItems: matchedTextItems.length,
      };
    }
  }

  const fallbackLayer = createHighlightLayer({
    page,
    rect: createFreeformHighlightRect(dragBox),
    color,
    colorIndex,
    opacity,
  });

  return {
    mode: "freeform-area",
    layers: [fallbackLayer],
    matchedTextItems: 0,
  };
}
