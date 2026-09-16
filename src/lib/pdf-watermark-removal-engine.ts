import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFRawStream,
  PDFStream,
  decodePDFRawStream,
  type PDFPage,
} from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

const TAG_START = new TextEncoder().encode("/PDFMantraWatermark BMC");
const TAG_END = new TextEncoder().encode("EMC");
const CONTENTS = PDFName.of("Contents");
const ANNOTS = PDFName.of("Annots");
const SUBTYPE = PDFName.of("Subtype");
const WATERMARK = "/Watermark";

export type RemovableWatermarkInspection = {
  readonly pageCount: number;
  readonly taggedContentBlocks: number;
  readonly watermarkAnnotations: number;
  readonly compatibleMarks: number;
};

export type WatermarkRemovalResult = {
  readonly result: PdfProcessingResult;
  readonly removedMarks: number;
  readonly removedTaggedContentBlocks: number;
  readonly removedWatermarkAnnotations: number;
};

function findSequence(bytes: Uint8Array, needle: Uint8Array, fromIndex = 0) {
  outer: for (let index = fromIndex; index <= bytes.length - needle.length; index += 1) {
    for (let offset = 0; offset < needle.length; offset += 1) {
      if (bytes[index + offset] !== needle[offset]) continue outer;
    }
    return index;
  }
  return -1;
}

function isPdfWhitespace(byte: number | undefined) {
  return byte === undefined || byte === 0 || byte === 9 || byte === 10 || byte === 12 || byte === 13 || byte === 32;
}

function findEndMarkedContent(bytes: Uint8Array, fromIndex: number) {
  let cursor = fromIndex;
  while (cursor < bytes.length) {
    const index = findSequence(bytes, TAG_END, cursor);
    if (index < 0) return -1;
    if (
      isPdfWhitespace(bytes[index - 1]) &&
      isPdfWhitespace(bytes[index + TAG_END.length])
    ) {
      return index;
    }
    cursor = index + TAG_END.length;
  }
  return -1;
}

function countTaggedSections(bytes: Uint8Array) {
  let count = 0;
  let cursor = 0;
  while (cursor < bytes.length) {
    const start = findSequence(bytes, TAG_START, cursor);
    if (start < 0) break;
    const end = findEndMarkedContent(bytes, start + TAG_START.length);
    if (end < 0) break;
    count += 1;
    cursor = end + TAG_END.length;
  }
  return count;
}

function removeTaggedSections(bytes: Uint8Array) {
  const chunks: Uint8Array[] = [];
  let removed = 0;
  let cursor = 0;

  while (cursor < bytes.length) {
    const start = findSequence(bytes, TAG_START, cursor);
    if (start < 0) break;
    const end = findEndMarkedContent(bytes, start + TAG_START.length);
    if (end < 0) break;

    chunks.push(bytes.slice(cursor, start));
    cursor = end + TAG_END.length;
    while (cursor < bytes.length && isPdfWhitespace(bytes[cursor])) cursor += 1;
    removed += 1;
  }

  if (!removed) return { bytes, removed };
  chunks.push(bytes.slice(cursor));
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return { bytes: output, removed };
}

function getContentStreams(page: PDFPage) {
  const contents = page.node.lookupMaybe(CONTENTS, PDFArray);
  if (contents) {
    return Array.from({ length: contents.size() }, (_, index) => ({
      array: contents,
      index,
      stream: contents.lookupMaybe(index, PDFRawStream),
    })).filter((entry): entry is typeof entry & { stream: PDFRawStream } => Boolean(entry.stream));
  }

  const stream = page.node.lookupMaybe(CONTENTS, PDFStream);
  return stream instanceof PDFRawStream ? [{ array: null, index: 0, stream }] : [];
}

function countWatermarkAnnotations(page: PDFPage) {
  const annotations = page.node.lookupMaybe(ANNOTS, PDFArray);
  if (!annotations) return 0;
  let count = 0;
  for (let index = 0; index < annotations.size(); index += 1) {
    const annotation = annotations.lookupMaybe(index, PDFDict);
    if (annotation?.lookupMaybe(SUBTYPE, PDFName)?.toString() === WATERMARK) count += 1;
  }
  return count;
}

export async function inspectRemovableWatermarks(
  file: File,
): Promise<RemovableWatermarkInspection> {
  const pdf = await loadPdfDocument(file);
  let taggedContentBlocks = 0;
  let watermarkAnnotations = 0;

  for (const page of pdf.getPages()) {
    for (const { stream } of getContentStreams(page)) {
      taggedContentBlocks += countTaggedSections(decodePDFRawStream(stream).decode());
    }
    watermarkAnnotations += countWatermarkAnnotations(page);
  }

  return {
    pageCount: pdf.getPageCount(),
    taggedContentBlocks,
    watermarkAnnotations,
    compatibleMarks: taggedContentBlocks + watermarkAnnotations,
  };
}

export async function removeCompatibleWatermarks(
  file: File,
  options: {
    readonly authorized: boolean;
    readonly onProgress?: (progress: { readonly completed: number; readonly total: number }) => void;
  },
): Promise<WatermarkRemovalResult> {
  if (!options.authorized) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "Confirm that you own this PDF or are authorized to remove its watermark.",
    );
  }

  const pdf = await loadPdfDocument(file);
  const pages = pdf.getPages();
  let removedTaggedContentBlocks = 0;
  let removedWatermarkAnnotations = 0;

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
    const page = pages[pageIndex];
    for (const { array, index, stream } of getContentStreams(page)) {
      const removal = removeTaggedSections(decodePDFRawStream(stream).decode());
      if (!removal.removed) continue;
      const replacement = pdf.context.register(pdf.context.flateStream(removal.bytes));
      if (array) array.set(index, replacement);
      else page.node.set(CONTENTS, replacement);
      removedTaggedContentBlocks += removal.removed;
    }

    const annotations = page.node.lookupMaybe(ANNOTS, PDFArray);
    if (annotations) {
      for (let index = annotations.size() - 1; index >= 0; index -= 1) {
        const annotation = annotations.lookupMaybe(index, PDFDict);
        if (annotation?.lookupMaybe(SUBTYPE, PDFName)?.toString() === WATERMARK) {
          annotations.remove(index);
          removedWatermarkAnnotations += 1;
        }
      }
    }
    options.onProgress?.({ completed: pageIndex + 1, total: pages.length });
  }

  const removedMarks = removedTaggedContentBlocks + removedWatermarkAnnotations;
  if (!removedMarks) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "No compatible removable watermark was found. Flattened page artwork cannot be safely removed automatically.",
    );
  }

  return {
    result: await savePdfResult(
      pdf,
      file.size,
      createPdfFileName("watermark-removed", file.name),
    ),
    removedMarks,
    removedTaggedContentBlocks,
    removedWatermarkAnnotations,
  };
}
