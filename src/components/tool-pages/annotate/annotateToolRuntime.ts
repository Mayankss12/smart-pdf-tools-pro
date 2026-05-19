import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";

import type {
  AnnotationLayer,
  ShapeBoxAnnotation,
  ShapeLineAnnotation,
  StrokeAnnotation,
  TextNoteAnnotation,
} from "@/engines/annotation/types";
import type { PdfPageGeometryContext } from "@/engines/shared/types";
import {
  normalizedPointToPdfPoint,
  normalizedRectToPdfRect,
} from "@/engines/shared/coordinateUtils";
import { createPageGeometryContextFromPdfJs } from "@/adapters/pdfjs/pageGeometryAdapter";
import type { AnnotatePageSnapshot } from "./annotateToolTypes";

export type PdfJsDocumentHandle = pdfjsLib.PDFDocumentProxy;

const PDF_SIGNATURE = "%PDF-";
const EXPORT_PADDING_PX = 12;
let pdfJsWorkerConfigured = false;

interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

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

export async function buildAnnotatePageSnapshot(input: {
  readonly pdf: PdfJsDocumentHandle;
  readonly pageNumber: number;
  readonly renderScale: number;
}): Promise<AnnotatePageSnapshot> {
  const page = await input.pdf.getPage(input.pageNumber);
  const pageIndex = input.pageNumber - 1;
  const pageRotation = page.rotate ?? 0;
  const preview = await renderPagePreview({
    page,
    renderScale: input.renderScale,
  });
  const baseViewport = page.getViewport({ scale: 1, rotation: 0 });

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

  return {
    pageIndex,
    pageNumber: input.pageNumber,
    pageLabel: `Page ${input.pageNumber}`,
    previewUrl: preview.previewUrl,
    geometry,
  };
}

export async function buildAllAnnotatePageSnapshots(input: {
  readonly pdf: PdfJsDocumentHandle;
  readonly renderScale: number;
  readonly onProgress?: (completed: number, total: number) => void;
}): Promise<readonly AnnotatePageSnapshot[]> {
  const pages: AnnotatePageSnapshot[] = [];

  for (let pageNumber = 1; pageNumber <= input.pdf.numPages; pageNumber += 1) {
    const snapshot = await buildAnnotatePageSnapshot({
      pdf: input.pdf,
      pageNumber,
      renderScale: input.renderScale,
    });

    pages.push(snapshot);
    input.onProgress?.(pageNumber, input.pdf.numPages);
  }

  return pages;
}

function parseHexColor(value: string, fallback: RgbColor): RgbColor {
  const normalized = value.trim().replace(/^#/, "");

  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return fallback;
  }

  return {
    r: parseInt(normalized.slice(0, 2), 16) / 255,
    g: parseInt(normalized.slice(2, 4), 16) / 255,
    b: parseInt(normalized.slice(4, 6), 16) / 255,
  };
}

function clampOpacity(value: number): number {
  if (!Number.isFinite(value)) {
    return 1;
  }

  return Math.min(Math.max(value, 0), 1);
}

function resolvePdfStrokeWidth(
  strokeWidth: number,
  geometry: PdfPageGeometryContext,
): number {
  const viewportAverage =
    (geometry.viewportSize.width + geometry.viewportSize.height) / 2;
  const pdfAverage = (geometry.pdfSize.width + geometry.pdfSize.height) / 2;
  const scale = viewportAverage > 0 ? pdfAverage / viewportAverage : 1;

  return Math.max(0.75, strokeWidth * scale);
}

function getGeometryMap(
  pages: readonly AnnotatePageSnapshot[],
): ReadonlyMap<number, PdfPageGeometryContext> {
  return new Map(pages.map((page) => [page.pageIndex, page.geometry]));
}

function drawStrokeAnnotation(input: {
  readonly page: ReturnType<PDFDocument["getPage"]>;
  readonly geometry: PdfPageGeometryContext;
  readonly annotation: StrokeAnnotation;
}): void {
  if (input.annotation.points.length < 2) {
    return;
  }

  const color = parseHexColor(input.annotation.style.color, {
    r: 0.07,
    g: 0.09,
    b: 0.16,
  });
  const thickness = resolvePdfStrokeWidth(
    input.annotation.style.strokeWidth,
    input.geometry,
  );
  const opacity = clampOpacity(input.annotation.style.opacity);
  const pdfPoints = input.annotation.points.map((point) =>
    normalizedPointToPdfPoint(point, input.geometry),
  );

  for (let index = 1; index < pdfPoints.length; index += 1) {
    input.page.drawLine({
      start: pdfPoints[index - 1],
      end: pdfPoints[index],
      thickness,
      color: rgb(color.r, color.g, color.b),
      opacity,
    });
  }
}

function drawShapeBoxAnnotation(input: {
  readonly page: ReturnType<PDFDocument["getPage"]>;
  readonly geometry: PdfPageGeometryContext;
  readonly annotation: ShapeBoxAnnotation;
}): void {
  const color = parseHexColor(input.annotation.style.color, {
    r: 0.4,
    g: 0.31,
    b: 0.91,
  });
  const bounds = normalizedRectToPdfRect(
    input.annotation.bounds,
    input.geometry,
  );
  const borderWidth = resolvePdfStrokeWidth(
    input.annotation.style.strokeWidth,
    input.geometry,
  );
  const opacity = clampOpacity(input.annotation.style.opacity);

  if (input.annotation.kind === "rectangle") {
    input.page.drawRectangle({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      borderColor: rgb(color.r, color.g, color.b),
      borderWidth,
      borderOpacity: opacity,
    });
    return;
  }

  input.page.drawEllipse({
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
    xScale: bounds.width / 2,
    yScale: bounds.height / 2,
    borderColor: rgb(color.r, color.g, color.b),
    borderWidth,
    borderOpacity: opacity,
  });
}

function drawShapeLineAnnotation(input: {
  readonly page: ReturnType<PDFDocument["getPage"]>;
  readonly geometry: PdfPageGeometryContext;
  readonly annotation: ShapeLineAnnotation;
}): void {
  const color = parseHexColor(input.annotation.style.color, {
    r: 0.4,
    g: 0.31,
    b: 0.91,
  });
  const thickness = resolvePdfStrokeWidth(
    input.annotation.style.strokeWidth,
    input.geometry,
  );
  const opacity = clampOpacity(input.annotation.style.opacity);
  const start = normalizedPointToPdfPoint(
    input.annotation.start,
    input.geometry,
  );
  const end = normalizedPointToPdfPoint(
    input.annotation.end,
    input.geometry,
  );

  input.page.drawLine({
    start,
    end,
    thickness,
    color: rgb(color.r, color.g, color.b),
    opacity,
  });

  if (input.annotation.kind !== "arrow") {
    return;
  }

  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const headLength = Math.max(8, thickness * 4.5);
  const spread = Math.PI / 7;
  const left = {
    x: end.x - headLength * Math.cos(angle - spread),
    y: end.y - headLength * Math.sin(angle - spread),
  };
  const right = {
    x: end.x - headLength * Math.cos(angle + spread),
    y: end.y - headLength * Math.sin(angle + spread),
  };

  input.page.drawLine({
    start: end,
    end: left,
    thickness,
    color: rgb(color.r, color.g, color.b),
    opacity,
  });
  input.page.drawLine({
    start: end,
    end: right,
    thickness,
    color: rgb(color.r, color.g, color.b),
    opacity,
  });
}

function wrapText(input: {
  readonly text: string;
  readonly font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
  readonly fontSize: number;
  readonly maxWidth: number;
}): readonly string[] {
  const lines: string[] = [];

  for (const rawLine of input.text.split(/\r?\n/)) {
    const words = rawLine.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      lines.push("");
      continue;
    }

    let current = "";

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const width = input.font.widthOfTextAtSize(candidate, input.fontSize);

      if (current && width > input.maxWidth) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines.length > 0 ? lines : [""];
}

function drawTextNoteAnnotation(input: {
  readonly page: ReturnType<PDFDocument["getPage"]>;
  readonly geometry: PdfPageGeometryContext;
  readonly annotation: TextNoteAnnotation;
  readonly font: Awaited<ReturnType<PDFDocument["embedFont"]>>;
}): void {
  const textColor = parseHexColor(input.annotation.style.color, {
    r: 0.07,
    g: 0.09,
    b: 0.16,
  });
  const background = parseHexColor(input.annotation.backgroundColor, {
    r: 1,
    g: 0.96,
    b: 0.72,
  });
  const bounds = normalizedRectToPdfRect(
    input.annotation.bounds,
    input.geometry,
  );
  const viewportAverage =
    (input.geometry.viewportSize.width + input.geometry.viewportSize.height) / 2;
  const pdfAverage =
    (input.geometry.pdfSize.width + input.geometry.pdfSize.height) / 2;
  const fontScale = viewportAverage > 0 ? pdfAverage / viewportAverage : 1;
  const fontSize = Math.max(8, input.annotation.fontSize * fontScale);
  const padding = Math.max(4, EXPORT_PADDING_PX * fontScale);
  const lineHeight = fontSize * 1.24;
  const maxTextWidth = Math.max(12, bounds.width - padding * 2);
  const lines = wrapText({
    text: input.annotation.text || "Note",
    font: input.font,
    fontSize,
    maxWidth: maxTextWidth,
  });

  input.page.drawRectangle({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    color: rgb(background.r, background.g, background.b),
    opacity: 0.92,
    borderColor: rgb(textColor.r, textColor.g, textColor.b),
    borderWidth: Math.max(0.65, resolvePdfStrokeWidth(1.2, input.geometry)),
    borderOpacity: 0.34,
  });

  const maxLineCount = Math.max(1, Math.floor((bounds.height - padding * 2) / lineHeight));
  const visibleLines = lines.slice(0, maxLineCount);

  visibleLines.forEach((line, index) => {
    input.page.drawText(line, {
      x: bounds.x + padding,
      y: bounds.y + bounds.height - padding - fontSize - lineHeight * index,
      size: fontSize,
      font: input.font,
      color: rgb(textColor.r, textColor.g, textColor.b),
      opacity: clampOpacity(input.annotation.style.opacity),
    });
  });
}

export async function exportAnnotatedPdf(input: {
  readonly originalBytes: Uint8Array;
  readonly annotations: readonly AnnotationLayer[];
  readonly pages: readonly AnnotatePageSnapshot[];
}): Promise<Blob> {
  const pdfDocument = await PDFDocument.load(input.originalBytes.slice(), {
    ignoreEncryption: true,
  });
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const geometryMap = getGeometryMap(input.pages);

  for (const annotation of input.annotations) {
    const geometry = geometryMap.get(annotation.pageIndex);

    if (!geometry) {
      continue;
    }

    const page = pdfDocument.getPage(annotation.pageIndex);

    switch (annotation.kind) {
      case "highlighter-stroke":
      case "ink-stroke":
        drawStrokeAnnotation({ page, geometry, annotation });
        break;
      case "rectangle":
      case "ellipse":
        drawShapeBoxAnnotation({ page, geometry, annotation });
        break;
      case "line":
      case "arrow":
        drawShapeLineAnnotation({ page, geometry, annotation });
        break;
      case "text-note":
        drawTextNoteAnnotation({ page, geometry, annotation, font });
        break;
      default:
        break;
    }
  }

  const bytes = await pdfDocument.save({
    useObjectStreams: true,
    addDefaultPage: false,
  });

  return new Blob([bytes], {
    type: "application/pdf",
  });
}
