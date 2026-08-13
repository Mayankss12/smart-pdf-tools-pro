import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  normalizeProportionalMarkBox,
  resizeProportionalMarkBox,
  scaleProportionalMarkBox,
} from "../src/lib/fill-sign-layout.ts";

const page = { width: 600, height: 800 };
const pixels = (box) => ({
  width: (box.widthPercent / 100) * page.width,
  height: (box.heightPercent / 100) * page.height,
});

const normalized = normalizeProportionalMarkBox(
  { xPercent: 48, yPercent: 48, widthPercent: 6, heightPercent: 5 },
  page,
);
assert.ok(Math.abs(pixels(normalized).width - pixels(normalized).height) < 0.01);

const resized = resizeProportionalMarkBox({
  box: normalized,
  handle: "se",
  deltaXPercent: 4,
  deltaYPercent: 1,
  page,
});
assert.ok(Math.abs(pixels(resized).width - pixels(resized).height) < 0.01);

const scaled = scaleProportionalMarkBox(resized, 3, page);
assert.ok(Math.abs(pixels(scaled).width - pixels(scaled).height) < 0.01);

const pageSource = await readFile(
  new URL("../src/app/tools/fill-sign/page.tsx", import.meta.url),
  "utf8",
);
assert.doesNotMatch(pageSource, />\s*Drag\s*</);
assert.match(pageSource, /data-fill-selection-controls/);
assert.match(pageSource, /resizeProportionalMarkBox/);
assert.match(pageSource, /scaleProportionalMarkBox/);

console.log(
  JSON.stringify({
    markPixelAspect: "passed",
    cornerResizeAspect: "passed",
    sizeControlAspect: "passed",
    unobstructedControls: "passed",
  }),
);
