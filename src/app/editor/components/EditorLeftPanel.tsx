"use client";

import { ChevronLeft, ChevronRight, FilePlus2, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { EditorController, PdfDocumentLike } from "../hooks/useEditor";

type ThumbnailProps = {
  documentProxy: PdfDocumentLike;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
};

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

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
        const viewport = page.getViewport({ scale: 0.22 });
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
      className={[
        "group w-full rounded-2xl border bg-white p-2 text-left shadow-sm transition",
        active ? "border-violet-400 ring-4 ring-violet-100" : "border-slate-200 hover:border-violet-300",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="relative flex min-h-[118px] w-[86px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {loading ? <Loader2 className="animate-spin text-violet-600" size={18} /> : null}
          <canvas ref={canvasRef} className="block bg-white shadow-sm" />
        </div>

        <div className="min-w-0 pt-1">
          <div className="text-sm font-black text-slate-900">Page {pageNumber}</div>
          <div className="mt-1 text-xs font-semibold text-slate-500">
            {active ? "Active page" : "Click to view"}
          </div>
        </div>
      </div>
    </button>
  );
}

export function EditorLeftPanel({
  editor,
  onOpenFile,
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
          <div className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Pages</div>
          <div className="mt-0.5 text-[11px] font-bold text-slate-500">
            {editor.file ? `${editor.totalPages} page${editor.totalPages === 1 ? "" : "s"}` : "No PDF loaded"}
          </div>
        </div>

        <button
          type="button"
          onClick={editor.toggleLeftPanel}
          className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-violet-700"
          aria-label="Collapse pages panel"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {editor.file ? (
        <div className="border-b border-slate-200 p-3">
          <div className="rounded-2xl bg-white p-3 shadow-sm">
            <div className="truncate text-sm font-black text-slate-900">{editor.fileMeta?.name}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">
              {formatBytes(editor.fileMeta?.size ?? 0)}
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {!editor.file || !editor.pdfDocument ? (
          <button
            type="button"
            onClick={onOpenFile}
            className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-white px-4 text-center transition hover:border-violet-300 hover:bg-violet-50"
          >
            <FilePlus2 size={26} className="text-violet-600" />
            <div className="mt-3 text-sm font-black text-slate-900">Open PDF</div>
            <div className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              Real page thumbnails will appear here.
            </div>
          </button>
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

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          onClick={onOpenFile}
          className="h-10 w-full rounded-2xl bg-violet-600 text-sm font-black text-white shadow-[0_12px_24px_rgba(101,80,232,0.2)] transition hover:bg-violet-700"
        >
          Open PDF
        </button>
      </div>
    </aside>
  );
}