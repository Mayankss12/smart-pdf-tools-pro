"use client";

import { FileText, Loader2, Upload, ZoomIn } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import type { EditorController, PdfDocumentLike } from "../hooks/useEditor";

type MainPageCanvasProps = {
  documentProxy: PdfDocumentLike;
  pageNumber: number;
  zoom: number;
};

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function MainPageCanvas({ documentProxy, pageNumber, zoom }: MainPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setLoading(true);
        setError("");

        const page = await documentProxy.getPage(pageNumber);
        const viewport = page.getViewport({ scale: zoom });
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

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setLoading(false);
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
  }, [documentProxy, pageNumber, zoom]);

  return (
    <div className="mx-auto">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
          Page {pageNumber}
        </span>
        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
          Active
        </span>
      </div>

      <div
        className="relative overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]"
        style={{
          width: pageSize.width || undefined,
          minHeight: pageSize.height || 680,
        }}
      >
        {loading ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
            <Loader2 className="animate-spin text-violet-600" size={28} />
            <div className="mt-3 text-sm font-black text-slate-600">Rendering PDF page...</div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white text-center">
            <FileText size={28} className="text-red-500" />
            <div className="mt-3 text-sm font-black text-red-700">{error}</div>
          </div>
        ) : null}

        <canvas ref={canvasRef} className="block bg-white" />
      </div>
    </div>
  );
}

export function EditorCanvas({
  editor,
  onOpenFile,
  onFileDrop,
}: {
  editor: EditorController;
  onOpenFile: () => void;
  onFileDrop: (file: File) => void;
}) {
  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];

    if (file && isPdfFile(file)) {
      onFileDrop(file);
    }
  }

  if (!editor.file || !editor.pdfDocument) {
    return (
      <main
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
        className="min-w-0 flex-1 overflow-hidden bg-slate-100"
      >
        <div className="flex min-h-full items-center justify-center p-6">
          <button
            type="button"
            onClick={onOpenFile}
            className="flex min-h-[520px] w-full max-w-4xl flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-violet-200 bg-white px-6 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition hover:border-violet-300 hover:bg-violet-50/40"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_18px_42px_rgba(101,80,232,0.28)]">
              <Upload size={28} />
            </div>

            <h1 className="mt-6 text-2xl font-black tracking-[-0.04em] text-slate-950">
              Upload a PDF to start editing
            </h1>

            <p className="mt-3 max-w-xl text-sm font-semibold leading-7 text-slate-500">
              Drop a PDF here or browse from your computer. Phase 1 now renders real PDF pages.
            </p>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
      className="min-w-0 flex-1 overflow-auto bg-slate-100"
    >
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur">
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-slate-900">{editor.fileMeta?.name}</div>
          <div className="text-xs font-bold text-slate-500">
            Page {editor.activePageNumber} of {editor.totalPages}
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
          <ZoomIn size={14} />
          {Math.round(editor.zoom * 100)}%
        </div>
      </div>

      <div className="flex min-h-[calc(100%-44px)] justify-center px-8 py-8">
        <MainPageCanvas
          documentProxy={editor.pdfDocument}
          pageNumber={editor.activePageNumber}
          zoom={editor.zoom}
        />
      </div>
    </main>
  );
}