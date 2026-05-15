import * as pdfjsLib from "pdfjs-dist";
import type { ParagraphBlock, TextOverlayItem, TextOverlayWord } from "./types";
import { clamp, makeId } from "./editor-utils";

type PdfTextContentItem = {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
  fontName?: string;
};

export async function extractTextOverlayItems(params: {
  page: pdfjsLib.PDFPageProxy;
  viewport: pdfjsLib.PageViewport;
  pageNumber: number;
  renderScale: number;
}) {
  const { page, viewport, pageNumber, renderScale } = params;

  const textContent = await page.getTextContent();
  const transformUtil = pdfjsLib.Util.transform;

  const items: TextOverlayItem[] = [];

  textContent.items.forEach((rawItem, index) => {
    const textItem = rawItem as PdfTextContentItem;
    const text = String(textItem.str || "");

    if (!text.trim() || !Array.isArray(textItem.transform)) return;

    const transformed = transformUtil(viewport.transform, textItem.transform);

    const left = transformed[4];
    const fontSizePx = Math.max(5, Math.hypot(transformed[2], transformed[3]));
    const heightPx = Math.max(5, fontSizePx * 1.12);
    const top = transformed[5] - heightPx;

    const widthPx = Math.max(1, Number(textItem.width || 0) * renderScale);
    const fontSizePdf = Math.max(5, fontSizePx / Math.max(renderScale, 0.1));

    const overlayItem: TextOverlayItem = {
      id: `${pageNumber}-${index}-${text.slice(0, 14)}`,
      page: pageNumber,
      text,

      leftPercent: clamp((left / viewport.width) * 100, 0, 100),
      topPercent: clamp((top / viewport.height) * 100, 0, 100),
      widthPercent: clamp((widthPx / viewport.width) * 100, 0.2, 100),
      heightPercent: clamp((heightPx / viewport.height) * 100, 0.2, 100),

      fontSizePx,
      fontSizePdf,

      transform: textItem.transform,
      fontName: textItem.fontName,
    };

    items.push(overlayItem);
  });

  return items;
}

export function splitOverlayItemsIntoWords(items: TextOverlayItem[]) {
  const words: TextOverlayWord[] = [];

  for (const item of items) {
    const normalized = item.text.replace(/\s+/g, " ");

    if (!normalized.trim()) continue;

    const matches = Array.from(normalized.matchAll(/\S+/g));

    if (matches.length <= 1) {
      words.push({
        ...item,
        id: `${item.id}-word-0`,
        sourceItemId: item.id,
        wordIndex: 0,
      });

      continue;
    }

    const fullTextLength = Math.max(normalized.length, 1);

    matches.forEach((match, wordIndex) => {
      const word = match[0];
      const start = match.index || 0;
      const end = start + word.length;

      const leftPercent =
        item.leftPercent + item.widthPercent * (start / fullTextLength);
      const widthPercent = item.widthPercent * ((end - start) / fullTextLength);

      words.push({
        ...item,
        id: `${item.id}-word-${wordIndex}`,
        text: word,
        leftPercent,
        widthPercent: Math.max(widthPercent, 0.15),
        sourceItemId: item.id,
        wordIndex,
      });
    });
  }

  return words;
}

export function buildParagraphBlocks(items: TextOverlayItem[]) {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.topPercent - b.topPercent) > 0.8) {
      return a.topPercent - b.topPercent;
    }

    return a.leftPercent - b.leftPercent;
  });

  const lines: TextOverlayItem[][] = [];

  for (const item of sorted) {
    const lastLine = lines[lines.length - 1];

    if (!lastLine) {
      lines.push([item]);
      continue;
    }

    const lineTop =
      lastLine.reduce((sum, lineItem) => sum + lineItem.topPercent, 0) /
      lastLine.length;

    const averageHeight =
      lastLine.reduce((sum, lineItem) => sum + lineItem.heightPercent, 0) /
      lastLine.length;

    const sameLine = Math.abs(item.topPercent - lineTop) <= Math.max(0.6, averageHeight * 0.75);

    if (sameLine) {
      lastLine.push(item);
    } else {
      lines.push([item]);
    }
  }

  const normalizedLines = lines.map((line) =>
    [...line].sort((a, b) => a.leftPercent - b.leftPercent)
  );

  const paragraphs: TextOverlayItem[][] = [];

  for (const line of normalizedLines) {
    const lastParagraph = paragraphs[paragraphs.length - 1];

    if (!lastParagraph) {
      paragraphs.push([...line]);
      continue;
    }

    const lastItems = lastParagraph;
    const lastBottom = Math.max(
      ...lastItems.map((item) => item.topPercent + item.heightPercent)
    );
    const lineTop = Math.min(...line.map((item) => item.topPercent));
    const lineHeight =
      line.reduce((sum, item) => sum + item.heightPercent, 0) / line.length;

    const verticalGap = lineTop - lastBottom;

    const lastLeft = Math.min(...lastItems.map((item) => item.leftPercent));
    const lineLeft = Math.min(...line.map((item) => item.leftPercent));
    const leftAligned = Math.abs(lastLeft - lineLeft) <= 4.5;

    const belongsToParagraph =
      verticalGap >= -0.3 &&
      verticalGap <= Math.max(2.4, lineHeight * 1.75) &&
      leftAligned;

    if (belongsToParagraph) {
      lastParagraph.push(...line);
    } else {
      paragraphs.push([...line]);
    }
  }

  return paragraphs.map((paragraphItems, index): ParagraphBlock => {
    const left = Math.min(...paragraphItems.map((item) => item.leftPercent));
    const top = Math.min(...paragraphItems.map((item) => item.topPercent));
    const right = Math.max(
      ...paragraphItems.map((item) => item.leftPercent + item.widthPercent)
    );
    const bottom = Math.max(
      ...paragraphItems.map((item) => item.topPercent + item.heightPercent)
    );

    const textByLine = groupItemsIntoLines(paragraphItems)
      .map((line) =>
        line
          .sort((a, b) => a.leftPercent - b.leftPercent)
          .map((item) => item.text)
          .join("")
          .replace(/\s+/g, " ")
          .trim()
      )
      .filter(Boolean);

    const fontSizePx =
      paragraphItems.reduce((sum, item) => sum + item.fontSizePx, 0) /
      paragraphItems.length;

    const fontSizePdf =
      paragraphItems.reduce((sum, item) => sum + item.fontSizePdf, 0) /
      paragraphItems.length;

    return {
      id: makeId(`paragraph-${index}`),
      page: paragraphItems[0]?.page || 1,
      text: textByLine.join("\n"),
      itemIds: paragraphItems.map((item) => item.id),

      leftPercent: clamp(left, 0, 100),
      topPercent: clamp(top, 0, 100),
      widthPercent: clamp(right - left, 0.5, 100 - left),
      heightPercent: clamp(bottom - top, 0.5, 100 - top),

      fontSizePx,
      fontSizePdf,
    };
  });
}

export function findParagraphForItem(
  item: TextOverlayItem,
  paragraphs: ParagraphBlock[]
) {
  return (
    paragraphs.find((paragraph) => paragraph.itemIds.includes(item.id)) || null
  );
}

export function getTextSelectionRects(params: {
  selection: Selection;
  pageRect: DOMRect;
  textItems: TextOverlayItem[];
}) {
  const { selection, pageRect, textItems } = params;

  if (selection.rangeCount === 0 || selection.isCollapsed) return [];

  const range = selection.getRangeAt(0);

  const selectionRects = Array.from(range.getClientRects())
    .filter((rect) => rect.width > 1 && rect.height > 1)
    .filter((rect) => {
      const isInsidePage =
        rect.right > pageRect.left &&
        rect.left < pageRect.right &&
        rect.bottom > pageRect.top &&
        rect.top < pageRect.bottom;

      return isInsidePage;
    })
    .map((rect) => {
      const left = clamp(rect.left - pageRect.left, 0, pageRect.width);
      const top = clamp(rect.top - pageRect.top, 0, pageRect.height);
      const width = clamp(rect.width, 1, pageRect.width - left);
      const height = clamp(rect.height, 1, pageRect.height - top);

      return {
        xPercent: (left / pageRect.width) * 100,
        yPercent: (top / pageRect.height) * 100,
        widthPercent: (width / pageRect.width) * 100,
        heightPercent: (height / pageRect.height) * 100,
      };
    });

  return selectionRects.filter((rect) =>
    textItems.some((item) => selectionRectTouchesItem(rect, item))
  );
}

function selectionRectTouchesItem(
  rect: {
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  },
  item: TextOverlayItem
) {
  const left = Math.max(rect.xPercent, item.leftPercent);
  const top = Math.max(rect.yPercent, item.topPercent);
  const right = Math.min(
    rect.xPercent + rect.widthPercent,
    item.leftPercent + item.widthPercent
  );
  const bottom = Math.min(
    rect.yPercent + rect.heightPercent,
    item.topPercent + item.heightPercent
  );

  return right > left && bottom > top;
}

function groupItemsIntoLines(items: TextOverlayItem[]) {
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(a.topPercent - b.topPercent) > 0.8) {
      return a.topPercent - b.topPercent;
    }

    return a.leftPercent - b.leftPercent;
  });

  const lines: TextOverlayItem[][] = [];

  for (const item of sorted) {
    const lastLine = lines[lines.length - 1];

    if (!lastLine) {
      lines.push([item]);
      continue;
    }

    const lineTop =
      lastLine.reduce((sum, lineItem) => sum + lineItem.topPercent, 0) /
      lastLine.length;

    const sameLine = Math.abs(item.topPercent - lineTop) <= 0.8;

    if (sameLine) {
      lastLine.push(item);
    } else {
      lines.push([item]);
    }
  }

  return lines;
}
