"use client";

import {
  AlertCircle,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { EditorController, EditorObject } from "../hooks/useEditor";
import { HighlightTool } from "./tools/HighlightTool";
import { TextTool } from "./tools/TextTool";

type EditorCanvasProps = {
  readonly editor: EditorController;
  readonly onOpenFile: () => void;
  readonly onFileDrop: (file: File) => void | Promise<void>;
};

type PageSize = {
  readonly width: number;
  readonly height: number;
};

type DraftBox = {
  readonly type: "text" | "highlight" | "whiteout";
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

const DEFAULT_TEXT_BOX = {
  width: 220,
  height: 44,
};

const MIN_TEXT_BOX = {
  width: 72,
  height: 30,
};

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBox(startX: number, startY: number, currentX: number, currentY: number) {
  return {
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

function getUnscaledPageSize(pageSize: PageSize, pageScale: number) {
  return {
    width: pageSize.width / pageScale,
    height: pageSize.height / pageScale,
  };
}

function clampBoxToPage(box: Box, pageSize: PageSize, pageScale: number, minWidth: number, minHeight: number) {
  const page = getUnscaledPageSize(pageSize, pageScale);

  const safePageWidth = Math.max(minWidth, page.width || minWidth);
  const safePageHeight = Math.max(minHeight, page.height || minHeight);

  const safeWidth = clamp(box.width, minWidth, safePageWidth);
  const safeHeight = clamp(box.height, minHeight, safePageHeight);

  const safeX = clamp(box.x, 0, Math.max(0, safePageWidth - safeWidth));
  const safeY = clamp(box.y, 0, Math.max(0, safePageHeight - safeHeight));

  return {
    x: safeX,
    y: safeY,
    width: Math.min(safeWidth, safePageWidth - safeX),
    height: Math.min(safeHeight, safePageHeight - safeY),
  };
}

function clampPointToPage(point: { readonly x: number; readonly y: number }, pageSize: PageSize, pageScale: number) {
  const page = getUnscaledPageSize(pageSize, pageScale);

  return {
    x: clamp(point.x, 0, Math.max(0, page.width)),
    y: clamp(point.y, 0, Math.max(0, page.height)),
  };
}

function getPointerPoint(
  event: ReactPointerEvent<HTMLDivElement>,
  layer: HTMLDivElement,
  pageScale: number,
  pageSize: PageSize,
) {
  const rect = layer.getBoundingClientRect();

  return clampPointToPage(
    {
      x: (event.clientX - rect.left) / pageScale,
      y: (event.clientY - rect.top) / pageScale,
    },
    pageSize,
    pageScale,
  );
}

function WhiteoutObject({
  object,
  selected,
  pageScale,
  onSelect,
  onDelete,
}: {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onDelete: (id: string) => void;
}) {
  return (
    <div
      className={[
        "absolute z-30 rounded-lg bg-white shadow-sm transition",
        selected
          ? "border-2 border-violet-500 ring-4 ring-violet-100"
          : "border border-slate-200 hover:border-violet-300",
      ].join(" ")}
      style={{
        left: object.box.x * pageScale,
        top: object.box.y * pageScale,
        width: object.box.width * pageScale,
        height: object.box.height * pageScale,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(object.id);
      }}
    >
      {selected ? (
        <div className="absolute -top-12 left-0 z-40 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
          <span className="px-2 text-xs font-black text-slate-600">Whiteout</span>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete(object.id);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Delete whiteout"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PdfPageRenderer({
  editor,
}: {
  readonly editor: EditorController;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageLayerRef = useRef<HTMLDivElement | null>(null);

  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>({ width: 0, height: 0 });
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function renderPage() {
      const canvas = canvasRef.current;

      if (!canvas || !editor.pdfDocument) return;

      try {
        setIsRendering(true);
        setError("");

        const page = await editor.pdfDocument.getPage(editor.activePageNumber);
        const viewport = page.getViewport({ scale: editor.zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });

        if (!context || cancelled) return;

        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setPageSize({
          width: viewport.width,
          height: viewport.height,
        });

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({
          canvasContext: context,
          viewport,
        });

        await renderTask.promise;

        if (!cancelled) {
          setIsRendering(false);
        }
      } catch {
        if (!cancelled) {
          setIsRendering(false);
          setError("Unable to render this PDF page.");
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore cancelled render task.
      }
    };
  }, [editor.pdfDocument, editor.activePageNumber, editor.zoom]);

  function addTextObject(box: Box) {
    const safeBox = clampBoxToPage(
      box,
      pageSize,
      editor.zoom,
      MIN_TEXT_BOX.width,
      MIN_TEXT_BOX.height,
    );

    editor.addObject({
      type: "text",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: {
        text: "Type text",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#111827",
      },
    });
  }

  function addHighlightObject(box: Box) {
    const safeBox = clampBoxToPage(
      {
        ...box,
        width: Math.max(40, box.width),
        height: Math.max(18, box.height),
      },
      pageSize,
      editor.zoom,
      40,
      18,
    );

    editor.addObject({
      type: "highlight",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: {
        backgroundColor: "#fde047",
        opacity: 0.45,
      },
    });
  }

  function addWhiteoutObject(box: Box) {
    const safeBox = clampBoxToPage(
      {
        ...box,
        width: Math.max(50, box.width),
        height: Math.max(22, box.height),
      },
      pageSize,
      editor.zoom,
      50,
      22,
    );

    editor.addObject({
      type: "whiteout",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: {
        backgroundColor: "#ffffff",
        opacity: 1,
      },
    });
  }

  function getFallbackTextBox(startX: number, startY: number) {
    return clampBoxToPage(
      {
        x: startX,
        y: startY,
        width: DEFAULT_TEXT_BOX.width,
        height: DEFAULT_TEXT_BOX.height,
      },
      pageSize,
      editor.zoom,
      MIN_TEXT_BOX.width,
      MIN_TEXT_BOX.height,
    );
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const layer = pageLayerRef.current;
    if (!layer || !editor.pdfDocument) return;

    if (editor.activeTool === "select") {
      editor.selectObject(null);
      return;
    }

    const point = getPointerPoint(event, layer, editor.zoom, pageSize);

    if (
      editor.activeTool === "text" ||
      editor.activeTool === "highlight" ||
      editor.activeTool === "whiteout"
    ) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      setDraftBox({
        type: editor.activeTool,
        startX: point.x,
        startY: point.y,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const layer = pageLayerRef.current;
    if (!layer || !draftBox) return;

    const point = getPointerPoint(event, layer, editor.zoom, pageSize);
    const normalized = normalizeBox(draftBox.startX, draftBox.startY, point.x, point.y);

    setDraftBox({
      ...draftBox,
      ...normalized,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draftBox) return;

    const finalBox = {
      x: draftBox.x,
      y: draftBox.y,
      width: draftBox.width,
      height: draftBox.height,
    };

    setDraftBox(null);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release issue.
    }

    const tooSmall = finalBox.width < 8 || finalBox.height < 8;

    if (draftBox.type === "text") {
      addTextObject(
        tooSmall
          ? getFallbackTextBox(draftBox.startX, draftBox.startY)
          : {
              ...finalBox,
              width: Math.max(MIN_TEXT_BOX.width, finalBox.width),
              height: Math.max(MIN_TEXT_BOX.height, finalBox.height),
            },
      );
    }

    if (draftBox.type === "highlight") {
      addHighlightObject(
        tooSmall
          ? {
              x: draftBox.startX,
              y: draftBox.startY,
              width: 180,
              height: 28,
            }
          : finalBox,
      );
    }

    if (draftBox.type === "whiteout") {
      addWhiteoutObject(
        tooSmall
          ? {
              x: draftBox.startX,
              y: draftBox.startY,
              width: 180,
              height: 34,
            }
          : finalBox,
      );
    }
  }

  return (
    <div className="mx-auto">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
          Page {editor.activePageNumber}
        </span>

        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
          {editor.activeTool === "select"
            ? "Select"
            : editor.activeTool === "text"
              ? "Drag to create text box"
              : editor.activeTool === "highlight"
                ? "Drag to highlight"
                : editor.activeTool === "whiteout"
                  ? "Drag to whiteout"
                  : editor.activeTool.toUpperCase()}
        </span>
      </div>

      {editor.selectedObject ? (
        <div className="mb-3 flex min-h-[48px] items-center justify-center">
          <div
            id="editor-object-toolbar-host"
            className="flex max-w-full items-center justify-center overflow-x-auto px-1"
          />
        </div>
      ) : null}

      <div
        ref={pageLayerRef}
        className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]"
        style={{
          width: pageSize.width || undefined,
          minHeight: pageSize.height || 680,
          cursor:
            editor.activeTool === "text" ||
            editor.activeTool === "highlight" ||
            editor.activeTool === "whiteout"
              ? "crosshair"
              : "default",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isRendering ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
            <Loader2 className="animate-spin text-violet-600" size={30} />
            <div className="mt-3 text-sm font-black text-slate-600">Rendering PDF...</div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white text-center">
            <AlertCircle size={30} className="text-red-500" />
            <div className="mt-3 text-sm font-black text-red-700">{error}</div>
          </div>
        ) : null}

        <canvas ref={canvasRef} className="block bg-white" />

        {editor.activePageObjects.map((object) => {
          if (object.type === "text") {
            return (
              <TextTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateData={editor.updateObjectData}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "highlight") {
            return (
              <HighlightTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateData={editor.updateObjectData}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "whiteout") {
            return (
              <WhiteoutObject
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onDelete={editor.deleteObject}
              />
            );
          }

          return null;
        })}

        {draftBox ? (
          <div
            className={[
              "pointer-events-none absolute z-40 rounded-lg border-2 border-dashed",
              draftBox.type === "highlight"
                ? "border-yellow-500 bg-yellow-300/40"
                : draftBox.type === "text"
                  ? "border-violet-500 bg-violet-100/20"
                  : "border-violet-500 bg-white/90",
            ].join(" ")}
            style={{
              left: draftBox.x * editor.zoom,
              top: draftBox.y * editor.zoom,
              width: draftBox.width * editor.zoom,
              height: draftBox.height * editor.zoom,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EditorCanvas({
  editor,
  onOpenFile,
  onFileDrop,
}: EditorCanvasProps) {
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file && isPdfFile(file)) {
      void onFileDrop(file);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  if (!editor.file || !editor.pdfDocument) {
    return (
      <main
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="min-w-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#eef2f7_100%)]"
      >
        <div className="flex min-h-full items-center justify-center p-6">
          <button
            type="button"
            onClick={onOpenFile}
            className={[
              "group flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.10)] transition",
              dragActive
                ? "border-violet-500 bg-violet-50"
                : "border-violet-200 bg-white/90 hover:border-violet-300 hover:bg-violet-50/70",
            ].join(" ")}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.7rem] bg-violet-600 text-white shadow-[0_20px_48px_rgba(124,58,237,0.30)] transition group-hover:scale-105">
              <Upload size={34} />
            </div>

            <h1 className="mt-7 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Drag & drop PDF here
            </h1>

            <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-slate-500">
              or click to upload PDF and start editing.
            </p>

            <div className="mt-6 rounded-full bg-violet-600 px-5 py-2 text-xs font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)] transition group-hover:bg-violet-700">
              Upload PDF
            </div>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#eef2f7_100%)]"
    >
      <div className="flex min-h-full justify-center px-8 py-10">
        <PdfPageRenderer editor={editor} />
      </div>
    </main>
  );
}
