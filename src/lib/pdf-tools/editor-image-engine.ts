import type { PDFDocument, PDFPage } from "pdf-lib";

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

  return Math.max(0.1, Math.min(1, Number(opacity)));
}

export async function drawEditorImageObject({
  pdfDoc,
  page,
  object,
}: {
  readonly pdfDoc: PDFDocument;
  readonly page: PDFPage;
  readonly object: EditorImageObjectLike;
}) {
  const imageDataUrl = object.data.imageDataUrl;

  if (!imageDataUrl) {
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

  page.drawImage(embeddedImage, {
    x: object.box.x,
    y: page.getHeight() - object.box.y - object.box.height,
    width: object.box.width,
    height: object.box.height,
    opacity: getSafeOpacity(object.data.opacity),
  });
}
