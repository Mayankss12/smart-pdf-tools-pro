import * as pdfjs from "pdfjs-dist";
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
  degrees,
  type PDFPage,
} from "pdf-lib";

import { createZipBlob } from "@/lib/browser-zip";
import { copyPdfDocumentMetadata, readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import {
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  safeFileBaseName,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { PdfEngineError } from "@/lib/pdf-errors";
import { removePngPredictor } from "@/lib/pdf-image-downsample";
import { copyPdfOutlines } from "@/lib/pdf-outline";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

if (typeof window !== "undefined") configurePdfJsWorker(pdfjs);

const name = (value: string) => PDFName.of(value);
const MAX_RENDER_PIXELS = 28_000_000;
const MAX_EXTRACT_PIXELS = 28_000_000;

export const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89, label: "A4" },
  letter: { width: 612, height: 792, label: "US Letter" },
  legal: { width: 612, height: 1008, label: "US Legal" },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;
export type NUpCount = 2 | 4 | 6 | 9;
export type MixOrder = "first" | "second";

function assertPageCount(count: number) {
  if (count < 1) throw new PdfEngineError("PROCESSING_FAILED", "The PDF has no pages.");
}

async function saveVerifiedPdf(pdf: PDFDocument, originalSize: number, fileName: string, expectedPages: number) {
  const result = await savePdfResult(pdf, originalSize, fileName);
  let reader: Awaited<ReturnType<typeof pdfjs.getDocument>["promise"]> | undefined;
  try {
    reader = await pdfjs.getDocument({ data: new Uint8Array(await result.blob.arrayBuffer()) }).promise;
    if (reader.numPages !== expectedPages) throw new Error("Output page count changed unexpectedly.");
    for (let pageNumber = 1; pageNumber <= expectedPages; pageNumber += 1) {
      const page = await reader.getPage(pageNumber);
      page.cleanup();
    }
  } catch {
    throw new PdfEngineError("PROCESSING_FAILED", "The exported PDF could not be reopened safely. No download was started.");
  } finally { await reader?.destroy(); }
  return result;
}

function normalizedRotation(page: PDFPage) {
  return ((page.getRotation().angle % 360) + 360) % 360;
}

export async function resizePdfPages(
  file: File,
  options: { readonly width: number; readonly height: number },
): Promise<PdfProcessingResult> {
  const { width, height } = options;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 72 || height < 72 || width > 2000 || height > 2000) {
    throw new PdfEngineError("PROCESSING_FAILED", "Page width and height must be between 72 and 2000 points.");
  }
  const pdf = await loadPdfDocument(file);
  assertPageCount(pdf.getPageCount());
  for (const page of pdf.getPages()) {
    const scale = Math.min(width / page.getWidth(), height / page.getHeight());
    page.scale(scale, scale); // Includes annotations; content stays vector/selectable.
    page.setSize(width, height); // Any remaining whitespace is on the top and right.
  }
  return saveVerifiedPdf(pdf, file.size, createPdfFileName("resized", file.name), pdf.getPageCount());
}

export async function nUpPdfPages(
  file: File,
  options: { readonly count: NUpCount; readonly size: PageSizeKey; readonly landscape: boolean },
): Promise<PdfProcessingResult> {
  const layout: Record<NUpCount, readonly [number, number]> = {
    2: [2, 1], 4: [2, 2], 6: [3, 2], 9: [3, 3],
  };
  const dimensions = PAGE_SIZES[options.size];
  const grid = layout[options.count];
  if (!dimensions || !grid) throw new PdfEngineError("PROCESSING_FAILED", "Choose a valid layout and paper size.");
  const input = await loadPdfDocument(file);
  assertPageCount(input.getPageCount());
  const output = await PDFDocument.create();
  copyPdfDocumentMetadata(input, output);
  const embedded = await output.embedPages(input.getPages());
  const [columns, rows] = grid;
  const sheetWidth = options.landscape ? dimensions.height : dimensions.width;
  const sheetHeight = options.landscape ? dimensions.width : dimensions.height;
  const margin = 18;
  const gap = 10;
  const cellWidth = (sheetWidth - 2 * margin - gap * (columns - 1)) / columns;
  const cellHeight = (sheetHeight - 2 * margin - gap * (rows - 1)) / rows;

  for (let first = 0; first < embedded.length; first += options.count) {
    const sheet = output.addPage([sheetWidth, sheetHeight]);
    for (let slot = 0; slot < options.count && first + slot < embedded.length; slot += 1) {
      const source = input.getPage(first + slot);
      const image = embedded[first + slot];
      const rotation = normalizedRotation(source);
      const sideways = rotation === 90 || rotation === 270;
      const visualWidth = sideways ? image.height : image.width;
      const visualHeight = sideways ? image.width : image.height;
      const scale = Math.min(cellWidth / visualWidth, cellHeight / visualHeight);
      const drawnWidth = image.width * scale;
      const drawnHeight = image.height * scale;
      const occupiedWidth = visualWidth * scale;
      const occupiedHeight = visualHeight * scale;
      const column = slot % columns;
      const row = Math.floor(slot / columns);
      const left = margin + column * (cellWidth + gap) + (cellWidth - occupiedWidth) / 2;
      const bottom = sheetHeight - margin - (row + 1) * cellHeight - row * gap + (cellHeight - occupiedHeight) / 2;
      // A page's /Rotate value is clockwise in viewer coordinates, while
      // drawPage rotations are counter-clockwise in PDF page coordinates.
      const x = left + (rotation === 180 || rotation === 270 ? occupiedWidth : 0);
      const y = bottom + (rotation === 90 || rotation === 180 ? occupiedHeight : 0);
      sheet.drawPage(image, { x, y, width: drawnWidth, height: drawnHeight, rotate: degrees(-rotation) });
    }
  }
  return saveVerifiedPdf(output, file.size, createPdfFileName("n-up", file.name), Math.ceil(input.getPageCount() / options.count));
}

export async function alternateMixPdfPages(
  first: File,
  second: File,
  options: { readonly startWith: MixOrder; readonly reverseSecond: boolean },
): Promise<PdfProcessingResult> {
  const [firstPdf, secondPdf] = await Promise.all([loadPdfDocument(first), loadPdfDocument(second)]);
  assertPageCount(firstPdf.getPageCount());
  assertPageCount(secondPdf.getPageCount());
  const output = await PDFDocument.create();
  copyPdfDocumentMetadata(firstPdf, output);
  const firstIndices = firstPdf.getPageIndices();
  const secondIndices = secondPdf.getPageIndices();
  if (options.reverseSecond) secondIndices.reverse();
  const [firstPages, secondPages] = await Promise.all([
    output.copyPages(firstPdf, firstIndices),
    output.copyPages(secondPdf, secondIndices),
  ]);
  const primary = options.startWith === "first" ? firstPages : secondPages;
  const secondary = options.startWith === "first" ? secondPages : firstPages;
  for (let i = 0; i < Math.max(primary.length, secondary.length); i += 1) {
    if (i < primary.length) output.addPage(primary[i]);
    if (i < secondary.length) output.addPage(secondary[i]);
  }
  copyPdfOutlines(output, [
    { source: firstPdf, sourcePageIndices: firstIndices, copiedPages: firstPages },
    { source: secondPdf, sourcePageIndices: secondIndices, copiedPages: secondPages },
  ]);
  return saveVerifiedPdf(output, first.size + second.size, "PDFMantra-alternate-mix.pdf", firstPdf.getPageCount() + secondPdf.getPageCount());
}

export function grayscaleRgba(pixels: Uint8ClampedArray) {
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const gray = Math.round(0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }
  return pixels;
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image encoding failed.")), type, quality));
}

export async function grayscalePdfPages(file: File, dpi: 120 | 150 = 150): Promise<PdfProcessingResult> {
  if (typeof document === "undefined") throw new PdfEngineError("PROCESSING_FAILED", "Grayscale conversion requires a browser.");
  const bytes = await readValidatedPdfBytes(file);
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  const output = await PDFDocument.create();
  try {
    assertPageCount(pdf.numPages);
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      try {
        const viewport = page.getViewport({ scale: dpi / 72 });
        const width = Math.ceil(viewport.width);
        const height = Math.ceil(viewport.height);
        if (width * height > MAX_RENDER_PIXELS) {
          throw new PdfEngineError("PROCESSING_FAILED", `Page ${pageNumber} is too large for safe browser rendering. Try 120 DPI.`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas is unavailable.");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        await page.render({ canvasContext: context, viewport }).promise;
        const image = context.getImageData(0, 0, width, height);
        grayscaleRgba(image.data);
        context.putImageData(image, 0, 0);
        const jpeg = await canvasBlob(canvas, "image/jpeg", 0.94);
        const embedded = await output.embedJpg(await jpeg.arrayBuffer());
        const sheet = output.addPage([width * 72 / dpi, height * 72 / dpi]);
        sheet.drawImage(embedded, { x: 0, y: 0, width: sheet.getWidth(), height: sheet.getHeight() });
        canvas.width = 0;
        canvas.height = 0;
      } finally {
        page.cleanup();
      }
    }
    return saveVerifiedPdf(output, file.size, createPdfFileName("grayscale", file.name), pdf.numPages);
  } finally {
    await pdf.destroy();
  }
}

export type ExtractedImage = { readonly blob: Blob; readonly fileName: string; readonly width: number; readonly height: number };

async function encodePng(width: number, height: number, rgba: Uint8ClampedArray): Promise<Blob> {
  if (typeof document === "undefined") throw new Error("PNG encoding requires a browser.");
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  context.putImageData(new ImageData(rgba, width, height), 0, 0);
  const blob = await canvasBlob(canvas, "image/png");
  canvas.width = 0;
  canvas.height = 0;
  return blob;
}

function getFilter(dict: PDFDict) {
  const filter = dict.lookup(name("Filter"));
  return filter instanceof PDFName ? filter.toString() : null;
}

function getSupportedImage(stream: PDFRawStream): { width: number; height: number; kind: "jpeg" | "pixels"; rgba?: Uint8ClampedArray } | null {
  const dict = stream.dict;
  const width = dict.lookup(name("Width"));
  const height = dict.lookup(name("Height"));
  const bits = dict.lookup(name("BitsPerComponent"));
  if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber) || !(bits instanceof PDFNumber) || bits.asNumber() !== 8) return null;
  const w = width.asNumber();
  const h = height.asNumber();
  if (!Number.isSafeInteger(w) || !Number.isSafeInteger(h) || w < 1 || h < 1 || w * h > MAX_EXTRACT_PIXELS) return null;
  if (dict.lookup(name("SMask")) || dict.lookup(name("Mask")) || dict.lookup(name("Decode"))) return null;
  const colorSpace = dict.lookup(name("ColorSpace"));
  const components = colorSpace === name("DeviceRGB") ? 3 : colorSpace === name("DeviceGray") ? 1 : null;
  if (!components) return null;
  const filter = getFilter(dict);
  if (filter === "/DCTDecode") {
    const jpeg = stream.getContents();
    if (jpeg.length < 4 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[jpeg.length - 2] !== 0xff || jpeg[jpeg.length - 1] !== 0xd9) return null;
    return { width: w, height: h, kind: "jpeg" };
  }
  if (filter !== "/FlateDecode") return null;
  const parms = dict.lookupMaybe(name("DecodeParms"), PDFDict);
  const predictor = parms?.lookup(name("Predictor"));
  const predictorValue = predictor instanceof PDFNumber ? predictor.asNumber() : 1;
  if (predictorValue !== 1 && (predictorValue < 10 || predictorValue > 15)) return null;
  let samples = decodePDFRawStream(stream).decode();
  if (predictorValue >= 10) samples = removePngPredictor(samples, w, h, components);
  if (samples.length < w * h * components) return null;
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let pixel = 0; pixel < w * h; pixel += 1) {
    const offset = pixel * components;
    const value = pixel * 4;
    rgba[value] = samples[offset];
    rgba[value + 1] = samples[offset + (components === 3 ? 1 : 0)];
    rgba[value + 2] = samples[offset + (components === 3 ? 2 : 0)];
    rgba[value + 3] = 255;
  }
  return { width: w, height: h, kind: "pixels", rgba };
}

export async function extractEmbeddedImages(file: File, pngEncoder: typeof encodePng = encodePng): Promise<{ blob: Blob; fileName: string; count: number; skipped: number; images: readonly ExtractedImage[] }> {
  const pdf = await loadPdfDocument(file);
  assertPageCount(pdf.getPageCount());
  const seen = new Set<string>();
  const images: ExtractedImage[] = [];
  let skipped = 0;

  async function visit(resources: PDFDict | undefined, depth: number) {
    if (!resources || depth > 8) return;
    const xObjects = resources.lookupMaybe(name("XObject"), PDFDict);
    if (!xObjects) return;
    for (const [, object] of xObjects.entries()) {
      if (!(object instanceof PDFRef) || seen.has(object.toString())) continue;
      seen.add(object.toString());
      const stream = pdf.context.lookup(object);
      if (!(stream instanceof PDFRawStream)) continue;
      const subtype = stream.dict.lookup(name("Subtype"));
      if (subtype === name("Form")) {
        await visit(stream.dict.lookupMaybe(name("Resources"), PDFDict), depth + 1);
      } else if (subtype === name("Image")) {
        try {
          const candidate = getSupportedImage(stream);
          if (!candidate) { skipped += 1; continue; }
          const blob = candidate.kind === "jpeg"
            ? new Blob([stream.getContents()], { type: "image/jpeg" })
            : await pngEncoder(candidate.width, candidate.height, candidate.rgba!);
          images.push({
            blob,
            fileName: `image-${String(images.length + 1).padStart(3, "0")}.${candidate.kind === "jpeg" ? "jpg" : "png"}`,
            width: candidate.width,
            height: candidate.height,
          });
        } catch { skipped += 1; }
      }
    }
  }
  for (const page of pdf.getPages()) await visit(page.node.Resources(), 0);
  if (images.length === 0) throw new PdfEngineError("PROCESSING_FAILED", "No supported embedded images were found. JPEG and 8-bit RGB/gray Flate images are supported; complex masks and color spaces are skipped.");
  const blob = await createZipBlob(images.map((image) => ({ fileName: image.fileName, blob: image.blob })));
  return { blob, fileName: `PDFMantra-extracted-images-${safeFileBaseName(file.name)}.zip`, count: images.length, skipped, images };
}
