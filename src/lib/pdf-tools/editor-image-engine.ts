import type { PDFDocument, PDFPage } from "pdf-lib";

import type { EditorPageGeometry } from "./editor-page-geometry";

export type EditorImageBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type EditorImageObjectLike = {
  readonly box: EditorImageBox;
  readonly data: {
    readonly imageDataUrl?: string;
    readonly opacity?: number;
  };
};

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);

  if (!match) {
    return null;
  }

  return {
    mimeType: match[1].toLowerCase(),
    base64: match[3],
  };
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getSafeOpacity(opacity: number | undefined) {
  if (!Number.isFinite(opacity)) return 1;

  return Math.max(0, Math.min(1, Number(opacity)));
}

function fitImageInsideBox({
  box,
  imageWidth,
  imageHeight,
}: {
  readonly box: EditorImageBox;
  readonly imageWidth: number;
  readonly imageHeight: number;
}) {
  const safeBoxWidth = Math.max(0.01, box.width);
  const safeBoxHeight = Math.max(0.01, box.height);
  const safeImageWidth = Math.max(0.01, imageWidth);
  const safeImageHeight = Math.max(0.01, imageHeight);
  const scale = Math.min(
    safeBoxWidth / safeImageWidth,
    safeBoxHeight / safeImageHeight,
  );
  const width = safeImageWidth * scale;
  const height = safeImageHeight * scale;

  return {
    width,
    height,
    offsetX: (safeBoxWidth - width) / 2,
    offsetY: (safeBoxHeight - height) / 2,
  };
}

export async function drawEditorImageObject({
  pdfDoc,
  page,
  object,
  geometry,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorImageObjectLike;
  readonly geometry: EditorPageGeometry;
}) {
  const imageDataUrl = object.data.imageDataUrl;
  const opacity = getSafeOpacity(object.data.opacity);

  if (!imageDataUrl || opacity <= 0) {
    return;
  }

  const parsed = parseDataUrl(imageDataUrl);

  if (!parsed) {
    return;
  }

  const imageBytes = base64ToUint8Array(parsed.base64);
  const embeddedImage = parsed.mimeType === "image/png"
    ? await pdfDoc.embedPng(imageBytes)
    : await pdfDoc.embedJpg(imageBytes);
  const fitted = fitImageInsideBox({
    box: object.box,
    imageWidth: embeddedImage.width,
    imageHeight: embeddedImage.height,
  });
  const boxBottom = geometry.viewportHeight - object.box.y - object.box.height;

  page.drawImage(embeddedImage, {
    x: object.box.x + fitted.offsetX,
    y: boxBottom + fitted.offsetY,
    width: fitted.width,
    height: fitted.height,
    opacity,
  });
}
