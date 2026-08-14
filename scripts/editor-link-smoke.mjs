import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFArray, PDFDocument, PDFName } from "pdf-lib";

import {
  appendEditorLinkAnnotation,
  getEditorLinkPdfRect,
  normalizeEditorLinkUrl,
} from "../src/lib/pdf-tools/editor-link-engine.ts";

assert.equal(normalizeEditorLinkUrl("example.com"), "https://example.com/");
assert.equal(
  normalizeEditorLinkUrl("https://openai.com/path?q=1"),
  "https://openai.com/path?q=1",
);
assert.equal(normalizeEditorLinkUrl("mailto:hello@example.com"), "mailto:hello@example.com");
assert.equal(normalizeEditorLinkUrl("javascript:alert(1)"), null);
assert.equal(normalizeEditorLinkUrl("data:text/html,test"), null);
assert.equal(normalizeEditorLinkUrl("file:///tmp/test.pdf"), null);
assert.equal(normalizeEditorLinkUrl(""), null);

const box = { x: 100, y: 200, width: 120, height: 40 };

assert.deepEqual(
  getEditorLinkPdfRect(box, {
    rotation: 0,
    viewportWidth: 600,
    viewportHeight: 800,
    pdfWidth: 600,
    pdfHeight: 800,
    pdfOriginX: 0,
    pdfOriginY: 0,
  }),
  [100, 560, 220, 600],
);

assert.deepEqual(
  getEditorLinkPdfRect(box, {
    rotation: 90,
    viewportWidth: 800,
    viewportHeight: 600,
    pdfWidth: 600,
    pdfHeight: 800,
    pdfOriginX: 0,
    pdfOriginY: 0,
  }),
  [200, 100, 240, 220],
);

assert.deepEqual(
  getEditorLinkPdfRect(box, {
    rotation: 180,
    viewportWidth: 600,
    viewportHeight: 800,
    pdfWidth: 600,
    pdfHeight: 800,
    pdfOriginX: 0,
    pdfOriginY: 0,
  }),
  [380, 200, 500, 240],
);

assert.deepEqual(
  getEditorLinkPdfRect(box, {
    rotation: 270,
    viewportWidth: 800,
    viewportHeight: 600,
    pdfWidth: 600,
    pdfHeight: 800,
    pdfOriginX: 0,
    pdfOriginY: 0,
  }),
  [360, 580, 400, 700],
);

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([600, 800]);
const added = appendEditorLinkAnnotation({
  pdfDoc,
  page,
  box,
  geometry: {
    rotation: 0,
    viewportWidth: 600,
    viewportHeight: 800,
    pdfWidth: 600,
    pdfHeight: 800,
    pdfOriginX: 0,
    pdfOriginY: 0,
  },
  url: "example.com",
});
assert.equal(added, true);
const annots = page.node.lookupMaybe(PDFName.of("Annots"), PDFArray);
assert.ok(annots);
assert.equal(annots.size(), 1);
const saved = await pdfDoc.save();
assert.ok(saved.length > 100);

const [controlsSource, linkControlsSource, exportSource] = await Promise.all([
  readFile(
    new URL("../src/app/editor/components/EditorLayerControls.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/EditorLinkControls.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-export-engine.ts", import.meta.url),
    "utf8",
  ),
]);

assert.match(controlsSource, /<EditorLinkControls editor=\{editor\} \/>/);
assert.match(linkControlsSource, /normalizeEditorLinkUrl\(value\)/);
assert.match(linkControlsSource, /http, https, or mailto/);
assert.match(linkControlsSource, /editor\.updateObjectData/);
assert.match(linkControlsSource, /createLinkPatch\(undefined\)/);
assert.match(exportSource, /readonly linkUrl\?: string/);
assert.match(exportSource, /appendEditorLinkAnnotation\(\{/);
assert.match(exportSource, /if \(!object\.data\.linkUrl\) continue/);

console.log(
  JSON.stringify({
    safeLinkSchemes: "passed",
    bareDomainNormalization: "passed",
    rotatedLinkGeometry: "passed",
    pdfLinkAnnotationCreation: "passed",
    selectedObjectLinkUi: "passed",
    linkRemoval: "passed",
    linkExportIntegration: "passed",
  }),
);
