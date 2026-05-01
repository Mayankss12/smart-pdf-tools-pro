import type { DraftBox, DrawState, PdfLayer, ResizeHandle, TextOverlayItem } from "./types";

export const resizeHandles: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: "tl", className: "-left-3 -top-3", cursor: "nwse-resize" },
  { id: "tm", className: "left-1/2 -top-3 -translate-x-1/2", cursor: "ns-resize" },
  { id: "tr", className: "-right-3 -top-3", cursor: "nesw-resize" },
  { id: "mr", className: "-right-3 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { id: "br", className: "-bottom-3 -right-3", cursor: "nwse-resize" },
  { id: "bm", className: "-bottom-3 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { id: "bl", className: "-bottom-3 -left-3", cursor: "nesw-resize" },
  { id: "ml", className: "-left-3 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function isPdfFile(file: File, arrayBuffer: ArrayBuffer) {
  const lower = file.name.toLowerCase();
  const hasPdfExtension = lower.endsWith(".pdf");
  const hasPdfMime =
    file.type === "application/pdf" || file.type === "application/x-pdf";

  const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const hasPdfSignature =
    bytes.length === 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;

  return hasPdfMime || hasPdfExtension || hasPdfSignature;
}

export function isImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

export async function convertImageToPngBytes(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to process image.");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (outputBlob) =>
          outputBlob
            ? resolve(outputBlob)
            : reject(new Error("Unable to convert image.")),
        "image/png"
      );
    });

    return {
      imageBytes: new Uint8Array(await blob.arrayBuffer()),
      imageKind: "png" as const,
      imageUrl: URL.createObjectURL(file),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function parsePageRange(input: string, totalPages: number) {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error("Enter a page range. Example: 1-3,5");
  }

  const pages: number[] = [];

  for (const part of cleaned
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    if (part.includes("-")) {
      const [start, end] = part.split("-").map((value) => Number(value.trim()));

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid range: ${part}`);
      }

      if (start <= 0 || end <= 0) {
        throw new Error("Page numbers start from 1.");
      }

      if (start > end) {
        throw new Error(`Invalid reversed range: ${part}`);
      }

      if (end > totalPages) {
        throw new Error(`Page ${end} is outside this PDF.`);
      }

      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: ${part}`);
      }

      if (page <= 0) {
        throw new Error("Page numbers start from 1.");
      }

      if (page > totalPages) {
        throw new Error(`Page ${page} is outside this PDF.`);
      }

      pages.push(page);
    }
  }

  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

export function getLayerStyle(layer: PdfLayer) {
  return {
    left: `${layer.xPercent}%`,
    top: `${layer.yPercent}%`,
    width: `${layer.widthPercent}%`,
    height: `${layer.heightPercent}%`,
  };
}

export function normalizeDraftBox(draw: DrawState): DraftBox {
  const left = Math.min(draw.startXPercent, draw.currentXPercent);
  const top = Math.min(draw.startYPercent, draw.currentYPercent);
  const width = Math.abs(draw.currentXPercent - draw.startXPercent);
  const height = Math.abs(draw.currentYPercent - draw.startYPercent);

  return {
    xPercent: clamp(left, 0, 100),
    yPercent: clamp(top, 0, 100),
    widthPercent: clamp(width, 0, 100 - left),
    heightPercent: clamp(height, 0, 100 - top),
  };
}

export function getPointerPercent(
  event: React.PointerEvent<HTMLDivElement>,
  fallbackElement?: HTMLElement | null
) {
  const element = fallbackElement || event.currentTarget;
  const rect = element.getBoundingClientRect();

  return {
    xPercent: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
    yPercent: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
  };
}

export function rectsOverlapEnough(
  a: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number },
  b: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number },
  threshold = 0.55
) {
  const left = Math.max(a.xPercent, b.xPercent);
  const top = Math.max(a.yPercent, b.yPercent);
  const right = Math.min(a.xPercent + a.widthPercent, b.xPercent + b.widthPercent);
  const bottom = Math.min(a.yPercent + a.heightPercent, b.yPercent + b.heightPercent);

  const overlapWidth = Math.max(0, right - left);
  const overlapHeight = Math.max(0, bottom - top);
  const overlapArea = overlapWidth * overlapHeight;

  const smallerArea = Math.min(
    a.widthPercent * a.heightPercent,
    b.widthPercent * b.heightPercent
  );

  if (smallerArea <= 0) return false;

  return overlapArea / smallerArea >= threshold;
}

export function rectTouchesTextItem(
  rect: { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number },
  item: TextOverlayItem,
  tolerancePercent = 0.2
) {
  const rectLeft = rect.xPercent;
  const rectTop = rect.yPercent;
  const rectRight = rect.xPercent + rect.widthPercent;
  const rectBottom = rect.yPercent + rect.heightPercent;

  const itemLeft = item.leftPercent - tolerancePercent;
  const itemTop = item.topPercent - tolerancePercent;
  const itemRight = item.leftPercent + item.widthPercent + tolerancePercent;
  const itemBottom = item.topPercent + item.heightPercent + tolerancePercent;

  return rectRight > itemLeft && rectLeft < itemRight && rectBottom > itemTop && rectTop < itemBottom;
}

export function mergeCloseHighlightRects(
  rects: PdfLayer[],
  yTolerancePercent = 0.35,
  xGapTolerancePercent = 0.45
) {
  const highlights = rects
    .filter((layer) => layer.type === "highlight")
    .sort((a, b) => {
      if (Math.abs(a.yPercent - b.yPercent) > yTolerancePercent) {
        return a.yPercent - b.yPercent;
      }

      return a.xPercent - b.xPercent;
    });

  const merged: PdfLayer[] = [];

  for (const rect of highlights) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push(rect);
      continue;
    }

    const sameLine = Math.abs(last.yPercent - rect.yPercent) <= yTolerancePercent;
    const closeHorizontally =
      rect.xPercent <= last.xPercent + last.widthPercent + xGapTolerancePercent;

    if (sameLine && closeHorizontally) {
      const left = Math.min(last.xPercent, rect.xPercent);
      const top = Math.min(last.yPercent, rect.yPercent);
      const right = Math.max(last.xPercent + last.widthPercent, rect.xPercent + rect.widthPercent);
      const bottom = Math.max(last.yPercent + last.heightPercent, rect.yPercent + rect.heightPercent);

      merged[merged.length - 1] = {
        ...last,
        xPercent: left,
        yPercent: top,
        widthPercent: right - left,
        heightPercent: bottom - top,
      };
    } else {
      merged.push(rect);
    }
  }

  return merged;
}

export function getSafeLayerBounds(layer: PdfLayer) {
  const widthPercent = clamp(layer.widthPercent, 0.2, 100);
  const heightPercent = clamp(layer.heightPercent, 0.2, 100);

  return {
    xPercent: clamp(layer.xPercent, 0, 100 - widthPercent),
    yPercent: clamp(layer.yPercent, 0, 100 - heightPercent),
    widthPercent,
    heightPercent,
  };
}

export function makeId(prefix = "layer") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
