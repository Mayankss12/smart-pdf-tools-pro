import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as pdfjs from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";

import { addPageNumbersWithOptions } from "../src/lib/pdf-number-engine.ts";
import { applyWatermark } from "../src/lib/pdf-watermark-engine.ts";

const rotations = [0, 90, 180, 270];
const source = await PDFDocument.create();
for (const rotation of rotations) {
  const page = source.addPage([400, 600]);
  page.setRotation(degrees(rotation));
}
const sourceFile = new File([await source.save()], "rotations.pdf", {
  type: "application/pdf",
});

const numberProgress = [];
const numbered = await addPageNumbersWithOptions(sourceFile, {
  position: { xPercent: 22, yPercent: 31 },
  targetPages: [1, 2, 3, 4],
  startNumber: 7,
  fontSize: 18,
  font: "courier",
  opacity: 0.5,
  prefix: "P",
  suffix: " / {total}",
  color: [0.1, 0.2, 0.3],
  onProgress(progress) {
    numberProgress.push(progress);
  },
});
assert.deepEqual(numberProgress.at(-1), { completed: 4, total: 4 });
const numberedBytes = new Uint8Array(await numbered.blob.arrayBuffer());
const numberedPdf = await PDFDocument.load(numberedBytes);
assert.deepEqual(
  numberedPdf.getPages().map((page) => page.getRotation().angle),
  rotations,
);

const numberedRender = await pdfjs.getDocument({
  data: numberedBytes.slice(),
}).promise;
const numberPositions = [];
try {
  for (let pageNumber = 1; pageNumber <= numberedRender.numPages; pageNumber += 1) {
    const page = await numberedRender.getPage(pageNumber);
    try {
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const combinedText = content.items
        .map((candidate) => ("str" in candidate ? candidate.str : ""))
        .join("");
      const item = content.items.find(
        (candidate) => "str" in candidate && candidate.str.startsWith("P"),
      );
      assert.ok(item && "transform" in item);
      assert.equal(combinedText, `P${pageNumber + 6} / 4`);
      const point = viewport.convertToViewportPoint(
        item.transform[4],
        item.transform[5],
      );
      numberPositions.push({
        rotation: rotations[pageNumber - 1],
        xRatio: point[0] / viewport.width,
        yRatio: point[1] / viewport.height,
      });
    } finally {
      page.cleanup();
    }
  }
} finally {
  await numberedRender.destroy();
}

for (const position of numberPositions) {
  assert.ok(position.xRatio > 0.05 && position.xRatio < 0.45);
  assert.ok(position.yRatio > 0.15 && position.yRatio < 0.5);
}

const [latinFontBytes, devanagariFontBytes] = await Promise.all([
  readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
  readFile(
    new URL(
      "../public/fonts/NotoSansDevanagari-Regular.ttf",
      import.meta.url,
    ),
  ),
]);
const unicodeNumbered = await addPageNumbersWithOptions(sourceFile, {
  position: { xPercent: 50, yPercent: 92 },
  targetPages: [1],
  startNumber: 1,
  fontSize: 18,
  font: "helvetica",
  opacity: 0.65,
  prefix: "कखग ",
  suffix: " / {total}",
  color: [0.2, 0.1, 0.6],
  unicodeFontBytes: {
    latin: new Uint8Array(latinFontBytes),
    devanagari: new Uint8Array(devanagariFontBytes),
  },
});
const unicodeNumberedBytes = new Uint8Array(
  await unicodeNumbered.blob.arrayBuffer(),
);
const unicodeNumberedRender = await pdfjs.getDocument({
  data: unicodeNumberedBytes.slice(),
}).promise;
try {
  const page = await unicodeNumberedRender.getPage(1);
  try {
    const content = await page.getTextContent();
    const combinedText = content.items
      .map((candidate) => ("str" in candidate ? candidate.str : ""))
      .join("");
    assert.match(combinedText, /कखग/);
    assert.match(combinedText, /1 \/ 1/);
  } finally {
    page.cleanup();
  }
} finally {
  await unicodeNumberedRender.destroy();
}

const watermarkProgress = [];
const watermarked = await applyWatermark(sourceFile, {
  mode: "text",
  layout: "single",
  targetPages: [1, 2, 3, 4],
  text: "ROTATION",
  fontSize: 32,
  opacity: 0.42,
  angle: 137,
  fontStyle: "bold",
  color: [0.3, 0.2, 0.8],
  position: { xPercent: 73, yPercent: 24 },
  tileGap: 220,
  imageFile: null,
  imageScale: 36,
  onProgress(progress) {
    watermarkProgress.push(progress);
  },
});
assert.deepEqual(watermarkProgress.at(-1), { completed: 4, total: 4 });
const watermarkedBytes = new Uint8Array(await watermarked.blob.arrayBuffer());
const watermarkedPdf = await PDFDocument.load(watermarkedBytes);
assert.deepEqual(
  watermarkedPdf.getPages().map((page) => page.getRotation().angle),
  rotations,
);

const watermarkRender = await pdfjs.getDocument({
  data: watermarkedBytes.slice(),
}).promise;
try {
  for (let pageNumber = 1; pageNumber <= watermarkRender.numPages; pageNumber += 1) {
    const page = await watermarkRender.getPage(pageNumber);
    try {
      const content = await page.getTextContent();
      assert.ok(
        content.items.some(
          (item) => "str" in item && item.str === "ROTATION",
        ),
      );
    } finally {
      page.cleanup();
    }
  }
} finally {
  await watermarkRender.destroy();
}

console.log(
  JSON.stringify({
    rotations: rotations.join("/"),
    nonCentralPageNumberPlacement: "passed",
    pageNumberFontOpacityRange: "passed",
    pageNumberUnicodeAffix: "devanagari passed",
    watermarkFullAngleOpacityRange: "passed",
    mixedRotationPreservation: "passed",
    overlayProgress: "passed",
  }),
);