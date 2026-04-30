"use client";

import { Header } from "@/components/Header";
import {
  Upload,
  Type,
  Highlighter,
  Trash2,
  Download,
  Loader2,
  FileText,
  Sparkles,
  MousePointer2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Minus,
  Plus,
  Bold,
  Italic,
  Palette,
  Copy,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useRef, useState } from "react";

type PdfLayer = {
  id: string;
  page: number;
  type: "text" | "highlight";
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  opacity?: number;
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  handle?: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startLayerX: number;
  startLayerY: number;
  startLayerWidth: number;
  startLayerHeight: number;
};

type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

const resizeHandles: { id: ResizeHandle; className: string; cursor: string }[] = [
  {
    id: "top-left",
    className: "-left-2 -top-2",
    cursor: "nwse-resize",
  },
  {
    id: "top",
    className: "left-1/2 -top-2 -translate-x-1/2",
    cursor: "ns-resize",
  },
  {
    id: "top-right",
    className: "-right-2 -top-2",
    cursor: "nesw-resize",
  },
  {
    id: "right",
    className: "-right-2 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
  {
    id: "bottom-right",
    className: "-bottom-2 -right-2",
    cursor: "nwse-resize",
  },
  {
    id: "bottom",
    className: "bottom-[-8px] left-1/2 -translate-x-1/2",
    cursor: "ns-resize",
  },
  {
    id: "bottom-left",
    className: "-bottom-2 -left-2",
    cursor: "nesw-resize",
  },
  {
    id: "left",
    className: "-left-2 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
];

export default function EditorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileBytesRef = useRef<ArrayBuffer | null>(null);
  const pdfDocRef = useRef<any>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Upload a PDF to start editing.");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 660, height: 860 });
  const [renderScale, setRenderScale] = useState(1.3);
  const [viewerScale, setViewerScale] = useState(1.3);
  const [layers, setLayers] = useState<PdfLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: viewerScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      setCanvasSize({
        width: viewport.width,
        height: viewport.height,
      });

      setRenderScale(viewerScale);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    },
    [viewerScale]
  );

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function updateLayer(id: string, updates: Partial<PdfLayer>) {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  }
    useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;

      const deltaX = event.clientX - drag.startMouseX;
      const deltaY = event.clientY - drag.startMouseY;

      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== drag.id) return layer;

          if (drag.mode === "move") {
            const nextX = clamp(
              drag.startLayerX + deltaX,
              0,
              canvasSize.width - layer.width
            );

            const nextY = clamp(
              drag.startLayerY + deltaY,
              0,
              canvasSize.height - layer.height
            );

            return {
              ...layer,
              x: nextX,
              y: nextY,
            };
          }

          let nextX = drag.startLayerX;
          let nextY = drag.startLayerY;
          let nextWidth = drag.startLayerWidth;
          let nextHeight = drag.startLayerHeight;

          const handle = drag.handle;

          if (
            handle === "right" ||
            handle === "top-right" ||
            handle === "bottom-right"
          ) {
            nextWidth = drag.startLayerWidth + deltaX;
          }

          if (
            handle === "left" ||
            handle === "top-left" ||
            handle === "bottom-left"
          ) {
            nextX = drag.startLayerX + deltaX;
            nextWidth = drag.startLayerWidth - deltaX;
          }

          if (
            handle === "bottom" ||
            handle === "bottom-left" ||
            handle === "bottom-right"
          ) {
            nextHeight = drag.startLayerHeight + deltaY;
          }

          if (
            handle === "top" ||
            handle === "top-left" ||
            handle === "top-right"
          ) {
            nextY = drag.startLayerY + deltaY;
            nextHeight = drag.startLayerHeight - deltaY;
          }

          const minWidth = layer.type === "text" ? 80 : 30;
          const minHeight = layer.type === "text" ? 28 : 14;

          if (nextWidth < minWidth) {
            if (
              handle === "left" ||
              handle === "top-left" ||
              handle === "bottom-left"
            ) {
              nextX = drag.startLayerX + drag.startLayerWidth - minWidth;
            }
            nextWidth = minWidth;
          }

          if (nextHeight < minHeight) {
            if (
              handle === "top" ||
              handle === "top-left" ||
              handle === "top-right"
            ) {
              nextY = drag.startLayerY + drag.startLayerHeight - minHeight;
            }
            nextHeight = minHeight;
          }

          nextX = clamp(nextX, 0, canvasSize.width - minWidth);
          nextY = clamp(nextY, 0, canvasSize.height - minHeight);
          nextWidth = clamp(nextWidth, minWidth, canvasSize.width - nextX);
          nextHeight = clamp(nextHeight, minHeight, canvasSize.height - nextY);

          return {
            ...layer,
            x: nextX,
            y: nextY,
            width: nextWidth,
            height: nextHeight,
          };
        })
      );
    }

    function handleMouseUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasSize.height, canvasSize.width]);

  async function handleFile(file?: File) {
    if (!file) return;

    setBusy(true);
    setStatus("Loading PDF preview...");

    try {
      const arrayBuffer = await file.arrayBuffer();
      const fileNameLower = file.name.toLowerCase();
      const hasPdfExtension = fileNameLower.endsWith(".pdf");
      const hasPdfMime =
        file.type === "application/pdf" || file.type === "application/x-pdf";
      const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
      const hasPdfSignature =
        headerBytes.length === 5 &&
        headerBytes[0] === 0x25 &&
        headerBytes[1] === 0x50 &&
        headerBytes[2] === 0x44 &&
        headerBytes[3] === 0x46 &&
        headerBytes[4] === 0x2d;

      if (!hasPdfMime && !hasPdfExtension && !hasPdfSignature) {
        setStatus("Please upload a valid PDF file.");
        return;
      }

      fileBytesRef.current = arrayBuffer.slice(0);

      const loadedPdf = await pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
      }).promise;

      pdfDocRef.current = loadedPdf;

      setFileName(file.name);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setLayers([]);
      setSelectedLayerId(null);

      await renderPage(1);

      setStatus(
        "PDF loaded. Add text/highlight, drag or resize directly on the page."
      );
    } catch (error) {
      console.error(error);
      setStatus("Unable to load PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function addTextLayer() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      x: 80,
      y: 120,
      width: 220,
      height: 38,
      text: "Edit text",
      fontSize: 16,
      fontStyle: "normal",
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text box added. Drag it or resize from any side/corner.");
  }

  function addHighlightLayer() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "highlight",
      x: 80,
      y: 180,
      width: 250,
      height: 30,
      opacity: 0.42,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Highlight box added. Drag it or resize from any side/corner.");
  }

  function deleteLayer(layerId: string) {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));

    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }

    setStatus("Layer deleted.");
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    deleteLayer(selectedLayerId);
  }
  function duplicateSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer) return;

    const duplicateLayer: PdfLayer = {
      ...layer,
      id: crypto.randomUUID(),
      x: clamp(layer.x + 20, 0, canvasSize.width - layer.width),
      y: clamp(layer.y + 20, 0, canvasSize.height - layer.height),
    };

    setLayers((prev) => [...prev, duplicateLayer]);
    setSelectedLayerId(duplicateLayer.id);
    setStatus("Layer duplicated.");
  }

  function duplicateSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer) return;

    const duplicateLayer: PdfLayer = {
      ...layer,
      id: crypto.randomUUID(),
      x: clamp(layer.x + 20, 0, canvasSize.width - layer.width),
      y: clamp(layer.y + 20, 0, canvasSize.height - layer.height),
    };

    setLayers((prev) => [...prev, duplicateLayer]);
    setSelectedLayerId(duplicateLayer.id);
    setStatus("Layer duplicated.");
  }

  function duplicateSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer) return;

    const duplicateLayer: PdfLayer = {
      ...layer,
      id: crypto.randomUUID(),
      x: clamp(layer.x + 20, 0, canvasSize.width - layer.width),
      y: clamp(layer.y + 20, 0, canvasSize.height - layer.height),
    };

    setLayers((prev) => [...prev, duplicateLayer]);
    setSelectedLayerId(duplicateLayer.id);
    setStatus("Layer duplicated.");
  }

  function resetEditor() {
    setLayers([]);
    setSelectedLayerId(null);
    setStatus("All edit layers cleared.");
  }

  function startMove(
    event: React.MouseEvent<HTMLDivElement | HTMLInputElement | HTMLButtonElement>,
    layer: PdfLayer
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedLayerId(layer.id);

    dragStateRef.current = {
      id: layer.id,
      mode: "move",
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startLayerWidth: layer.width,
      startLayerHeight: layer.height,
    };
  }

  function startResize(
    event: React.MouseEvent<HTMLButtonElement>,
    layer: PdfLayer,
    handle: ResizeHandle
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedLayerId(layer.id);

    dragStateRef.current = {
      id: layer.id,
      mode: "resize",
      handle,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
      startLayerWidth: layer.width,
      startLayerHeight: layer.height,
    };
  }
    function zoomIn() {
    setViewerScale((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(2))));
    setStatus("Zoom increased.");
  }

  function zoomOut() {
    setViewerScale((prev) => Math.max(0.9, Number((prev - 0.1).toFixed(2))));
    setStatus("Zoom decreased.");
  }

  async function exportPdf() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Exporting edited PDF...");

    try {
      const pdfDoc = await PDFDocument.load(fileBytesRef.current.slice(0));
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaObliqueFont = await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique
      );
      const pages = pdfDoc.getPages();

      for (const layer of layers) {
        const page = pages[layer.page - 1];
        if (!page) continue;

        const { height } = page.getSize();

        const pdfX = layer.x / renderScale;
        const pdfY =
          height - layer.y / renderScale - layer.height / renderScale;

        if (layer.type === "highlight") {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: layer.width / renderScale,
            height: layer.height / renderScale,
            color: rgb(1, 0.86, 0.16),
            opacity: layer.opacity ?? 0.42,
          });
        }

        if (layer.type === "text") {
          const fontSize = layer.fontSize || 16;
          const scaledFontSize = fontSize / renderScale;
          const scaledLineHeight = (fontSize * 1.15) / renderScale;
          const scaledWidth = layer.width / renderScale;
          const scaledHeight = layer.height / renderScale;
          const paddingX = 2 / renderScale;
          const paddingY = 1 / renderScale;

          const textFont = layer.isBold
            ? helveticaBoldFont
            : layer.isItalic
              ? helveticaObliqueFont
              : helveticaFont;

          page.drawText(layer.text || "", {
            x: pdfX + paddingX,
            y: pdfY + scaledHeight - paddingY - scaledFontSize,
            size: scaledFontSize,
            lineHeight: scaledLineHeight,
            maxWidth: Math.max(scaledWidth - paddingX * 2, 1),
            font: textFont,
            color: rgb(0.05, 0.07, 0.16),
          });
        }
      }
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `PDFMantra-edited-${fileName || "document.pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setStatus("Edited PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus("Export failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentPageLayers = layers.filter((layer) => layer.page === currentPage);
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId);

  function renderResizeHandles(layer: PdfLayer) {
    if (selectedLayerId !== layer.id) return null;

    return resizeHandles.map((handle) => (
      <button
        key={handle.id}
        onMouseDown={(event) => startResize(event, layer, handle.id)}
        className={`absolute z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-sm transition hover:scale-110 ${handle.className}`}
        style={{ cursor: handle.cursor }}
        title={`Resize ${handle.id}`}
      />
    ));
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-7">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white/85 shadow-xl shadow-indigo-100/60 backdrop-blur">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                    <Sparkles size={14} />
                    PDFMantra Smart Workspace
                  </div>

                  <h1 className="text-3xl font-black tracking-[-0.03em] md:text-5xl">
                    PDF Editor
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                    {status}
                  </p>
                </div>

                <div className="hidden rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 lg:block">
                  Fast, private, browser-based PDF editing
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </div>

            <div
              className="m-5 rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-amber-50 p-5 text-center"
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-200">
                <FileText size={22} />
              </div>

              <div className="font-black text-slate-950">
                {fileName || "Drop your PDF here"}
              </div>
  <div className="mt-1 text-sm font-semibold text-slate-500">
                Add text or highlight, then resize directly from corners/sides.
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:bg-amber-300"
              >
                <Upload size={18} />
                Upload PDF
              </button>
            </div>

            <div className="mx-5 mb-5 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
                <button
                  onClick={addTextLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Type size={16} />
                  Text Box
                </button>

                <button
                  onClick={addHighlightLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                >
                  <Highlighter size={16} />
                  Highlight
                </button>

                <button
                  onClick={deleteSelectedLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>

                <button
                  onClick={resetEditor}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <RotateCcw size={16} />
                  Clear
                </button>

                <button
                  onClick={exportPdf}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download size={16} />
                  Export PDF
                </button>

                {selectedLayer?.type === "text" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { fontStyle: "bold" })}
                      className={`rounded-lg border px-2 py-1 text-xs font-black ${selectedLayer.fontStyle === "bold" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                    >
                      Bold
                    </button>
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { fontStyle: "italic" })}
                      className={`rounded-lg border px-2 py-1 text-xs font-black ${selectedLayer.fontStyle === "italic" ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}
                    >
                      Italic
                    </button>

                    <button
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontSize: Math.max(
                            8,
                            (selectedLayer.fontSize || 16) - 1
                          ),
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                      title="Decrease font size"
                    >
                      <Minus size={13} />
                    </button>

                    <span className="min-w-8 text-center text-sm font-black text-slate-900">
                      {selectedLayer.fontSize || 16}
                    </span>

                    <button
                      onClick={() =>
                        updateLayer(selectedLayer.id, {
                          fontSize: Math.min(
                            72,
                            (selectedLayer.fontSize || 16) + 1
                          ),
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-700 hover:bg-slate-100"
                      title="Increase font size"
                    >
                      <Plus size={13} />
                    </button>

                    <button
                      onClick={duplicateSelectedLayer}
                      className="ml-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      Duplicate
                    </button>
                  </div>
                )}

                {selectedLayer?.type === "highlight" && (
                  <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-xs font-black text-slate-500">Opacity</span>
                    <select
                      value={selectedLayer.opacity ?? 0.42}
                      onChange={(event) =>
                        updateLayer(selectedLayer.id, {
                          opacity: Number(event.target.value),
                        })
                      }
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700"
                    >
                      <option value={0.2}>20%</option>
                      <option value={0.35}>35%</option>
                      <option value={0.5}>50%</option>
                      <option value={0.65}>65%</option>
                      <option value={0.8}>80%</option>
                    </select>
                    <button
                      onClick={duplicateSelectedLayer}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-700 hover:bg-slate-100"
                    >
                      Duplicate
                    </button>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={zoomOut}
                    className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
                    title="Zoom out"
                  >
                    <ZoomOut size={17} />
                  </button>

                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                    {Math.round(viewerScale * 100)}%
                  </div>

                  <button
                    onClick={zoomIn}
                    className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
                    title="Zoom in"
                  >
                    <ZoomIn size={17} />
                  </button>
                </div>
              </div>
                            <div className="grid min-h-[650px] lg:grid-cols-[155px_1fr]">
                <aside className="border-r border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                    <FileText size={16} />
                    Pages
                  </div>

                  {numPages === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No PDF uploaded.
                    </p>
                  ) : (
                    Array.from({ length: numPages }).map((_, index) => {
                      const pageNumber = index + 1;

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => {
                            setCurrentPage(pageNumber);
                            setSelectedLayerId(null);
                          }}
                          className={`mb-2 w-full rounded-2xl border p-3 text-left text-sm transition ${
                            currentPage === pageNumber
                              ? "border-indigo-600 bg-indigo-50 font-black text-indigo-700 shadow-sm"
                              : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                          }`}
                        >
                          Page {pageNumber}
                        </button>
                      );
                    })
                  )}

                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold leading-5 text-indigo-700">
                    <div className="mb-1 flex items-center gap-1 font-black">
                      <MousePointer2 size={14} />
                      Quick tip
                    </div>
                    Click a layer to select it. Use the top strip to move text
                    boxes. Drag dots to resize.
                  </div>
                </aside>

                <section className="flex items-start justify-center overflow-auto bg-[radial-gradient(circle_at_top,_#ddd6fe,_#f8fafc_42%,_#e2e8f0)] p-6">
                  <div
                    className="relative rounded-xl bg-white shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200"
                    style={{
                      width: canvasSize.width,
                      minHeight: canvasSize.height,
                    }}
                    onClick={() => setSelectedLayerId(null)}
                  >
                    {busy && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 font-bold shadow-xl">
                          <Loader2
                            className="animate-spin text-indigo-600"
                            size={20}
                          />
                          Processing
                        </div>
                      </div>
                    )}

                    {!fileName && (
                      <div className="flex min-h-[540px] items-center justify-center p-10 text-center">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
                            <Upload size={26} />
                          </div>
                          <div className="font-black text-slate-900">
                            Upload a PDF to preview it here
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Your PDF pages will appear in this workspace.
                          </p>
                        </div>
                      </div>
                    )}

                    <canvas
                      ref={canvasRef}
                      className={fileName ? "block" : "hidden"}
                    />

                    {currentPageLayers.map((layer) => {
                      const isSelected = selectedLayerId === layer.id;

                      if (layer.type === "highlight") {
                        return (
                          <div
                            key={layer.id}
                            onMouseDown={(event) => startMove(event, layer)}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedLayerId(layer.id);
                            }}
                            className={`absolute cursor-move rounded-md border transition ${
                              isSelected
                                  ? "border-amber-500 ring-2 ring-amber-100"
                                  : "border-transparent hover:border-amber-300"
                              }`}
                              style={{
                                left: layer.x,
                                top: layer.y,
                                width: layer.width,
                                height: layer.height,
                                backgroundColor: `rgba(251, 191, 36, ${layer.opacity || 0.42})`,
                              }}
                            title="Drag highlight layer"
                          >
                          {renderResizeHandles(layer)}
                          </div>
                        );
                      }

                      return (
                      <div
                          key={layer.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedLayerId(layer.id);
                          }}
                          className={`absolute rounded-lg border bg-white/95 text-slate-950 shadow-sm transition ${
                            isSelected
                              ? "border-indigo-400 ring-2 ring-indigo-100"
                              : "border-transparent hover:border-indigo-200"
                          }`}
                          style={{
                            left: layer.x,
                            top: layer.y,
                            width: layer.width,
                            height: layer.height,
                          }}
                        >
                          <textarea
                            value={layer.text || ""}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedLayerId(layer.id);
                            }}
                            onChange={(event) =>
                              updateLayer(layer.id, {
                                text: event.target.value,
                              })
                            }
                            className="h-full w-full resize-none rounded-md bg-transparent px-2 py-1 font-semibold outline-none"
                            style={{
                             fontSize: layer.fontSize || 16,
                             lineHeight: 1.2,
                             fontWeight: layer.isBold ? 800 : 600,
                             fontStyle: layer.isItalic ? "italic" : "normal",
                             letterSpacing: "-0.01em",
                           }}
                          />
                          {isSelected && (
                            <div
                              onMouseDown={(event) => startMove(event, layer)}
                              className="absolute left-2 right-2 top-1 h-1.5 cursor-move rounded-full bg-indigo-500/25 transition hover:bg-indigo-500/40"
                              title="Drag text box"
                            />
                          )}
                          {renderResizeHandles(layer)}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
                <div>
                  Selected layer:{" "}
                  <span className="font-black text-indigo-700">
                    {selectedLayer
                      ? `${selectedLayer.type} on page ${selectedLayer.page}`
                      : "None"}
                  </span>
                </div>

                <div>
                  Total layers:{" "}
                  <span className="font-black text-slate-900">
                    {layers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
            <span className="font-black">PDFMantra note:</span> This editor
            currently adds new editable layers on top of the PDF. Advanced mode
            for replacing existing text, OCR, PDF to Word, password tools, and
            high-quality compression will be added with backend processing.
          </div>
        </section>
      </main>
    </>
  );
}
