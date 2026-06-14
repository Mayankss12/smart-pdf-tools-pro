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

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

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

type EditorObjectFrameProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly minWidth?: number;
  readonly minHeight?: number;
  readonly toolbarLabel?: string;
  readonly toolbarContent?: ReactNode;
  readonly children: ReactNode;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

const HANDLE_STYLES: Record<ResizeHandle, string> = {
  "top-left": "-left-1 -top-1 cursor-nwse-resize",
  "top-right": "-right-1 -top-1 cursor-nesw-resize",
  "bottom-left": "-bottom-1 -left-1 cursor-nesw-resize",
  "bottom-right": "-bottom-1 -right-1 cursor-nwse-resize",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampSize(value: number, minimum: number) {
  return Math.max(minimum, value);
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

  function getPageBounds() {
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

  function startMove(event: ReactPointerEvent<HTMLButtonElement>) {
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

  function moveObject(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const nextBox = clampBoxToPage({
      ...dragRef.current.startBox,
      x:
        dragRef.current.startBox.x +
        (event.clientX - dragRef.current.startClientX) / pageScale,
      y:
        dragRef.current.startBox.y +
        (event.clientY - dragRef.current.startClientY) / pageScale,
    });

    onUpdateBox(object.id, {
      x: nextBox.x,
      y: nextBox.y,
    });
  }

  function stopMove(event: ReactPointerEvent<HTMLButtonElement>) {
    dragRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release errors.
    }
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

    const pageBounds = getPageBounds();
    const deltaX = (event.clientX - resizeRef.current.startClientX) / pageScale;
    const deltaY = (event.clientY - resizeRef.current.startClientY) / pageScale;

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

    const nextBox = clampBoxToPage({
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    });

    onUpdateBox(object.id, nextBox);
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

          {toolbarContent ? (
            <>
              <span className="h-5 w-px shrink-0 bg-slate-200" />
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
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect(object.id);
        }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(object.id);
        }}
      >
        <div className="h-full w-full overflow-hidden">{children}</div>

        {selected ? (
          <>
            {(Object.keys(HANDLE_STYLES) as ResizeHandle[]).map((handle) => (
              <button
                key={handle}
                type="button"
                onPointerDown={(event) => startResize(handle, event)}
                onPointerMove={resizeObject}
                onPointerUp={stopResize}
                onPointerCancel={stopResize}
                className={[
                  "absolute z-40 h-2 w-2 rounded-full border border-white bg-violet-600 shadow-sm transition duration-200",
                  HANDLE_STYLES[handle],
                ].join(" ")}
                aria-label={`Resize ${toolbarLabel}`}
                title={`Resize ${toolbarLabel}`}
              />
            ))}
          </>
        ) : null}
      </div>

      {toolbar}
    </>
  );
}
