import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  normalizeProportionalMediaBox,
  resizeProportionalMediaBox,
  scaleProportionalMediaBox,
} from "../src/lib/fill-sign-layout.ts";

function physicalAspect(box, page) {
  const width = (box.widthPercent / 100) * page.width;
  const height = (box.heightPercent / 100) * page.height;
  return width / height;
}

for (const page of [
  { width: 600, height: 800 },
  { width: 900, height: 600 },
]) {
  const normalized = normalizeProportionalMediaBox({
    box: {
      xPercent: 50,
      yPercent: 65,
      widthPercent: 28,
      heightPercent: 18,
    },
    page,
    aspectRatio: 2,
  });

  assert.ok(Math.abs(physicalAspect(normalized, page) - 2) < 1e-9);
  assert.ok(normalized.xPercent >= 0);
  assert.ok(normalized.yPercent >= 0);
  assert.ok(normalized.xPercent + normalized.widthPercent <= 100 + 1e-9);
  assert.ok(normalized.yPercent + normalized.heightPercent <= 100 + 1e-9);

  const resized = resizeProportionalMediaBox({
    box: normalized,
    handle: "se",
    deltaXPercent: 8,
    deltaYPercent: 1,
    page,
    aspectRatio: 2,
  });
  assert.ok(Math.abs(physicalAspect(resized, page) - 2) < 1e-9);

  const resizedFromNorthWest = resizeProportionalMediaBox({
    box: normalized,
    handle: "nw",
    deltaXPercent: -5,
    deltaYPercent: -4,
    page,
    aspectRatio: 2,
  });
  assert.ok(Math.abs(physicalAspect(resizedFromNorthWest, page) - 2) < 1e-9);
  assert.ok(resizedFromNorthWest.xPercent >= 0);
  assert.ok(resizedFromNorthWest.yPercent >= 0);

  const scaled = scaleProportionalMediaBox({
    box: normalized,
    deltaWidthPercent: 5,
    page,
    aspectRatio: 2,
  });
  assert.ok(Math.abs(physicalAspect(scaled, page) - 2) < 1e-9);
}

const pageSource = await readFile(
  new URL("../src/app/tools/fill-sign/page.tsx", import.meta.url),
  "utf8",
);

assert.match(pageSource, /normalizeProportionalMediaBox/);
assert.match(pageSource, /resizeProportionalMediaBox/);
assert.match(pageSource, /scaleProportionalMediaBox/);
assert.match(
  pageSource,
  /object\.image &&\s*\(object\.kind === "image" \|\| object\.kind === "signature"\)/,
);
assert.match(
  pageSource,
  /image &&\s*\(kind === "image" \|\| kind === "signature"\)/,
);
assert.match(pageSource, /aspectRatio:\s*image\.width \/ Math\.max\(1, image\.height\)/);
assert.match(
  pageSource,
  /aspectRatio:\s*object\.image\.width \/ Math\.max\(1, object\.image\.height\)/,
);

console.log(
  JSON.stringify({
    portraitMediaAspectLock: "passed",
    landscapeMediaAspectLock: "passed",
    mediaCornerResizeAspectLock: "passed",
    mediaToolbarScaleAspectLock: "passed",
    uploadedImageAspectLock: "passed",
    imageSignatureAspectLock: "passed",
  }),
);
