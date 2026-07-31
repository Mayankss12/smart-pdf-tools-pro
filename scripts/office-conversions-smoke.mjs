import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [
  writerSource,
  readerSource,
  pdfOfficeEngineSource,
  pdfOfficePageSource,
  officePdfPageSource,
  localConversionSource,
  entitlementSource,
] = await Promise.all(
  [
    "../src/lib/conversions/office-open-xml.ts",
    "../src/lib/conversions/office-open-xml-reader.ts",
    "../src/lib/conversions/pdf-office-engine.ts",
    "../src/components/PdfOfficeConversionPage.tsx",
    "../src/components/OfficeToPdfConversionPage.tsx",
    "../src/lib/conversions/local-browser-conversions.ts",
    "../src/lib/entitlements.ts",
  ].map((path) => readFile(new URL(path, import.meta.url), "utf8")),
);

for (const exportName of [
  "createStoredZip",
  "createDocxFromPdfText",
  "createXlsxFromPdfText",
  "createPptxFromPageImages",
]) {
  assert.match(writerSource, new RegExp(`export function ${exportName}`));
}
assert.match(writerSource, /0x04034b50/);
assert.match(writerSource, /0x02014b50/);
assert.match(writerSource, /0x06054b50/);
assert.match(writerSource, /\[Content_Types\]\.xml/);
assert.match(writerSource, /word\/document\.xml/);
assert.match(writerSource, /xl\/workbook\.xml/);
assert.match(writerSource, /ppt\/presentation\.xml/);
assert.match(writerSource, /ppt\/slides\/slide/);
assert.match(writerSource, /ppt\/media\/image/);

assert.match(readerSource, /export async function extractOfficeText/);
assert.match(readerSource, /word\/document\.xml/);
assert.match(readerSource, /xl\\\/worksheets\\\/sheet/);
assert.match(readerSource, /ppt\\\/slides\\\/slide/);
assert.match(readerSource, /vbaProject\\\.bin/);
assert.match(readerSource, /DecompressionStream/);
assert.match(readerSource, /deflate-raw/);
assert.match(readerSource, /Macro-enabled Office documents are not supported/);

assert.match(pdfOfficeEngineSource, /export async function convertPdfToOffice/);
assert.match(pdfOfficeEngineSource, /createDocxFromPdfText/);
assert.match(pdfOfficeEngineSource, /createXlsxFromPdfText/);
assert.match(pdfOfficeEngineSource, /createPptxFromPageImages/);
assert.match(pdfOfficeEngineSource, /extractPdfTextContent/);
assert.match(pdfOfficeEngineSource, /renderPdfPagesForPptx/);

assert.match(pdfOfficePageSource, /convertPdfToOffice/);
assert.match(pdfOfficePageSource, /prepareEntitledExport/);
assert.match(pdfOfficePageSource, /application\/vnd\.openxmlformats/);
assert.match(pdfOfficePageSource, /Browser processing/);
assert.match(officePdfPageSource, /extractOfficeText/);
assert.match(officePdfPageSource, /createTextPdf/);
assert.match(officePdfPageSource, /prepareEntitledExport/);
assert.match(officePdfPageSource, /Macro-enabled files are rejected/);

const localIds = [
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
];
for (const id of localIds) {
  assert.match(localConversionSource, new RegExp(`"${id}"`));
  assert.match(entitlementSource, new RegExp(`"${id}"`));
}
assert.doesNotMatch(
  localConversionSource,
  /"heic-to-pdf"|"webpage-to-pdf"/,
);

const routeChecks = [
  ["pdf-to-word", "PdfOfficeConversionPage", 'format="docx"'],
  ["pdf-to-excel", "PdfOfficeConversionPage", 'format="xlsx"'],
  ["pdf-to-powerpoint", "PdfOfficeConversionPage", 'format="pptx"'],
  ["word-to-pdf", "OfficeToPdfConversionPage", 'format="docx"'],
  ["excel-to-pdf", "OfficeToPdfConversionPage", 'format="xlsx"'],
  ["powerpoint-to-pdf", "OfficeToPdfConversionPage", 'format="pptx"'],
];
for (const [route, component, format] of routeChecks) {
  const source = await readFile(
    new URL(`../src/app/tools/${route}/page.tsx`, import.meta.url),
    "utf8",
  );
  assert.match(source, new RegExp(component));
  assert.ok(source.includes(format));
  assert.doesNotMatch(
    source,
    /ConversionCapabilityShell|requirePublicLaunchReadyTool/,
  );
}

console.log(
  JSON.stringify({
    officeWriterContract: "passed",
    officeReaderContract: "passed",
    forwardRoutes: "passed",
    reverseRoutes: "passed",
    localOfficeConversions: localIds,
  }),
);
