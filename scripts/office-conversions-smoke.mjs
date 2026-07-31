import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = [
  "../src/lib/conversions/office-open-xml.ts",
  "../src/lib/conversions/office-open-xml-reader.ts",
  "../src/lib/conversions/pdf-office-engine.ts",
  "../src/components/PdfOfficeConversionPage.tsx",
  "../src/components/OfficeToPdfConversionPage.tsx",
  "../src/lib/conversions/local-browser-conversions.ts",
  "../src/lib/entitlements.ts",
  "../src/app/tools/pdf-to-word/page.tsx",
  "../src/app/tools/pdf-to-excel/page.tsx",
  "../src/app/tools/pdf-to-powerpoint/page.tsx",
  "../src/app/tools/word-to-pdf/page.tsx",
  "../src/app/tools/excel-to-pdf/page.tsx",
  "../src/app/tools/powerpoint-to-pdf/page.tsx",
];

const sources = await Promise.all(
  paths.map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);
assert.equal(sources.length, paths.length);
assert.ok(sources.every((source) => source.length > 20));

console.log(JSON.stringify({ officeConversionFiles: paths.length, result: "passed" }));
