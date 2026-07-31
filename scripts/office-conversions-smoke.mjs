import assert from "node:assert/strict";

import {
  createDocxFromPdfText,
  createPptxFromPageImages,
  createXlsxFromPdfText,
} from "../src/lib/conversions/office-open-xml.ts";

const extracted = {
  pages: [
    {
      pageNumber: 1,
      usedOcr: false,
      lines: [
        { text: "Quarterly Report", fontSize: 22, direction: "ltr" },
        { text: "Region | Revenue | Growth", fontSize: 12, direction: "ltr" },
        { text: "North | 1200 | 8%", fontSize: 12, direction: "ltr" },
      ],
    },
    {
      pageNumber: 2,
      usedOcr: true,
      lines: [{ text: "Second page", fontSize: 12, direction: "ltr" }],
    },
  ],
  pageCount: 2,
  ocrPageCount: 1,
};

function assertZip(bytes) {
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 100);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
}

const docx = createDocxFromPdfText(extracted);
const xlsx = createXlsxFromPdfText(extracted);
const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);
const pptx = createPptxFromPageImages([
  { bytes: png, width: 1, height: 1 },
  { bytes: png, width: 1, height: 1 },
]);

assertZip(docx);
assertZip(xlsx);
assertZip(pptx);

console.log(
  JSON.stringify({
    docxPackage: docx.length,
    xlsxPackage: xlsx.length,
    pptxPackage: pptx.length,
    result: "passed",
  }),
);
