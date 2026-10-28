import assert from "node:assert/strict";
import { deflateSync } from "node:zlib";

import * as pdfjs from "pdfjs-dist";
import {
  PDFDocument,
  PDFName,
  PDFRef,
  StandardFonts,
  degrees,
  rgb,
} from "pdf-lib";

import {
  compressPdf,
  compressedPdfPagesAreReadable,
  structurallyCompress,
} from "../src/lib/pdf-compress.ts";

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

const threePagePdf = await PDFDocument.create();
for (let index = 0; index < 3; index += 1) {
  threePagePdf.addPage([420, 300]);
}
const threePageBytes = await threePagePdf.save({ useObjectStreams: false });
assert.equal(await compressedPdfPagesAreReadable(threePageBytes, 3), true);
assert.equal(await compressedPdfPagesAreReadable(threePageBytes, 2), false);
assert.equal(await compressedPdfPagesAreReadable(new Uint8Array([1, 2, 3]), 3), false);

const threePageResult = await compressPdf(
  new File([threePageBytes], "three-pages.pdf", { type: "application/pdf" }),
  { mode: "structural", level: "medium" },
);
const threePageResultBytes = new Uint8Array(await threePageResult.blob.arrayBuffer());
assert.equal(await compressedPdfPagesAreReadable(threePageResultBytes, 3), true);

const versionedReferencePdf = await PDFDocument.create();
versionedReferencePdf.addPage([420, 300]);
versionedReferencePdf.context.assign(PDFRef.of(23, 1), PDFName.of("VersionedObject"));
const versionedReferenceBytes = await versionedReferencePdf.save({ useObjectStreams: false });
assert.equal(await compressedPdfPagesAreReadable(versionedReferenceBytes, 1), true);
const versionedReferenceResult = await compressPdf(
  new File([versionedReferenceBytes], "versioned-reference.pdf", { type: "application/pdf" }),
  { mode: "structural", level: "medium", removeMetadata: true },
);
assert.equal(versionedReferenceResult.usedOriginal, true);
assert.deepEqual(
  new Uint8Array(await versionedReferenceResult.blob.arrayBuffer()),
  versionedReferenceBytes,
);

// Preserve Text mode resamples only oversized photos, in place.
async function createImagePdf() {
  const pdf = await PDFDocument.create();
  const imageFont = await pdf.embedFont(StandardFonts.Helvetica);
  const letterPage = pdf.addPage([612, 792]);
  letterPage.drawText("Photo report text stays selectable", {
    x: 40, y: 740, size: 16, font: imageFont,
  });
  const context = pdf.context;

  function image(width, height, colorSpace, contents, extra = {}) {
    return context.register(context.stream(contents, {
      Type: "XObject",
      Subtype: "Image",
      Width: width,
      Height: height,
      ColorSpace: colorSpace,
      BitsPerComponent: 8,
      ...extra,
    }));
  }

  // 3000×2000 RGB with PNG "Up" row filters: every row predicts from the one above.
  const predictedRows = new Uint8Array((3000 * 3 + 1) * 2000);
  for (let row = 0; row < 2000; row += 1) {
    predictedRows[row * (3000 * 3 + 1)] = 2;
  }
  predictedRows.set([200, 100, 50], 1);
  const deflated = deflateSync(predictedRows);
  const photo = image(3000, 2000, "DeviceRGB", deflated, {
    Filter: "FlateDecode",
    DecodeParms: { Predictor: 15, Colors: 3, BitsPerComponent: 8, Columns: 3000 },
  });
  const mask = image(3000, 2000, "DeviceGray", new Uint8Array(10), { Filter: "FlateDecode" });
  const maskedJpeg = image(2600, 2600, "DeviceRGB", new Uint8Array(400_000), {
    Filter: "DCTDecode",
    SMask: mask,
  });
  const smallJpeg = image(800, 600, "DeviceGray", new Uint8Array(50_000), { Filter: "DCTDecode" });
  const cmyk = image(3000, 3000, "DeviceCMYK", new Uint8Array(1000), { Filter: "FlateDecode" });
  const stubborn = image(2500, 2500, "DeviceRGB", new Uint8Array(1000), { Filter: "DCTDecode" });
  const formImage = image(2400, 2400, "DeviceRGB", new Uint8Array(300_000), { Filter: "DCTDecode" });
  const form = context.register(context.stream("q /Fx Do Q", {
    Type: "XObject",
    Subtype: "Form",
    BBox: [0, 0, 612, 792],
    Resources: { XObject: { Fx: formImage } },
  }));

  for (const [label, ref] of Object.entries({ photo, maskedJpeg, smallJpeg, cmyk, stubborn, form })) {
    letterPage.node.newXObject(label, ref);
  }

  return {
    bytes: await pdf.save({ useObjectStreams: false }),
    refs: { photo, mask, maskedJpeg, smallJpeg, cmyk, stubborn, formImage },
  };
}

const imagePdf = await createImagePdf();
const codecCalls = [];
const downsampled = await PDFDocument.load(
  await structurallyCompress(
    imagePdf.bytes,
    "medium",
    false,
    undefined,
    undefined,
    async (source, targetWidth, targetHeight) => {
      codecCalls.push({ source, targetWidth, targetHeight });
      // The "stubborn" image re-encodes larger than it started, so it must be kept.
      return new Uint8Array(source.kind === "jpeg" && source.bytes.length === 1000 ? 5000 : 2000);
    },
  ),
);
const imageDict = (ref) => downsampled.context.lookup(ref).dict;
const imageNumber = (ref, key) =>
  imageDict(ref).lookup(PDFName.of(key))?.asNumber();
const imageName = (ref, key) =>
  imageDict(ref).lookup(PDFName.of(key))?.asString();

// Letter page, longest side 11 in × 150 DPI = 1650 px.
assert.deepEqual(
  codecCalls.map(({ targetWidth, targetHeight }) => [targetWidth, targetHeight]).sort(),
  [[1650, 1100], [1650, 1650], [1650, 1650], [1650, 1650]].sort(),
);
const flateCall = codecCalls.find(({ source }) => source.kind === "pixels");
assert.equal(flateCall.source.width, 3000);
// PNG "Up" prediction is undone: the last row still carries the first row's pixel.
const lastRowStart = 1999 * 3000 * 4;
assert.deepEqual(
  [...flateCall.source.rgba.slice(lastRowStart, lastRowStart + 4)],
  [200, 100, 50, 255],
);

assert.equal(imageNumber(imagePdf.refs.photo, "Width"), 1650);
assert.equal(imageNumber(imagePdf.refs.photo, "Height"), 1100);
assert.equal(imageName(imagePdf.refs.photo, "Filter"), "/DCTDecode");
assert.equal(imageDict(imagePdf.refs.photo).get(PDFName.of("DecodeParms")), undefined);
assert.equal(
  imageDict(imagePdf.refs.maskedJpeg).get(PDFName.of("SMask")).toString(),
  imagePdf.refs.mask.toString(),
);
assert.equal(imageNumber(imagePdf.refs.formImage, "Width"), 1650);
assert.equal(imageNumber(imagePdf.refs.smallJpeg, "Width"), 800);
assert.equal(imageName(imagePdf.refs.cmyk, "ColorSpace"), "/DeviceCMYK");
assert.equal(imageNumber(imagePdf.refs.cmyk, "Width"), 3000);
assert.equal(imageNumber(imagePdf.refs.stubborn, "Width"), 2500);

console.log(
  JSON.stringify({
    oversizedImageResampling: "passed",
    pngPredictorDecoding: "passed",
    softMaskPreserved: "passed",
    formXObjectImages: "passed",
    unsupportedColorSpacesKept: "passed",
    noGainImagesKept: "passed",
    selectableText: "passed",
    vectorAndFormStructure: "passed",
    pageSizeAndRotation: "passed",
    metadata: "passed",
    cancellation: "passed",
    largerOutputProtection: "original-preserved",
    unreadableOutputDetection: "passed",
    multiPageReopen: "passed",
    versionedReferenceFallback: "original-preserved",
  }),
);
