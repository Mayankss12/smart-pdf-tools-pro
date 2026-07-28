import assert from "node:assert/strict";

import {
  calculateImageDrawBox,
  readJpegExifOrientation,
  validateImageFiles,
} from "../src/lib/pdf-image-engine.ts";

function jpegWithOrientation(orientation) {
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xe1,
    0x00,
    0x22,
    0x45,
    0x78,
    0x69,
    0x66,
    0x00,
    0x00,
    0x49,
    0x49,
    0x2a,
    0x00,
    0x08,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x12,
    0x01,
    0x03,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    orientation,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0xff,
    0xd9,
  ]);
}

for (const orientation of [1, 3, 6, 8]) {
  assert.equal(readJpegExifOrientation(jpegWithOrientation(orientation)), orientation);
}
assert.equal(readJpegExifOrientation(Uint8Array.from([1, 2, 3])), 1);

const contain = calculateImageDrawBox({
  imageWidth: 1600,
  imageHeight: 900,
  pageWidth: 600,
  pageHeight: 800,
  margin: 50,
  fitMode: "contain",
});
assert.equal(contain.x, 50);
assert.equal(contain.width, 500);
assert.ok(contain.y > 50);
assert.ok(contain.height < 700);

const cover = calculateImageDrawBox({
  imageWidth: 1600,
  imageHeight: 900,
  pageWidth: 600,
  pageHeight: 800,
  margin: 50,
  fitMode: "cover",
});
assert.equal(cover.y, 50);
assert.equal(cover.height, 700);
assert.ok(cover.x < 50);
assert.ok(cover.width > 500);

assert.deepEqual(
  calculateImageDrawBox({
    imageWidth: 1600,
    imageHeight: 900,
    pageWidth: 600,
    pageHeight: 800,
    margin: 50,
    fitMode: "stretch",
  }),
  { x: 50, y: 50, width: 500, height: 700 },
);

const orderedFiles = [
  new File(["one"], "one.jpg", { type: "image/jpeg" }),
  new File(["two"], "two.png", { type: "image/png" }),
  new File(["three"], "three.webp", { type: "image/webp" }),
];
assert.deepEqual(validateImageFiles(orderedFiles).accepted, orderedFiles);

console.log(
  JSON.stringify({
    exifOrientation1_3_6_8: "passed",
    containLayout: "passed",
    coverCropGeometry: "passed",
    stretchLayout: "passed",
    queueOrder: "passed",
  }),
);
