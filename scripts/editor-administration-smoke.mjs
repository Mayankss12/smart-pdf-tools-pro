import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { PDFDocument } from "pdf-lib";

import {
  addEditorBlankPage,
  reorderEditorPages,
  rotateEditorPage,
} from "../src/lib/pdf-tools/editor-page-management.ts";
import {
  createEditorPageNumberObjects,
  parseEditorPageRange,
} from "../src/lib/editor/editor-page-numbering.ts";
import {
  remapObjectsAfterPageInsertion,
  remapObjectsAfterPageReorder,
  remapObjectsAfterPageRotation,
} from "../src/lib/editor/editor-page-object-mapping.ts";
import {
  getEditorToolDefinition,
  resolveEditorTool,
} from "../src/lib/editor/editor-tool-registry.ts";

const source = await PDFDocument.create();
source.addPage([100, 200]);
source.addPage([200, 300]);
source.addPage([300, 400]);
const sourceBytes = await source.save();

const added = await addEditorBlankPage({
  fileBytes: sourceBytes,
  currentPageNumber: 2,
  insertion: "after",
  size: "same",
});
const addedPdf = await PDFDocument.load(added.bytes);
assert.equal(added.activePageNumber, 3);
assert.equal(addedPdf.getPageCount(), 4);
assert.deepEqual(addedPdf.getPage(2).getSize(), { width: 200, height: 300 });

const reordered = await reorderEditorPages({
  fileBytes: sourceBytes,
  pageOrder: [3, 1, 2],
  activePageNumber: 2,
});
const reorderedPdf = await PDFDocument.load(reordered.bytes);
assert.equal(reordered.activePageNumber, 3);
assert.deepEqual(
  reorderedPdf.getPages().map((page) => page.getWidth()),
  [300, 100, 200],
);

const rotated = await rotateEditorPage({
  fileBytes: sourceBytes,
  pageNumber: 1,
  direction: "clockwise",
});
const rotatedPdf = await PDFDocument.load(rotated.bytes);
assert.equal(rotatedPdf.getPage(0).getRotation().angle, 90);
assert.equal(rotated.oldViewportWidth, 100);
assert.equal(rotated.oldViewportHeight, 200);
assert.equal(rotated.newViewportWidth, 200);
assert.equal(rotated.newViewportHeight, 100);

const object = {
  id: "object-1",
  type: "shape",
  pageNumber: 1,
  box: { x: 10, y: 20, width: 30, height: 40 },
  data: {
    shapeType: "line",
    lineStart: { x: 0, y: 0 },
    lineEnd: { x: 30, y: 40 },
  },
};

assert.equal(remapObjectsAfterPageInsertion([object], 1)[0].pageNumber, 2);
assert.equal(
  remapObjectsAfterPageReorder([object], [3, 1, 2])[0].pageNumber,
  2,
);
assert.deepEqual(
  remapObjectsAfterPageRotation({
    objects: [object],
    pageNumber: 1,
    oldViewportWidth: 100,
    oldViewportHeight: 200,
    direction: "clockwise",
  })[0].box,
  { x: 140, y: 10, width: 40, height: 30 },
);

assert.deepEqual(parseEditorPageRange("1-2, 4", 4), [1, 2, 4]);
const numberObjects = createEditorPageNumberObjects({
  setId: "number-set",
  settings: {
    position: "bottom-right",
    startNumber: 5,
    prefix: "Page ",
    suffix: " / 3",
    fontSize: 12,
    color: "#334155",
    pageRange: "1-3",
  },
  pageSizes: [
    { pageNumber: 1, width: 100, height: 200 },
    { pageNumber: 2, width: 200, height: 300 },
    { pageNumber: 3, width: 300, height: 400 },
  ],
});
assert.equal(numberObjects.length, 3);
assert.equal(numberObjects[0].data.text, "Page 5 / 3");
assert.equal(numberObjects[2].data.text, "Page 7 / 3");
assert.ok(numberObjects.every((item) => item.data.pageNumberSetId === "number-set"));

const baseToolContext = {
  hasDocument: false,
  hasPage: false,
  pageCount: 0,
  hasSelection: false,
  hasObject: false,
  selectedObjectLocked: false,
  canUndo: false,
  canRedo: false,
  backendCapabilities: { translation: false },
  userTier: "guest",
  canUseCoreTools: true,
  canUseAdvancedTools: false,
  canUseBackendTools: false,
  featureControl: {
    globalEditorEnabled: true,
    maintenanceMode: false,
    flags: {},
  },
};

assert.equal(
  resolveEditorTool(getEditorToolDefinition("text"), baseToolContext).disabledReason,
  "Open a PDF with an active page to use this tool.",
);
const unavailableTranslate = resolveEditorTool(
  getEditorToolDefinition("translate"),
  {
    ...baseToolContext,
    hasDocument: true,
    hasPage: true,
    pageCount: 1,
  },
);
assert.equal(unavailableTranslate.visible, false);
assert.equal(unavailableTranslate.enabled, false);
assert.equal(unavailableTranslate.disabledReason, "Backend configuration required.");

const availableTranslate = resolveEditorTool(
  getEditorToolDefinition("translate"),
  {
    ...baseToolContext,
    hasDocument: true,
    hasPage: true,
    pageCount: 1,
    backendCapabilities: { translation: true },
    canUseBackendTools: true,
  },
);
assert.equal(availableTranslate.visible, true);
assert.equal(availableTranslate.enabled, true);
assert.equal(
  resolveEditorTool(getEditorToolDefinition("delete"), {
    ...baseToolContext,
    hasDocument: true,
    hasPage: true,
    pageCount: 1,
    hasSelection: true,
    hasObject: true,
    selectedObjectLocked: true,
  }).disabledReason,
  "Unlock the selected object to use this action.",
);
assert.equal(
  resolveEditorTool(getEditorToolDefinition("reorder-pages"), {
    ...baseToolContext,
    hasDocument: true,
    hasPage: true,
    pageCount: 1,
  }).disabledReason,
  "Reorder requires a document with at least two pages.",
);

const layerControlsSource = await readFile(
  new URL(
    "../src/app/editor/components/EditorLayerControls.tsx",
    import.meta.url,
  ),
  "utf8",
);
assert.match(layerControlsSource, /editor\.duplicateObject\(selectedObjectId\)/);
assert.match(layerControlsSource, /editor\.deleteObject\(selectedObjectId\)/);
assert.match(layerControlsSource, /object\.type === "shape"/);
assert.match(layerControlsSource, /object\.type === "draw"/);
assert.match(layerControlsSource, /selectedObject\.box\.width/);
assert.match(layerControlsSource, /editor\.toggleObjectLock\(selectedObjectId\)/);
assert.match(layerControlsSource, /editor\.setObjectOpacity\(/);

console.log(
  JSON.stringify({
    addPage: "passed",
    reorderPages: "passed",
    rotatePage: "passed",
    objectRemapping: "passed",
    pageNumbers: "passed",
    contextualToolbar: "passed",
    objectAdministration: "passed",
  }),
);
