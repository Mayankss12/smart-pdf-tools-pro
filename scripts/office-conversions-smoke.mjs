import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  createDocxFromPdfText,
  createPptxFromPageImages,
  createXlsxFromPdfText,
} from "../src/lib/conversions/office-open-xml.ts";
import { LOCAL_BROWSER_CONVERSION_IDS } from "../src/lib/conversions/local-browser-conversions.ts";
import { getPublicConversionCapability } from "../src/lib/conversions/capabilities.ts";
import { getPublicLaunchCapabilitySnapshot } from "../src/lib/public-launch-snapshot.ts";
import { isToolPubliclyLaunchReady } from "../src/lib/public-launch.ts";
import { getToolById } from "../src/lib/tools.ts";
import { canUseToolByTier } from "../src/lib/entitlements.ts";

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
      lines: [
        { text: "नमस्ते दुनिया", fontSize: 14, direction: "ltr" },
        { text: "Second page", fontSize: 12, direction: "ltr" },
      ],
    },
  ],
  pageCount: 2,
  ocrPageCount: 1,
};

function assertZipPackage(bytes, requiredStrings) {
  assert.ok(bytes instanceof Uint8Array);
  assert.ok(bytes.length > 100);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.deepEqual([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
  const searchable = new TextDecoder().decode(bytes);
  for (const value of requiredStrings) {
    assert.match(searchable, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
}

const docx = createDocxFromPdfText(extracted);
assertZipPackage(docx, [
  "[Content_Types].xml",
  "word/document.xml",
  "Quarterly Report",
  "Second page",
]);

const xlsx = createXlsxFromPdfText(extracted);
assertZipPackage(xlsx, [
  "[Content_Types].xml",
  "xl/workbook.xml",
  "xl/worksheets/sheet1.xml",
  "xl/worksheets/sheet2.xml",
  "Revenue",
  "1200",
]);

const transparentPng = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
  0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99,
  0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const pptx = createPptxFromPageImages([
  { bytes: transparentPng, width: 1, height: 1 },
  { bytes: transparentPng, width: 1, height: 1 },
]);
assertZipPackage(pptx, [
  "[Content_Types].xml",
  "ppt/presentation.xml",
  "ppt/slides/slide1.xml",
  "ppt/slides/slide2.xml",
  "ppt/media/image1.png",
]);

const expectedLocalIds = new Set([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
]);
assert.deepEqual(new Set(LOCAL_BROWSER_CONVERSION_IDS), expectedLocalIds);
const snapshot = getPublicLaunchCapabilitySnapshot();
for (const id of LOCAL_BROWSER_CONVERSION_IDS) {
  const capability = getPublicConversionCapability(id);
  assert.ok(capability, `Missing capability for ${id}`);
  assert.equal(capability.enabled, true);
  assert.equal(capability.status, "available");
  assert.equal(capability.processingMode, "client");
  assert.equal(capability.access, "free");
  const tool = getToolById(id);
  assert.ok(tool, `Missing tool for ${id}`);
  assert.equal(isToolPubliclyLaunchReady(tool, snapshot), true);
  assert.equal(canUseToolByTier({ tier: "guest", toolKey: id }), true);
  assert.equal(canUseToolByTier({ tier: "free", toolKey: id }), true);
}

const routeSources = await Promise.all(
  [
    ["pdf-to-word", "PdfOfficeConversionPage"],
    ["pdf-to-excel", "PdfOfficeConversionPage"],
    ["pdf-to-powerpoint", "PdfOfficeConversionPage"],
    ["word-to-pdf", "OfficeToPdfConversionPage"],
    ["excel-to-pdf", "OfficeToPdfConversionPage"],
    ["powerpoint-to-pdf", "OfficeToPdfConversionPage"],
  ].map(async ([route, component]) => ({
    component,
    source: await readFile(
      new URL(`../src/app/tools/${route}/page.tsx`, import.meta.url),
      "utf8",
    ),
  })),
);
for (const route of routeSources) {
  assert.match(route.source, new RegExp(route.component));
  assert.doesNotMatch(
    route.source,
    /ConversionCapabilityShell|requirePublicLaunchReadyTool/,
  );
}

const readerSource = await readFile(
  new URL(
    "../src/lib/conversions/office-open-xml-reader.ts",
    import.meta.url,
  ),
  "utf8",
);
assert.match(readerSource, /vbaProject\\\.bin/);
assert.match(readerSource, /DecompressionStream/);
assert.match(readerSource, /word\/document\.xml/);
assert.match(readerSource, /xl\\\/worksheets/);
assert.match(readerSource, /ppt\\\/slides/);

console.log(
  JSON.stringify({
    docxPackage: "passed",
    xlsxPackage: "passed",
    pptxPackage: "passed",
    localOfficeConversions: [...LOCAL_BROWSER_CONVERSION_IDS],
    publicAvailability: "passed",
    coreEntitlements: "passed",
    routeCoverage: "passed",
  }),
);
