import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  MAX_PDF_IMAGE_CANVAS_PIXELS,
  assertSafePdfRenderPixelArea,
  getPdfRenderPixelArea,
  getPdfRenderScale,
  getSafePdfThumbnailScale,
} from "../src/lib/pdf-to-image-engine.ts";

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

console.log(
  JSON.stringify({
    dpiPresets: "passed",
    safePixelLimit: "passed",
    largePageRejection: "passed",
    thumbnailDownscaling: "passed",
    jpgAndPngSharedImplementation: "passed",
  }),
);
