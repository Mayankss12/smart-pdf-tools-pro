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
  const [canvasSize, setCanvasSize] = useState({ width: 760, height: 980 });
  const [renderScale, setRenderScale] = useState(1.55);
  const [layers, setLayers] = useState<PdfLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current) return;

    const page = await pdfDocRef.current.getPage(pageNumber);

    const scale = 1.55;
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
    setStatus("Loading PDF...");

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

      setStatus("PDF loaded. Add text/highlight, drag it, edit it, then export.");
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
      x: 90,
      y: 130,
      width: 260,
      height: 46,
      text: "Edit this text",
      fontSize: 18,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text layer added. Drag it or edit from right panel.");
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
      x: 90,
      y: 200,
      width: 280,
      height: 34,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Highlight layer added. Drag or resize from right panel.");
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
            color: rgb(1, 0.92, 0.25),
            opacity: 0.45,
          });
        }

        if (layer.type === "text") {
          page.drawText(layer.text || "", {
            x: pdfX,
            y: pdfY + 10,
            size: layer.fontSize || 18,
            font: helveticaFont,
            color: rgb(0.04, 0.08, 0.16),
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

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-black">Advanced PDF Editor</h1>
            <p className="mt-2 text-slate-600">{status}</p>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary gap-2"
          >
            <Upload size={18} />
            Upload PDF
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />
        </div>

        <div
          className="mt-6 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center"
          onDrop={(event) => {
            event.preventDefault();
            handleFile(event.dataTransfer.files?.[0]);
          }}
          onDragOver={(event) => event.preventDefault()}
        >
          <div className="font-bold">{fileName || "Drop PDF here"}</div>
          <div className="mt-1 text-sm text-slate-500">
            Upload PDF, add draggable text/highlight, then export edited file.
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b p-3">
            <button
              onClick={addTextLayer}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <Type size={16} />
              Text
            </button>

            <button
              onClick={addHighlightLayer}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <Highlighter size={16} />
              Highlight
            </button>

            <button
              onClick={deleteSelectedLayer}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <Trash2 size={16} />
              Delete Selected
            </button>

            <button
              onClick={exportPdf}
              className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>

          <div className="grid min-h-[700px] md:grid-cols-[170px_1fr_300px]">
            <aside className="border-r bg-slate-50 p-4">
              <div className="mb-3 font-bold">Pages</div>

              {numPages === 0 ? (
                <p className="text-sm text-slate-500">No PDF uploaded.</p>
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
                      className={`mb-3 w-full rounded-xl border p-3 text-left text-sm ${
                        currentPage === pageNumber
                          ? "border-brand-600 bg-brand-50 font-bold text-brand-700"
                          : "bg-white"
                      }`}
                    >
                      Page {pageNumber}
                    </button>
                  );
                })
              )}
            </aside>

            <section className="flex items-start justify-center overflow-auto bg-slate-200 p-6">
              <div
                className="relative rounded-xl bg-white shadow-lg"
                style={{
                  width: canvasSize.width,
                  minHeight: canvasSize.height,
                }}
                onClick={() => setSelectedLayerId(null)}
              >
                {busy && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/70">
                    <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-semibold shadow">
                      <Loader2 className="animate-spin" size={18} />
                      Processing
                    </div>
                  </div>
                )}

                {!fileName && (
                  <div className="flex min-h-[560px] items-center justify-center p-10 text-center text-slate-500">
                    Upload a PDF to preview it here.
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
                        className={`absolute cursor-move border-2 ${
                          isSelected ? "border-brand-700" : "border-yellow-500"
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
                      className={`absolute cursor-move rounded-md border-2 bg-white/90 px-2 py-1 font-semibold outline-none ${
                        isSelected ? "border-brand-700" : "border-brand-400"
                      }`}
                      style={{
                        left: layer.x,
                        top: layer.y,
                        width: layer.width,
                        height: layer.height,
                        fontSize: layer.fontSize || 18,
                      }}
                    />
                  );
                })}
              </div>
            </section>

            <aside className="border-l p-4">
              <div className="font-bold">Layers</div>

              <div className="mt-3 space-y-2">
                {layers.length === 0 ? (
                  <p className="text-sm text-slate-500">No layers yet.</p>
                ) : (
                  layers.map((layer) => (
                    <button
                      key={layer.id}
                      onClick={() => {
                        setCurrentPage(layer.page);
                        setSelectedLayerId(layer.id);
                      }}
                      className={`w-full rounded-xl border p-3 text-left text-sm capitalize ${
                        selectedLayerId === layer.id
                          ? "border-brand-600 bg-brand-50 font-bold text-brand-700"
                          : "bg-white"
                      }`}
                    >
                      {layer.type} layer
                      <div className="text-xs text-slate-500">
                        Page {layer.page}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedLayer && (
                <div className="mt-5 rounded-2xl border bg-slate-50 p-4">
                  <div className="font-bold">Selected Layer Settings</div>

                  <div className="mt-4 space-y-4">
                    {selectedLayer.type === "text" && (
                      <>
                        <label className="block text-sm font-semibold">
                          Text
                          <textarea
                            value={selectedLayer.text || ""}
                            onChange={(event) =>
                              updateLayer(selectedLayer.id, {
                                text: event.target.value,
                              })
                            }
                            className="mt-2 min-h-24 w-full rounded-xl border bg-white p-3 text-sm outline-none"
                          />
                        </label>

                        <div>
                          <div className="text-sm font-semibold">Font size</div>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateLayer(selectedLayer.id, {
                                  fontSize: Math.max(
                                    8,
                                    (selectedLayer.fontSize || 18) - 1
                                  ),
                                })
                              }
                              className="rounded-lg border bg-white p-2"
                            >
                              <Minus size={14} />
                            </button>

                            <div className="w-12 text-center font-bold">
                              {selectedLayer.fontSize || 18}
                            </div>

                            <button
                              onClick={() =>
                                updateLayer(selectedLayer.id, {
                                  fontSize: Math.min(
                                    80,
                                    (selectedLayer.fontSize || 18) + 1
                                  ),
                                })
                              }
                              className="rounded-lg border bg-white p-2"
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
                          <div className="text-sm font-semibold">Width</div>
                          <input
                            type="range"
                            min="40"
                            max="600"
                            value={selectedLayer.width}
                            onChange={(event) =>
                              updateLayer(selectedLayer.id, {
                                width: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                          <div className="text-xs text-slate-500">
                            {selectedLayer.width}px
                          </div>
                        </div>

                        <div>
                          <div className="text-sm font-semibold">Height</div>
                          <input
                            type="range"
                            min="15"
                            max="180"
                            value={selectedLayer.height}
                            onChange={(event) =>
                              updateLayer(selectedLayer.id, {
                                height: Number(event.target.value),
                              })
                            }
                            className="mt-2 w-full"
                          />
                          <div className="text-xs text-slate-500">
                            {selectedLayer.height}px
                          </div>
                        </div>
                      </>
                    )}

                    <button
                      onClick={deleteSelectedLayer}
                      className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-100"
                    >
                      Delete this layer
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </>
  );
}
