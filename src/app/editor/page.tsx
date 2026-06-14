"use client";

import * as pdfjsLib from "pdfjs-dist";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
};

type NoticeType = "info" | "success" | "warning" | "error";

type Notice = {
  type: NoticeType;
  message: string;
};

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function clampZoom(value: number) {
  return Math.max(0.25, Math.min(3, Number(value.toFixed(2))));
}

function noticeClass(type: NoticeType) {
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (type === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (type === "error") return "border-red-200 bg-red-50 text-red-700";

  return "border-violet-200 bg-violet-50 text-violet-800";
}

function downloadOriginal(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = file.name || "PDFMantra-document.pdf";
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function PdfPageCanvas({
  documentProxy,
  pageNumber,
  zoom,
}: {
  documentProxy: PdfDocument;
  pageNumber: number;
  zoom: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function renderPage() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setIsRendering(true);
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

        setPageSize({ width: viewport.width, height: viewport.height });

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) setIsRendering(false);
      } catch {
        if (!cancelled) {
          setIsRendering(false);
          setError("Unable to render this page.");
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore cancelled render.
      }
    };
  }, [documentProxy, pageNumber, zoom]);

  return (
    <div
      className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]"
      style={{
        width: pageSize.width || undefined,
        minHeight: pageSize.height || 680,
      }}
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
    </div>
  );
}

function PdfThumbnail({
  documentProxy,
  pageNumber,
  active,
  onClick,
}: {
  documentProxy: PdfDocument;
  pageNumber: number;
  active: boolean;
  onClick: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRendering, setIsRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function renderThumbnail() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      try {
        setIsRendering(true);

        const page = await documentProxy.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.18 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });

        if (!context || cancelled) return;

        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });
        await renderTask.promise;

        if (!cancelled) setIsRendering(false);
      } catch {
        if (!cancelled) setIsRendering(false);
      }
    }

    renderThumbnail();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore cancelled render.
      }
    };
  }, [documentProxy, pageNumber]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border p-2 text-left transition",
        active
          ? "border-violet-500 bg-violet-50 shadow-[0_0_0_4px_rgba(124,58,237,0.12)]"
          : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50",
      ].join(" ")}
    >
      <div className="flex gap-3">
        <div className="relative flex h-[104px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {isRendering ? <Loader2 className="animate-spin text-violet-600" size={17} /> : null}
          <canvas ref={canvasRef} className="block bg-white" />
        </div>

        <div className="min-w-0 pt-1">
          <div className="text-sm font-black text-slate-900">Page {pageNumber}</div>
          <div className="mt-1 text-xs font-bold text-slate-500">
            {active ? "Currently open" : "Click to view"}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function EditorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>({
    type: "info",
    message: "Open a PDF to start.",
  });

  const totalPages = pdfDocument?.numPages ?? 0;

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages],
  );

  useEffect(() => {
    configurePdfWorker();

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setLeftPanelOpen(false);
    }
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function loadPdfFile(selectedFile: File) {
    if (loading) return;

    if (!isPdfFile(selectedFile)) {
      setNotice({ type: "error", message: "Please select a valid PDF file." });
      return;
    }

    try {
      setLoading(true);
      setNotice({ type: "info", message: "Loading PDF..." });

      configurePdfWorker();

      const buffer = await selectedFile.arrayBuffer();
      const documentProxy = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      setFile(selectedFile);
      setPdfDocument(documentProxy as PdfDocument);
      setActivePage(1);
      setZoom(1);

      setNotice({
        type: "success",
        message: `Loaded ${selectedFile.name} with ${documentProxy.numPages} page${documentProxy.numPages === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      setFile(null);
      setPdfDocument(null);
      setActivePage(1);

      setNotice({
        type: "error",
        message: error instanceof Error ? error.message : "Unable to load this PDF.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();

    const droppedFile = event.dataTransfer.files?.[0];

    if (droppedFile) {
      loadPdfFile(droppedFile);
    }
  }

  function goToPreviousPage() {
    setActivePage((current) => Math.max(1, current - 1));
  }

  function goToNextPage() {
    setActivePage((current) => Math.min(totalPages || 1, current + 1));
  }

  function closePdf() {
    setFile(null);
    setPdfDocument(null);
    setActivePage(1);
    setZoom(1);
    setNotice({
      type: "success",
      message: "PDF closed. Open another file to continue.",
    });
  }

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#f5f7fb] text-slate-950">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];

          if (selectedFile) {
            loadPdfFile(selectedFile);
          }

          event.currentTarget.value = "";
        }}
      />

      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setLeftPanelOpen((value) => !value)}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
            aria-label="Toggle pages panel"
          >
            {leftPanelOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-sm font-black text-white shadow-[0_14px_32px_rgba(124,58,237,0.26)]">
            PM
          </div>

          <div className="hidden min-w-0 sm:block">
            <div className="truncate text-sm font-black tracking-[-0.02em] text-slate-950">
              PDFMantra Editor
            </div>
            <div className="truncate text-xs font-bold text-slate-500">
              {file ? file.name : "Open a PDF to start editing foundation"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openFilePicker}
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
          >
            <FolderOpen size={17} />
            <span className="hidden sm:inline">Open PDF</span>
          </button>

          <div className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 md:flex">
            <button
              type="button"
              onClick={goToPreviousPage}
              disabled={!pdfDocument || activePage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>

            <div className="min-w-[96px] text-center text-xs font-black text-slate-700">
              {pdfDocument ? `${activePage} / ${totalPages}` : "No PDF"}
            </div>

            <button
              type="button"
              onClick={goToNextPage}
              disabled={!pdfDocument || activePage >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setZoom((value) => clampZoom(value - 0.1))}
              disabled={!pdfDocument}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom out"
            >
              <Minus size={16} />
            </button>

            <div className="min-w-[56px] text-center text-xs font-black text-slate-700">
              {Math.round(zoom * 100)}%
            </div>

            <button
              type="button"
              onClick={() => setZoom((value) => clampZoom(value + 0.1))}
              disabled={!pdfDocument}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom in"
            >
              <Plus size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => file && downloadOriginal(file)}
            disabled={!file}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(124,58,237,0.24)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Download size={17} />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            type="button"
            onClick={closePdf}
            disabled={!file}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close PDF"
          >
            <X size={18} />
          </button>
        </div>
      </header>

      {notice.message ? (
        <div className="pointer-events-none absolute left-1/2 top-[76px] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
          <div className={`rounded-2xl border px-4 py-3 text-center text-sm font-black shadow-lg ${noticeClass(notice.type)}`}>
            {loading ? "Please wait - " : ""}
            {notice.message}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {leftPanelOpen ? (
          <aside className="hidden w-[260px] shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Pages
              </div>
              <div className="mt-1 text-xs font-bold text-slate-500">
                {pdfDocument ? `${totalPages} page${totalPages === 1 ? "" : "s"}` : "No PDF loaded"}
              </div>
            </div>

            {file ? (
              <div className="border-b border-slate-200 p-3">
                <div className="rounded-2xl bg-slate-50 p-3">
                  <div className="truncate text-sm font-black text-slate-900">{file.name}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500">{formatBytes(file.size)}</div>
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {!pdfDocument ? (
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 px-4 text-center transition hover:border-violet-300 hover:bg-violet-50"
                >
                  <Upload size={26} className="text-violet-600" />
                  <div className="mt-3 text-sm font-black text-slate-900">Open PDF</div>
                  <div className="mt-1 text-xs font-bold leading-5 text-slate-500">
                    Real page thumbnails will appear here.
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  {pageNumbers.map((pageNumber) => (
                    <PdfThumbnail
                      key={pageNumber}
                      documentProxy={pdfDocument}
                      pageNumber={pageNumber}
                      active={activePage === pageNumber}
                      onClick={() => setActivePage(pageNumber)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        ) : null}

        <main
          onDrop={handleDrop}
          onDragOver={(event) => event.preventDefault()}
          className="min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#eef2f7_100%)]"
        >
          {!pdfDocument ? (
            <div className="flex min-h-full items-center justify-center p-6">
              <button
                type="button"
                onClick={openFilePicker}
                className="group flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-violet-200 bg-white/90 px-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.10)] transition hover:border-violet-300 hover:bg-violet-50/70"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-[1.7rem] bg-violet-600 text-white shadow-[0_20px_48px_rgba(124,58,237,0.30)] transition group-hover:scale-105">
                  <Upload size={34} />
                </div>

                <h1 className="mt-7 text-3xl font-black tracking-[-0.05em] text-slate-950">
                  Open a PDF to start
                </h1>

                <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-slate-500">
                  A clean editor foundation: real PDF rendering, working thumbnails, page navigation,
                  zoom, download, and a focused canvas.
                </p>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
                  <FileText size={14} />
                  Browser-side PDF preview
                </div>
              </button>
            </div>
          ) : (
            <div className="flex min-h-full justify-center px-8 py-10">
              <PdfPageCanvas documentProxy={pdfDocument} pageNumber={activePage} zoom={zoom} />
            </div>
          )}
        </main>
      </div>

      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-slate-200 bg-white px-4 text-[11px] font-black text-slate-500">
        <span>{pdfDocument ? `Page ${activePage} of ${totalPages}` : "No document"}</span>
        <span>{file ? "Ready" : "Waiting for PDF"}</span>
        <span>{Math.round(zoom * 100)}%</span>
      </footer>
    </div>
  );
}