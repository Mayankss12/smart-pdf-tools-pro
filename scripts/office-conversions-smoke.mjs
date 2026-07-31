import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = {
  writer: "../src/lib/conversions/office-open-xml.ts",
  reader: "../src/lib/conversions/office-open-xml-reader.ts",
  engine: "../src/lib/conversions/pdf-office-engine.ts",
  pdfOfficePage: "../src/components/PdfOfficeConversionPage.tsx",
  officePdfPage: "../src/components/OfficeToPdfConversionPage.tsx",
  localConversions: "../src/lib/conversions/local-browser-conversions.ts",
  entitlements: "../src/lib/entitlements.ts",
};
const entries = await Promise.all(
  Object.entries(paths).map(async ([key, path]) => [
    key,
    await readFile(new URL(path, import.meta.url), "utf8"),
  ]),
);
const sources = Object.fromEntries(entries);

for (const value of [
  "export function createStoredZip",
  "export function createDocxFromPdfText",
  "export function createXlsxFromPdfText",
  "export function createPptxFromPageImages",
  "0x04034b50",
  "0x02014b50",
  "0x06054b50",
  "[Content_Types].xml",
  "word/document.xml",
  "xl/workbook.xml",
  "ppt/presentation.xml",
  "ppt/slides/slide",
  "ppt/media/image",
]) {
  assert.ok(sources.writer.includes(value), `Office writer is missing ${value}`);
}

for (const value of [
  "export async function extractOfficeText",
  "word/document.xml",
  "xl/worksheets/sheet",
  "ppt/slides/slide",
  "vbaProject",
  "DecompressionStream",
  "deflate-raw",
  "Macro-enabled Office documents are not supported",
]) {
  assert.ok(sources.reader.includes(value), `Office reader is missing ${value}`);
}

for (const value of [
  "export async function convertPdfToOffice",
  "createDocxFromPdfText",
  "createXlsxFromPdfText",
  "createPptxFromPageImages",
  "extractPdfTextContent",
  "renderPdfPagesForPptx",
]) {
  assert.ok(sources.engine.includes(value), `PDF Office engine is missing ${value}`);
}

for (const value of [
  "convertPdfToOffice",
  "prepareEntitledExport",
  "application/vnd.openxmlformats",
  "Browser processing",
]) {
  assert.ok(
    sources.pdfOfficePage.includes(value),
    `PDF Office workspace is missing ${value}`,
  );
}
for (const value of [
  "extractOfficeText",
  "createTextPdf",
  "prepareEntitledExport",
  "Macro-enabled files are rejected",
]) {
  assert.ok(
    sources.officePdfPage.includes(value),
    `Office PDF workspace is missing ${value}`,
  );
}

const localIds = [
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
];
for (const id of localIds) {
  assert.ok(
    sources.localConversions.includes(`"${id}"`),
    `Local conversion catalog is missing ${id}`,
  );
  assert.ok(
    sources.entitlements.includes(`"${id}"`),
    `Core entitlement catalog is missing ${id}`,
  );
}
assert.equal(sources.localConversions.includes('"heic-to-pdf"'), false);
assert.equal(sources.localConversions.includes('"webpage-to-pdf"'), false);

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
  assert.ok(source.includes(component));
  assert.ok(source.includes(format));
  assert.equal(source.includes("ConversionCapabilityShell"), false);
  assert.equal(source.includes("requirePublicLaunchReadyTool"), false);
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
