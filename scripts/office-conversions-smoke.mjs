import assert from "node:assert/strict";

import {
  createDocxFromPdfText,
  createPptxFromPageImages,
  createXlsxFromPdfText,
} from "../src/lib/conversions/office-open-xml.ts";

assert.equal(typeof createDocxFromPdfText, "function");
assert.equal(typeof createXlsxFromPdfText, "function");
assert.equal(typeof createPptxFromPageImages, "function");

console.log(JSON.stringify({ officeWriterImport: "passed" }));
