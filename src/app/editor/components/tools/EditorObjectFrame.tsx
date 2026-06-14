"use client";

import { GripHorizontal, Trash2 } from "lucide-react";
import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

import type { EditorObject, EditorObjectBox } from "../../hooks/useEditor";

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right";

type DragState = {
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startX: number;
  readonly startY: number;
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
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);

  function startMove(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    onSelect(object.id);

    dragRef.current = {
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: object.box.x,
      startY: object.box.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveObject(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    onUpdateBox(object.id, {
      x: Math.max(0, dragRef.current.startX + (event.clientX - dragRef.current.startClientX) / pageScale),
      y: Math.max(0, dragRef.current.startY + (event.clientY - dragRef.current.startClientY) / pageScale),
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

    const deltaX = (event.clientX - resizeRef.current.startClientX) / pageScale;
    const deltaY = (event.clientY - resizeRef.current.startClientY) / pageScale;

    const { handle, startBox } = resizeRef.current;

    let nextX = startBox.x;
    let nextY = startBox.y;
    let nextWidth = startBox.width;
    let nextHeight = startBox.height;

    if (handle.includes("right")) {
      nextWidth = clampSize(startBox.width + deltaX, minWidth);
    }

    if (handle.includes("left")) {
      const proposedWidth = clampSize(startBox.width - deltaX, minWidth);
      nextX = startBox.x + (startBox.width - proposedWidth);
      nextWidth = proposedWidth;
    }

    if (handle.includes("bottom")) {
      nextHeight = clampSize(startBox.height + deltaY, minHeight);
    }

    if (handle.includes("top")) {
      const proposedHeight = clampSize(startBox.height - deltaY, minHeight);
      nextY = startBox.y + (startBox.height - proposedHeight);
      nextHeight = proposedHeight;
    }

    onUpdateBox(object.id, {
      x: Math.max(0, nextX),
      y: Math.max(0, nextY),
      width: nextWidth,
      height: nextHeight,
    });
  }

  function stopResize(event: ReactPointerEvent<HTMLButtonElement>) {
    resizeRef.current = null;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release errors.
    }
  }

  return (
    <div
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
          <div className="absolute left-0 top-full z-40 mt-2 flex max-w-[min(92vw,620px)] items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
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
                <div className="flex min-w-0 items-center gap-1">{toolbarContent}</div>
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
          </div>

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
  );
}