"use client";

import { SlidersHorizontal } from "lucide-react";

import { HIGHLIGHT_COLOR_PRESETS } from "@/components/tool-pages/highlight/highlightToolTypes";

import type {
  EditorObject,
  EditorObjectBox,
  EditorObjectData,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type HighlightToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

type HighlightData = {
  readonly backgroundColor?: string;
  readonly opacity?: number;
};

function clampOpacity(value: number) {
  if (!Number.isFinite(value)) return 0.45;

  return Math.max(0.15, Math.min(0.85, value));
}

export function HighlightTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: HighlightToolProps) {
  const data = object.data as HighlightData;
  const backgroundColor = data.backgroundColor ?? "#fde047";
  const opacity = clampOpacity(Number(data.opacity ?? 0.45));

  const toolbarContent = (
    <>
      <span className="flex shrink-0 items-center gap-1 rounded-xl bg-yellow-50 px-2.5 py-1 text-xs font-black text-yellow-700">
        <SlidersHorizontal size={14} />
        Highlight
      </span>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <div className="flex shrink-0 items-center gap-1.5">
        {HIGHLIGHT_COLOR_PRESETS.map((preset) => {
          const active = preset.value.toLowerCase() === backgroundColor.toLowerCase();

          return (
            <button
              key={preset.value}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();

                onUpdateData(object.id, {
                  backgroundColor: preset.value,
                });
              }}
              className={[
                "h-6 w-6 rounded-full border-2 transition duration-200",
                active
                  ? "border-violet-600 ring-2 ring-violet-200"
                  : "border-white hover:ring-2 hover:ring-slate-200",
              ].join(" ")}
              style={{ backgroundColor: preset.value }}
              title={preset.label}
              aria-label={`Set highlight color ${preset.label}`}
            />
          );
        })}
      </div>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <label className="flex shrink-0 items-center gap-2 text-xs font-black text-slate-600">
        Opacity
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
          className="w-24 accent-violet-600"
          aria-label="Highlight opacity"
        />
        <span className="w-8 text-right text-[11px] text-slate-500">
          {Math.round(opacity * 100)}%
        </span>
      </label>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={40}
      minHeight={18}
      toolbarLabel="Highlight"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <div className="h-full w-full rounded-sm" style={{ backgroundColor }} />
    </EditorObjectFrame>
  );
}
