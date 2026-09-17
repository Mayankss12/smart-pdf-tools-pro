import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createDocxFromPageImages,
  createEditableLayoutDocx,
} from "../src/lib/conversions/office-open-xml.ts";

const paths = {
  writer: "../src/lib/conversions/office-open-xml.ts",
  reader: "../src/lib/conversions/office-open-xml-reader.ts",
  engine: "../src/lib/conversions/pdf-office-engine.ts",
  pdfOfficePage: "../src/components/PdfOfficeConversionPage.tsx",
  officePdfPage: "../src/components/OfficeToPdfConversionPage.tsx",
  localConversions: "../src/lib/conversions/local-browser-conversions.ts",
  entitlements: "../src/lib/entitlements.ts",
  registry: "../src/lib/conversions/registry.ts",
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
  "export function createDocxFromPageImages",
  "export function createEditableLayoutDocx",
  "export function createXlsxFromPdfText",
  "export function createPptxFromPageImages",
  "0x04034b50",
  "0x02014b50",
  "0x06054b50",
  "[Content_Types].xml",
  "word/document.xml",
  "word/_rels/document.xml.rels",
  "word/media/page-",
  "wordprocessingDrawing",
  "w:txbxContent",
  "wp:anchor",
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
  "worksheets",
  "sheetPaths",
  "slidePaths",
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
  "createDocxFromPageImages",
  "createEditableLayoutDocx",
  "createXlsxFromPdfText",
  "createPptxFromPageImages",
  "extractPdfTextContent",
  "renderPdfPagesForOffice",
  "renderPdfPagesForEditableWord",
  '"editable-layout"',
  '"preserve-layout"',
  '"editable-text"',
]) {
  assert.ok(sources.engine.includes(value), `PDF Office engine is missing ${value}`);
}

for (const value of [
  "convertPdfToOffice",
  "prepareEntitledExport",
  "application/vnd.openxmlformats",
  "Browser processing",
  "Editable layout",
  "Exact visual copy",
  "Recommended",
  "Simple editable text",
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

assert.ok(
  sources.registry.includes('capabilityKey: "browser-pdf-render"'),
  "PDF to Word must use the browser renderer capability",
);
assert.ok(
  sources.registry.includes('preservesLayout: "yes"'),
  "PDF to Word must advertise editable layout reconstruction honestly",
);

function readStoredZipEntries(bytes) {
  const entries = new Map();
  const decoder = new TextDecoder();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const compression = view.getUint16(offset + 8, true);
    assert.equal(compression, 0, "Generated Office entry must use stored ZIP data");
    const size = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const dataStart = nameStart + nameLength + extraLength;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLength));
    entries.set(name, bytes.slice(dataStart, dataStart + size));
    offset = dataStart + size;
  }
  return entries;
}

const onePixelPng = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);
const generatedDocx = createDocxFromPageImages([
  {
    bytes: onePixelPng,
    width: 1190,
    height: 1684,
    pageWidthPoints: 595,
    pageHeightPoints: 842,
  },
  {
    bytes: onePixelPng,
    width: 1684,
    height: 1190,
    pageWidthPoints: 842,
    pageHeightPoints: 595,
  },
]);
const generatedEntries = readStoredZipEntries(generatedDocx);
assert.ok(generatedEntries.has("word/media/page-1.png"));
assert.ok(generatedEntries.has("word/media/page-2.png"));
assert.ok(generatedEntries.has("word/_rels/document.xml.rels"));
const generatedDocumentXml = new TextDecoder().decode(
  generatedEntries.get("word/document.xml"),
);
assert.equal((generatedDocumentXml.match(/<wp:inline/g) ?? []).length, 2);
assert.match(generatedDocumentXml, /w:w="11900" w:h="16840"/);
assert.match(generatedDocumentXml, /w:w="16840" w:h="11900" w:orient="landscape"/);
assert.match(generatedDocumentXml, /descr="PDF page 1"/);

const editableDocx = createEditableLayoutDocx([
  {
    background: {
      bytes: onePixelPng,
      width: 1190,
      height: 1684,
      pageWidthPoints: 595,
      pageHeightPoints: 842,
    },
    textBoxes: [
      {
        text: "Editable invoice number 1042",
        x: 44,
        top: 36,
        width: 180,
        height: 15,
        fontSize: 11,
        fontFamily: "Carlito-Bold",
        color: "3A1F08",
        bold: true,
        italic: false,
        direction: "ltr",
        rotation: 0,
      },
      {
        text: "Editable total 1499.00",
        x: 390,
        top: 700,
        width: 120,
        height: 13,
        fontSize: 10,
        fontFamily: "Carlito-Regular",
        color: "111827",
        bold: false,
        italic: false,
        direction: "ltr",
        rotation: 0,
      },
    ],
  },
]);
const editableEntries = readStoredZipEntries(editableDocx);
assert.ok(editableEntries.has("word/media/page-1-background.png"));
assert.ok(editableEntries.has("word/_rels/document.xml.rels"));
const editableDocumentXml = new TextDecoder().decode(
  editableEntries.get("word/document.xml"),
);
assert.equal((editableDocumentXml.match(/<wp:anchor/g) ?? []).length, 1);
assert.equal((editableDocumentXml.match(/<w:txbxContent>/g) ?? []).length, 2);
assert.match(editableDocumentXml, /behindDoc="1"/);
assert.match(editableDocumentXml, /Editable invoice number 1042/);
assert.match(editableDocumentXml, /Editable total 1499\.00/);
assert.match(editableDocumentXml, /w:ascii="Carlito"/);
assert.match(editableDocumentXml, /<w:b\/>/);
assert.match(editableDocumentXml, /w:color w:val="3A1F08"/);

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
