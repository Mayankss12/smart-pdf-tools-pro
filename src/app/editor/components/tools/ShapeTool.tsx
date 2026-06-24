"use client";

import {
  ArrowUpRight,
  Circle,
  Minus,
  Minus as MinusIcon,
  Plus,
  Square,
} from "lucide-react";
import type { MouseEvent } from "react";

import type {
  EditorObject,
  EditorObjectBox,
  EditorObjectData,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type ShapeType = "rectangle" | "circle" | "line" | "arrow";

type RelativePoint = {
  readonly x: number;
  readonly y: number;
};

type ShapeData = EditorObjectData & {
  readonly shapeType?: ShapeType;
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  readonly fillColor?: string;
  readonly lineStart?: RelativePoint;
  readonly lineEnd?: RelativePoint;
};

type ShapeToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const SHAPE_TYPES: readonly {
  readonly value: ShapeType;
  readonly label: string;
  readonly icon: typeof Square;
}[] = [
  { value: "rectangle", label: "Rectangle", icon: Square },
  { value: "circle", label: "Circle", icon: Circle },
  { value: "line", label: "Line", icon: MinusIcon },
  { value: "arrow", label: "Arrow", icon: ArrowUpRight },
];

const COLOR_PRESETS = ["#111827", "#dc2626", "#2563eb", "#16a34a", "#ca8a04", "#7c3aed"];

const DEFAULT_STROKE_COLOR = "#111827";
const DEFAULT_FILL_COLOR = "#ede9fe";
const DEFAULT_STROKE_WIDTH = 2;
const MIN_SCALE_DIMENSION = 0.01;

function clampStrokeWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_STROKE_WIDTH;

  return Math.max(1, Math.min(8, Math.round(value)));
}

function isNoFill(value: string | undefined) {
  return !value || value === "none" || value === "transparent";
}

function getShapeType(value: unknown): ShapeType {
  if (
    value === "rectangle" ||
    value === "circle" ||
    value === "line" ||
    value === "arrow"
  ) {
    return value;
  }

  return "rectangle";
}

function getRelativePoint(
  point: RelativePoint | undefined,
  fallback: RelativePoint,
  width: number,
  height: number,
) {
  if (!point) return fallback;

  return {
    x: Math.max(0, Math.min(width, Number(point.x) || 0)),
    y: Math.max(0, Math.min(height, Number(point.y) || 0)),
  };
}

function getLinePoints(data: ShapeData, width: number, height: number) {
  return {
    start: getRelativePoint(data.lineStart, { x: 0, y: 0 }, width, height),
    end: getRelativePoint(data.lineEnd, { x: width, y: height }, width, height),
  };
}

function scaleRelativePoint({
  point,
  fallback,
  oldWidth,
  oldHeight,
  nextWidth,
  nextHeight,
}: {
  readonly point: RelativePoint | undefined;
  readonly fallback: RelativePoint;
  readonly oldWidth: number;
  readonly oldHeight: number;
  readonly nextWidth: number;
  readonly nextHeight: number;
}) {
  const safeOldWidth = Math.max(MIN_SCALE_DIMENSION, oldWidth);
  const safeOldHeight = Math.max(MIN_SCALE_DIMENSION, oldHeight);
  const safeNextWidth = Math.max(MIN_SCALE_DIMENSION, nextWidth);
  const safeNextHeight = Math.max(MIN_SCALE_DIMENSION, nextHeight);
  const currentPoint = getRelativePoint(point, fallback, safeOldWidth, safeOldHeight);

  return getRelativePoint(
    {
      x: currentPoint.x * (safeNextWidth / safeOldWidth),
      y: currentPoint.y * (safeNextHeight / safeOldHeight),
    },
    fallback,
    safeNextWidth,
    safeNextHeight,
  );
}

function getArrowMarkerId(objectId: string) {
  return `pdfmantra-arrow-${objectId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function ShapePreview({
  object,
  data,
}: {
  readonly object: EditorObject;
  readonly data: ShapeData;
}) {
  const width = Math.max(1, object.box.width);
  const height = Math.max(1, object.box.height);
  const shapeType = getShapeType(data.shapeType);
  const strokeColor = data.strokeColor || DEFAULT_STROKE_COLOR;
  const strokeWidth = clampStrokeWidth(Number(data.strokeWidth ?? DEFAULT_STROKE_WIDTH));
  const fillColor = isNoFill(data.fillColor) ? "transparent" : data.fillColor || DEFAULT_FILL_COLOR;
  const linePadding = Math.max(strokeWidth / 2, 1);
  const { start, end } = getLinePoints(data, width, height);
  const arrowMarkerId = getArrowMarkerId(object.id);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-full w-full overflow-visible"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {shapeType === "arrow" ? (
        <defs>
          <marker
            id={arrowMarkerId}
            markerWidth="8"
            markerHeight="8"
            refX="7"
            refY="4"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 0 L 8 4 L 0 8 z" fill={strokeColor} />
          </marker>
        </defs>
      ) : null}

      {shapeType === "rectangle" ? (
        <rect
          x={linePadding}
          y={linePadding}
          width={Math.max(1, width - linePadding * 2)}
          height={Math.max(1, height - linePadding * 2)}
          rx={Math.min(10, Math.max(2, Math.min(width, height) * 0.06))}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {shapeType === "circle" ? (
        <ellipse
          cx={width / 2}
          cy={height / 2}
          rx={Math.max(1, width / 2 - linePadding)}
          ry={Math.max(1, height / 2 - linePadding)}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {shapeType === "line" ? (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}

      {shapeType === "arrow" ? (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          markerEnd={`url(#${arrowMarkerId})`}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

export function ShapeTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: ShapeToolProps) {
  const data = object.data as ShapeData;
  const shapeType = getShapeType(data.shapeType);
  const strokeColor = data.strokeColor || DEFAULT_STROKE_COLOR;
  const strokeWidth = clampStrokeWidth(Number(data.strokeWidth ?? DEFAULT_STROKE_WIDTH));
  const fillEnabled = !isNoFill(data.fillColor);
  const fillColor = fillEnabled ? data.fillColor || DEFAULT_FILL_COLOR : "none";
  const canUseFill = shapeType === "rectangle" || shapeType === "circle";

  function updateShapeData(nextData: Partial<ShapeData>) {
    onUpdateData(object.id, nextData as Partial<EditorObjectData>);
  }

  function handleToolbarMouseDown(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(object.id);
  }

  function setShapeType(event: MouseEvent<HTMLButtonElement>, nextShapeType: ShapeType) {
    handleToolbarMouseDown(event);

    updateShapeData({
      shapeType: nextShapeType,
      fillColor:
        nextShapeType === "line" || nextShapeType === "arrow"
          ? "none"
          : fillColor,
    });
  }

  function setStrokeColor(event: MouseEvent<HTMLButtonElement>, nextColor: string) {
    handleToolbarMouseDown(event);
    updateShapeData({ strokeColor: nextColor });
  }

  function setFillColor(event: MouseEvent<HTMLButtonElement>, nextColor: string) {
    handleToolbarMouseDown(event);
    updateShapeData({ fillColor: nextColor });
  }

  function changeStrokeWidth(event: MouseEvent<HTMLButtonElement>, delta: number) {
    handleToolbarMouseDown(event);
    updateShapeData({ strokeWidth: clampStrokeWidth(strokeWidth + delta) });
  }

  function toggleFill(event: MouseEvent<HTMLButtonElement>) {
    handleToolbarMouseDown(event);

    if (!canUseFill) return;

    updateShapeData({
      fillColor: fillEnabled ? "none" : DEFAULT_FILL_COLOR,
    });
  }

  function updateShapeBox(id: string, box: Partial<EditorObjectBox>) {
    if (shapeType !== "line" && shapeType !== "arrow") {
      onUpdateBox(id, box);
      return;
    }

    const nextBox = {
      ...object.box,
      ...box,
    };

    if (
      nextBox.width === object.box.width &&
      nextBox.height === object.box.height
    ) {
      onUpdateBox(id, box);
      return;
    }

    onUpdateData(id, {
      lineStart: scaleRelativePoint({
        point: data.lineStart,
        fallback: { x: 0, y: 0 },
        oldWidth: object.box.width,
        oldHeight: object.box.height,
        nextWidth: nextBox.width,
        nextHeight: nextBox.height,
      }),
      lineEnd: scaleRelativePoint({
        point: data.lineEnd,
        fallback: { x: object.box.width, y: object.box.height },
        oldWidth: object.box.width,
        oldHeight: object.box.height,
        nextWidth: nextBox.width,
        nextHeight: nextBox.height,
      }),
    });

    onUpdateBox(id, box);
  }

  const toolbarContent = (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {SHAPE_TYPES.map((shape) => {
          const Icon = shape.icon;
          const active = shape.value === shapeType;

          return (
            <button
              key={shape.value}
              type="button"
              onMouseDown={(event) => setShapeType(event, shape.value)}
              className={[
                "flex h-8 w-8 items-center justify-center rounded-xl transition duration-200",
                active
                  ? "bg-violet-100 text-violet-700 ring-1 ring-violet-200"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              ].join(" ")}
              title={shape.label}
              aria-label={`Set shape type to ${shape.label}`}
            >
              <Icon size={15} />
            </button>
          );
        })}
      </div>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

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
        disabled={strokeWidth >= 8}
        title="Increase stroke width"
        aria-label="Increase stroke width"
      >
        <Plus size={14} />
      </button>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <button
        type="button"
        disabled={!canUseFill}
        onMouseDown={toggleFill}
        className={[
          "flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-black transition duration-200 disabled:cursor-not-allowed disabled:opacity-40",
          fillEnabled && canUseFill
            ? "bg-violet-100 text-violet-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        ].join(" ")}
        title={canUseFill ? "Toggle fill" : "Fill is not available for line and arrow"}
        aria-label="Toggle shape fill"
      >
        <span
          className="h-3.5 w-3.5 rounded border border-slate-300"
          style={{
            backgroundColor: fillEnabled && canUseFill ? fillColor : "transparent",
          }}
        />
        Fill
      </button>

      {fillEnabled && canUseFill ? (
        <>
          <span className="h-5 w-px shrink-0 bg-slate-200" />

          <div className="flex shrink-0 items-center gap-1">
            {COLOR_PRESETS.map((color) => {
              const active = color.toLowerCase() === fillColor.toLowerCase();

              return (
                <button
                  key={`fill-${color}`}
                  type="button"
                  onMouseDown={(event) => setFillColor(event, color)}
                  className={[
                    "h-6 w-6 rounded-full border-2 transition duration-200",
                    active
                      ? "border-violet-600 ring-2 ring-violet-200"
                      : "border-white hover:ring-2 hover:ring-slate-200",
                  ].join(" ")}
                  style={{ backgroundColor: color }}
                  title={`Fill ${color}`}
                  aria-label={`Set fill color ${color}`}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={24}
      minHeight={24}
      toolbarLabel="Shape"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={updateShapeBox}
      onDelete={onDelete}
    >
      <ShapePreview object={object} data={data} />
    </EditorObjectFrame>
  );
}
