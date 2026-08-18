import type {
  EditorObject,
  EditorObjectBox,
} from "@/app/editor/hooks/useEditor";

export type EditorPageNumberPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type EditorPageNumberSettings = {
  readonly position: EditorPageNumberPosition;
  readonly startNumber: number;
  readonly prefix: string;
  readonly suffix: string;
  readonly fontSize: number;
  readonly color: string;
  readonly pageRange: string;
};

export type EditorPageSize = {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
};

export const DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS: EditorPageNumberSettings = {
  position: "bottom-center",
  startNumber: 1,
  prefix: "",
  suffix: "",
  fontSize: 12,
  color: "#334155",
  pageRange: "all",
};

export function parseEditorPageRange(value: string, pageCount: number) {
  const normalized = value.trim().toLowerCase();

  if (normalized === "all") {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>();
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new Error("Enter “all” or a page range such as 1-3, 5.");
  }

  for (const part of parts) {
    if (!/^\d+(-\d+)?$/.test(part)) {
      throw new Error(`Invalid page range segment: ${part}.`);
    }

    const [startValue, endValue] = part.split("-");
    const start = Number(startValue);
    const end = endValue ? Number(endValue) : start;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end > pageCount
    ) {
      throw new Error(`Page range ${part} is outside this ${pageCount}-page PDF.`);
    }

    for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
      pages.add(pageNumber);
    }
  }

  return [...pages].sort((left, right) => left - right);
}

function getPageNumberBox({
  position,
  pageWidth,
  pageHeight,
  width,
  height,
}: {
  readonly position: EditorPageNumberPosition;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly width: number;
  readonly height: number;
}): EditorObjectBox {
  const horizontal = position.split("-")[1];
  const horizontalMargin = Math.min(
    24,
    Math.max(0, (pageWidth - width) / 2),
  );
  const verticalMargin = Math.min(
    24,
    Math.max(0, (pageHeight - height) / 2),
  );
  const x =
    horizontal === "left"
      ? horizontalMargin
      : horizontal === "right"
        ? Math.max(0, pageWidth - width - horizontalMargin)
        : Math.max(0, (pageWidth - width) / 2);
  const y = position.startsWith("top")
    ? verticalMargin
    : Math.max(0, pageHeight - height - verticalMargin);

  return { x, y, width, height };
}

function createPageNumberId(setId: string, pageNumber: number) {
  return `${setId}-page-${pageNumber}`;
}

export function createEditorPageNumberObjects({
  settings,
  pageSizes,
  setId,
}: {
  readonly settings: EditorPageNumberSettings;
  readonly pageSizes: readonly EditorPageSize[];
  readonly setId: string;
}): EditorObject[] {
  const targetPages = parseEditorPageRange(settings.pageRange, pageSizes.length);
  const fontSize = Math.max(8, Math.min(72, settings.fontSize));

  return targetPages.flatMap((pageNumber, targetIndex) => {
    const pageSize = pageSizes.find((item) => item.pageNumber === pageNumber);
    if (!pageSize) return [];

    const safePageWidth = Math.max(1, pageSize.width);
    const safePageHeight = Math.max(1, pageSize.height);
    const horizontalGutter = Math.min(48, safePageWidth * 0.2);
    const verticalGutter = Math.min(48, safePageHeight * 0.2);
    const maxBoxWidth = Math.max(1, safePageWidth - horizontalGutter);
    const maxBoxHeight = Math.max(1, safePageHeight - verticalGutter);
    const text = `${settings.prefix}${settings.startNumber + targetIndex}${settings.suffix}`;
    const width = Math.min(
      maxBoxWidth,
      Math.max(60, text.length * fontSize * 0.65 + 12),
    );
    const height = Math.min(maxBoxHeight, Math.max(24, fontSize * 1.55));

    const pageNumberObject: EditorObject = {
      id: createPageNumberId(setId, pageNumber),
      type: "text",
      pageNumber,
      box: getPageNumberBox({
        position: settings.position,
        pageWidth: safePageWidth,
        pageHeight: safePageHeight,
        width,
        height,
      }),
      data: {
        text,
        fontSize,
        color: settings.color,
        opacity: 1,
        pageNumberSetId: setId,
      },
      locked: false,
    };

    return [pageNumberObject];
  });
}
