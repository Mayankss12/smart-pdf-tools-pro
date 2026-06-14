"use client";

import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { EditorController, PdfDocumentLike } from "../hooks/useEditor";

type ThumbnailProps = {
  documentProxy: PdfDocumentLike;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
};

function PageThumbnail({ documentProxy, pageNumber, active, onSelect }: ThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { cancel: () => void; promise: Promise<void> } | null = null;

    async function renderThumbnail() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setLoading(true);

        const page = await documentProxy.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.26 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d");

        if (!context || cancelled) return;

        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    renderThumbnail();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore cancelled render task.
      }
    };
  }, [documentProxy, pageNumber]);

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`Page ${pageNumber}`}
      className={[
        "group relative flex w-full items-center justify-center rounded-2xl border bg-white p-3 shadow-sm transition",
        active
          ? "border-violet-500 ring-4 ring-violet-100"
          : "border-slate-200 hover:border-violet-300 hover:ring-4 hover:ring-violet-50",
      ].join(" ")}
      aria-label={`Open page ${pageNumber}`}
    >
      <div className="relative flex min-h-[138px] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
            <Loader2 className="animate-spin text-violet-600" size={18} />
          </div>
        ) : null}

        <canvas ref={canvasRef} className="block bg-white shadow-sm" />
      </div>

      <span
        className={[
          "absolute right-3 top-3 rounded-full px-2 py-1 text-[10px] font-black shadow-sm",
          active ? "bg-violet-600 text-white" : "bg-white text-slate-600",
        ].join(" ")}
      >
        {pageNumber}
      </span>
    </button>
  );
}

export function EditorLeftPanel({
  editor,
}: {
  editor: EditorController;
  onOpenFile: () => void;
}) {
  if (editor.leftPanelCollapsed) {
    return (
      <aside className="hidden h-full w-12 shrink-0 border-r border-slate-200 bg-slate-50 lg:flex lg:items-start lg:justify-center lg:py-3">
        <button
          type="button"
          onClick={editor.toggleLeftPanel}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          aria-label="Expand pages panel"
          title="Expand pages"
        >
          <ChevronRight size={16} />
        </button>
      </aside>
    );
  }

  const pages = Array.from({ length: editor.totalPages }, (_, index) => index + 1);

  return (
    <aside className="hidden h-full w-[240px] shrink-0 flex-col border-r border-slate-200 bg-slate-50 lg:flex">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">
            Pages
          </div>
          <div className="mt-0.5 text-[11px] font-bold text-slate-500">
            {editor.file && editor.pdfDocument
              ? `${editor.totalPages} page${editor.totalPages === 1 ? "" : "s"}`
              : "No PDF loaded"}
          </div>
        </div>

        <button
          type="button"
          onClick={editor.toggleLeftPanel}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-violet-700"
          aria-label="Collapse pages panel"
          title="Collapse pages"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!editor.file || !editor.pdfDocument ? (
          <div className="flex min-h-[280px] w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 text-center">
            <div>
              <div className="text-sm font-black text-slate-900">No preview</div>
              <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                Page previews will appear here after upload.
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <PageThumbnail
                key={page}
                documentProxy={editor.pdfDocument}
                pageNumber={page}
                active={editor.activePageNumber === page}
                onSelect={() => editor.setActivePage(page)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
