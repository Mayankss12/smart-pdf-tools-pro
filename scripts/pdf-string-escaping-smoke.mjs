import assert from "node:assert/strict";

import * as pdfjs from "pdfjs-dist";
import { PDFDict, PDFDocument, PDFName, PDFString } from "pdf-lib";

import { escapePdfLiteral, pdfLiteralString } from "../src/lib/pdf-string.ts";
import { exportEditorPdfBytes } from "../src/lib/pdf-tools/editor-export-engine.ts";

// A ")" inside an unescaped literal ends the string and the rest is read as PDF
// syntax, so link URLs, ids and font operators must be escaped.
assert.equal(escapePdfLiteral("a(b)c\\d"), "a\\(b\\)c\\\\d");
assert.equal(escapePdfLiteral("line\r\nbreak"), "line\\r\\nbreak");
assert.equal(pdfLiteralString("a(b)c\\d").decodeText(), "a(b)c\\d");

const source = await PDFDocument.create();
source.addPage([300, 200]);
const sourceBytes = await source.save();

const hostileUrl = "https://example.com/a)/S/JavaScript/JS(app.alert(1))(";
const hostileId = "note)/Subtype/Link/A<</S/JavaScript/JS(app.alert(2))>>(";

const exported = await exportEditorPdfBytes({
  fileBytes: sourceBytes,
  objects: [
    {
      id: "link-1",
      type: "text",
      pageNumber: 1,
      box: { x: 20, y: 20, width: 100, height: 20 },
      data: { text: "Click", linkUrl: hostileUrl },
    },
    {
      id: hostileId,
      type: "note",
      pageNumber: 1,
      box: { x: 20, y: 60, width: 120, height: 60 },
      data: { text: "Note", fontSize: Number.NaN },
    },
  ],
});

const pdf = await pdfjs.getDocument({ data: exported.slice() }).promise;
try {
  const page = await pdf.getPage(1);
  const annotations = await page.getAnnotations();
  const link = annotations.find((annotation) => annotation.subtype === "Link");
  const note = annotations.find((annotation) => annotation.subtype === "FreeText");

  assert.ok(link, "link annotation exported");
  assert.equal(new URL(link.url).hostname, "example.com");
  assert.equal(link.url, new URL(hostileUrl).toString(), "URL is kept whole");
  assert.equal(link.action, undefined, "no JavaScript action injected");

  assert.ok(note, "note annotation exported as FreeText");
  assert.equal(
    annotations.filter((annotation) => annotation.subtype === "Link").length,
    1,
    "hostile id did not create a second Link annotation",
  );
  assert.equal(
    annotations.some((annotation) => annotation.actions || annotation.action),
    false,
    "no annotation carries a script action",
  );
} finally {
  await pdf.destroy();
}

// pdf.js does not expose /NM, so read it back with pdf-lib.
const reopened = await PDFDocument.load(exported);
const annotationDicts = reopened
  .getPage(0)
  .node.Annots()
  .asArray()
  .map((ref) => reopened.context.lookup(ref, PDFDict));
const freeText = annotationDicts.find(
  (dict) => dict.lookup(PDFName.of("Subtype")) === PDFName.of("FreeText"),
);
assert.equal(
  freeText.lookup(PDFName.of("NM"), PDFString).decodeText(),
  hostileId,
  "annotation name survives unchanged",
);
assert.equal(
  freeText.lookup(PDFName.of("DA"), PDFString).decodeText(),
  "/Helv 14 Tf 0 g",
  "non-finite font size falls back to 14",
);

console.log(
  JSON.stringify({
    literalEscaping: "passed",
    hostileLinkUrl: "passed",
    hostileAnnotationName: "passed",
    nonFiniteFontSize: "passed",
  }),
);
