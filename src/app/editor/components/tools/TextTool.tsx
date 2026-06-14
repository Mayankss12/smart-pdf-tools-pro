"use client";

import { useState } from "react";

import type { EditorObject } from "../../hooks/useEditor";

type TextToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: any) => void;
  readonly onUpdateBox: (id: string, box: any) => void;
  readonly onDelete: (id: string) => void;
};

type TextData = {
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontWeight?: string;
  readonly fontStyle?: string;
  readonly color?: string;
};

export function TextTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
}: TextToolProps) {
  const [editing, setEditing] = useState(true);

  const data = object.data as TextData;
  const text = data.text ?? "";
  const fontSize = Number(data.fontSize ?? 16);
  const fontWeight = data.fontWeight ?? "normal";
  const fontStyle = data.fontStyle ?? "normal";
  const color = data.color ?? "#111827";

  const showOutline = selected && editing;

  return (
    <div
      className={[
        "absolute z-30 rounded-none transition duration-150",
        showOutline
          ? "border border-violet-500 bg-white/80 shadow-[0_0_0_3px_rgba(124,58,237,0.14)]"
          : "border border-transparent bg-transparent",
      ].join(" ")}
      style={{
        left: object.box.x * pageScale,
        top: object.box.y * pageScale,
        width: object.box.width * pageScale,
        height: object.box.height * pageScale,
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
    >
      <textarea
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
        }}
        className="block h-full w-full resize-none rounded-none bg-transparent px-1 py-0.5 outline-none"
        style={{
          color,
          fontSize: fontSize * pageScale,
          fontWeight,
          fontStyle,
          lineHeight: 1.3,
        }}
        spellCheck={false}
        aria-label="Edit PDF text"
      />

      {showOutline ? (
        <>
          <div className="pointer-events-none absolute -left-1 -top-1 h-2 w-2 rounded-full border border-white bg-violet-600 shadow" />
          <div className="pointer-events-none absolute -right-1 -top-1 h-2 w-2 rounded-full border border-white bg-violet-600 shadow" />
          <div className="pointer-events-none absolute -bottom-1 -left-1 h-2 w-2 rounded-full border border-white bg-violet-600 shadow" />
          <div className="pointer-events-none absolute -bottom-1 -right-1 h-2 w-2 rounded-full border border-white bg-violet-600 shadow" />
        </>
      ) : null}
    </div>
  );
}
