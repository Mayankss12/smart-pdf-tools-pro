import type { DraftBox, TextOverlayItem } from "@/lib/editor/types";

export type HighlightBuildMode = "text" | "area" | "none";

export type HighlightBuildResult = {
  mode: HighlightBuildMode;
  rects: DraftBox[];
  matchedItemCount: number;
};

type LineGroup = {
  centerY: number;
  averageHeight: number;
  items: TextOverlayItem[];
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBox(box: DraftBox): DraftBox {
  const xPercent = clamp(box.xPercent, 0, 100);
  const yPercent = clamp(box.yPercent, 0, 100);
  const widthPercent = clamp(box.widthPercent, 0, 100 - xPercent);
  const heightPercent = clamp(box.heightPercent, 0, 100 - yPercent);

  return {
    xPercent,
    yPercent,
    widthPercent,
    heightPercent,
  };
}

function getRight(box: DraftBox) {
  return box.xPercent + box.widthPercent;
}

function getBottom(box: DraftBox) {
  return box.yPercent + box.heightPercent;
}

function textItemToBox(item: TextOverlayItem): DraftBox {
  return {
    xPercent: item.leftPercent,
    yPercent: item.topPercent,
    widthPercent: item.widthPercent,
    heightPercent: item.heightPercent,
  };
}

function boxesIntersect(a: DraftBox, b: DraftBox) {
  return (
    a.xPercent < getRight(b) &&
    getRight(a) > b.xPercent &&
    a.yPercent < getBottom(b) &&
    getBottom(a) > b.yPercent
  );
}

function getCenterY(item: TextOverlayItem) {
  return item.topPercent + item.heightPercent / 2;
}

function createLineGroups(items: TextOverlayItem[]) {
  const sorted = [...items].sort((a, b) => {
    const centerDelta = getCenterY(a) - getCenterY(b);

    if (Math.abs(centerDelta) > 0.15) {
      return centerDelta;
    }

    return a.leftPercent - b.leftPercent;
  });

  const lines: LineGroup[] = [];

  for (const item of sorted) {
    const centerY = getCenterY(item);
    const height = item.heightPercent;

    const matchingLine = lines.find((line) => {
      const tolerance = Math.max(
        0.45,
        Math.max(line.averageHeight, height) * 0.72
      );

      return Math.abs(line.centerY - centerY) <= tolerance;
    });

    if (!matchingLine) {
      lines.push({
        centerY,
        averageHeight: height,
        items: [item],
      });

      continue;
    }

    const nextCount = matchingLine.items.length + 1;

    matchingLine.centerY =
      (matchingLine.centerY * matchingLine.items.length + centerY) /
      nextCount;

    matchingLine.averageHeight =
      (matchingLine.averageHeight * matchingLine.items.length + height) /
      nextCount;

    matchingLine.items.push(item);
  }

  return lines;
}

function splitLineIntoSegments(items: TextOverlayItem[]) {
  const sorted = [...items].sort((a, b) => a.leftPercent - b.leftPercent);
  const segments: TextOverlayItem[][] = [];

  for (const item of sorted) {
    const lastSegment = segments[segments.length - 1];

    if (!lastSegment) {
      segments.push([item]);
      continue;
    }

    const previousItem = lastSegment[lastSegment.length - 1];
    const previousRight =
      previousItem.leftPercent + previousItem.widthPercent;

    const gap = item.leftPercent - previousRight;

    const gapTolerance = Math.max(
      0.7,
      Math.max(previousItem.heightPercent, item.heightPercent) * 1.75
    );

    if (gap <= gapTolerance) {
      lastSegment.push(item);
    } else {
      segments.push([item]);
    }
  }

  return segments;
}

function segmentToHighlightRect(items: TextOverlayItem[]): DraftBox {
  const left = Math.min(...items.map((item) => item.leftPercent));
  const top = Math.min(...items.map((item) => item.topPercent));
  const right = Math.max(
    ...items.map((item) => item.leftPercent + item.widthPercent)
  );
  const bottom = Math.max(
    ...items.map((item) => item.topPercent + item.heightPercent)
  );

  const rawHeight = Math.max(0.4, bottom - top);
  const verticalInset = rawHeight * 0.14;
  const horizontalPadding = Math.max(0.08, rawHeight * 0.12);

  const nextLeft = clamp(left - horizontalPadding, 0, 100);
  const nextTop = clamp(top + verticalInset, 0, 100);
  const nextWidth = clamp(
    right - left + horizontalPadding * 2,
    0.4,
    100 - nextLeft
  );
  const nextHeight = clamp(
    rawHeight - verticalInset * 2,
    0.25,
    100 - nextTop
  );

  return {
    xPercent: nextLeft,
    yPercent: nextTop,
    widthPercent: nextWidth,
    heightPercent: nextHeight,
  };
}

export function buildHighlightRectsFromDragBox(
  textItems: TextOverlayItem[],
  draftBox: DraftBox
): HighlightBuildResult {
  const normalizedBox = normalizeBox(draftBox);

  const matchedItems = textItems.filter((item) =>
    boxesIntersect(textItemToBox(item), normalizedBox)
  );

  if (matchedItems.length > 0) {
    const lines = createLineGroups(matchedItems);

    const rects = lines.flatMap((line) =>
      splitLineIntoSegments(line.items).map(segmentToHighlightRect)
    );

    return {
      mode: "text",
      rects,
      matchedItemCount: matchedItems.length,
    };
  }

  const isLargeEnoughForAreaHighlight =
    normalizedBox.widthPercent >= 1.2 &&
    normalizedBox.heightPercent >= 0.8;

  if (isLargeEnoughForAreaHighlight) {
    return {
      mode: "area",
      rects: [normalizedBox],
      matchedItemCount: 0,
    };
  }

  return {
    mode: "none",
    rects: [],
    matchedItemCount: 0,
  };
}
