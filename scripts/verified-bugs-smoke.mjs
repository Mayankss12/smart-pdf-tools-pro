import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";

import {
  deduplicateFindRegions,
  findNormalizedSubstringRanges,
  getPdfSubstringBox,
} from "../src/lib/editor/editor-find-geometry.ts";
import { rotateEditorOcrResult } from "../src/lib/editor/editor-ocr-rotation.ts";
import {
  createEditorPageNumberObjects,
  DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS,
} from "../src/lib/editor/editor-page-numbering.ts";
import {
  remapObjectsAfterPageInsertion,
  remapObjectsAfterPageReorder,
} from "../src/lib/editor/editor-page-object-mapping.ts";
import { ThumbnailRenderQueue } from "../src/lib/editor/thumbnail-render-queue.ts";
import {
  MAX_IMAGE_QUEUE_COUNT,
  selectImageQueueCandidates,
} from "../src/lib/conversions/image-route-policy.ts";
import { getPdfDocumentLoadErrorMessage } from "../src/lib/conversions/pdf-load-errors.ts";
import {
  addEditorBlankPage,
  reorderEditorPages,
  rotateEditorPage,
} from "../src/lib/pdf-tools/editor-page-management.ts";
import { getEditorTextClipBox } from "../src/lib/pdf-tools/editor-rich-text-engine.ts";

const repeated = findNormalizedSubstringRanges("alpha alpha alpha", "alpha");
assert.deepEqual(repeated, [
  { start: 0, length: 5 },
  { start: 6, length: 5 },
  { start: 12, length: 5 },
]);
assert.equal(findNormalizedSubstringRanges("नमस्ते दुनिया", "नमस्ते").length, 1);
const substringBox = getPdfSubstringBox({
  text: "prefix MATCH suffix",
  start: 7,
  length: 5,
  x: 10,
  y: 20,
  width: 180,
  height: 16,
  direction: "ltr",
});
assert.ok(substringBox.x > 10);
assert.ok(substringBox.width < 180);
assert.equal(
  deduplicateFindRegions([
    { pageNumber: 1, source: "pdf", box: { x: 10, y: 10, width: 40, height: 12 } },
    { pageNumber: 1, source: "ocr", box: { x: 11, y: 10, width: 39, height: 12 } },
  ]).length,
  1,
);

const ocrResult = {
  fileName: "page.png",
  imageData: { width: 100, height: 200 },
  words: [{ text: "word", confidence: 91, bbox: { x0: 10, y0: 20, x1: 30, y1: 60 } }],
  rawWords: [{ text: "word", confidence: 91, bbox: { x0: 10, y0: 20, x1: 30, y1: 60 } }],
  averageConfidence: 91,
  language: "English",
  workerLanguage: "eng",
  detectedLanguage: "english",
  languageBreakdown: { english: 1, hindi: 0, arabic: 0, other: 0 },
  languageSymbol: "EN",
  fullText: "word",
};
const rotatedOcr = rotateEditorOcrResult(ocrResult, "clockwise");
assert.deepEqual(rotatedOcr.imageData, { width: 200, height: 100 });
assert.deepEqual(rotatedOcr.words[0].bbox, { x0: 140, y0: 10, x1: 180, y1: 30 });
assert.equal(rotatedOcr.words[0].text, "word");
assert.equal(rotatedOcr.words[0].confidence, 91);

const sourcePdf = await PDFDocument.create();
sourcePdf.addPage([300, 400]);
sourcePdf.addPage([500, 600]);
const sourceBytes = await sourcePdf.save();
const added = await addEditorBlankPage({
  fileBytes: sourceBytes,
  currentPageNumber: 1,
  insertion: "after",
  size: "same",
});
assert.equal((await PDFDocument.load(added.bytes)).getPageCount(), 3);
assert.equal((await PDFDocument.load(sourceBytes)).getPageCount(), 2);
const reordered = await reorderEditorPages({
  fileBytes: added.bytes,
  pageOrder: [3, 1, 2],
  activePageNumber: 2,
});
assert.equal(reordered.activePageNumber, 3);
const rotated = await rotateEditorPage({
  fileBytes: reordered.bytes,
  pageNumber: 1,
  direction: "clockwise",
});
assert.equal(rotated.oldViewportWidth, rotated.newViewportHeight);
assert.equal(rotated.oldViewportHeight, rotated.newViewportWidth);

const baseObject = {
  id: "ordinary",
  type: "text",
  pageNumber: 2,
  box: { x: 20, y: 20, width: 80, height: 24 },
  data: { text: "ordinary" },
  locked: false,
};
assert.equal(remapObjectsAfterPageInsertion([baseObject], 2)[0].pageNumber, 3);
assert.equal(remapObjectsAfterPageReorder([baseObject], [2, 1])[0].pageNumber, 1);
const numbered = createEditorPageNumberObjects({
  settings: { ...DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS, prefix: "P-" },
  pageSizes: [
    { pageNumber: 1, width: 300, height: 400 },
    { pageNumber: 2, width: 500, height: 600 },
    { pageNumber: 3, width: 300, height: 400 },
  ],
  setId: "managed",
});
assert.deepEqual(numbered.map((object) => object.data.text), ["P-1", "P-2", "P-3"]);
assert.deepEqual(numbered.map((object) => object.pageNumber), [1, 2, 3]);

assert.deepEqual(
  getEditorTextClipBox(
    { x: 20, y: 30, width: 100, height: 40 },
    { viewportWidth: 300, viewportHeight: 400, mediaBoxWidth: 300, mediaBoxHeight: 400, rotation: 0 },
  ),
  { x: 20, y: 330, width: 100, height: 40 },
);

const jpgFiles = Array.from(
  { length: MAX_IMAGE_QUEUE_COUNT + 1 },
  (_, index) => new File(["x"], `${index}.jpg`, { type: "image/jpeg" }),
);
assert.equal(
  selectImageQueueCandidates({ files: jpgFiles.slice(0, 80), source: "jpg", currentCount: 0 }).accepted.length,
  80,
);
const overLimit = selectImageQueueCandidates({
  files: jpgFiles,
  source: "jpg",
  currentCount: 0,
});
assert.equal(overLimit.accepted.length, 80);
assert.equal(overLimit.queueLimitCount, 1);
const batchIntoQueue = selectImageQueueCandidates({
  files: jpgFiles.slice(0, 5),
  source: "jpg",
  currentCount: 78,
});
assert.equal(batchIntoQueue.accepted.length, 2);
assert.equal(batchIntoQueue.queueLimitCount, 3);
assert.equal(
  selectImageQueueCandidates({
    files: [new File(["x"], "wrong.png", { type: "image/png" })],
    source: "jpg",
    currentCount: 0,
  }).wrongFormatCount,
  1,
);

assert.match(
  getPdfDocumentLoadErrorMessage({ name: "InvalidPDFException" }),
  /damaged or invalid/i,
);
assert.match(
  getPdfDocumentLoadErrorMessage({ name: "PasswordException" }),
  /encrypted/i,
);

const queue = new ThumbnailRenderQueue(2);
let releaseFirst;
const firstGate = new Promise((resolve) => {
  releaseFirst = resolve;
});
const controller = new AbortController();
const first = queue.run(async () => firstGate, controller.signal);
const second = queue.run(async () => "second", controller.signal);
const third = queue.run(async () => "third", controller.signal);
await Promise.resolve();
assert.equal(queue.activeCount, 2);
assert.equal(queue.pendingCount, 1);
releaseFirst();
await Promise.all([first, second, third]);
assert.equal(queue.activeCount, 0);

const [
  editorPage,
  editorHook,
  smartTools,
  objectFrame,
  thumbnailPanel,
  translateRoute,
  jobRoute,
  footer,
  exportEngine,
  pdfWordRegistry,
] = await Promise.all([
  readFile(new URL("../src/app/editor/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/hooks/useEditor.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/components/EditorSmartToolsPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/components/tools/EditorObjectFrame.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/editor/components/EditorLeftPanel.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/translate/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/app/api/conversions/jobs/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/components/Footer.tsx", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/pdf-tools/editor-export-engine.ts", import.meta.url), "utf8"),
  readFile(new URL("../src/lib/conversions/registry.ts", import.meta.url), "utf8"),
]);
assert.match(editorPage, /recordDocumentTransaction/);
assert.match(editorPage, /preparePdfDocument\(result\.bytes\)/);
assert.match(editorHook, /kind: "document"/);
assert.match(editorHook, /redoStackRef\.current = \[\]/);
assert.match(smartTools, /findRunRef/);
assert.match(smartTools, /translatedDocumentIdentity !== documentIdentity/);
assert.match(smartTools, /getPageTranslationText/);
assert.match(objectFrame, /tabIndex=\{0\}/);
assert.match(objectFrame, /aria-pressed=\{selected\}/);
assert.match(thumbnailPanel, /IntersectionObserver/);
assert.match(thumbnailPanel, /page\.cleanup\(\)/);
assert.match(translateRoute, /getConversionApiIdentity/);
assert.match(translateRoute, /consumeTranslationRateLimit/);
assert.doesNotMatch(translateRoute, /new Map/);
assert.match(jobRoute, /validateAndResolvePublicWebpageUrl/);
assert.match(jobRoute, /webpageSecurityPolicy/);
assert.match(footer, /href: "\/tools\/reorder"/);
assert.doesNotMatch(footer, /href: "\/tools\/organize"/);
assert.match(exportEngine, /object\.data\.stampLabel/);
assert.match(pdfWordRegistry, /OCR, editable Word output, and layout preservation are provider-dependent/);

console.log(
  JSON.stringify({
    structuralPageOperations: "passed",
    atomicDocumentHistoryBoundary: "passed",
    managedPageNumbers: "passed",
    ocrRotation: "passed",
    findSubstringGeometryAndDeduplication: "passed",
    smartToolDocumentIdentity: "passed",
    textClipGeometry: "passed",
    lazyThumbnailQueue: "passed",
    objectKeyboardAccessibility: "passed",
    imageRouteIdentityAndQueueLimit: "passed",
    malformedPdfReplacement: "passed",
    translateAuthorizationAndRateLimit: "passed",
    footerAndStampFallback: "passed",
    pdfToWordHonesty: "passed",
  }),
);
