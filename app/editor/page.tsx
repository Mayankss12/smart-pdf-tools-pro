"use client";

import { Header } from "@/components/Header";
import {
  Upload,
  Type,
  Highlighter,
  Trash2,
  Download,
  Loader2,
  Minus,
  Plus,
  FileText,
  MousePointer2,
  Sparkles,
  Layers,
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
};

type DragState = {
  id: string;
  startMouseX: number;
  startMouseY: number;
  startLayerX: number;
  startLayerY: number;
};

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
  const [canvasSize, setCanvasSize] = useState({ width: 680, height: 880 });
  const [renderScale, setRenderScale] = useState(1.35);
  const [layers, setLayers] = useState<PdfLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const page = await pdfDocRef.current.getPage(pageNumber);

    // Smaller preview than before, but still sharp
    const scale = 1.35;
    const viewport = page.getViewport({ scale });

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

    setRenderScale(scale);

    await page.render({
      canvasContext: context,
      viewport,
    }).promise;
  }, []);

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;

      const deltaX = event.clientX - drag.startMouseX;
      const deltaY = event.clientY - drag.startMouseY;

      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== drag.id) return layer;

          const nextX = Math.max(
            0,
            Math.min(canvasSize.width - layer.width, drag.startLayerX + deltaX)
          );

          const nextY = Math.max(
            0,
            Math.min(canvasSize.height - layer.height, drag.startLayerY + deltaY)
          );

          return {
            ...layer,
            x: nextX,
            y: nextY,
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

    if (file.type !== "application/pdf") {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Loading PDF preview...");

    try {
      const arrayBuffer = await file.arrayBuffer();
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

      setStatus("PDF loaded. Add text/highlight, drag it, then export.");
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
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text layer added. Drag it or edit from the right panel.");
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
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Highlight layer added. Drag it or resize from the right panel.");
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    setLayers((prev) => prev.filter((layer) => layer.id !== selectedLayerId));
    setSelectedLayerId(null);
    setStatus("Selected layer deleted.");
  }

  function updateLayer(id: string, updates: Partial<PdfLayer>) {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  }

  function startDrag(
    event: React.MouseEvent<HTMLDivElement | HTMLInputElement | HTMLButtonElement>,
    layer: PdfLayer
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedLayerId(layer.id);

    dragStateRef.current = {
      id: layer.id,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startLayerX: layer.x,
      startLayerY: layer.y,
    };
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
      const pages = pdfDoc.getPages();

      for (const layer of layers) {
        const page = pages[layer.page - 1];
        if (!page) continue;

        const { height } = page.getSize();

        const pdfX = layer.x / renderScale;
        const pdfY = height - layer.y / renderScale - layer.height / renderScale;

        if (layer.type === "highlight") {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: layer.width / renderScale,
            height: layer.height / renderScale,
            color: rgb(1, 0.9, 0.18),
            opacity: 0.42,
          });
        }

        if (layer.type === "text") {
          page.drawText(layer.text || "", {
            x: pdfX,
            y: pdfY + 4,
            size: (layer.fontSize || 16) / renderScale,
            font: helveticaFont,
            color: rgb(0.03, 0.07, 0.15),
          });
        }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `edited-${fileName || "document.pdf"}`;
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

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
        <section className="mx-auto max-w-7xl px-5 py-7">
          <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  <Sparkles size={14} />
                  Smart PDF Workspace
                </div>

                <h1 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
                  Advanced PDF Editor
                </h1>

                <p className="mt-2 max-w-2xl text-sm font-medium text-slate-600 md:text-base">
                  {status}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700"
                >
                  <Upload size={18} />
                  Upload PDF
                </button>

                <button
                  onClick={exportPdf}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
                >
                  <Download size={18} />
                  Export
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>

            <div
              className="mt-6 rounded-3xl border-2 border-dashed border-blue-200 bg-gradient-to-r from-blue-50 via-white to-indigo-50 p-6 text-center"
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-200">
                <FileText size={22} />
              </div>

              <div className="font-black text-slate-950">
                {fileName || "Drop your PDF here"}
              </div>

              <div className="mt-1 text-sm font-medium text-slate-500">
                Add draggable text and highlights, then download the edited PDF.
              </div>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white/90 p-3 backdrop-blur">
              <button
                onClick={addTextLayer}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
              >
                <Type size={16} />
                Text
              </button>

              <button
                onClick={addHighlightLayer}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-yellow-200 hover:bg-yellow-50 hover:text-yellow-700"
              >
                <Highlighter size={16} />
                Highlight
              </button>

              <button
                onClick={deleteSelectedLayer}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={16} />
                Delete Selected
              </button>

              <div className="ml-auto hidden items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 md:flex">
                <MousePointer2 size={15} />
                Drag layers directly on PDF
              </div>
            </div>

            <div className="grid min-h-[660px] lg:grid-cols-[155px_1fr_285px]">
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
                            ? "border-blue-600 bg-blue-50 font-black text-blue-700 shadow-sm"
                            : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        Page {pageNumber}
                      </button>
                    );
                  })
                )}
              </aside>

              <section className="flex items-start justify-center overflow-auto bg-[radial-gradient(circle_at_top,_#e0ecff,_#f1f5f9_45%,_#e2e8f0)] p-6">
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
                        <Loader2 className="animate-spin text-blue-600" size={20} />
                        Processing
                      </div>
                    </div>
                  )}

                  {!fileName && (
                    <div className="flex min-h-[540px] items-center justify-center p-10 text-center">
                      <div>
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-blue-600">
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

                  <canvas ref={canvasRef} className={fileName ? "block" : "hidden"} />

                  {currentPageLayers.map((layer) => {
                    const isSelected = selectedLayerId === layer.id;

                    if (layer.type === "highlight") {
                      return (
                        <button
                          key={layer.id}
                          onMouseDown={(event) => startDrag(event, layer)}
                          className={`absolute cursor-move rounded-md border-2 transition ${
                            isSelected
                              ? "border-blue-700 ring-4 ring-blue-200"
                              : "border-yellow-500"
                          } bg-yellow-300/50`}
                          style={{
                            left: layer.x,
                            top: layer.y,
                            width: layer.width,
                            height: layer.height,
                          }}
                          title="Drag highlight layer"
                        />
                      );
                    }

                    return (
                      <input
                        key={layer.id}
                        value={layer.text || ""}
                        onMouseDown={(event) => startDrag(event, layer)}
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedLayerId(layer.id);
                        }}
                        onChange={(event) =>
                          updateLayer(layer.id, { text: event.target.value })
                        }
                        className={`absolute cursor-move rounded-lg border-2 bg-white px-2 py-1 font-semibold text-slate-950 outline-none transition ${
                          isSelected
                            ? "border-blue-700 ring-4 ring-blue-200"
                            : "border-blue-400"
                        }`}
                        style={{
                          left: layer.x,
                          top: layer.y,
                          width: layer.width,
                          height: layer.height,
                          fontSize: layer.fontSize || 16,
                        }}
                      />
                    );
                  })}
                </div>
              </section>

              <aside className="border-l border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                  <Layers size={16} />
                  Layers
                </div>

                <div className="space-y-2">
                  {layers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No layers yet. Add text or highlight.
                    </div>
                  ) : (
                    layers.map((layer) => (
                      <button
                        key={layer.id}
                        onClick={() => {
                          setCurrentPage(layer.page);
                          setSelectedLayerId(layer.id);
                        }}
                        className={`w-full rounded-2xl border p-3 text-left text-sm capitalize transition ${
                          selectedLayerId === layer.id
                            ? "border-blue-600 bg-blue-50 font-black text-blue-700"
                            : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                        }`}
                      >
                        {layer.type} layer
                        <div className="mt-1 text-xs text-slate-500">
                          Page {layer.page}
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {selectedLayer && (
                  <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="font-black text-slate-950">
                      Selected Layer Settings
                    </div>

                    <div className="mt-4 space-y-4">
                      {selectedLayer.type === "text" && (
                        <>
                          <label className="block text-sm font-bold text-slate-800">
                            Text
                            <textarea
                              value={selectedLayer.text || ""}
                              onChange={(event) =>
                                updateLayer(selectedLayer.id, {
                                  text: event.target.value,
                                })
                              }
                              className="mt-2 min-h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                            />
                          </label>

                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              Font size
                            </div>

                            <div className="mt-2 flex items-center gap-2">
                              <button
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    fontSize: Math.max(
                                      8,
                                      (selectedLayer.fontSize || 16) - 1
                                    ),
                                  })
                                }
                                className="rounded-xl border border-slate-200 bg-white p-2 transition hover:bg-slate-50"
                              >
                                <Minus size={14} />
                              </button>

                              <div className="w-12 rounded-xl bg-white py-2 text-center font-black">
                                {selectedLayer.fontSize || 16}
                              </div>

                              <button
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    fontSize: Math.min(
                                      72,
                                      (selectedLayer.fontSize || 16) + 1
                                    ),
                                  })
                                }
                                className="rounded-xl border border-slate-200 bg-white p-2 transition hover:bg-slate-50"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                        </>
                      )}

                      {selectedLayer.type === "highlight" && (
                        <>
                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              Width
                            </div>

                            <input
                              type="range"
                              min="40"
                              max="550"
                              value={selectedLayer.width}
                              onChange={(event) =>
                                updateLayer(selectedLayer.id, {
                                  width: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />

                            <div className="text-xs font-semibold text-slate-500">
                              {selectedLayer.width}px
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-bold text-slate-800">
                              Height
                            </div>

                            <input
                              type="range"
                              min="14"
                              max="150"
                              value={selectedLayer.height}
                              onChange={(event) =>
                                updateLayer(selectedLayer.id, {
                                  height: Number(event.target.value),
                                })
                              }
                              className="mt-2 w-full"
                            />

                            <div className="text-xs font-semibold text-slate-500">
                              {selectedLayer.height}px
                            </div>
                          </div>
                        </>
                      )}

                      <button
                        onClick={deleteSelectedLayer}
                        className="w-full rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                      >
                        Delete this layer
                      </button>
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
