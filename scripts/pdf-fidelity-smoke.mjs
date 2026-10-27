import assert from "node:assert/strict";

import * as pdfjs from "pdfjs-dist";
import {
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFRawStream,
  PDFString,
  concatTransformationMatrix,
  drawObject,
  popGraphicsState,
  pushGraphicsState,
} from "pdf-lib";

import { mergePdfFiles, splitPdfIntoGroups } from "../src/lib/pdf-engine.ts";
import {
  deletePdfPages,
  extractPdfPages,
  reorderPdfPages,
} from "../src/lib/pdf-page-engine.ts";
import { splitPdfAtPages } from "../src/lib/pdf-stage-one.ts";
import { exportEditorPdfBytes } from "../src/lib/pdf-tools/editor-export-engine.ts";

const IMAGE_WIDTH = 600;
const IMAGE_HEIGHT = 400;

// Four pages with bookmarks that use every destination style we resolve:
// explicit /Dest arrays, named destinations in the /Names tree, GoTo actions
// and nested children. Page 2 carries a high-detail image.
async function createSourcePdf() {
  const pdf = await PDFDocument.create();
  const pages = [1, 2, 3, 4].map(() => pdf.addPage([400, 500]));
  const context = pdf.context;

  const pixels = new Uint8Array(IMAGE_WIDTH * IMAGE_HEIGHT * 3);
  let seed = 7;
  for (let index = 0; index < pixels.length; index += 1) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    pixels[index] = seed >>> 24;
  }
  const imageRef = context.register(
    context.flateStream(pixels, {
      Type: "XObject",
      Subtype: "Image",
      Width: IMAGE_WIDTH,
      Height: IMAGE_HEIGHT,
      ColorSpace: "DeviceRGB",
      BitsPerComponent: 8,
    }),
  );
  const imageName = pages[1].node.newXObject("Im", imageRef);
  pages[1].pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(300, 0, 0, 200, 50, 250),
    drawObject(imageName),
    popGraphicsState(),
  );

  const namedDestinations = context.obj({
    Names: [PDFString.of("section-1-1"), context.obj([pages[1].ref, "XYZ", 0, 480, 0])],
  });
  pdf.catalog.set(PDFName.of("Names"), context.obj({ Dests: namedDestinations }));
  pdf.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));

  const [rootRef, chapter1Ref, section11Ref, chapter2Ref, appendixRef] = [
    0, 1, 2, 3, 4,
  ].map(() => context.nextRef());

  context.assign(rootRef, context.obj({
    Type: "Outlines", First: chapter1Ref, Last: appendixRef, Count: 4,
  }));
  context.assign(chapter1Ref, context.obj({
    Title: PDFHexString.fromText("Chapter 1 — परिचय"),
    Parent: rootRef,
    Next: chapter2Ref,
    First: section11Ref,
    Last: section11Ref,
    Count: 1,
    Dest: [pages[0].ref, "XYZ", 0, 500, 0],
  }));
  context.assign(section11Ref, context.obj({
    Title: PDFString.of("Section 1.1"),
    Parent: chapter1Ref,
    Dest: PDFString.of("section-1-1"),
  }));
  context.assign(chapter2Ref, context.obj({
    Title: PDFString.of("Chapter 2"),
    Parent: rootRef,
    Prev: chapter1Ref,
    Next: appendixRef,
    A: { S: "GoTo", D: [pages[2].ref, "Fit"] },
  }));
  context.assign(appendixRef, context.obj({
    Title: PDFString.of("Appendix"),
    Parent: rootRef,
    Prev: chapter2Ref,
    Dest: [pages[3].ref, "Fit"],
  }));
  pdf.catalog.set(PDFName.of("Outlines"), rootRef);

  return pdf.save();
}

// Reads bookmarks with pdf.js, an independent reader, as "title→page" trees.
async function readOutline(bytes) {
  const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
  try {
    async function walk(items) {
      return Promise.all((items ?? []).map(async (item) => {
        const dest = typeof item.dest === "string"
          ? await pdf.getDestination(item.dest)
          : item.dest;
        const page = dest ? (await pdf.getPageIndex(dest[0])) + 1 : null;
        const children = await walk(item.items);
        return children.length
          ? { [`${item.title}→${page}`]: children }
          : `${item.title}→${page}`;
      }));
    }
    return await walk(await pdf.getOutline());
  } finally {
    await pdf.destroy();
  }
}

function getImageStreamBytes(pdf) {
  return pdf.context
    .enumerateIndirectObjects()
    .map(([, object]) => object)
    .filter(
      (object) =>
        object instanceof PDFRawStream &&
        object.dict.lookup(PDFName.of("Subtype")) === PDFName.of("Image"),
    )
    .map((stream) => stream.getContents());
}

async function assertOriginalImage(bytes, label) {
  const [image, ...others] = getImageStreamBytes(await PDFDocument.load(bytes));
  assert.equal(others.length, 0, `${label}: one image stream`);
  assert.deepEqual(
    Buffer.from(image),
    Buffer.from(sourceImage),
    `${label}: image bytes are untouched`,
  );
}

const asFile = (bytes, name) => new File([bytes], name, { type: "application/pdf" });
const outputBytes = async (result) => new Uint8Array(await result.blob.arrayBuffer());

const sourceBytes = await createSourcePdf();
const [sourceImage] = getImageStreamBytes(await PDFDocument.load(sourceBytes));
const sourceFile = asFile(sourceBytes, "chapters.pdf");

assert.deepEqual(await readOutline(sourceBytes), [
  { "Chapter 1 — परिचय→1": ["Section 1.1→2"] },
  "Chapter 2→3",
  "Appendix→4",
]);

const reordered = await outputBytes(await reorderPdfPages(sourceFile, [4, 3, 2, 1]));
assert.deepEqual(await readOutline(reordered), [
  { "Chapter 1 — परिचय→4": ["Section 1.1→3"] },
  "Chapter 2→2",
  "Appendix→1",
]);
await assertOriginalImage(reordered, "reorder");
const reorderedPdf = await PDFDocument.load(reordered);
assert.equal(
  reorderedPdf.catalog.lookup(PDFName.of("PageMode")),
  PDFName.of("UseOutlines"),
);

// Chapter 1's page is gone, but it still groups Section 1.1, so it stays as a heading.
const extracted = await outputBytes(await extractPdfPages(sourceFile, [2, 3]));
assert.deepEqual(await readOutline(extracted), [
  { "Chapter 1 — परिचय→null": ["Section 1.1→1"] },
  "Chapter 2→2",
]);
await assertOriginalImage(extracted, "extract");

const deleted = await outputBytes(await deletePdfPages(sourceFile, [3]));
assert.deepEqual(await readOutline(deleted), [
  { "Chapter 1 — परिचय→1": ["Section 1.1→2"] },
  "Appendix→3",
]);

const merged = await outputBytes(
  await mergePdfFiles([sourceFile, asFile(sourceBytes, "chapters-copy.pdf")]),
);
assert.deepEqual(await readOutline(merged), [
  { "Chapter 1 — परिचय→1": ["Section 1.1→2"] },
  "Chapter 2→3",
  "Appendix→4",
  { "Chapter 1 — परिचय→5": ["Section 1.1→6"] },
  "Chapter 2→7",
  "Appendix→8",
]);

const [firstGroup, secondGroup] = await splitPdfIntoGroups(sourceFile, [
  { label: "1-2", pages: [1, 2] },
  { label: "3-4", pages: [3, 4] },
]);
assert.deepEqual(await readOutline(await outputBytes(firstGroup)), [
  { "Chapter 1 — परिचय→1": ["Section 1.1→2"] },
]);
assert.deepEqual(await readOutline(await outputBytes(secondGroup)), [
  "Chapter 2→1",
  "Appendix→2",
]);

const [, chapterTwoOnward] = await splitPdfAtPages(sourceBytes, [3]);
assert.deepEqual(await readOutline(chapterTwoOnward), [
  "Chapter 2→1",
  "Appendix→2",
]);

// Editing never re-encodes the original page images, and keeps bookmarks.
const edited = await exportEditorPdfBytes({
  fileBytes: sourceBytes,
  objects: [{
    id: "image-highlight",
    type: "highlight",
    pageNumber: 2,
    box: { x: 60, y: 60, width: 200, height: 24 },
    data: { backgroundColor: "#fde047", opacity: 0.45 },
  }],
});
await assertOriginalImage(edited, "editor export");
assert.deepEqual(await readOutline(edited), await readOutline(sourceBytes));

console.log(
  JSON.stringify({
    bookmarksAfterReorder: "passed",
    bookmarksAfterExtract: "passed",
    bookmarksAfterDelete: "passed",
    bookmarksAfterMerge: "passed",
    bookmarksAfterSplit: "passed",
    namedAndActionDestinations: "passed",
    originalImageBytesPreserved: "passed",
  }),
);
