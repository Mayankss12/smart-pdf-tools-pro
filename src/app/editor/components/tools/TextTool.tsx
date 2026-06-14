"use client";

import { Bold, Italic, Minus, Plus, Underline } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { EditorObject, EditorObjectBox, EditorObjectData } from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type TextToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const TEXT_COLORS = [
  "#111827",
  "#dc2626",
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#7c3aed",
];

function clampFontSize(value: number) {
  return Math.min(72, Math.max(8, value));
}

export function TextTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: TextToolProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editing, setEditing] = useState(true);

  const text = object.data.text ?? "";
  const fontSize = Number(object.data.fontSize ?? 16);
  const fontWeight = object.data.fontWeight ?? "normal";
  const fontStyle = object.data.fontStyle ?? "normal";
  const color = object.data.color ?? "#111827";
  const textDecoration =
    (object.data as EditorObjectData & { textDecoration?: "none" | "underline" }).textDecoration ??
    "none";

  const isBold = fontWeight === "bold" || fontWeight === "700";
  const isItalic = fontStyle === "italic";
  const isUnderline = textDecoration === "underline";

  useEffect(() => {
    if (!selected || !editing) return;

    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [selected, editing]);

  function updateTextDecoration(nextDecoration: "none" | "underline") {
    onUpdateData(object.id, {
      textDecoration: nextDecoration,
    } as Partial<EditorObjectData>);
  }

  const toolbarContent = (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontWeight: isBold ? "normal" : "bold",
          });
        }}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          isBold ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Bold"
        aria-label="Bold text"
      >
        <Bold size={15} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontStyle: isItalic ? "normal" : "italic",
          });
        }}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          isItalic ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Italic"
        aria-label="Italic text"
      >
        <Italic size={15} />
      </button>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          updateTextDecoration(isUnderline ? "none" : "underline");
        }}
        className={[
          "flex h-8 w-8 items-center justify-center rounded-xl text-xs font-black transition duration-200",
          isUnderline ? "bg-violet-100 text-violet-700" : "text-slate-600 hover:bg-slate-100",
        ].join(" ")}
        title="Underline"
        aria-label="Underline text"
      >
        <Underline size={15} />
      </button>

      <span className="h-5 w-px bg-slate-200" />

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontSize: clampFontSize(fontSize - 1),
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Decrease font size"
        aria-label="Decrease font size"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-8 text-center text-xs font-black text-slate-600">
        {fontSize}
      </span>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onUpdateData(object.id, {
            fontSize: clampFontSize(fontSize + 1),
          });
        }}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100"
        title="Increase font size"
        aria-label="Increase font size"
      >
        <Plus size={14} />
      </button>

      <span className="h-5 w-px bg-slate-200" />

      <div className="flex items-center gap-1">
        {TEXT_COLORS.map((textColor) => (
          <button
            key={textColor}
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onUpdateData(object.id, {
                color: textColor,
              });
            }}
            className={[
              "h-6 w-6 rounded-full border-2 transition duration-200",
              color === textColor
                ? "border-violet-500 ring-2 ring-violet-200"
                : "border-white hover:ring-2 hover:ring-slate-200",
            ].join(" ")}
            style={{ backgroundColor: textColor }}
            title={`Set text color ${textColor}`}
            aria-label={`Set text color ${textColor}`}
          />
        ))}
      </div>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={72}
      minHeight={28}
      toolbarLabel="Text"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <textarea
        ref={textareaRef}
        value={text}
        onFocus={() => {
          onSelect(object.id);
          setEditing(true);
        }}
        onBlur={() => {
          setEditing(false);
        }}
        onChange={(event) => {
          onUpdateData(object.id, {
            text: event.target.value,
          });
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(object.id);
          setEditing(true);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(object.id);
          setEditing(true);
        }}
        className={[
          "block h-full w-full resize-none rounded-none border-0 bg-transparent px-1 py-0.5 outline-none",
          selected ? "cursor-text" : "cursor-pointer",
        ].join(" ")}
        style={{
          color,
          fontSize: fontSize * pageScale,
          fontWeight,
          fontStyle,
          textDecoration,
          lineHeight: 1.3,
        }}
        spellCheck={false}
        aria-label="Edit PDF text"
      />
    </EditorObjectFrame>
  );
}