"use client";

import { useMemo, useRef, useState } from "react";

import type {
  AnnotationLayer,
  AnnotationStyle,
  AnnotationTool,
  ShapeBoxAnnotation,
  ShapeLineAnnotation,
  StrokeAnnotation,
  TextNoteAnnotation,
} from "@/engines/annotation/types";
import { ANNOTATION_SCHEMA_VERSION } from "@/engines/annotation/types";
import type {
  NormalizedPoint,
  NormalizedRect,
} from "@/engines/shared/types";
import {
  clampNormalizedPoint,
  clampNormalizedRect,
  createNormalizedRectFromPoints,
} from "@/engines/shared/coordinateUtils";
import type { AnnotatePageSnapshot } from "./annotateToolTypes";
import { normalizedRectToCssStyle } from "../highlight/highlightToolRuntime";

export interface AnnotatePageSurfaceProps {
  readonly page: AnnotatePageSnapshot;
  readonly annotations: readonly AnnotationLayer[];
  readonly selectedAnnotationId: string | null;
  readonly activeTool: AnnotationTool;
  readonly style: AnnotationStyle;
  readonly noteFontSize: number;
  readonly noteBackgroundColor: string;
  readonly onCreateAnnotation: (annotation: AnnotationLayer) => void;
  readonly onSelectAnnotation: (annotationId: string | null) => void;
}

interface PointerDraft {
  readonly pointerId: number;
  readonly start: NormalizedPoint;
  readonly current: NormalizedPoint;
  readonly points: readonly NormalizedPoint[];
}

type PreviewStrokeRole = "marker" | "ink" | "shape";

const MARKER_POINT_DISTANCE = 0.0035;
const PEN_POINT_DISTANCE = 0.0014;

function createUuid(): string {
  return crypto.randomUUID();
}

function pointerEventToNormalizedPoint(
  event: React.PointerEvent<HTMLDivElement>,
  surface: HTMLDivElement,
): NormalizedPoint {
  const rect = surface.getBoundingClientRect();
  const width = Math.max(rect.width, 1);
  const height = Math.max(rect.height, 1);

  return clampNormalizedPoint({
    x: (event.clientX - rect.left) / width,
    y: (event.clientY - rect.top) / height,
  });
}

function getPointDistance(first: NormalizedPoint, second: NormalizedPoint): number {
  const deltaX = second.x - first.x;
  const deltaY = second.y - first.y;

  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

function appendPointIfMeaningful(input: {
  readonly points: readonly NormalizedPoint[];
  readonly nextPoint: NormalizedPoint;
  readonly minimumDistance: number;
}): readonly NormalizedPoint[] {
  const lastPoint = input.points[input.points.length - 1];

  if (!lastPoint) {
    return [input.nextPoint];
  }

  if (getPointDistance(lastPoint, input.nextPoint) < input.minimumDistance) {
    return input.points;
  }

  return [...input.points, input.nextPoint];
}

function resolvePointerPointDistance(tool: AnnotationTool): number {
  if (tool === "highlighter-pen") {
    return MARKER_POINT_DISTANCE;
  }

  if (tool === "pen") {
    return PEN_POINT_DISTANCE;
  }

  return 0;
}

function resolvePreviewStrokeWidth(style: AnnotationStyle, role: PreviewStrokeRole): number {
  if (role === "marker") {
    return Math.max(2.8, style.strokeWidth / 6);
  }

  return Math.max(0.18, style.strokeWidth / 12);
}

function expandNormalizedRect(rect: NormalizedRect, padding: number): NormalizedRect {
  return clampNormalizedRect({
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  });
}

function buildStrokeAnnotation(input: {
  readonly pageIndex: number;
  readonly tool: "highlighter-pen" | "pen";
  readonly style: AnnotationStyle;
  readonly points: readonly NormalizedPoint[];
}): StrokeAnnotation {
  return {
    schemaVersion: ANNOTATION_SCHEMA_VERSION,
    id: createUuid(),
    pageIndex: input.pageIndex,
    kind: input.tool === "highlighter-pen" ? "highlighter-stroke" : "ink-stroke",
    style: input.style,
    points: input.points,
  };
}

function buildShapeBoxAnnotation(input: {
  readonly pageIndex: number;
  readonly tool: "rectangle" | "ellipse";
  readonly style: AnnotationStyle;
  readonly bounds: NormalizedRect;
}): ShapeBoxAnnotation {
  return {
    schemaVersion: ANNOTATION_SCHEMA_VERSION,
    id: createUuid(),
    pageIndex: input.pageIndex,
    kind: input.tool,
    style: input.style,
    bounds: clampNormalizedRect(input.bounds),
  };
}

function buildShapeLineAnnotation(input: {
  readonly pageIndex: number;
  readonly tool: "line" | "arrow";
  readonly style: AnnotationStyle;
  readonly start: NormalizedPoint;
  readonly end: NormalizedPoint;
}): ShapeLineAnnotation {
  return {
    schemaVersion: ANNOTATION_SCHEMA_VERSION,
    id: createUuid(),
    pageIndex: input.pageIndex,
    kind: input.tool,
    style: input.style,
    start: clampNormalizedPoint(input.start),
    end: clampNormalizedPoint(input.end),
  };
}

function buildTextNoteAnnotation(input: {
  readonly pageIndex: number;
  readonly style: AnnotationStyle;
  readonly bounds: NormalizedRect;
  readonly fontSize: number;
  readonly backgroundColor: string;
}): TextNoteAnnotation {
  return {
    schemaVersion: ANNOTATION_SCHEMA_VERSION,
    id: createUuid(),
    pageIndex: input.pageIndex,
    kind: "text-note",
    style: input.style,
    bounds: clampNormalizedRect(input.bounds),
    text: "Write your note here",
    fontSize: input.fontSize,
    backgroundColor: input.backgroundColor,
  };
}

function pointListToSvgPoints(points: readonly NormalizedPoint[]): string {
  return points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
}

function buildArrowHeadPoints(
  start: NormalizedPoint,
  end: NormalizedPoint,
): readonly NormalizedPoint[] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const angle = Math.atan2(dy, dx);
  const length = 0.025;
  const spread = Math.PI / 7;

  return [
    end,
    {
      x: end.x - length * Math.cos(angle - spread),
      y: end.y - length * Math.sin(angle - spread),
    },
    end,
    {
      x: end.x - length * Math.cos(angle + spread),
      y: end.y - length * Math.sin(angle + spread),
    },
  ].map(clampNormalizedPoint);
}

function buildAnnotationBounds(annotation: AnnotationLayer): NormalizedRect {
  if (annotation.kind === "rectangle" || annotation.kind === "ellipse" || annotation.kind === "text-note") {
    return annotation.bounds;
  }

  if (annotation.kind === "line" || annotation.kind === "arrow") {
    return expandNormalizedRect(
      createNormalizedRectFromPoints(annotation.start, annotation.end),
      0.006,
    );
  }

  if (annotation.points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const xs = annotation.points.map((point) => point.x);
  const ys = annotation.points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const baseBounds = clampNormalizedRect({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  });

  return expandNormalizedRect(
    baseBounds,
    annotation.kind === "highlighter-stroke" ? 0.02 : 0.008,
  );
}

function annotationTitle(annotation: AnnotationLayer): string {
  switch (annotation.kind) {
    case "highlighter-stroke":
      return "Marker stroke";
    case "ink-stroke":
      return "Pen stroke";
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "line":
      return "Line";
    case "arrow":
      return "Arrow";
    case "text-note":
      return "Text note";
    default:
      return "Annotation";
  }
}

export function AnnotatePageSurface({
  page,
  annotations,
  selectedAnnotationId,
  activeTool,
  style,
  noteFontSize,
  noteBackgroundColor,
  onCreateAnnotation,
  onSelectAnnotation,
}: AnnotatePageSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState<PointerDraft | null>(null);

  const pageAnnotations = useMemo(
    () => annotations.filter((annotation) => annotation.pageIndex === page.pageIndex),
    [annotations, page.pageIndex],
  );

  const draftBounds = useMemo(() => {
    if (!draft) {
      return null;
    }

    return createNormalizedRectFromPoints(draft.start, draft.current);
  }, [draft]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !surfaceRef.current) {
      return;
    }

    const target = event.target as HTMLElement;

    if (target.closest("[data-annotation-item='true']")) {
      return;
    }

    if (activeTool === "select") {
      onSelectAnnotation(null);
      return;
    }

    const point = pointerEventToNormalizedPoint(event, surfaceRef.current);
    surfaceRef.current.setPointerCapture(event.pointerId);

    setDraft({
      pointerId: event.pointerId,
      start: point,
      current: point,
      points: [point],
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!surfaceRef.current) {
      return;
    }

    setDraft((currentDraft) => {
      if (!currentDraft || currentDraft.pointerId !== event.pointerId) {
        return currentDraft;
      }

      const point = pointerEventToNormalizedPoint(event, surfaceRef.current);
      const shouldAppendPoint =
        activeTool === "highlighter-pen" || activeTool === "pen";

      return {
        ...currentDraft,
        current: point,
        points: shouldAppendPoint
          ? appendPointIfMeaningful({
              points: currentDraft.points,
              nextPoint: point,
              minimumDistance: resolvePointerPointDistance(activeTool),
            })
          : currentDraft.points,
      };
    });
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const currentDraft = draft;
    const surface = surfaceRef.current;

    if (!currentDraft || !surface || currentDraft.pointerId !== event.pointerId) {
      return;
    }

    const end = pointerEventToNormalizedPoint(event, surface);
    const finalizedDraft: PointerDraft = {
      ...currentDraft,
      current: end,
      points:
        activeTool === "highlighter-pen" || activeTool === "pen"
          ? appendPointIfMeaningful({
              points: currentDraft.points,
              nextPoint: end,
              minimumDistance: resolvePointerPointDistance(activeTool),
            })
          : currentDraft.points,
    };

    surface.releasePointerCapture(event.pointerId);
    setDraft(null);

    if (activeTool === "highlighter-pen" || activeTool === "pen") {
      if (finalizedDraft.points.length < 2) {
        return;
      }

      onCreateAnnotation(
        buildStrokeAnnotation({
          pageIndex: page.pageIndex,
          tool: activeTool,
          style,
          points: finalizedDraft.points,
        }),
      );
      return;
    }

    const bounds = createNormalizedRectFromPoints(finalizedDraft.start, end);

    if (activeTool === "rectangle" || activeTool === "ellipse") {
      if (bounds.width < 0.005 || bounds.height < 0.005) {
        return;
      }

      onCreateAnnotation(
        buildShapeBoxAnnotation({
          pageIndex: page.pageIndex,
          tool: activeTool,
          style,
          bounds,
        }),
      );
      return;
    }

    if (activeTool === "line" || activeTool === "arrow") {
      if (bounds.width < 0.004 && bounds.height < 0.004) {
        return;
      }

      onCreateAnnotation(
        buildShapeLineAnnotation({
          pageIndex: page.pageIndex,
          tool: activeTool,
          style,
          start: finalizedDraft.start,
          end,
        }),
      );
      return;
    }

    if (activeTool === "text-note") {
      const noteBounds = bounds.width >= 0.03 && bounds.height >= 0.03
        ? bounds
        : clampNormalizedRect({
            x: finalizedDraft.start.x,
            y: finalizedDraft.start.y,
            width: 0.28,
            height: 0.12,
          });

      onCreateAnnotation(
        buildTextNoteAnnotation({
          pageIndex: page.pageIndex,
          style,
          bounds: noteBounds,
          fontSize: noteFontSize,
          backgroundColor: noteBackgroundColor,
        }),
      );
    }
  }

  function handlePointerCancel(event: React.PointerEvent<HTMLDivElement>) {
    if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
      surfaceRef.current.releasePointerCapture(event.pointerId);
    }

    setDraft(null);
  }

  return (
    <div className="min-w-0 rounded-[1.35rem] border border-[var(--border-light)] bg-white p-3 shadow-[var(--shadow-soft)] sm:rounded-[2rem] sm:p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--violet-600)] sm:text-sm">
            Annotate canvas
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-3xl">
            {page.pageLabel}
          </h2>
        </div>

        <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--violet-50)] px-3 py-2.5 text-left sm:px-4 sm:py-3 sm:text-right">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] sm:text-xs">
            Page annotations
          </div>
          <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-xl">
            {pageAnnotations.length}
          </div>
        </div>
      </div>

      <div className="min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-base)] p-2.5 sm:rounded-[1.75rem] sm:p-4">
        <div
          className="mx-auto w-full rounded-[1.1rem] bg-white p-2 shadow-xl shadow-slate-300/35 sm:rounded-2xl sm:p-3"
          style={{ maxWidth: `${page.geometry.viewportSize.width + 24}px` }}
        >
          <div
            ref={surfaceRef}
            className="relative mx-auto w-full select-none overflow-hidden rounded-lg bg-white touch-none sm:rounded-xl"
            style={{
              maxWidth: `${page.geometry.viewportSize.width}px`,
              aspectRatio: `${page.geometry.viewportSize.width} / ${page.geometry.viewportSize.height}`,
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          >
            <img
              src={page.previewUrl}
              alt={page.pageLabel}
              draggable={false}
              className="absolute inset-0 h-full w-full object-fill"
            />

            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {pageAnnotations.map((annotation) => {
                const stroke = annotation.style.color;
                const opacity = annotation.style.opacity;

                if (annotation.kind === "highlighter-stroke") {
                  return (
                    <polyline
                      key={annotation.id}
                      points={pointListToSvgPoints(annotation.points)}
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={opacity}
                      strokeWidth={resolvePreviewStrokeWidth(annotation.style, "marker")}
                      strokeLinecap="square"
                      strokeLinejoin="round"
                    />
                  );
                }

                if (annotation.kind === "ink-stroke") {
                  return (
                    <polyline
                      key={annotation.id}
                      points={pointListToSvgPoints(annotation.points)}
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={opacity}
                      strokeWidth={resolvePreviewStrokeWidth(annotation.style, "ink")}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                }

                if (annotation.kind === "rectangle" || annotation.kind === "ellipse") {
                  const bounds = annotation.bounds;
                  const strokeWidth = resolvePreviewStrokeWidth(annotation.style, "shape");

                  return annotation.kind === "rectangle" ? (
                    <rect
                      key={annotation.id}
                      x={bounds.x * 100}
                      y={bounds.y * 100}
                      width={bounds.width * 100}
                      height={bounds.height * 100}
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={opacity}
                      strokeWidth={strokeWidth}
                    />
                  ) : (
                    <ellipse
                      key={annotation.id}
                      cx={(bounds.x + bounds.width / 2) * 100}
                      cy={(bounds.y + bounds.height / 2) * 100}
                      rx={(bounds.width / 2) * 100}
                      ry={(bounds.height / 2) * 100}
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={opacity}
                      strokeWidth={strokeWidth}
                    />
                  );
                }

                if (annotation.kind === "line" || annotation.kind === "arrow") {
                  const arrowHead = buildArrowHeadPoints(annotation.start, annotation.end);
                  const strokeWidth = resolvePreviewStrokeWidth(annotation.style, "shape");

                  return (
                    <g key={annotation.id}>
                      <line
                        x1={annotation.start.x * 100}
                        y1={annotation.start.y * 100}
                        x2={annotation.end.x * 100}
                        y2={annotation.end.y * 100}
                        stroke={stroke}
                        strokeOpacity={opacity}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                      />
                      {annotation.kind === "arrow" ? (
                        <polyline
                          points={pointListToSvgPoints(arrowHead)}
                          fill="none"
                          stroke={stroke}
                          strokeOpacity={opacity}
                          strokeWidth={strokeWidth}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                    </g>
                  );
                }

                return null;
              })}

              {draft && activeTool === "highlighter-pen" ? (
                <polyline
                  points={pointListToSvgPoints(draft.points)}
                  fill="none"
                  stroke={style.color}
                  strokeOpacity={style.opacity}
                  strokeWidth={resolvePreviewStrokeWidth(style, "marker")}
                  strokeLinecap="square"
                  strokeLinejoin="round"
                />
              ) : null}

              {draft && activeTool === "pen" ? (
                <polyline
                  points={pointListToSvgPoints(draft.points)}
                  fill="none"
                  stroke={style.color}
                  strokeOpacity={style.opacity}
                  strokeWidth={resolvePreviewStrokeWidth(style, "ink")}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : null}

              {draftBounds && (activeTool === "rectangle" || activeTool === "ellipse") ? (
                activeTool === "rectangle" ? (
                  <rect
                    x={draftBounds.x * 100}
                    y={draftBounds.y * 100}
                    width={draftBounds.width * 100}
                    height={draftBounds.height * 100}
                    fill="none"
                    stroke={style.color}
                    strokeOpacity={style.opacity}
                    strokeWidth={resolvePreviewStrokeWidth(style, "shape")}
                    strokeDasharray="1.2 0.7"
                  />
                ) : (
                  <ellipse
                    cx={(draftBounds.x + draftBounds.width / 2) * 100}
                    cy={(draftBounds.y + draftBounds.height / 2) * 100}
                    rx={(draftBounds.width / 2) * 100}
                    ry={(draftBounds.height / 2) * 100}
                    fill="none"
                    stroke={style.color}
                    strokeOpacity={style.opacity}
                    strokeWidth={resolvePreviewStrokeWidth(style, "shape")}
                    strokeDasharray="1.2 0.7"
                  />
                )
              ) : null}

              {draft && (activeTool === "line" || activeTool === "arrow") ? (
                <g>
                  <line
                    x1={draft.start.x * 100}
                    y1={draft.start.y * 100}
                    x2={draft.current.x * 100}
                    y2={draft.current.y * 100}
                    stroke={style.color}
                    strokeOpacity={style.opacity}
                    strokeWidth={resolvePreviewStrokeWidth(style, "shape")}
                    strokeLinecap="round"
                    strokeDasharray="1.2 0.7"
                  />
                  {activeTool === "arrow" ? (
                    <polyline
                      points={pointListToSvgPoints(buildArrowHeadPoints(draft.start, draft.current))}
                      fill="none"
                      stroke={style.color}
                      strokeOpacity={style.opacity}
                      strokeWidth={resolvePreviewStrokeWidth(style, "shape")}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}
                </g>
              ) : null}
            </svg>

            {pageAnnotations.map((annotation) => {
              const bounds = buildAnnotationBounds(annotation);
              const selected = annotation.id === selectedAnnotationId;

              if (annotation.kind === "text-note") {
                return (
                  <button
                    key={annotation.id}
                    type="button"
                    data-annotation-item="true"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelectAnnotation(annotation.id);
                    }}
                    className={`absolute overflow-hidden rounded-xl border px-3 py-2 text-left text-xs font-semibold leading-5 shadow-sm transition ${
                      selected
                        ? "border-[var(--violet-600)] ring-2 ring-[rgba(101,80,232,0.22)]"
                        : "border-black/10 hover:border-[var(--violet-border)]"
                    }`}
                    style={{
                      ...normalizedRectToCssStyle(annotation.bounds),
                      color: annotation.style.color,
                      backgroundColor: annotation.backgroundColor,
                      opacity: annotation.style.opacity,
                      fontSize: `${Math.max(10, annotation.fontSize)}px`,
                    }}
                    title={annotationTitle(annotation)}
                  >
                    {annotation.text}
                  </button>
                );
              }

              return (
                <button
                  key={annotation.id}
                  type="button"
                  data-annotation-item="true"
                  onClick={(event) => {
                    event.stopPropagation();
                    onSelectAnnotation(annotation.id);
                  }}
                  className={`absolute rounded-md transition ${
                    selected
                      ? "border border-[var(--violet-600)] bg-[rgba(101,80,232,0.07)] ring-2 ring-[rgba(101,80,232,0.18)]"
                      : "border border-transparent hover:border-[var(--violet-border)] hover:bg-[rgba(101,80,232,0.04)]"
                  }`}
                  style={normalizedRectToCssStyle(bounds)}
                  aria-label={`Select ${annotationTitle(annotation)}`}
                  title={annotationTitle(annotation)}
                />
              );
            })}

            {draftBounds && activeTool === "text-note" ? (
              <div
                className="pointer-events-none absolute rounded-xl border-2 border-dashed border-[var(--violet-600)] bg-[rgba(255,228,94,0.38)]"
                style={normalizedRectToCssStyle(draftBounds)}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
