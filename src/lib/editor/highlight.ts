import type { PdfLayer, TextOverlayItem } from "./types";
import {
  makeId,
  mergeCloseHighlightRects,
  rectsOverlapEnough,
  rectTouchesTextItem,
} from "./editor-utils";

type RectPercent = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export function createHighlightLayersFromSelectionRects(params: {
  rects: RectPercent[];
  page: number;
  textItems: TextOverlayItem[];
  existingLayers: PdfLayer[];
}) {
  const { rects, page, textItems, existingLayers } = params;

  const cleanedRects = rects
    .map((rect) => makeMarkerRect(rect))
    .filter((rect) =>
      textItems.some((item) => rectTouchesTextItem(rect, item, 0.35))
    );

  const candidateHighlights: PdfLayer[] = cleanedRects.map((rect) => ({
    id: makeId("highlight"),
    page,
    type: "highlight",
    xPercent: rect.xPercent,
    yPercent: rect.yPercent,
    widthPercent: rect.widthPercent,
    heightPercent: rect.heightPercent,
    opacity: 0.32,
    color: "#fbbf24",
  }));

  const mergedHighlights = mergeCloseHighlightRects(candidateHighlights, 0.25, 0.25);

  const existingHighlights = existingLayers.filter(
    (layer) => layer.page === page && layer.type === "highlight"
  );

  return mergedHighlights.filter((candidate) => {
    return !existingHighlights.some((existing) =>
      rectsOverlapEnough(candidate, existing, 0.62)
    );
  });
}

export function makeMarkerRect(rect: RectPercent): RectPercent {
  const markerHeight = rect.heightPercent * 0.72;
  const yOffset = rect.heightPercent * 0.2;

  return {
    xPercent: rect.xPercent,
    yPercent: rect.yPercent + yOffset,
    widthPercent: rect.widthPercent,
    heightPercent: markerHeight,
  };
}

export function getHighlightStatus(count: number) {
  if (count <= 0) {
    return "No new highlight added. This text may already be highlighted, or no selectable text was found.";
  }

  if (count === 1) {
    return "Highlighted selected text.";
  }

  return `Highlighted selected text in ${count} areas.`;
}

export function getNoSelectableTextStatus() {
  return "No selectable text found in this area. OCR highlight will require premium/backend OCR later.";
}
