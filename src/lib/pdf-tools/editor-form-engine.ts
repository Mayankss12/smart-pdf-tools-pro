import {
  PDFDocument,
  StandardFonts,
  degrees,
  rgb,
  type PDFField,
  type PDFPage,
} from "pdf-lib";

import { getEditorLinkPdfRect } from "./editor-link-engine";
import type { EditorPageGeometry } from "./editor-page-geometry";

export type EditorFormFieldType = "text" | "checkbox" | "dropdown" | "radio";

export type EditorFormFieldConfig = {
  readonly type: EditorFormFieldType;
  readonly name: string;
  readonly required?: boolean;
  readonly readOnly?: boolean;
  readonly multiline?: boolean;
  readonly options?: readonly string[];
  readonly optionValue?: string;
  readonly defaultValue?: string;
  readonly checked?: boolean;
};

export type EditorFormAuthoringObject = {
  readonly id: string;
  readonly pageNumber: number;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly data: {
    readonly formField?: EditorFormFieldConfig;
  };
};

const FIELD_BORDER = rgb(0.55, 0.58, 0.65);
const FIELD_BACKGROUND = rgb(1, 1, 1);
const FIELD_TEXT = rgb(0.07, 0.09, 0.15);
const MAX_FIELD_NAME_LENGTH = 120;
const MAX_OPTION_LENGTH = 200;
const MAX_OPTIONS = 100;

function cleanValue(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function normalizeEditorFormFieldName(value: string | null | undefined) {
  const cleaned = cleanValue(value)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_FIELD_NAME_LENGTH);

  return cleaned || null;
}

export function normalizeEditorFormOptions(values: readonly string[] | undefined) {
  const unique = new Set<string>();

  for (const value of values ?? []) {
    const cleaned = cleanValue(value).slice(0, MAX_OPTION_LENGTH);
    if (!cleaned) continue;
    unique.add(cleaned);
    if (unique.size >= MAX_OPTIONS) break;
  }

  return [...unique];
}

function applyCommonFlags(
  field: PDFField,
  config: EditorFormFieldConfig,
) {
  if (config.required) field.enableRequired();
  else field.disableRequired();

  if (config.readOnly) field.enableReadOnly();
  else field.disableReadOnly();
}

function getWidgetOptions(
  box: EditorFormAuthoringObject["box"],
  geometry: EditorPageGeometry,
) {
  const [x1, y1, x2, y2] = getEditorLinkPdfRect(box, geometry);

  return {
    x: x1,
    y: y1,
    width: Math.max(1, x2 - x1),
    height: Math.max(1, y2 - y1),
    borderWidth: 1,
    borderColor: FIELD_BORDER,
    backgroundColor: FIELD_BACKGROUND,
    textColor: FIELD_TEXT,
    rotate: degrees(geometry.rotation),
  };
}

function assertUniqueFieldName(
  name: string,
  existingNames: Set<string>,
  createdNames: Set<string>,
) {
  if (existingNames.has(name) || createdNames.has(name)) {
    throw new Error(
      `Form field name “${name}” is already in use. Give each non-radio field a unique name.`,
    );
  }
}

function getPage(
  pages: readonly PDFPage[],
  pageNumber: number,
) {
  const page = pages[pageNumber - 1];
  if (!page) {
    throw new Error(`Form field references missing page ${pageNumber}.`);
  }
  return page;
}

export async function createEditorFormFields({
  pdfDoc,
  objects,
  getGeometry,
}: {
  readonly pdfDoc: PDFDocument;
  readonly objects: readonly EditorFormAuthoringObject[];
  readonly getGeometry: (page: PDFPage) => EditorPageGeometry;
}) {
  const formObjects = objects.filter(
    (object): object is EditorFormAuthoringObject & {
      data: { readonly formField: EditorFormFieldConfig };
    } => Boolean(object.data.formField),
  );

  if (formObjects.length === 0) {
    return { createdCount: 0, fieldNames: [] as string[] };
  }

  const form = pdfDoc.getForm();
  const pages = pdfDoc.getPages();
  const existingNames = new Set(form.getFields().map((field) => field.getName()));
  const createdNames = new Set<string>();
  const createdFieldNames: string[] = [];
  const radioGroups = new Map<
    string,
    {
      group: ReturnType<typeof form.createRadioGroup>;
      required: boolean;
      readOnly: boolean;
      defaultValue: string | null;
    }
  >();
  const appearanceFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const object of formObjects) {
    const config = object.data.formField;
    const name = normalizeEditorFormFieldName(config.name);

    if (!name) {
      throw new Error("Every form field needs a non-empty field name.");
    }

    const page = getPage(pages, object.pageNumber);
    const geometry = getGeometry(page);
    const widgetOptions = getWidgetOptions(object.box, geometry);

    if (config.type === "radio") {
      if (existingNames.has(name) && !radioGroups.has(name)) {
        throw new Error(
          `Form field name “${name}” already exists in the source PDF and cannot be reused as a new radio group.`,
        );
      }

      const required = Boolean(config.required);
      const readOnly = Boolean(config.readOnly);
      let radioState = radioGroups.get(name);

      if (!radioState) {
        const group = form.createRadioGroup(name);
        applyCommonFlags(group, config);
        radioState = {
          group,
          required,
          readOnly,
          defaultValue: null,
        };
        radioGroups.set(name, radioState);
        createdNames.add(name);
        createdFieldNames.push(name);
      } else if (
        radioState.required !== required ||
        radioState.readOnly !== readOnly
      ) {
        throw new Error(
          `Radio field “${name}” must use the same required and read-only settings for every option.`,
        );
      }

      const optionValue = cleanValue(config.optionValue).slice(0, MAX_OPTION_LENGTH);
      if (!optionValue) {
        throw new Error(`Radio field “${name}” needs an option value.`);
      }
      if (radioState.group.getOptions().includes(optionValue)) {
        throw new Error(
          `Radio field “${name}” has duplicate option “${optionValue}”.`,
        );
      }

      radioState.group.addOptionToPage(optionValue, page, widgetOptions);

      const defaultValue = cleanValue(config.defaultValue).slice(0, MAX_OPTION_LENGTH);
      if (defaultValue) {
        if (defaultValue !== optionValue) {
          throw new Error(
            `Radio field “${name}” default value must match the option it is configured on.`,
          );
        }
        if (radioState.defaultValue && radioState.defaultValue !== defaultValue) {
          throw new Error(
            `Radio field “${name}” can have only one default option.`,
          );
        }
        if (!radioState.defaultValue) {
          radioState.group.select(defaultValue);
          radioState.defaultValue = defaultValue;
        }
      }
      continue;
    }

    assertUniqueFieldName(name, existingNames, createdNames);
    createdNames.add(name);
    createdFieldNames.push(name);

    if (config.type === "text") {
      const field = form.createTextField(name);
      applyCommonFlags(field, config);
      if (config.multiline) field.enableMultiline();
      else field.disableMultiline();
      if (config.defaultValue) field.setText(config.defaultValue);
      field.addToPage(page, { ...widgetOptions, font: appearanceFont });
      continue;
    }

    if (config.type === "checkbox") {
      const field = form.createCheckBox(name);
      applyCommonFlags(field, config);
      field.addToPage(page, widgetOptions);
      if (config.checked) field.check();
      continue;
    }

    const options = normalizeEditorFormOptions(config.options);
    if (options.length === 0) {
      throw new Error(`Dropdown field “${name}” needs at least one option.`);
    }

    const field = form.createDropdown(name);
    applyCommonFlags(field, config);
    field.addOptions(options);
    field.addToPage(page, { ...widgetOptions, font: appearanceFont });

    const defaultValue = cleanValue(config.defaultValue);
    if (defaultValue) {
      if (!options.includes(defaultValue)) {
        throw new Error(
          `Dropdown field “${name}” default value must match one of its options.`,
        );
      }
      field.select(defaultValue);
    }
  }

  form.updateFieldAppearances(appearanceFont);

  return {
    createdCount: formObjects.length,
    fieldNames: createdFieldNames,
  };
}
