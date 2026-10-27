import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as pdfjs from "pdfjs-dist";
import { degrees, PDFDocument } from "pdf-lib";

import {
  exportEditorPdfBytes,
} from "../src/lib/pdf-tools/editor-export-engine.ts";
import { getEditorLinkPdfRect } from "../src/lib/pdf-tools/editor-link-engine.ts";
import { getEditorPageGeometry } from "../src/lib/pdf-tools/editor-page-geometry.ts";
import {
  transformOcrWordsToPdfSpace,
} from "../src/lib/pdf-text-overlay.ts";

const rotations = [0, 90, 180, 270];
const source = await PDFDocument.create();

for (const rotation of rotations) {
  const page = source.addPage([420, 300]);
  page.setRotation(degrees(rotation));
}

const sourceBytes = await source.save();
const [latinFontBytes, devanagariFontBytes] = await Promise.all([
  readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
  readFile(
    new URL(
      "../public/fonts/NotoSansDevanagari-Regular.ttf",
      import.meta.url,
    ),
  ),
]);
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const searchableOcrResult = {
  fileName: "page-1.png",
  imageData: { width: 420, height: 300 },
  words: [
    {
      text: "SEARCHABLE-OCR-FIXTURE",
      confidence: 99,
      bbox: { x0: 20, y0: 240, x1: 240, y1: 272 },
    },
  ],
  rawWords: [],
  averageConfidence: 99,
  language: "eng",
  workerLanguage: "eng",
  detectedLanguage: "english",
  languageBreakdown: { english: 20, hindi: 0, arabic: 0, other: 0 },
  languageSymbol: "EN",
  fullText: "SEARCHABLE-OCR-FIXTURE",
  preprocessing: {
    sourceWidth: 420,
    sourceHeight: 300,
    outputWidth: 420,
    outputHeight: 300,
    skewAngle: 0,
    deskewed: false,
    contrastEnhanced: false,
    sharpened: false,
    denoised: false,
    binarized: false,
    mode: "auto",
  },
};
const objects = rotations.map((rotation, index) => ({
  id: `rotation-${rotation}`,
  type: "text",
  pageNumber: index + 1,
  box: { x: 24, y: 24, width: 190, height: 54 },
  data: {
    text:
      index === 0
        ? 'Café — “quote” • 你好 😀 नमस्ते'
        : `ASCII rotation ${rotation}`,
    fontSize: 14,
    opacity: 1,
  },
}));

objects.push(
  {
    id: "highlight",
    type: "highlight",
    pageNumber: 1,
    box: { x: 24, y: 90, width: 120, height: 18 },
    data: { backgroundColor: "#fde047", opacity: 0.45 },
  },
  {
    id: "whiteout",
    type: "whiteout",
    pageNumber: 1,
    box: { x: 154, y: 90, width: 70, height: 18 },
    data: { opacity: 1 },
  },
  {
    id: "image",
    type: "image",
    pageNumber: 1,
    box: { x: 24, y: 122, width: 44, height: 44 },
    data: { imageDataUrl: pixel, opacity: 1 },
  },
  {
    id: "signature",
    type: "signature",
    pageNumber: 1,
    box: { x: 78, y: 122, width: 70, height: 34 },
    data: { imageDataUrl: pixel, opacity: 1 },
  },
  {
    id: "stamp",
    type: "stamp",
    pageNumber: 1,
    box: { x: 158, y: 122, width: 54, height: 34 },
    data: { imageDataUrl: pixel, opacity: 1 },
  },
  {
    id: "generated-stamp",
    type: "stamp",
    pageNumber: 1,
    box: { x: 224, y: 122, width: 168, height: 48 },
    data: {
      stampLabel: "AUTHORIZED · Authorized: Mayank Singh · 11/09/2026",
      stampPreset: "Authorized",
      stampFormat: "pill",
      stampAuthorizedName: "Mayank Singh",
      stampDate: "2026-09-11",
      stampColor: "#166534",
      opacity: 0.88,
    },
  },
  {
    id: "shape",
    type: "shape",
    pageNumber: 1,
    box: { x: 390, y: 174, width: 60, height: 44 },
    data: {
      shapeType: "arrow",
      lineStart: { x: 0, y: 0 },
      lineEnd: { x: 60, y: 44 },
      strokeColor: "#7c3aed",
      strokeWidth: 3,
      opacity: 1,
    },
  },
  {
    id: "draw",
    type: "draw",
    pageNumber: 1,
    box: { x: 24, y: 180, width: 100, height: 42 },
    data: {
      pathData: "M 0 20 L 30 0 L 60 30 L 100 10",
      drawWidth: 100,
      drawHeight: 42,
      strokeColor: "#111827",
      strokeWidth: 2,
      opacity: 1,
    },
  },
  {
    id: "note",
    type: "note",
    pageNumber: 1,
    box: { x: 136, y: 174, width: 130, height: 86 },
    data: {
      text: "कखग",
      fontSize: 12,
      backgroundColor: "#fef3c7",
      opacity: 1,
    },
  },
  {
    id: "transparent-text",
    type: "text",
    pageNumber: 1,
    box: { x: 280, y: 24, width: 100, height: 30 },
    data: { text: "INVISIBLE", opacity: 0 },
  },
);

const exportedBytes = await exportEditorPdfBytes({
  fileBytes: sourceBytes,
  objects,
  ocrPages: [{ pageNumber: 1, result: searchableOcrResult }],
  unicodeFontBytes: {
    latin: new Uint8Array(latinFontBytes),
    devanagari: new Uint8Array(devanagariFontBytes),
  },
});
const exported = await PDFDocument.load(exportedBytes);

assert.equal(exported.getPageCount(), 4);
assert.deepEqual(
  exported.getPages().map((page) => page.getRotation().angle),
  rotations,
);
assert.ok(exportedBytes.length > sourceBytes.length);

async function readPageTextAndAnnotations(bytes, pageNumber) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  try {
    const page = await pdf.getPage(pageNumber);
    try {
      const textContent = await page.getTextContent();
      return {
        text: textContent.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" "),
        annotations: await page.getAnnotations(),
      };
    } finally {
      page.cleanup();
    }
  } finally {
    await pdf.destroy();
  }
}

const {
  text: firstPageText,
  annotations: firstPageAnnotations,
} = await readPageTextAndAnnotations(exportedBytes, 1);
assert.match(firstPageText, /Café/);
assert.match(firstPageText, /नमस्ते/);

// Highlights, notes, shapes and ink stay editable as real PDF annotations.
const markupBySubtype = new Map(
  firstPageAnnotations.map((annotation) => [annotation.subtype, annotation]),
);
for (const subtype of ["Highlight", "FreeText", "Line", "Ink"]) {
  const annotation = markupBySubtype.get(subtype);
  assert.ok(annotation, `${subtype} annotation is exported`);
  assert.equal(annotation.hasAppearance, true, `${subtype} keeps its appearance`);
  assert.equal(annotation.titleObj?.str, "PDFMantra");
}
assert.equal(markupBySubtype.get("FreeText").contentsObj.str, "कखग");
assert.equal(markupBySubtype.get("Highlight").quadPoints.length, 8);
assert.doesNotMatch(firstPageText, /कखग/);

const rotatedHighlightBytes = await exportEditorPdfBytes({
  fileBytes: sourceBytes,
  objects: [{
    id: "rotated-highlight",
    type: "highlight",
    pageNumber: 2,
    box: { x: 30, y: 40, width: 100, height: 20 },
    data: { backgroundColor: "#fde047", opacity: 0.45 },
  }, {
    id: "overhanging-note",
    type: "note",
    pageNumber: 2,
    box: { x: 250, y: 120, width: 140, height: 80 },
    data: { text: "Edge note", fontSize: 12, opacity: 1 },
  }],
});
const [rotatedHighlight, overhangingNote] = (
  await readPageTextAndAnnotations(rotatedHighlightBytes, 2)
).annotations;
// The note is pulled back onto the 300pt-wide viewport, as the flattened export draws it.
assert.deepEqual(Array.from(overhangingNote.rect, Math.round), [119, 159, 201, 300]);
// Page 2 is 420×300 rotated 90°: bottom-up viewport (x, y) lands at PDF (420 - y, x),
// matching the link annotation geometry.
assert.deepEqual(
  Array.from(rotatedHighlight.rect, Math.round),
  getEditorLinkPdfRect(
    { x: 30, y: 40, width: 100, height: 20 },
    getEditorPageGeometry((await PDFDocument.load(sourceBytes)).getPage(1)),
  ).map(Math.round),
);
assert.deepEqual(Array.from(rotatedHighlight.rect, Math.round), [40, 30, 60, 130]);

const flattenedBytes = await exportEditorPdfBytes({
  fileBytes: sourceBytes,
  objects,
  unicodeFontBytes: {
    latin: new Uint8Array(latinFontBytes),
    devanagari: new Uint8Array(devanagariFontBytes),
  },
  markupMode: "flatten",
});
const flattenedFirstPage = await readPageTextAndAnnotations(flattenedBytes, 1);
assert.match(flattenedFirstPage.text, /कखग/);
assert.equal(flattenedFirstPage.annotations.length, 0);
assert.match(firstPageText, /SEARCHABLE-OCR-FIXTURE/);
assert.match(firstPageText, /AUTHORIZED/);
assert.match(firstPageText, /Mayank\s+Singh/);
assert.doesNotMatch(firstPageText, /你好|😀/);

const transformedWords = transformOcrWordsToPdfSpace(
  [
    {
      text: "searchable",
      confidence: 99,
      bbox: { x0: 10, y0: 20, x1: 110, y1: 50 },
    },
  ],
  { width: 200, height: 100 },
  {
    pageIndex: 0,
    imageWidth: 200,
    imageHeight: 100,
    drawX: 0,
    drawY: 0,
    drawWidth: 400,
    drawHeight: 200,
    pageWidth: 400,
    pageHeight: 200,
  },
);

const [transformedWord] = transformedWords;
assert.equal(transformedWord.text, "searchable");
assert.equal(transformedWord.confidence, 99);
assert.equal(transformedWord.x, 20);
assert.equal(transformedWord.y, 100);
assert.equal(transformedWord.width, 200);
assert.equal(transformedWord.height, 60);
assert.ok(Math.abs(transformedWord.fontSize - 49.2) < 0.0001);

console.log(
  JSON.stringify({
    rotations,
    objectTypes: [...new Set(objects.map((object) => object.type))],
    unicodeText: "devanagari passed",
    unicodeNote: "devanagari passed",
    editableMarkupAnnotations: "passed",
    rotatedAnnotationGeometry: "passed",
    flattenedMarkupMode: "passed",
    unsupportedUnicodeFallback: "passed",
    asciiText: "passed",
    ocrPlacement: "passed",
    searchablePdfTextLayer: "passed",
    searchablePdfOfflineReopen: "passed",
    generatedAuthorizedStamp: "passed",
    outputBytes: exportedBytes.length,
  }),
);
