"use client";

import { Trash2 } from "lucide-react";

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
  onDelete,
}: TextToolProps) {
  const data = object.data as TextData;
  const fontSize = Number(data.fontSize ?? 16);

  return (
    <div
      className={[
        "absolute z-30 rounded-lg transition",
        selected
          ? "border-2 border-violet-500 bg-white/95 shadow-lg ring-4 ring-violet-100"
          : "border border-transparent hover:border-violet-300",
      ].join(" ")}
      style={{
        left: object.box.x * pageScale,
        top: object.box.y * pageScale,
        width: object.box.width * pageScale,
        minHeight: object.box.height * pageScale,
      }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(object.id);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(object.id);
      }}
    >
      {selected ? (
        <div className="absolute -top-12 left-0 z-40 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <span className="px-2 text-xs font-black text-slate-600">Text</span>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(object.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete text"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}

      <textarea
        value={data.text ?? ""}
        onChange={(event) => {
          onUpdateData(object.id, {
            text: event.target.value,
          });
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
        }}
        className="block h-full min-h-[32px] w-full resize-none rounded-lg bg-transparent px-2 py-1 outline-none"
        style={{
          color: data.color ?? "#111827",
          fontSize: fontSize * pageScale,
          fontWeight: data.fontWeight ?? "normal",
          fontStyle: data.fontStyle ?? "normal",
          lineHeight: 1.35,
        }}
        spellCheck={false}
        aria-label="Edit PDF text"
      />
    </div>
  );
}