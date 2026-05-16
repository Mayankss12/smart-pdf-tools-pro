import { PDFDocument, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import type {
  NormalizedRect,
  PdfPageIndex,
} from "@/engines/shared/types";

import type {
  HighlightLayer,
} from "@/engines/highlight/types";

import {
  prepareHighlightExportPlan,
} from "@/engines/highlight/highlightExporter";

import {
  createPageGeometryContextFromPdfJs,
} from "@/adapters/pdfjs/pageGeometryAdapter";

import {
  buildTextSnapUnitsFromPdfJs,
} from "@/adapters/pdfjs/textContentAdapter";

import type {
  HighlightPageSnapshot,
} from "./highlightToolTypes";

/**
 * PDFMantra Highlight Tool Runtime
 * --------------------------------------------
 * Browser-side runtime helpers for the standalone Smart Highlight PDF page.
 *
 * Boundary rules:
 * - This file may use PDF.js, pdf-lib, File, Blob, Canvas, and document APIs.
 * - Core geometry/snapping/composition/export planning remains inside engines/.
 * - No old editor modules are imported or reused.
 */

export type PdfJsDocumentHandle = pdfjsLib.PDFDocumentProxy;

const PDF_SIGNATURE = "%PDF-";

let pdfJsWorkerConfigured = false;

export function ensurePdfJsWorker(): void {
  if (pdfJsWorkerConfigured) {
    return;
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  pdfJsWorkerConfigured = true;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export async function readPdfFileBytes(file: File): Promise<Uint8Array> {
  const buffer = await file.arrayBuffer();
  return new Uint8Array(buffer);
}

function hasPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_SIGNATURE.length) {
    return false;
  }

  const header = String.fromCharCode(
    bytes[0],
    bytes[1],
    bytes[2],
    bytes[3],
    bytes[4],
  );

  return header === PDF_SIGNATURE;
}

export async function validatePdfFile(file: File): Promise<Uint8Array> {
  const bytes = await readPdfFileBytes(file);
  const lowerName = file.name.toLowerCase();
  const extensionLooksValid = lowerName.endsWith(".pdf");
  const mimeLooksValid =
    file.type === "application/pdf" || file.type === "application/x-pdf";
  const signatureLooksValid = hasPdfSignature(bytes);

  if (!extensionLooksValid && !mimeLooksValid && !signatureLooksValid) {
    throw new Error("Please upload a valid PDF file.");
  }

  if (!signatureLooksValid) {
    throw new Error("This file does not contain a readable PDF signature.");
  }

  return bytes;
}

export async function loadPdfDocumentFromBytes(
  bytes: Uint8Array,
): Promise<PdfJsDocumentHandle> {
  ensurePdfJsWorker();

  const loadingTask = pdfjsLib.getDocument({
    data: bytes.slice(),
  });

  return loadingTask.promise;
}

async function renderPagePreview(input: {
  readonly page: pdfjsLib.PDFPageProxy;
  readonly renderScale: number;
}): Promise<{
  readonly previewUrl: string;
  readonly viewport: pdfjsLib.PageViewport;
}> {
  const viewport = input.page.getViewport({ scale: input.renderScale });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create a canvas preview for this PDF page.");
  }

  const outputScale = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.floor(viewport.width * outputScale));
  canvas.height = Math.max(1, Math.floor(viewport.height * outputScale));
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await input.page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    previewUrl: canvas.toDataURL("image/png"),
    viewport,
  };
}

export async function buildHighlightPageSnapshot(input: {
  readonly pdf: PdfJsDocumentHandle;
  readonly pageNumber: number;
  readonly renderScale: number;
}): Promise<HighlightPageSnapshot> {
  const page = await input.pdf.getPage(input.pageNumber);
  const pageIndex: PdfPageIndex = input.pageNumber - 1;
  const pageRotation = page.rotate ?? 0;

  const preview = await renderPagePreview({
    page,
    renderScale: input.renderScale,
  });

  const textContent = await page.getTextContent();
  const baseViewport = page.getViewport({
    scale: 1,
    rotation: 0,
  });

  const geometry = createPageGeometryContextFromPdfJs({
    pageIndex,
    pageNumber: input.pageNumber,
    rotation: pageRotation,
    pdfPageSize: {
      width: baseViewport.width,
      height: baseViewport.height,
    },
    viewport: preview.viewport,
  });

  const textExtraction = buildTextSnapUnitsFromPdfJs({
    pageIndex,
    textContent,
    viewport: preview.viewport,
    options: {
      granularity: "word",
    },
  });

  return {
    pageIndex,
    pageNumber: input.pageNumber,
    previewUrl: preview.previewUrl,
    pageLabel: `Page ${input.pageNumber}`,
    geometry,
    textUnits: textExtraction.units,
    textDiagnostics: textExtraction.diagnostics,
  };
}

export async function buildAllHighlightPageSnapshots(input: {
  readonly pdf: PdfJsDocumentHandle;
  readonly renderScale: number;
  readonly onProgress?: (completed: number, total: number) => void;
}): Promise<readonly HighlightPageSnapshot[]> {
  const pages: HighlightPageSnapshot[] = [];

  for (let pageNumber = 1; pageNumber <= input.pdf.numPages; pageNumber += 1) {
    const snapshot = await buildHighlightPageSnapshot({
      pdf: input.pdf,
      pageNumber,
      renderScale: input.renderScale,
    });

    pages.push(snapshot);
    input.onProgress?.(pageNumber, input.pdf.numPages);
  }

  return pages;
}

export function createNormalizedDragBounds(input: {
  readonly startX: number;
  readonly startY: number;
  readonly endX: number;
  readonly endY: number;
  readonly containerRect: DOMRect;
}): NormalizedRect {
  const safeWidth = Math.max(input.containerRect.width, 1);
  const safeHeight = Math.max(input.containerRect.height, 1);

  const normalizedStartX = (input.startX - input.containerRect.left) / safeWidth;
  const normalizedStartY = (input.startY - input.containerRect.top) / safeHeight;
  const normalizedEndX = (input.endX - input.containerRect.left) / safeWidth;
  const normalizedEndY = (input.endY - input.containerRect.top) / safeHeight;

  return {
    x: Math.min(normalizedStartX, normalizedEndX),
    y: Math.min(normalizedStartY, normalizedEndY),
    width: Math.abs(normalizedEndX - normalizedStartX),
    height: Math.abs(normalizedEndY - normalizedStartY),
  };
}

export function normalizedRectToCssStyle(rect: NormalizedRect): {
  readonly left: string;
  readonly top: string;
  readonly width: string;
  readonly height: string;
} {
  return {
    left: `${rect.x * 100}%`,
    top: `${rect.y * 100}%`,
    width: `${rect.width * 100}%`,
    height: `${rect.height * 100}%`,
  };
}

export async function exportHighlightedPdf(input: {
  readonly originalBytes: Uint8Array;
  readonly layers: readonly HighlightLayer[];
  readonly pages: readonly HighlightPageSnapshot[];
}): Promise<Blob> {
  const pdfDocument = await PDFDocument.load(input.originalBytes.slice(), {
    ignoreEncryption: true,
  });

  const plan = prepareHighlightExportPlan({
    layers: input.layers,
    pageGeometryContexts: input.pages.map((page) => page.geometry),
  });

  for (const command of plan.flatCommands) {
    const page = pdfDocument.getPage(command.pageIndex);

    page.drawRectangle({
      x: command.pdfBounds.x,
      y: command.pdfBounds.y,
      width: command.pdfBounds.width,
      height: command.pdfBounds.height,
      color: rgb(command.color.r, command.color.g, command.color.b),
      opacity: command.opacity,
      borderWidth: 0,
    });
  }

  const bytes = await pdfDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return new Blob([bytes], {
    type: "application/pdf",
  });
}
