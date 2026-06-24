"use client";

import { Minus, Plus } from "lucide-react";
import type { MouseEvent } from "react";

import type {
  EditorObject,
  EditorObjectBox,
  EditorObjectData,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type DrawData = EditorObjectData & {
  readonly pathData?: string;
  readonly drawWidth?: number;
  readonly drawHeight?: number;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
};

type DrawToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const COLOR_PRESETS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];
const DEFAULT_STROKE_COLOR = "#111827";
const DEFAULT_STROKE_WIDTH = 2;
const MIN_DRAW_DIMENSION = 1;

function clampStrokeWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_STROKE_WIDTH;

  return Math.max(1, Math.min(12, Math.round(value)));
}

function getSafePathData(value: unknown) {
  if (typeof value !== "string") return "";

  return value;
}

function getDrawDimension(value: unknown, fallback: number) {
  const dimension = Number(value);

  if (Number.isFinite(dimension) && dimension > 0) {
    return Math.max(MIN_DRAW_DIMENSION, dimension);
  }

  return Math.max(MIN_DRAW_DIMENSION, fallback);
}

export function DrawTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: DrawToolProps) {
  const data = object.data as DrawData;
  const pathData = getSafePathData(data.pathData);
  const strokeColor = data.strokeColor || DEFAULT_STROKE_COLOR;
  const strokeWidth = clampStrokeWidth(Number(data.strokeWidth ?? DEFAULT_STROKE_WIDTH));
  const viewBoxWidth = getDrawDimension(data.drawWidth, object.box.width);
  const viewBoxHeight = getDrawDimension(data.drawHeight, object.box.height);

  function handleToolbarMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(object.id);
  }

  function updateDrawData(nextData: Partial<DrawData>) {
    onUpdateData(object.id, nextData as Partial<EditorObjectData>);
  }

  function setStrokeColor(event: MouseEvent<HTMLButtonElement>, nextColor: string) {
    handleToolbarMouseDown(event);
    updateDrawData({ strokeColor: nextColor });
  }

  function changeStrokeWidth(event: MouseEvent<HTMLButtonElement>, delta: number) {
    handleToolbarMouseDown(event);
    updateDrawData({ strokeWidth: clampStrokeWidth(strokeWidth + delta) });
  }

  const toolbarContent = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {COLOR_PRESETS.map((color) => {
          const active = color.toLowerCase() === strokeColor.toLowerCase();

          return (
            <button
              key={color}
              type="button"
              onMouseDown={(event) => setStrokeColor(event, color)}
              className={[
                "h-6 w-6 rounded-full border-2 transition duration-200",
                active
                  ? "border-violet-600 ring-2 ring-violet-200"
                  : "border-white hover:ring-2 hover:ring-slate-200",
              ].join(" ")}
              style={{ backgroundColor: color }}
              title={`Stroke ${color}`}
              aria-label={`Set stroke color ${color}`}
            />
          );
        })}
      </div>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <button
        type="button"
        onMouseDown={(event) => changeStrokeWidth(event, -1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={strokeWidth <= 1}
        title="Decrease stroke width"
        aria-label="Decrease stroke width"
      >
        <Minus size={14} />
      </button>

      <span className="min-w-8 text-center text-xs font-black text-slate-600">
        {strokeWidth}px
      </span>

      <button
        type="button"
        onMouseDown={(event) => changeStrokeWidth(event, 1)}
        className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={strokeWidth >= 12}
        title="Increase stroke width"
        aria-label="Increase stroke width"
      >
        <Plus size={14} />
      </button>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={24}
      minHeight={24}
      toolbarLabel="Draw"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <svg
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
        className="block h-full w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </EditorObjectFrame>
  );
}
