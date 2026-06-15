"use client";

import { GripHorizontal, Trash2 } from "lucide-react";
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

type PointerTarget = HTMLButtonElement | HTMLDivElement;

type DragState = {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startBox: EditorObjectBox;
};

type ResizeState = {
  readonly handle: ResizeHandle;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startBox: EditorObjectBox;
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
  readonly directDrag?: boolean;
  readonly preserveAspectRatioOnCornerResize?: boolean;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const HANDLE_STYLES: Record<ResizeHandle, string> = {
  "top-left": "-left-1.5 -top-1.5 cursor-nwse-resize",
  top: "left-1/2 -top-1.5 -translate-x-1/2 cursor-ns-resize",
  "top-right": "-right-1.5 -top-1.5 cursor-nesw-resize",
  right: "right-[-0.375rem] top-1/2 -translate-y-1/2 cursor-ew-resize",
  "bottom-right": "-bottom-1.5 -right-1.5 cursor-nwse-resize",
  bottom: "bottom-[-0.375rem] left-1/2 -translate-x-1/2 cursor-ns-resize",
  "bottom-left": "-bottom-1.5 -left-1.5 cursor-nesw-resize",
  left: "left-[-0.375rem] top-1/2 -translate-y-1/2 cursor-ew-resize",
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

function clampSize(value: number, minimum: number) {
  return Math.max(minimum, value);
}

function isCornerHandle(handle: ResizeHandle): handle is CornerResizeHandle {
  return CORNER_HANDLES.has(handle);
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
  let targetScale = horizontalChange >= verticalChange ? horizontalScale : verticalScale;

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

  targetScale = clamp(targetScale, minScale, maxScale);

  const width = startWidth * targetScale;
  const height = startHeight * targetScale;

  if (handle === "bottom-right") {
    return {
      x: startBox.x,
      y: startBox.y,
      width,
      height,
    };
  }

  if (handle === "bottom-left") {
    const anchorX = startBox.x + startWidth;

    return {
      x: anchorX - width,
      y: startBox.y,
      width,
      height,
    };
  }

  if (handle === "top-right") {
    const anchorY = startBox.y + startHeight;

    return {
      x: startBox.x,
      y: anchorY - height,
      width,
      height,
    };
  }

  const anchorX = startBox.x + startWidth;
  const anchorY = startBox.y + startHeight;

  return {
    x: anchorX - width,
    y: anchorY - height,
    width,
    height,
  };
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
  directDrag = false,
  preserveAspectRatioOnCornerResize = false,
  onSelect,
  onUpdateBox,
  onDelete,
}: EditorObjectFrameProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [toolbarHost, setToolbarHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!selected) {
      setToolbarHost(null);
      return;
    }

    const updateHost = () => {
      setToolbarHost(document.getElementById("editor-object-toolbar-host"));
    };

    updateHost();

    const frame = window.requestAnimationFrame(updateHost);

    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

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
        width: clampSize(box.width, minWidth),
        height: clampSize(box.height, minHeight),
      };
    }

    const safeWidth = clamp(box.width, minWidth, Math.max(minWidth, pageBounds.width));
    const safeHeight = clamp(box.height, minHeight, Math.max(minHeight, pageBounds.height));

    return {
      x: clamp(box.x, 0, Math.max(0, pageBounds.width - safeWidth)),
      y: clamp(box.y, 0, Math.max(0, pageBounds.height - safeHeight)),
      width: safeWidth,
      height: safeHeight,
    };
  }

  function startMove(event: ReactPointerEvent<PointerTarget>) {
    event.preventDefault();
    event.stopPropagation();

    onSelect(object.id);

    dragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveObject(event: ReactPointerEvent<PointerTarget>) {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const safeScale = Math.max(0.01, pageScale);
    const nextBox = clampBoxToPage({
      ...dragRef.current.startBox,
      x:
        dragRef.current.startBox.x +
        (event.clientX - dragRef.current.startClientX) / safeScale,
      y:
        dragRef.current.startBox.y +
        (event.clientY - dragRef.current.startClientY) / safeScale,
    });

    onUpdateBox(object.id, {
      x: nextBox.x,
      y: nextBox.y,
    });
  }

  function stopMove(event: ReactPointerEvent<PointerTarget>) {
    dragRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release errors.
    }
  }

  function handleRootPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (directDrag) {
      startMove(event);
      return;
    }

    event.stopPropagation();
    onSelect(object.id);
  }

  function startResize(handle: ResizeHandle, event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    onSelect(object.id);

    resizeRef.current = {
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizeObject(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!resizeRef.current) return;

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
      right = clamp(startBox.x + startBox.width + deltaX, startBox.x + minWidth, pageWidth);
    }

    if (handle.includes("left")) {
      left = clamp(startBox.x + deltaX, 0, startBox.x + startBox.width - minWidth);
    }

    if (handle.includes("bottom")) {
      bottom = clamp(startBox.y + startBox.height + deltaY, startBox.y + minHeight, pageHeight);
    }

    if (handle.includes("top")) {
      top = clamp(startBox.y + deltaY, 0, startBox.y + startBox.height - minHeight);
    }

    const nextBox = preserveAspectRatioOnCornerResize && isCornerHandle(handle)
      ? getAspectLockedCornerBox({
          handle,
          startBox,
          deltaX,
          deltaY,
          minWidth,
          minHeight,
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
    resizeRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release errors.
    }
  }

  const toolbar = selected && toolbarHost
    ? createPortal(
        <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
          {!directDrag ? (
            <button
              type="button"
              onPointerDown={startMove}
              onPointerMove={moveObject}
              onPointerUp={stopMove}
              onPointerCancel={stopMove}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-600 transition duration-200 hover:bg-violet-50 hover:text-violet-700"
              aria-label={`Move ${toolbarLabel}`}
              title={`Move ${toolbarLabel}`}
            >
              <GripHorizontal size={16} />
            </button>
          ) : null}

          {toolbarContent ? (
            <>
              {!directDrag ? <span className="h-5 w-px shrink-0 bg-slate-200" /> : null}
              <div className="flex min-w-0 shrink-0 items-center gap-1">{toolbarContent}</div>
            </>
          ) : null}

          <span className="h-5 w-px shrink-0 bg-slate-200" />

          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete(object.id);
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-500 transition duration-200 hover:bg-red-50 hover:text-red-600"
            aria-label={`Delete ${toolbarLabel}`}
            title={`Delete ${toolbarLabel}`}
          >
            <Trash2 size={15} />
          </button>
        </div>,
        toolbarHost,
      )
    : null;

  return (
    <>
      <div
        ref={rootRef}
        className={[
          "absolute z-30 rounded-none transition duration-200",
          directDrag ? "cursor-move touch-none" : "",
          selected
            ? "border border-violet-500 bg-white/5 ring-2 ring-violet-500/20"
            : "border border-transparent hover:border-violet-300/70",
        ].join(" ")}
        style={{
          left: object.box.x * pageScale,
          top: object.box.y * pageScale,
          width: object.box.width * pageScale,
          height: object.box.height * pageScale,
        }}
        onPointerDown={handleRootPointerDown}
        onPointerMove={directDrag ? moveObject : undefined}
        onPointerUp={directDrag ? stopMove : undefined}
        onPointerCancel={directDrag ? stopMove : undefined}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(object.id);
        }}
      >
        <div className="h-full w-full overflow-hidden">{children}</div>

        {selected ? (
          <>
            {RESIZE_HANDLES.map((handle) => (
              <button
                key={handle}
                type="button"
                onPointerDown={(event) => startResize(handle, event)}
                onPointerMove={resizeObject}
                onPointerUp={stopResize}
                onPointerCancel={stopResize}
                className={[
                  "absolute z-40 h-3 w-3 rounded-full border-2 border-white bg-violet-600 shadow-[0_2px_8px_rgba(79,70,229,0.32)] transition duration-200 hover:scale-125 hover:bg-violet-700",
                  HANDLE_STYLES[handle],
                ].join(" ")}
                aria-label={`Resize ${toolbarLabel}`}
                title={
                  preserveAspectRatioOnCornerResize && isCornerHandle(handle)
                    ? `Resize ${toolbarLabel} proportionally`
                    : `Resize ${toolbarLabel}`
                }
              />
            ))}
          </>
        ) : null}
      </div>

      {toolbar}
    </>
  );
}
