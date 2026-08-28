"use client";

import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import { normalizeRedactionArea, type RedactionArea } from "@/lib/pdf-stage-one";

configurePdfJsWorker(pdfjsLib);

async function canvasToPng(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Unable to create the redacted page image.");
  return new Uint8Array(await blob.arrayBuffer());
}

export async function loadRedactionPreview(input: Uint8Array, pageNumber: number) {
  const loadingTask = pdfjsLib.getDocument({ data: input.slice() });
  const pdf = await loadingTask.promise;
  try {
    const page = await pdf.getPage(pageNumber);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(1.35, 820 / Math.max(1, base.width));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Unable to create PDF preview.");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: context, viewport }).promise;
    const url = canvas.toDataURL("image/png");
    page.cleanup();
    return { url, width: canvas.width, height: canvas.height, pageCount: pdf.numPages };
  } finally {
    await loadingTask.destroy();
  }
}

export async function permanentlyRedactPdf({
  input,
  areas,
  scale = 2,
  onProgress,
}: {
  readonly input: Uint8Array;
  readonly areas: readonly RedactionArea[];
  readonly scale?: number;
  readonly onProgress?: (progress: number, message: string) => void;
}) {
  if (!areas.length) throw new Error("Add at least one redaction area.");
  const normalized = areas.map(normalizeRedactionArea).filter((area) => area.widthRatio > 0.002 && area.heightRatio > 0.002);
  if (!normalized.length) throw new Error("Redaction areas are too small.");

  const loadingTask = pdfjsLib.getDocument({ data: input.slice() });
  const source = await loadingTask.promise;
  const output = await PDFDocument.create();

  try {
    for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
      onProgress?.(10 + Math.round((pageNumber - 1) / source.numPages * 72), `Rendering page ${pageNumber} of ${source.numPages}…`);
      const page = await source.getPage(pageNumber);
      const points = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("Unable to create redaction canvas.");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;

      normalized.filter((area) => area.pageNumber === pageNumber).forEach((area) => {
        const x = area.xRatio * canvas.width;
        const y = area.yRatio * canvas.height;
        const width = area.widthRatio * canvas.width;
        const height = area.heightRatio * canvas.height;
        context.save();
        context.fillStyle = "#000000";
        context.fillRect(Math.floor(x), Math.floor(y), Math.ceil(width), Math.ceil(height));
        context.restore();
      });

      const image = await output.embedPng(await canvasToPng(canvas));
      const outputPage = output.addPage([points.width, points.height]);
      outputPage.drawImage(image, { x: 0, y: 0, width: points.width, height: points.height });
      page.cleanup();
      canvas.width = 0;
      canvas.height = 0;
    }
    output.setProducer("PDFMantra permanent redaction");
    output.setCreator("PDFMantra");
    output.setModificationDate(new Date());
    onProgress?.(90, "Verifying flattened redacted output…");
    return output.save({ useObjectStreams: true });
  } finally {
    await loadingTask.destroy();
  }
}
