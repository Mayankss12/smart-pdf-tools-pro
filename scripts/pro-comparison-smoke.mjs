import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  alignPdfPageTexts,
  compareTextContent,
  serializePdfComparison,
  serializePdfComparisonCsv,
} from "../src/lib/pdf-compare-engine.ts";

const page = (pageNumber, text) => ({ pageNumber, text });

const insertedAlignment = alignPdfPageTexts(
  [
    page(1, "Cover and document title"),
    page(2, "Invoice terms and finance approval"),
    page(3, "Legal approval and signature"),
  ],
  [
    page(1, "Cover and document title"),
    page(2, "New appendix inserted in revision"),
    page(3, "Invoice terms and finance approval"),
    page(4, "Legal approval and signature"),
  ],
);
assert.deepEqual(insertedAlignment, [
  { originalPageNumber: 1, revisedPageNumber: 1, textSimilarity: 100 },
  { originalPageNumber: null, revisedPageNumber: 2, textSimilarity: 0 },
  { originalPageNumber: 2, revisedPageNumber: 3, textSimilarity: 100 },
  { originalPageNumber: 3, revisedPageNumber: 4, textSimilarity: 100 },
]);

const removedAlignment = alignPdfPageTexts(
  [
    page(1, "Cover"),
    page(2, "Temporary appendix"),
    page(3, "Contract body"),
  ],
  [page(1, "Cover"), page(2, "Contract body")],
);
assert.deepEqual(removedAlignment, [
  { originalPageNumber: 1, revisedPageNumber: 1, textSimilarity: 100 },
  { originalPageNumber: 2, revisedPageNumber: null, textSimilarity: 0 },
  { originalPageNumber: 3, revisedPageNumber: 2, textSimilarity: 100 },
]);

const textDifference = compareTextContent(
  "Invoice total 100\nApproved by Finance",
  "Invoice total 120\nApproved by Finance and Legal",
  ["Invoice total 100", "Approved by Finance"],
  ["Invoice total 120", "Approved by Finance and Legal"],
);
assert.equal(textDifference.changedLineCount, 2);
assert.deepEqual(
  textDifference.lineChanges.map((change) => change.type),
  ["modified", "modified"],
);
assert.equal(textDifference.lineChanges[0].similarity > 60, true);
assert.equal(textDifference.added.includes("120"), true);
assert.equal(textDifference.removed.includes("100"), true);

const report = {
  originalName: 'original,"signed".pdf',
  revisedName: "revised.pdf",
  originalPages: 1,
  revisedPages: 2,
  comparedPagePairs: 1,
  unchangedPages: 0,
  changedPages: 1,
  addedPages: 1,
  removedPages: 0,
  averageTextSimilarity: 75,
  averageVisualDifferencePercent: 2.5,
  generatedAt: "2026-08-29T00:00:00.000Z",
  pages: [
    {
      pageNumber: 1,
      originalPageNumber: 1,
      revisedPageNumber: 1,
      status: "changed",
      visualDifferencePercent: 2.5,
      textDifference,
      originalPreview: "data:image/jpeg;base64,original",
      revisedPreview: "data:image/jpeg;base64,revised",
      differencePreview: "data:image/png;base64,difference",
    },
  ],
};
const json = serializePdfComparison(report);
assert.match(json, /"reportVersion": 2/);
assert.doesNotMatch(json, /base64/);
assert.match(json, /"originalPageNumber": 1/);
assert.match(json, /"lineChanges"/);

const csv = serializePdfComparisonCsv(report);
assert.match(csv, /"Original page","Revised page"/);
assert.match(csv, /"changed","2.5","71\.43","2"/);
assert.equal(csv.split("\r\n").length, 2);

const [clientSource, engineSource] = await Promise.all(
  [
    "../src/components/PdfCompareToolClient.tsx",
    "../src/lib/pdf-compare-engine.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
assert.match(clientSource, /Aligned visual and text analysis/);
assert.match(clientSource, /Line-level changes/);
assert.match(clientSource, /serializePdfComparisonCsv/);
assert.match(clientSource, /Original .*Revised/);
assert.match(engineSource, /alignPdfPageTexts/);
assert.match(engineSource, /collectPositionedLines/);
assert.match(engineSource, /reportVersion: 2/);

console.log(
  JSON.stringify({
    pageInsertionAlignment: "passed",
    pageRemovalAlignment: "passed",
    lineLevelChanges: "passed",
    jsonAuditReport: "passed",
    csvAuditReport: "passed",
    proComparisonUi: "passed",
  }),
);
