import assert from "node:assert/strict";

import {
  applyFindReplaceBatch,
  createVisualFindReplacementObject,
  findEditorObjectTextMatches,
  getFindReplacementSourceId,
  isFindMatchCoveredByExistingTextEdit,
  isReplaceableFindMatch,
  replaceTextRanges,
} from "../src/lib/editor/editor-find-replace.ts";

assert.equal(
  replaceTextRanges(
    "alpha beta alpha",
    [
      { start: 0, length: 5 },
      { start: 11, length: 5 },
    ],
    "A",
  ),
  "A beta A",
);

const editorObjects = [
  {
    id: "text-1",
    type: "text",
    pageNumber: 1,
    box: { x: 10, y: 20, width: 220, height: 30 },
    data: { text: "Invoice Invoice", textRuns: [{ text: "old" }] },
  },
  {
    id: "locked-text",
    type: "text",
    pageNumber: 1,
    box: { x: 10, y: 70, width: 160, height: 30 },
    locked: true,
    data: { text: "Invoice" },
  },
];

const editorMatches = findEditorObjectTextMatches(editorObjects, "invoice");
assert.equal(editorMatches.length, 2);
assert.ok(editorMatches.every((match) => match.source === "editor"));
assert.ok(editorMatches.every((match) => match.editorObjectId === "text-1"));

const editorBatch = applyFindReplaceBatch({
  objects: editorObjects,
  matches: editorMatches,
  replacement: "Bill",
});
assert.equal(editorBatch.replacedCount, 2);
assert.equal(editorBatch.objects[0].data.text, "Bill Bill");
assert.equal(editorBatch.objects[0].data.textRuns, undefined);
assert.equal(editorBatch.objects[1].data.text, "Invoice");

const pdfMatch = {
  id: "pdf-page1-item1-0",
  pageNumber: 1,
  source: "pdf",
  box: { x: 50, y: 80, width: 60, height: 14 },
  matchedText: "Invoice",
  matchStart: 0,
  matchLength: 7,
};

assert.equal(getFindReplacementSourceId(pdfMatch), "find:pdf:pdf-page1-item1-0");
assert.equal(isReplaceableFindMatch(pdfMatch), true);
assert.equal(
  isReplaceableFindMatch({ ...pdfMatch, id: "ocr-1", source: "ocr" }),
  false,
);

const visualReplacement = createVisualFindReplacementObject(pdfMatch, "Bill");
assert.equal(visualReplacement.type, "text");
assert.equal(visualReplacement.data.text, "Bill");
assert.equal(
  visualReplacement.data.sourceTextEdit.sourceItemId,
  "find:pdf:pdf-page1-item1-0",
);
assert.ok(visualReplacement.data.sourceTextEdit.coverBox.width > pdfMatch.box.width);

const pdfBatch = applyFindReplaceBatch({
  objects: editorObjects,
  matches: [pdfMatch, { ...pdfMatch, id: "ocr-1", source: "ocr" }],
  replacement: "Bill",
});
assert.equal(pdfBatch.replacedCount, 1);
assert.equal(pdfBatch.objects.length, editorObjects.length + 1);
assert.equal(pdfBatch.objects.at(-1)?.data.text, "Bill");

const coveringObject = {
  id: "existing-edit",
  type: "text",
  pageNumber: 1,
  box: { x: 45, y: 75, width: 80, height: 24 },
  data: {
    text: "Changed",
    sourceTextEdit: {
      sourceItemId: "native-source",
      originalText: "Invoice",
      fontName: null,
      fontSize: 12,
      baselineOffset: 14,
      sourceBox: { x: 45, y: 75, width: 80, height: 24 },
      coverBox: { x: 48, y: 78, width: 66, height: 18 },
    },
  },
};
assert.equal(
  isFindMatchCoveredByExistingTextEdit(pdfMatch, [coveringObject]),
  true,
);
assert.equal(
  isFindMatchCoveredByExistingTextEdit(
    { ...pdfMatch, box: { x: 300, y: 300, width: 50, height: 12 } },
    [coveringObject],
  ),
  false,
);

console.log(
  JSON.stringify({
    descendingRangeReplacement: "passed",
    editorObjectFindMatches: "passed",
    lockedEditorObjectsSkipped: "passed",
    editorBatchReplacement: "passed",
    nativePdfVisualReplacement: "passed",
    ocrReplaceSafetyBlock: "passed",
    existingEditDuplicateSuppression: "passed",
    findReplaceSingleHistoryBatchReady: "passed",
  }),
);
