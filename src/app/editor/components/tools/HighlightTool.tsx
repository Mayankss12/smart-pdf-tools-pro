"use client";

import { Trash2 } from "lucide-react";

import type { EditorObject } from "../../hooks/useEditor";

type HighlightToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: any) => void;
  readonly onUpdateBox: (id: string, box: any) => void;
  readonly onDelete: (id: string) => void;
};

type HighlightData = {
  readonly backgroundColor?: string;
  readonly opacity?: number;
};

export function HighlightTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onDelete,
}: HighlightToolProps) {
  const data = object.data as HighlightData;
  const backgroundColor = data.backgroundColor ?? "#fde047";
  const opacity = Number(data.opacity ?? 0.45);

  return (
    <div
      className={[
        "absolute z-20 rounded-lg transition",
        selected
          ? "border-2 border-violet-500 shadow-lg ring-4 ring-violet-100"
          : "border border-transparent hover:border-violet-300",
      ].join(" ")}
      style={{
        left: object.box.x * pageScale,
        top: object.box.y * pageScale,
        width: object.box.width * pageScale,
        height: object.box.height * pageScale,
        backgroundColor,
        opacity,
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
        <div className="absolute -top-12 left-0 z-40 flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
          <span className="px-2 text-xs font-black text-slate-600">Highlight</span>

          <input
            type="range"
            min="0.15"
            max="0.85"
            step="0.05"
            value={opacity}
            onChange={(event) => {
              onUpdateData(object.id, {
                opacity: Number(event.target.value),
              });
            }}
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            className="w-20 accent-violet-600"
            aria-label="Highlight opacity"
          />

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(object.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete highlight"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}