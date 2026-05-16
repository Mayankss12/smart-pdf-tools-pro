"use client";

import { useMemo, useRef, useState } from "react";

import type {
  NormalizedRect,
} from "@/engines/shared/types";

import type {
  CompositedHighlightRegion,
} from "@/engines/highlight/overlapMerger";

import {
  composeHighlightRegions,
} from "@/engines/highlight/overlapMerger";

import type {
  HighlightLayer,
} from "@/engines/highlight/types";

import type {
  HighlightPageSnapshot,
} from "./highlightToolTypes";

import {
  createNormalizedDragBounds,
  normalizedRectToCssStyle,
} from "./highlightToolRuntime";

export interface HighlightPageSurfaceProps {
  readonly page: HighlightPageSnapshot;
  readonly layers: readonly HighlightLayer[];
  readonly selectedLayerId: string | null;
  readonly onDragComplete: (dragBounds: NormalizedRect) => void;
  readonly onSelectLayer: (layerId: string) => void;
}

interface PointerDragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
}

function getRegionLayerId(
  region: CompositedHighlightRegion,
): string | null {
  return region.sourceLayerIds[0] ?? null;
}

export function HighlightPageSurface({
  page,
  layers,
  selectedLayerId,
  onDragComplete,
  onSelectLayer,
}: HighlightPageSurfaceProps) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<PointerDragState | null>(null);

  const pageLayers = useMemo(
    () => layers.filter((layer) => layer.pageIndex === page.pageIndex),
    [layers, page.pageIndex],
  );

  const compositedRegions = useMemo(
    () => composeHighlightRegions(pageLayers).regions,
    [pageLayers],
  );

  const draftBounds = useMemo(() => {
    if (!drag || !surfaceRef.current) {
      return null;
    }

    return createNormalizedDragBounds({
      startX: drag.startX,
      startY: drag.startY,
      endX: drag.currentX,
      endY: drag.currentY,
      containerRect: surfaceRef.current.getBoundingClientRect(),
    });
  }, [drag]);

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            Active page
          </div>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
            {page.pageLabel}
          </h2>
        </div>

        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Text units detected
          </div>
          <div className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950">
            {page.textUnits.length}
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-[1.75rem] border border-slate-200 bg-slate-100 p-4">
        <div className="mx-auto w-fit max-w-full rounded-2xl bg-white p-3 shadow-xl shadow-slate-300/35">
          <div
            ref={surfaceRef}
            className="relative select-none overflow-hidden rounded-xl bg-white touch-none"
            style={{
              width: `${page.geometry.viewportSize.width}px`,
              maxWidth: "100%",
              aspectRatio: `${page.geometry.viewportSize.width} / ${page.geometry.viewportSize.height}`,
            }}
            onPointerDown={(event) => {
              if (event.button !== 0) {
                return;
              }

              const target = event.target as HTMLElement;

              if (target.closest("[data-highlight-region='true']")) {
                return;
              }

              surfaceRef.current?.setPointerCapture(event.pointerId);

              setDrag({
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                currentX: event.clientX,
                currentY: event.clientY,
              });
            }}
            onPointerMove={(event) => {
              setDrag((current) => {
                if (!current || current.pointerId !== event.pointerId) {
                  return current;
                }

                return {
                  ...current,
                  currentX: event.clientX,
                  currentY: event.clientY,
                };
              });
            }}
            onPointerUp={(event) => {
              const currentDrag = drag;

              if (!currentDrag || currentDrag.pointerId !== event.pointerId || !surfaceRef.current) {
                return;
              }

              const bounds = createNormalizedDragBounds({
                startX: currentDrag.startX,
                startY: currentDrag.startY,
                endX: event.clientX,
                endY: event.clientY,
                containerRect: surfaceRef.current.getBoundingClientRect(),
              });

              surfaceRef.current.releasePointerCapture(event.pointerId);
              setDrag(null);
              onDragComplete(bounds);
            }}
            onPointerCancel={(event) => {
              if (surfaceRef.current?.hasPointerCapture(event.pointerId)) {
                surfaceRef.current.releasePointerCapture(event.pointerId);
              }

              setDrag(null);
            }}
          >
            <img
              src={page.previewUrl}
              alt={page.pageLabel}
              draggable={false}
              className="absolute inset-0 h-full w-full object-fill"
            />

            {compositedRegions.map((region) => {
              const regionLayerId = getRegionLayerId(region);
              const selected =
                regionLayerId !== null && region.sourceLayerIds.includes(selectedLayerId ?? "");

              return (
                <button
                  key={`${region.pageIndex}-${region.renderOrder}-${region.sourceRegionIds.join("-")}`}
                  type="button"
                  data-highlight-region="true"
                  onClick={(event) => {
                    event.stopPropagation();

                    if (regionLayerId) {
                      onSelectLayer(regionLayerId);
                    }
                  }}
                  className={`absolute rounded-sm border transition ${
                    selected
                      ? "border-indigo-600 ring-2 ring-indigo-500/40"
                      : "border-transparent hover:border-slate-600/40"
                  }`}
                  style={{
                    ...normalizedRectToCssStyle(region.bounds),
                    backgroundColor: region.style.color,
                    opacity: region.style.opacity,
                  }}
                  aria-label="Select highlight"
                />
              );
            })}

            {draftBounds && (
              <div
                className="pointer-events-none absolute rounded-sm border-2 border-dashed border-indigo-500 bg-indigo-300/20"
                style={normalizedRectToCssStyle(draftBounds)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
