"use client";

import { FileInput, Trash2 } from "lucide-react";

import type { EditorFormFieldConfig, EditorFormFieldType } from "@/lib/pdf-tools/editor-form-engine";

import type { EditorController, EditorObjectData } from "../hooks/useEditor";

type FormCapableData = EditorObjectData & {
  readonly formField?: EditorFormFieldConfig;
};

const FIELD_TYPES: readonly { value: EditorFormFieldType; label: string }[] = [
  { value: "text", label: "Text field" },
  { value: "checkbox", label: "Checkbox" },
  { value: "dropdown", label: "Dropdown" },
  { value: "radio", label: "Radio option" },
];

function getFormField(data: EditorObjectData) {
  return (data as FormCapableData).formField;
}

function createFormPatch(formField: EditorFormFieldConfig | undefined) {
  return { formField } as unknown as Partial<EditorObjectData>;
}

function createFormRegionPatch(formField: EditorFormFieldConfig) {
  return {
    formField,
    shapeType: "rectangle",
    fillColor: "none",
    strokeColor: "#7c3aed",
    strokeWidth: 1,
  } as unknown as Partial<EditorObjectData>;
}

function createDefaultConfig(objectId: string): EditorFormFieldConfig {
  const suffix = objectId.replace(/[^a-zA-Z0-9]/g, "").slice(-8) || "field";
  return {
    type: "text",
    name: `Field_${suffix}`,
    required: false,
    readOnly: false,
    multiline: false,
    defaultValue: "",
  };
}

function splitOptions(value: string) {
  return value
    .split(",")
    .map((option) => option.trim())
    .filter(Boolean);
}

export function EditorFormControls({ editor }: { readonly editor: EditorController }) {
  const object = editor.selectedObject;
  const objectId = editor.selectedObjectId;

  if (!object || !objectId || object.type !== "shape") return null;

  const config = getFormField(object.data);

  function updateConfig(patch: Partial<EditorFormFieldConfig>) {
    const current = getFormField(object.data) ?? createDefaultConfig(objectId);
    editor.updateObjectData(
      objectId,
      createFormRegionPatch({
        ...current,
        ...patch,
      }),
    );
  }

  if (!config) {
    return (
      <button
        type="button"
        onClick={() => {
          editor.updateObjectData(
            objectId,
            createFormRegionPatch(createDefaultConfig(objectId)),
          );
        }}
        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-2.5 text-[11px] font-black text-violet-700 transition hover:border-violet-300 hover:bg-violet-100"
        title="Turn this rectangle into a real interactive PDF form field"
      >
        <FileInput size={13} />
        Make form field
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-1.5 py-1 ring-1 ring-violet-200">
      <span className="ml-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-600">
        Form
      </span>

      <select
        value={config.type}
        onChange={(event) => {
          const type = event.target.value as EditorFormFieldType;
          updateConfig({
            type,
            options: type === "dropdown" ? config.options ?? ["Option 1", "Option 2"] : undefined,
            optionValue: type === "radio" ? config.optionValue || "Option 1" : undefined,
            checked: type === "checkbox" ? Boolean(config.checked) : undefined,
            multiline: type === "text" ? Boolean(config.multiline) : undefined,
          });
        }}
        className="h-7 rounded-lg border border-slate-200 bg-white px-1.5 text-[10px] font-black text-slate-700 outline-none focus:border-violet-400"
        aria-label="Form field type"
      >
        {FIELD_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>

      <input
        value={config.name}
        onChange={(event) => updateConfig({ name: event.target.value })}
        placeholder="Field name"
        className="h-7 w-36 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-violet-400"
        aria-label="Form field name"
        title="Unique field name"
      />

      {config.type === "dropdown" ? (
        <input
          value={(config.options ?? []).join(", ")}
          onChange={(event) => updateConfig({ options: splitOptions(event.target.value) })}
          placeholder="Option 1, Option 2"
          className="h-7 w-44 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-violet-400"
          aria-label="Dropdown options"
          title="Comma-separated dropdown options"
        />
      ) : null}

      {config.type === "radio" ? (
        <input
          value={config.optionValue ?? ""}
          onChange={(event) => updateConfig({ optionValue: event.target.value })}
          placeholder="Option value"
          className="h-7 w-28 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-violet-400"
          aria-label="Radio option value"
          title="Use the same field name on multiple rectangles to build one radio group"
        />
      ) : null}

      {config.type === "text" || config.type === "dropdown" ? (
        <input
          value={config.defaultValue ?? ""}
          onChange={(event) => updateConfig({ defaultValue: event.target.value })}
          placeholder="Default"
          className="h-7 w-28 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-700 outline-none focus:border-violet-400"
          aria-label="Default field value"
        />
      ) : null}

      {config.type === "checkbox" ? (
        <label className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(config.checked)}
            onChange={(event) => updateConfig({ checked: event.target.checked })}
          />
          Checked
        </label>
      ) : null}

      {config.type === "text" ? (
        <label className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black text-slate-600">
          <input
            type="checkbox"
            checked={Boolean(config.multiline)}
            onChange={(event) => updateConfig({ multiline: event.target.checked })}
          />
          Multiline
        </label>
      ) : null}

      <label className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black text-slate-600">
        <input
          type="checkbox"
          checked={Boolean(config.required)}
          onChange={(event) => updateConfig({ required: event.target.checked })}
        />
        Required
      </label>

      <label className="flex h-7 items-center gap-1 rounded-lg px-1.5 text-[10px] font-black text-slate-600">
        <input
          type="checkbox"
          checked={Boolean(config.readOnly)}
          onChange={(event) => updateConfig({ readOnly: event.target.checked })}
        />
        Read-only
      </label>

      <span className="rounded-lg bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-600">
        Interactive on export
      </span>

      <button
        type="button"
        onClick={() => editor.updateObjectData(objectId, createFormPatch(undefined))}
        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        aria-label="Remove form field behavior"
        title="Convert back to a normal shape"
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
