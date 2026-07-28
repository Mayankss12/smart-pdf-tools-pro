import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as pdfjs from "pdfjs-dist";
import { PDFDocument, degrees } from "pdf-lib";

import {
  applyFillSignExport,
  inspectFillSignForm,
} from "../src/lib/fill-sign-engine.ts";

const [latin, devanagari] = await Promise.all([
  readFile(new URL("../public/fonts/NotoSans-Regular.ttf", import.meta.url)),
  readFile(
    new URL(
      "../public/fonts/NotoSansDevanagari-Regular.ttf",
      import.meta.url,
    ),
  ),
]);
const fontBytes = {
  latin: new Uint8Array(latin),
  devanagari: new Uint8Array(devanagari),
};

const source = await PDFDocument.create();
const rotations = [0, 90, 180, 270];
for (const rotation of rotations) {
  const page = source.addPage([400, 600]);
  page.setRotation(degrees(rotation));
}
const form = source.getForm();
const name = form.createTextField("customer.name");
name.addToPage(source.getPage(0), { x: 40, y: 500, width: 180, height: 28 });
const accepted = form.createCheckBox("terms.accepted");
accepted.addToPage(source.getPage(0), { x: 40, y: 450, width: 18, height: 18 });
const contact = form.createRadioGroup("contact.method");
contact.addOptionToPage("Email", source.getPage(0), {
  x: 40,
  y: 410,
  width: 18,
  height: 18,
});
contact.addOptionToPage("Phone", source.getPage(0), {
  x: 80,
  y: 410,
  width: 18,
  height: 18,
});
const country = form.createDropdown("country");
country.addOptions(["India", "France"]);
country.addToPage(source.getPage(0), {
  x: 40,
  y: 350,
  width: 140,
  height: 28,
});

const sourceFile = new File([await source.save()], "form.pdf", {
  type: "application/pdf",
});
const inspected = await inspectFillSignForm(sourceFile);
assert.deepEqual(
  inspected.map((field) => field.kind),
  ["text", "checkbox", "radio", "dropdown"],
);

const overlay = {
  id: "unicode-overlay",
  pageNumber: 2,
  kind: "text",
  box: {
    xPercent: 68,
    yPercent: 19,
    widthPercent: 28,
    heightPercent: 9,
  },
  text: "नमस्ते 你好 😀",
  style: "clean",
  fontSize: 18,
};
const preserved = await applyFillSignExport({
  file: sourceFile,
  objects: [overlay],
  formValues: {
    "customer.name": "नमस्ते",
    "terms.accepted": true,
    "contact.method": "Phone",
    country: "India",
  },
  formMode: "preserve",
  fontBytes,
});
assert.equal(preserved.filledFieldCount, 4);
assert.ok(preserved.replacementCount >= 3);

const preservedBytes = new Uint8Array(await preserved.blob.arrayBuffer());
const preservedPdf = await PDFDocument.load(preservedBytes);
assert.deepEqual(
  preservedPdf.getPages().map((page) => page.getRotation().angle),
  rotations,
);
const preservedForm = preservedPdf.getForm();
assert.equal(preservedForm.getTextField("customer.name").getText(), "नमस्ते");
assert.equal(preservedForm.getCheckBox("terms.accepted").isChecked(), true);
assert.equal(preservedForm.getRadioGroup("contact.method").getSelected(), "Phone");
assert.deepEqual(preservedForm.getDropdown("country").getSelected(), ["India"]);

const rendered = await pdfjs.getDocument({
  data: preservedBytes.slice(),
}).promise;
try {
  const page = await rendered.getPage(2);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const item = content.items.find(
      (candidate) => "str" in candidate && candidate.str.includes("नमस्ते"),
    );
    assert.ok(item && "transform" in item);
    const point = viewport.convertToViewportPoint(
      item.transform[4],
      item.transform[5],
    );
    assert.ok(point[0] / viewport.width > 0.5);
    assert.ok(point[1] / viewport.height < 0.45);
  } finally {
    page.cleanup();
  }
} finally {
  await rendered.destroy();
}

const flattened = await applyFillSignExport({
  file: sourceFile,
  objects: [],
  formValues: {
    "customer.name": "Flattened",
    "terms.accepted": true,
    "contact.method": "Email",
    country: "France",
  },
  formMode: "flatten",
  fontBytes,
});
const flattenedPdf = await PDFDocument.load(
  await flattened.blob.arrayBuffer(),
);
assert.equal(flattenedPdf.getForm().getFields().length, 0);

console.log(
  JSON.stringify({
    acroFormInspection: "passed",
    supportedFieldFilling: "passed",
    preserveMode: "passed",
    flattenMode: "passed",
    unicodeOverlayFallback: "passed",
    rotations: rotations.join("/"),
    nonCentralPlacement: "passed",
  }),
);
