import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  MAX_PDF_IMAGE_CANVAS_PIXELS,
  assertSafePdfRenderPixelArea,
  getPdfRenderPixelArea,
  getPdfRenderScale,
  getSafePdfThumbnailScale,
} from "../src/lib/pdf-to-image-engine.ts";
import {
  createZipBlob,
  normalizeZipEntryName,
} from "../src/lib/browser-zip.ts";

assert.equal(getPdfRenderScale(96), 96 / 72);
assert.equal(getPdfRenderScale(150), 150 / 72);
assert.equal(getPdfRenderScale(200), 200 / 72);
assert.equal(getPdfRenderScale(300), 300 / 72);

const presetAreas = [96, 150, 200, 300].map((dpi) =>
  getPdfRenderPixelArea(595.28, 841.89, dpi),
);
assert.ok(
  presetAreas.every(
    (area, index) => index === 0 || area > presetAreas[index - 1],
  ),
);
assert.ok(presetAreas.at(-1) < MAX_PDF_IMAGE_CANVAS_PIXELS);
assert.throws(
  () => assertSafePdfRenderPixelArea(2, 4000, 6000, 300),
  /lower DPI/i,
);
const safeThumbnailScale = getSafePdfThumbnailScale(50_000, 50_000);
assert.ok(safeThumbnailScale < 0.36);
assert.ok(
  50_000 * safeThumbnailScale * 50_000 * safeThumbnailScale <=
    MAX_PDF_IMAGE_CANVAS_PIXELS + 1,
);

const [jpgWrapper, pngWrapper] = await Promise.all([
  readFile(
    new URL("../src/app/tools/pdf-to-jpg/page.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/tools/pdf-to-png/page.tsx", import.meta.url),
    "utf8",
  ),
]);
assert.match(jpgWrapper, /from "\.\.\/pdf-to-images\/page"/);
assert.match(pngWrapper, /from "\.\.\/pdf-to-images\/page"/);

assert.equal(normalizeZipEntryName("page-001.png"), "page-001.png");
assert.equal(normalizeZipEntryName("page-002.jpg"), "page-002.jpg");
assert.equal(normalizeZipEntryName("../unsafe/page-003.webp"), "unsafe/page-003.webp");
assert.equal(normalizeZipEntryName("document.pdf"), "document.pdf");

const pngBytes = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const jpegBytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xdb]);
const zipBlob = await createZipBlob([
  {
    fileName: "PDFMantra-page-001.png",
    blob: new Blob([pngBytes], { type: "image/png" }),
  },
  {
    fileName: "PDFMantra-page-002.jpg",
    blob: new Blob([jpegBytes], { type: "image/jpeg" }),
  },
]);
const zipBytes = new Uint8Array(await zipBlob.arrayBuffer());
assert.deepEqual(Array.from(zipBytes.slice(0, 4)), [0x50, 0x4b, 0x03, 0x04]);
const zipText = new TextDecoder().decode(zipBytes);
assert.match(zipText, /PDFMantra-page-001\.png/);
assert.match(zipText, /PDFMantra-page-002\.jpg/);
assert.doesNotMatch(zipText, /\.png\.pdf|\.jpg\.pdf/);

console.log(
  JSON.stringify({
    dpiPresets: "passed",
    safePixelLimit: "passed",
    largePageRejection: "passed",
    thumbnailDownscaling: "passed",
    jpgAndPngSharedImplementation: "passed",
    imageZipExtensions: "passed",
    imageZipMagicBytes: "passed",
  }),
);
