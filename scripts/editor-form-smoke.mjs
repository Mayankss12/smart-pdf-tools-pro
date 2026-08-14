import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";

import {
  createEditorFormFields,
  normalizeEditorFormFieldName,
  normalizeEditorFormOptions,
} from "../src/lib/pdf-tools/editor-form-engine.ts";
import { getEditorPageGeometry } from "../src/lib/pdf-tools/editor-page-geometry.ts";

assert.equal(normalizeEditorFormFieldName("  Customer   Name  "), "Customer Name");
assert.equal(normalizeEditorFormFieldName("\u0000\u0001"), null);
assert.deepEqual(
  normalizeEditorFormOptions([" One ", "Two", "One", "", "Three"]),
  ["One", "Two", "Three"],
);

const pdfDoc = await PDFDocument.create();
pdfDoc.addPage([600, 800]);

const objects = [
  {
    id: "text-field",
    pageNumber: 1,
    box: { x: 60, y: 80, width: 220, height: 34 },
    data: {
      formField: {
        type: "text",
        name: "CustomerName",
        required: true,
        multiline: true,
        defaultValue: "Mayank",
      },
    },
  },
  {
    id: "checkbox-field",
    pageNumber: 1,
    box: { x: 60, y: 140, width: 24, height: 24 },
    data: {
      formField: {
        type: "checkbox",
        name: "AcceptedTerms",
        checked: true,
      },
    },
  },
  {
    id: "dropdown-field",
    pageNumber: 1,
    box: { x: 60, y: 200, width: 180, height: 34 },
    data: {
      formField: {
        type: "dropdown",
        name: "Warehouse",
        options: ["Delhi", "Mumbai", "Gurugram"],
        defaultValue: "Gurugram",
      },
    },
  },
  {
    id: "radio-one",
    pageNumber: 1,
    box: { x: 60, y: 260, width: 24, height: 24 },
    data: {
      formField: {
        type: "radio",
        name: "Priority",
        optionValue: "Normal",
      },
    },
  },
  {
    id: "radio-two",
    pageNumber: 1,
    box: { x: 100, y: 260, width: 24, height: 24 },
    data: {
      formField: {
        type: "radio",
        name: "Priority",
        optionValue: "Urgent",
        defaultValue: "Urgent",
      },
    },
  },
];

const result = await createEditorFormFields({
  pdfDoc,
  objects,
  getGeometry: getEditorPageGeometry,
});

assert.equal(result.createdCount, 5);
assert.deepEqual(result.fieldNames, [
  "CustomerName",
  "AcceptedTerms",
  "Warehouse",
  "Priority",
]);

const saved = await pdfDoc.save();
const reloaded = await PDFDocument.load(saved);
const form = reloaded.getForm();

const text = form.getTextField("CustomerName");
assert.equal(text.getText(), "Mayank");
assert.equal(text.isRequired(), true);
assert.equal(text.isMultiline(), true);

const checkbox = form.getCheckBox("AcceptedTerms");
assert.equal(checkbox.isChecked(), true);

const dropdown = form.getDropdown("Warehouse");
assert.deepEqual(dropdown.getOptions(), ["Delhi", "Mumbai", "Gurugram"]);
assert.deepEqual(dropdown.getSelected(), ["Gurugram"]);

const radio = form.getRadioGroup("Priority");
assert.deepEqual(radio.getOptions().sort(), ["Normal", "Urgent"]);
assert.equal(radio.getSelected(), "Urgent");

const duplicatePdf = await PDFDocument.create();
duplicatePdf.addPage([600, 800]);
await assert.rejects(
  () =>
    createEditorFormFields({
      pdfDoc: duplicatePdf,
      objects: [
        {
          id: "one",
          pageNumber: 1,
          box: { x: 10, y: 10, width: 100, height: 30 },
          data: { formField: { type: "text", name: "Duplicate" } },
        },
        {
          id: "two",
          pageNumber: 1,
          box: { x: 10, y: 60, width: 100, height: 30 },
          data: { formField: { type: "checkbox", name: "Duplicate" } },
        },
      ],
      getGeometry: getEditorPageGeometry,
    }),
  /already in use/,
);

const invalidDropdownPdf = await PDFDocument.create();
invalidDropdownPdf.addPage([600, 800]);
await assert.rejects(
  () =>
    createEditorFormFields({
      pdfDoc: invalidDropdownPdf,
      objects: [
        {
          id: "dropdown",
          pageNumber: 1,
          box: { x: 20, y: 20, width: 160, height: 32 },
          data: {
            formField: {
              type: "dropdown",
              name: "InvalidDefault",
              options: ["A", "B"],
              defaultValue: "C",
            },
          },
        },
      ],
      getGeometry: getEditorPageGeometry,
    }),
  /default value must match/,
);

const duplicateRadioPdf = await PDFDocument.create();
duplicateRadioPdf.addPage([600, 800]);
await assert.rejects(
  () =>
    createEditorFormFields({
      pdfDoc: duplicateRadioPdf,
      objects: [
        {
          id: "radio-a",
          pageNumber: 1,
          box: { x: 20, y: 20, width: 24, height: 24 },
          data: {
            formField: {
              type: "radio",
              name: "Status",
              optionValue: "Open",
            },
          },
        },
        {
          id: "radio-b",
          pageNumber: 1,
          box: { x: 60, y: 20, width: 24, height: 24 },
          data: {
            formField: {
              type: "radio",
              name: "Status",
              optionValue: "Open",
            },
          },
        },
      ],
      getGeometry: getEditorPageGeometry,
    }),
  /duplicate option/,
);

const [controlsSource, layerSource, exportSource, formEngineSource] = await Promise.all([
  readFile(
    new URL("../src/app/editor/components/EditorFormControls.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/editor/components/EditorLayerControls.tsx", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-export-engine.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/lib/pdf-tools/editor-form-engine.ts", import.meta.url),
    "utf8",
  ),
]);

assert.match(controlsSource, /Make form field/);
assert.match(controlsSource, /Interactive on export/);
assert.match(controlsSource, /shapeType: "rectangle"/);
assert.match(controlsSource, /Dropdown options/);
assert.match(controlsSource, /Radio option value/);
assert.match(layerSource, /<EditorFormControls editor=\{editor\} \/>/);
assert.match(layerSource, /Remove form behavior before duplicating/);
assert.match(layerSource, /!formField \? <EditorLinkControls/);
assert.match(exportSource, /if \(!object\.data\.formField\)/);
assert.match(exportSource, /await createEditorFormFields\(\{/);
assert.match(exportSource, /if \(!object\.data\.linkUrl \|\| object\.data\.formField\) continue/);
assert.match(formEngineSource, /getEditorLinkPdfRect\(box, geometry\)/);
assert.match(formEngineSource, /rotate: degrees\(geometry\.rotation\)/);
assert.match(formEngineSource, /form\.updateFieldAppearances\(appearanceFont\)/);

console.log(
  JSON.stringify({
    realAcroFormTextField: "passed",
    realAcroFormCheckbox: "passed",
    realAcroFormDropdown: "passed",
    realAcroFormRadioGroup: "passed",
    fieldFlagsAndDefaults: "passed",
    duplicateFieldNameProtection: "passed",
    radioOptionProtection: "passed",
    dropdownDefaultValidation: "passed",
    formShapeExportSuppression: "passed",
    formLinkConflictProtection: "passed",
    formAuthoringUi: "passed",
  }),
);
