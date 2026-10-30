import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import * as pdfjs from "pdfjs-dist";
import {
  PDFDocument,
  PDFName,
  PDFString,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

import {
  alternateMixPdfPages,
  extractEmbeddedImages,
  grayscaleRgba,
  nUpPdfPages,
  resizePdfPages,
} from "../src/lib/pdf-phase-one-engine.ts";

const asFile = (bytes, filename) => new File([bytes], filename, { type: "application/pdf" });
const bytesOf = async (result) => new Uint8Array(await result.blob.arrayBuffer());

async function makePdf(prefix, pageCount, withImage = false) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    const page = pdf.addPage([400, 600]);
    page.drawText(`${prefix}${i}`, { x: 40, y: 520, size: 25, font });
    if (i === 1) page.drawRectangle({ x: 50, y: 350, width: 160, height: 90, color: rgb(1, 0, 0) });
    if (i === 2) page.setRotation(degrees(90));
  }
  if (withImage) {
    const samples = new Uint8Array([255, 0, 0, 0, 255, 0]);
    const image = pdf.context.register(pdf.context.flateStream(samples, {
      Type: "XObject", Subtype: "Image", Width: 2, Height: 1,
      ColorSpace: "DeviceRGB", BitsPerComponent: 8,
    }));
    pdf.getPage(0).node.newXObject("TestImage", image);
  }
  const bookmarkPage = prefix === "A" ? 0 : 1;
  const rootRef = pdf.context.nextRef();
  const itemRef = pdf.context.nextRef();
  pdf.context.assign(rootRef, pdf.context.obj({ Type: "Outlines", First: itemRef, Last: itemRef, Count: 1 }));
  pdf.context.assign(itemRef, pdf.context.obj({
    Title: PDFString.of(`${prefix} bookmark`), Parent: rootRef,
    Dest: [pdf.getPage(bookmarkPage).ref, "Fit"],
  }));
  pdf.catalog.set(PDFName.of("Outlines"), rootRef);
  return asFile(await pdf.save({ useObjectStreams: false }), `${prefix}.pdf`);
}

async function inspectPdf(bytes) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  try {
    const pages = [];
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      try {
        pages.push({
          width: page.view[2] - page.view[0],
          height: page.view[3] - page.view[1],
          rotation: page.rotate,
          text: (await page.getTextContent()).items.map((item) => "str" in item ? item.str : "").join(" "),
        });
      } finally { page.cleanup(); }
    }
    return pages;
  } finally { await pdf.destroy(); }
}

const a = await makePdf("A", 3, true);
const b = await makePdf("B", 4);

const resized = await resizePdfPages(a, { width: 595.28, height: 841.89 });
const resizedPages = await inspectPdf(await bytesOf(resized));
assert.equal(resizedPages.length, 3);
for (const page of resizedPages) {
  assert.ok(Math.abs(page.width - 595.28) < 0.1);
  assert.ok(Math.abs(page.height - 841.89) < 0.1);
}
assert.match(resizedPages[0].text, /A1/);
assert.equal(resizedPages[1].rotation, 90);
await assert.rejects(resizePdfPages(a, { width: 0, height: 600 }));

const nup = await nUpPdfPages(a, { count: 2, size: "a4", landscape: true });
const nupPages = await inspectPdf(await bytesOf(nup));
assert.equal(nupPages.length, 2);
assert.match(nupPages[0].text, /A1/);
assert.match(nupPages[0].text, /A2/);
assert.match(nupPages[1].text, /A3/);
for (const count of [4, 6, 9]) {
  const alternateLayout = await nUpPdfPages(a, { count, size: "letter", landscape: false });
  const pages = await inspectPdf(await bytesOf(alternateLayout));
  assert.equal(pages.length, 1);
  for (const label of ["A1", "A2", "A3"]) assert.match(pages[0].text, new RegExp(label));
}

const mixed = await alternateMixPdfPages(a, b, { startWith: "first", reverseSecond: true });
const mixedPages = await inspectPdf(await bytesOf(mixed));
assert.deepEqual(mixedPages.map((page) => page.text.trim()), ["A1", "B4", "A2", "B3", "A3", "B2", "B1"]);
const secondFirst = await alternateMixPdfPages(a, b, { startWith: "second", reverseSecond: false });
assert.deepEqual((await inspectPdf(await bytesOf(secondFirst))).map((page) => page.text.trim()), ["B1", "A1", "B2", "A2", "B3", "A3", "B4"]);
const mixedReader = await pdfjs.getDocument({ data: (await bytesOf(mixed)).slice() }).promise;
try {
  const outline = await mixedReader.getOutline();
  assert.deepEqual(outline?.map((item) => item.title), ["A bookmark", "B bookmark"]);
  assert.equal(await mixedReader.getPageIndex(outline[0].dest[0]), 0);
  assert.equal(await mixedReader.getPageIndex(outline[1].dest[0]), 5);
} finally { await mixedReader.destroy(); }

if (process.argv.includes("--visual")) {
  const target = join(process.cwd(), "tmp", "phase-one-visual");
  await mkdir(target, { recursive: true });
  for (const [filename, result] of [
    ["source.pdf", a], ["source-color.pdf", a], ["resized.pdf", resized], ["n-up.pdf", nup], ["alternate-mix.pdf", mixed],
  ]) {
    const bytes = result instanceof File ? new Uint8Array(await result.arrayBuffer()) : await bytesOf(result);
    await writeFile(join(target, filename), bytes);
  }
}

const pixels = grayscaleRgba(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 123]));
assert.deepEqual([...pixels], [54, 54, 54, 255, 182, 182, 182, 123]);

const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64"));
let extractedPixels;
const extracted = await extractEmbeddedImages(a, async (width, height, rgba) => {
  extractedPixels = { width, height, rgba: [...rgba] };
  return new Blob([png], { type: "image/png" });
});
assert.equal(extracted.count, 1);
assert.equal(extracted.skipped, 0);
assert.deepEqual(extractedPixels, { width: 2, height: 1, rgba: [255, 0, 0, 255, 0, 255, 0, 255] });
const zip = new Uint8Array(await extracted.blob.arrayBuffer());
assert.deepEqual([...zip.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
assert.match(new TextDecoder().decode(zip), /image-001\.png/);
await assert.rejects(extractEmbeddedImages(b, async () => new Blob([png])), /No supported embedded images/);

console.log(JSON.stringify({ resizedPages: 3, nUpSheets: 2, mixedPages: 7, grayscalePixelMath: "passed", extractedImages: 1, zipMagic: "passed" }));
