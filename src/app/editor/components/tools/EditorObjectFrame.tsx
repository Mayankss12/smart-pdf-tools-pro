"use client";

import { Lock, Trash2 } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import type { EditorObject, EditorObjectBox } from "../../hooks/useEditor";

type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

type CornerResizeHandle = Extract<
  ResizeHandle,
  "top-left" | "top-right" | "bottom-left" | "bottom-right"
>;

type ResizeState = {
  readonly handle: ResizeHandle;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startBox: EditorObjectBox;
  readonly pointerId: number;
};

type DragState = {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startBox: EditorObjectBox;
  readonly pointerId: number;
  dragging: boolean;
};

type PageBounds = {
  readonly width: number;
  readonly height: number;
};

type EditorObjectFrameProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly toolbarLabel?: string;
  readonly toolbarContent?: ReactNode;
  readonly children: ReactNode;
  readonly preserveAspectRatioOnCornerResize?: boolean;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const DRAG_THRESHOLD = 3;
const TEXT_OBJECT_MIN_WIDTH = 140;
const TEXT_OBJECT_MIN_HEIGHT = 34;
const BOX_EPSILON = 0.1;

const HANDLE_STYLES: Record<ResizeHandle, string> = {
  "top-left": "-left-2 -top-2 cursor-nwse-resize",
  top: "left-1/2 -top-2 -translate-x-1/2 cursor-ns-resize",
  "top-right": "-right-2 -top-2 cursor-nesw-resize",
  right: "-right-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
  "bottom-right": "-bottom-2 -right-2 cursor-nwse-resize",
  bottom: "-bottom-2 left-1/2 -translate-x-1/2 cursor-ns-resize",
  "bottom-left": "-bottom-2 -left-2 cursor-nesw-resize",
  left: "-left-2 top-1/2 -translate-y-1/2 cursor-ew-resize",
};

const RESIZE_HANDLES: readonly ResizeHandle[] = [
  "top-left",
  "top",
  "top-right",
  "right",
  "bottom-right",
  "bottom",
  "bottom-left",
  "left",
];

const CORNER_HANDLES = new Set<ResizeHandle>([
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isCornerHandle(handle: ResizeHandle): handle is CornerResizeHandle {
  return CORNER_HANDLES.has(handle);
}

function boxesDiffer(left: EditorObjectBox, right: EditorObjectBox) {
  return (
    Math.abs(left.x - right.x) > BOX_EPSILON ||
    Math.abs(left.y - right.y) > BOX_EPSILON ||
    Math.abs(left.width - right.width) > BOX_EPSILON ||
    Math.abs(left.height - right.height) > BOX_EPSILON
  );
}

function getAspectLockedCornerBox({
  handle,
  startBox,
  deltaX,
  deltaY,
  minWidth,
  minHeight,
  pageBounds,
}: {
  readonly handle: CornerResizeHandle;
  readonly startBox: EditorObjectBox;
  readonly deltaX: number;
  readonly deltaY: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly pageBounds: PageBounds | null;
}): EditorObjectBox {
  const startWidth = Math.max(minWidth, startBox.width);
  const startHeight = Math.max(minHeight, startBox.height);

  const horizontalDelta = handle.includes("left") ? -deltaX : deltaX;
  const verticalDelta = handle.includes("top") ? -deltaY : deltaY;

  const horizontalScale = (startWidth + horizontalDelta) / startWidth;
  const verticalScale = (startHeight + verticalDelta) / startHeight;
  const horizontalChange = Math.abs(horizontalScale - 1);
  const verticalChange = Math.abs(verticalScale - 1);
  const minScale = Math.max(minWidth / startWidth, minHeight / startHeight);

  const pageWidth = pageBounds?.width ?? Number.POSITIVE_INFINITY;
  const pageHeight = pageBounds?.height ?? Number.POSITIVE_INFINITY;

  let maxWidth = Number.POSITIVE_INFINITY;
  let maxHeight = Number.POSITIVE_INFINITY;

  if (handle === "bottom-right") {
    maxWidth = pageWidth - startBox.x;
    maxHeight = pageHeight - startBox.y;
  }

  if (handle === "bottom-left") {
    maxWidth = startBox.x + startWidth;
    maxHeight = pageHeight - startBox.y;
  }

  if (handle === "top-right") {
    maxWidth = pageWidth - startBox.x;
    maxHeight = startBox.y + startHeight;
  }

  if (handle === "top-left") {
    maxWidth = startBox.x + startWidth;
    maxHeight = startBox.y + startHeight;
  }

  const maxScale = Math.max(
    minScale,
    Math.min(maxWidth / startWidth, maxHeight / startHeight),
  );

  const nextScale = clamp(
    horizontalChange >= verticalChange ? horizontalScale : verticalScale,
    minScale,
    maxScale,
  );

  const width = startWidth * nextScale;
  const height = startHeight * nextScale;

  if (handle === "bottom-right") {
    return { x: startBox.x, y: startBox.y, width, height };
  }

  if (handle === "bottom-left") {
    const anchorX = startBox.x + startWidth;
    return { x: anchorX - width, y: startBox.y, width, height };
  }

  if (handle === "top-right") {
    const anchorY = startBox.y + startHeight;
    return { x: startBox.x, y: anchorY - height, width, height };
  }

  const anchorX = startBox.x + startWidth;
  const anchorY = startBox.y + startHeight;

  return { x: anchorX - width, y: anchorY - height, width, height };
}

export function EditorObjectFrame({
  object,
  selected,
  pageScale,
  minWidth = 40,
  minHeight = 24,
  toolbarLabel = "Object",
  toolbarContent,
  children,
  preserveAspectRatioOnCornerResize = false,
  onSelect,
  onUpdateBox,
  onDelete,
}: EditorObjectFrameProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const fitFrameRef = useRef<number | null>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);
  const locked = Boolean(object.locked);
  const objectOpacity = object.data.opacity ?? 1;
  const effectiveMinWidth =
    object.type === "text" ? Math.max(minWidth, TEXT_OBJECT_MIN_WIDTH) : minWidth;
  const effectiveMinHeight =
    object.type === "text" ? Math.max(minHeight, TEXT_OBJECT_MIN_HEIGHT) : minHeight;

  function getPageBounds(): PageBounds | null {
    const root = rootRef.current;
    const pageLayer = root?.parentElement;

    if (!pageLayer) return null;

    const safeScale = Math.max(0.01, pageScale);

    return {
      width: pageLayer.clientWidth / safeScale,
      height: pageLayer.clientHeight / safeScale,
    };
  }

  function clampBoxToPage(box: EditorObjectBox): EditorObjectBox {
    const pageBounds = getPageBounds();

    if (!pageBounds) {
      return {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.max(effectiveMinWidth, box.width),
        height: Math.max(effectiveMinHeight, box.height),
      };
    }

    const pageWidth = Math.max(1, pageBounds.width);
    const pageHeight = Math.max(1, pageBounds.height);
    const minimumWidth = Math.min(effectiveMinWidth, pageWidth);
    const minimumHeight = Math.min(effectiveMinHeight, pageHeight);
    const safeWidth = clamp(box.width, minimumWidth, pageWidth);
    const safeHeight = clamp(box.height, minimumHeight, pageHeight);

    return {
      x: clamp(box.x, 0, Math.max(0, pageWidth - safeWidth)),
      y: clamp(box.y, 0, Math.max(0, pageHeight - safeHeight)),
      width: safeWidth,
      height: safeHeight,
    };
  }

  function commitClampedBox(box: EditorObjectBox) {
    const nextBox = clampBoxToPage(box);

    if (boxesDiffer(object.box, nextBox)) {
      onUpdateBox(object.id, nextBox);
    }
  }

  useEffect(() => {
    if (!selected) {
      setToolbarHost(null);
      return;
    }

    setToolbarHost(document.getElementById("editor-object-toolbar-host"));
  }, [selected]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      commitClampedBox(object.box);
    });

    return () => window.cancelAnimationFrame(frame);
    // The individual box fields keep this normalization deterministic without
    // depending on object identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    object.id,
    object.box.x,
    object.box.y,
    object.box.width,
    object.box.height,
    pageScale,
    effectiveMinWidth,
    effectiveMinHeight,
  ]);

  useEffect(() => {
    if (object.type !== "text") return;

    const editable = rootRef.current?.querySelector<HTMLElement>("[contenteditable]");
    if (!editable) return;

    function scheduleFit() {
      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
      }

      fitFrameRef.current = window.requestAnimationFrame(() => {
        fitFrameRef.current = null;

        const pageBounds = getPageBounds();
        if (!pageBounds) return;

        const safeScale = Math.max(0.01, pageScale);
        const overflowPixels = Math.max(
          0,
          editable.scrollHeight - editable.clientHeight,
        );
        const overflowHeight =
          overflowPixels > 1 ? Math.ceil(overflowPixels / safeScale) + 2 : 0;
        const desiredBox: EditorObjectBox = {
          ...object.box,
          width: Math.max(object.box.width, effectiveMinWidth),
          height: Math.max(
            object.box.height + overflowHeight,
            effectiveMinHeight,
          ),
        };

        commitClampedBox(desiredBox);
      });
    }

    scheduleFit();

    const mutationObserver = new MutationObserver(scheduleFit);
    mutationObserver.observe(editable, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(scheduleFit);
    resizeObserver?.observe(editable);

    return () => {
      mutationObserver.disconnect();
      resizeObserver?.disconnect();

      if (fitFrameRef.current !== null) {
        window.cancelAnimationFrame(fitFrameRef.current);
        fitFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    object.id,
    object.type,
    object.box.x,
    object.box.y,
    object.box.width,
    object.box.height,
    object.data.text,
    object.data.textRuns,
    object.data.fontSize,
    pageScale,
    effectiveMinWidth,
    effectiveMinHeight,
  ]);

  function handleRootPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect(object.id);

    if (locked) {
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
      pointerId: event.pointerId,
      dragging: false,
    };
  }

  function handleRootPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const state = dragRef.current;

    if (locked || !state) return;

    const dxClient = event.clientX - state.startClientX;
    const dyClient = event.clientY - state.startClientY;

    if (!state.dragging) {
      if (Math.hypot(dxClient, dyClient) < DRAG_THRESHOLD) return;

      state.dragging = true;

      try {
        event.currentTarget.setPointerCapture(state.pointerId);
      } catch {
        // Ignore capture errors.
      }
    }

    event.preventDefault();

    const safeScale = Math.max(0.01, pageScale);
    const nextBox = clampBoxToPage({
      ...state.startBox,
      x: state.startBox.x + dxClient / safeScale,
      y: state.startBox.y + dyClient / safeScale,
    });

    onUpdateBox(object.id, { x: nextBox.x, y: nextBox.y });
  }

  function handleRootPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    const state = dragRef.current;
    dragRef.current = null;

    if (state?.dragging) {
      try {
        event.currentTarget.releasePointerCapture(state.pointerId);
      } catch {
        // Ignore release errors.
      }
    }
  }

  function startResize(
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();
    onSelect(object.id);

    if (locked) {
      resizeRef.current = null;
      return;
    }

    resizeRef.current = {
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
      pointerId: event.pointerId,
    };

    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Ignore capture errors.
    }
  }

  function resizeObject(event: ReactPointerEvent<HTMLButtonElement>) {
    if (locked || !resizeRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const safeScale = Math.max(0.01, pageScale);
    const pageBounds = getPageBounds();
    const deltaX = (event.clientX - resizeRef.current.startClientX) / safeScale;
    const deltaY = (event.clientY - resizeRef.current.startClientY) / safeScale;
    const { handle, startBox } = resizeRef.current;

    const pageWidth = pageBounds?.width ?? Number.POSITIVE_INFINITY;
    const pageHeight = pageBounds?.height ?? Number.POSITIVE_INFINITY;

    let left = startBox.x;
    let top = startBox.y;
    let right = startBox.x + startBox.width;
    let bottom = startBox.y + startBox.height;

    if (handle.includes("right")) {
      right = clamp(
        startBox.x + startBox.width + deltaX,
        startBox.x + effectiveMinWidth,
        pageWidth,
      );
    }

    if (handle.includes("left")) {
      left = clamp(
        startBox.x + deltaX,
        0,
        startBox.x + startBox.width - effectiveMinWidth,
      );
    }

    if (handle.includes("bottom")) {
      bottom = clamp(
        startBox.y + startBox.height + deltaY,
        startBox.y + effectiveMinHeight,
        pageHeight,
      );
    }

    if (handle.includes("top")) {
      top = clamp(
        startBox.y + deltaY,
        0,
        startBox.y + startBox.height - effectiveMinHeight,
      );
    }

    const nextBox =
      preserveAspectRatioOnCornerResize && isCornerHandle(handle)
        ? getAspectLockedCornerBox({
            handle,
            startBox,
            deltaX,
            deltaY,
            minWidth: effectiveMinWidth,
            minHeight: effectiveMinHeight,
            pageBounds,
          })
        : {
            x: left,
            y: top,
            width: right - left,
            height: bottom - top,
          };

    onUpdateBox(object.id, clampBoxToPage(nextBox));
  }

  function stopResize(event: ReactPointerEvent<HTMLButtonElement>) {
    const state = resizeRef.current;
    resizeRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(
        state?.pointerId ?? event.pointerId,
      );
    } catch {
      // Ignore release errors.
    }
  }

  function nudgeObject(deltaX: number, deltaY: number) {
    if (locked) return;

    const nextBox = clampBoxToPage({
      ...object.box,
      x: object.box.x + deltaX,
      y: object.box.y + deltaY,
    });

    onUpdateBox(object.id, { x: nextBox.x, y: nextBox.y });
  }

  const showToolbarBelow = object.box.y * pageScale < 56;

  const toolbar = selected ? (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      className={
        toolbarHost
          ? "flex max-w-full items-center gap-1 whitespace-nowrap rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_12px_34px_rgba(15,23,42,0.12)]"
          : "absolute left-0 z-50 flex max-w-[min(92vw,720px)] items-center gap-1 overflow-x-auto whitespace-nowrap rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]"
      }
      style={
        toolbarHost
          ? undefined
          : showToolbarBelow
            ? { top: "100%", marginTop: 10 }
            : { bottom: "100%", marginBottom: 10 }
      }
      role="toolbar"
      aria-label={`${toolbarLabel} controls`}
    >
      {locked ? (
        <span className="flex h-8 shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-2 text-[11px] font-black text-slate-600">
          <Lock size={13} />
          Locked
        </span>
      ) : null}

      {toolbarContent ? (
        <div className="flex min-w-0 shrink-0 items-center gap-1">
          {toolbarContent}
        </div>
      ) : null}

      {toolbarContent ? (
        <span className="h-5 w-px shrink-0 bg-slate-200" />
      ) : null}

      <button
        type="button"
        disabled={locked}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onDelete(object.id);
        }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:border disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        aria-label={`Delete ${toolbarLabel}`}
        title={
          locked
            ? `Unlock ${toolbarLabel} before deleting`
            : `Delete ${toolbarLabel}`
        }
      >
        <Trash2 size={15} />
      </button>
    </div>
  ) : null;

  return (
    <div
      ref={rootRef}
      data-editor-object-frame={object.type}
      className={[
        "absolute z-30 transition-[border-color,box-shadow,background-color] duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300",
        locked ? "cursor-default" : "cursor-move touch-none",
        selected
          ? locked
            ? "border border-slate-500 bg-slate-100/10 ring-2 ring-slate-400/20"
            : "border border-violet-500 bg-white/5 ring-2 ring-violet-500/20"
          : "border border-transparent hover:border-violet-300/70",
      ].join(" ")}
      style={{
        left: object.box.x * pageScale,
        top: object.box.y * pageScale,
        width: object.box.width * pageScale,
        height: object.box.height * pageScale,
      }}
      onPointerDown={handleRootPointerDown}
      onPointerMove={locked ? undefined : handleRootPointerMove}
      onPointerUp={locked ? undefined : handleRootPointerUp}
      onPointerCancel={locked ? undefined : handleRootPointerUp}
      tabIndex={0}
      role="group"
      aria-label={`${toolbarLabel} object, ${selected ? "selected" : "not selected"}, ${locked ? "locked" : "unlocked"}, page ${object.pageNumber}, position ${Math.round(object.box.x)} by ${Math.round(object.box.y)}, size ${Math.round(object.box.width)} by ${Math.round(object.box.height)}`}
      onFocus={() => onSelect(object.id)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;

        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(object.id);
          return;
        }

        const step = event.shiftKey ? 10 : 1;

        if (event.key === "ArrowLeft") {
          event.preventDefault();
          nudgeObject(-step, 0);
        }

        if (event.key === "ArrowRight") {
          event.preventDefault();
          nudgeObject(step, 0);
        }

        if (event.key === "ArrowUp") {
          event.preventDefault();
          nudgeObject(0, -step);
        }

        if (event.key === "ArrowDown") {
          event.preventDefault();
          nudgeObject(0, step);
        }
      }}
    >
      <div
        className={[
          "h-full w-full",
          object.type === "text" && selected
            ? "overflow-y-auto overflow-x-hidden"
            : "overflow-hidden",
          locked ? "pointer-events-none" : "",
        ].join(" ")}
        style={{ opacity: objectOpacity }}
      >
        {children}
      </div>

      {selected && locked ? (
        <span className="absolute -right-2 -top-2 z-50 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-slate-700 text-white shadow-md">
          <Lock size={11} />
        </span>
      ) : null}

      {selected && !locked
        ? RESIZE_HANDLES.map((handle) => (
            <button
              key={handle}
              type="button"
              onPointerDown={(event) => startResize(handle, event)}
              onPointerMove={resizeObject}
              onPointerUp={stopResize}
              onPointerCancel={stopResize}
              className={[
                "absolute z-40 h-4 w-4 rounded-full border-2 border-white bg-violet-600 shadow-[0_2px_8px_rgba(79,70,229,0.32)] transition-transform duration-150 hover:scale-125 hover:bg-violet-700 focus-visible:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300",
                HANDLE_STYLES[handle],
              ].join(" ")}
              aria-label={`Resize ${toolbarLabel} from ${handle}`}
              title={
                preserveAspectRatioOnCornerResize && isCornerHandle(handle)
                  ? `Resize ${toolbarLabel} proportionally`
                  : `Resize ${toolbarLabel}`
              }
            />
          ))
        : null}

      {toolbar
        ? toolbarHost
          ? createPortal(toolbar, toolbarHost)
          : toolbar
        : null}
    </div>
  );
}
