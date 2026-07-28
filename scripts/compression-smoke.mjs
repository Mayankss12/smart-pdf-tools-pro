import assert from "node:assert/strict";

import * as pdfjs from "pdfjs-dist";
import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

import { compressPdf } from "../src/lib/pdf-compress.ts";

const source = await PDFDocument.create();
source.setTitle("Compression smoke");
source.setAuthor("PDFMantra");
const font = await source.embedFont(StandardFonts.Helvetica);
const page = source.addPage([420, 300]);
page.setRotation(degrees(90));
page.drawText("Selectable structural compression text", {
  x: 42,
  y: 220,
  size: 18,
  font,
});
page.drawRectangle({
  x: 40,
  y: 80,
  width: 200,
  height: 80,
  borderWidth: 2,
  borderColor: rgb(0.2, 0.3, 0.7),
});
source.getForm().createTextField("customer.name");
const sourceBytes = await source.save({ useObjectStreams: false });
const sourceFile = new File([sourceBytes], "structural.pdf", {
  type: "application/pdf",
});

const progress = [];
const result = await compressPdf(sourceFile, {
  mode: "structural",
  level: "medium",
  onProgress: (event) => progress.push(event),
});
assert.equal(result.method, "structural");
assert.ok(progress.some((event) => event.percent === null));
assert.equal(progress.at(-1)?.percent, 100);

const outputBytes = new Uint8Array(await result.blob.arrayBuffer());
const output = await PDFDocument.load(outputBytes);
assert.equal(output.getPageCount(), 1);
assert.equal(output.getPage(0).getRotation().angle, 90);
assert.deepEqual(output.getPage(0).getSize(), { width: 420, height: 300 });
assert.equal(output.getTitle(), "Compression smoke");
assert.equal(output.getAuthor(), "PDFMantra");
assert.equal(output.getForm().getFields().length, 1);

const rendered = await pdfjs.getDocument({ data: outputBytes.slice() }).promise;
try {
  const renderedPage = await rendered.getPage(1);
  try {
    const content = await renderedPage.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    assert.match(text, /Selectable structural compression text/);
  } finally {
    renderedPage.cleanup();
  }
} finally {
  await rendered.destroy();
}

const controller = new AbortController();
controller.abort();
await assert.rejects(
  compressPdf(sourceFile, {
    mode: "structural",
    level: "medium",
    signal: controller.signal,
  }),
  (error) => error instanceof DOMException && error.name === "AbortError",
);

const optimized = await PDFDocument.create();
optimized.addPage([100, 100]);
const optimizedBytes = await optimized.save({ useObjectStreams: true });
const optimizedFile = new File([optimizedBytes], "optimized.pdf", {
  type: "application/pdf",
});
const optimizedResult = await compressPdf(optimizedFile, {
  mode: "structural",
  level: "medium",
});
assert.equal(optimizedResult.usedOriginal, true);
assert.equal(optimizedResult.compressedSize, optimizedFile.size);
assert.deepEqual(
  new Uint8Array(await optimizedResult.blob.arrayBuffer()),
  new Uint8Array(await optimizedFile.arrayBuffer()),
);

console.log(
  JSON.stringify({
    selectableText: "passed",
    vectorAndFormStructure: "passed",
    pageSizeAndRotation: "passed",
    metadata: "passed",
    cancellation: "passed",
    largerOutputProtection: "original-preserved",
  }),
);
