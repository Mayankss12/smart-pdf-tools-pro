"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  FileText,
  Highlighter,
  Loader2,
  RotateCcw,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Header } from "@/components/Header";
import type { NormalizedRect } from "@/engines/shared/types";
import type { HighlightLayer } from "@/engines/highlight/types";
import { createSmartHighlightFromDrag } from "@/engines/highlight/highlightOrchestrator";
import { updateHighlightLayerStyle } from "@/engines/highlight/highlightEngine";
import { HIGHLIGHT_COLOR_PRESETS } from "./highlightToolTypes";
import type {
  HighlightPageSnapshot,
  HighlightUploadSummary,
} from "./highlightToolTypes";
import { HighlightPageSurface } from "./HighlightPageSurface";
import {
  buildAllHighlightPageSnapshots,
  downloadBlob,
  exportHighlightedPdf,
  formatFileSize,
  loadPdfDocumentFromBytes,
  validatePdfFile,
} from "./highlightToolRuntime";

/**
 * PDFMantra Standalone Smart Highlight Tool
 * --------------------------------------------
 * This page is intentionally isolated from the old monolithic editor.
 * It consumes the new engines/adapters stack only:
 * - engines/highlight/*
 * - engines/shared/*
 * - adapters/pdfjs/*
 *
 * Phase delivered here:
 * - PDF upload and validation
 * - PDF.js page preview extraction
 * - PDF.js text-to-TextSnapUnit adapter consumption
 * - smart drag-to-highlight orchestration
 * - freeform fallback when text snapping cannot create a region
 * - same-page highlight selection, style editing, delete
 * - undo/redo
 * - export highlighted PDF through the export plan pipeline
 */

const RENDER_SCALE = 1.08;
const DEFAULT_HIGHLIGHT_COLOR = HIGHLIGHT_COLOR_PRESETS[0].value;
const DEFAULT_HIGHLIGHT_OPACITY = 0.38;

interface HistoryState {
  readonly undo: readonly (readonly HighlightLayer[])[];
  readonly redo: readonly (readonly HighlightLayer[])[];
}

function createStatusClassName(tone: "info" | "success" | "error"): string {
  if (tone === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-indigo-100 bg-indigo-50 text-indigo-800";
}

function cloneLayerArray(layers: readonly HighlightLayer[]): readonly HighlightLayer[] {
  return [...layers];
}

function createUuid(): string {
  return crypto.randomUUID();
}

function getLayerRegionCount(layer: HighlightLayer): number {
  return layer.regions.length;
}

function getLayerPreviewText(layer: HighlightLayer): string {
  const text = layer.regions
    .map((region) => region.text?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length > 0) {
    return text.length > 84 ? `${text.slice(0, 81)}...` : text;
  }

  return layer.creationSource === "freeform-drag"
    ? "Freeform highlight region"
    : "Smart highlight region";
}

function getPageLayerCount(
  layers: readonly HighlightLayer[],
  pageIndex: number,
): number {
  return layers.filter((layer) => layer.pageIndex === pageIndex).length;
}

export function HighlightToolPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [summary, setSummary] = useState<HighlightUploadSummary | null>(null);
  const [pages, setPages] = useState<readonly HighlightPageSnapshot[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [layers, setLayers] = useState<readonly HighlightLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ undo: [], redo: [] });

  const [selectedColor, setSelectedColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
  const [selectedOpacity, setSelectedOpacity] = useState(DEFAULT_HIGHLIGHT_OPACITY);

  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to start Smart Highlight.");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");

  const activePage = pages[activePageIndex] ?? null;
  const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
  const selectedPageLayers = useMemo(
    () => (activePage ? layers.filter((layer) => layer.pageIndex === activePage.pageIndex) : []),
    [activePage, layers],
  );

  function updateStatus(nextStatus: string, tone: "info" | "success" | "error" = "info") {
    setStatus(nextStatus);
    setStatusTone(tone);
  }

  function commitLayers(nextLayers: readonly HighlightLayer[], nextSelectedLayerId?: string | null) {
    setHistory((current) => ({
      undo: [...current.undo, cloneLayerArray(layers)],
      redo: [],
    }));
    setLayers(nextLayers);
    setSelectedLayerId(
      typeof nextSelectedLayerId === "undefined" ? selectedLayerId : nextSelectedLayerId,
    );
  }

  function clearDocumentState() {
    setFile(null);
    setBytes(null);
    setSummary(null);
    setPages([]);
    setActivePageIndex(0);
    setLayers([]);
    setSelectedLayerId(null);
    setHistory({ undo: [], redo: [] });
    setSelectedColor(DEFAULT_HIGHLIGHT_COLOR);
    setSelectedOpacity(DEFAULT_HIGHLIGHT_OPACITY);
    updateStatus("Upload a PDF to start Smart Highlight.", "info");
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) {
      return;
    }

    setBusy(true);
    setLayers([]);
    setSelectedLayerId(null);
    setHistory({ undo: [], redo: [] });
    updateStatus("Validating PDF and preparing Smart Highlight workspace...", "info");

    try {
      const validatedBytes = await validatePdfFile(selectedFile);
      const pdf = await loadPdfDocumentFromBytes(validatedBytes);

      updateStatus(`Rendering page previews 0/${pdf.numPages}...`, "info");

      const snapshots = await buildAllHighlightPageSnapshots({
        pdf,
        renderScale: RENDER_SCALE,
        onProgress: (completed, total) => {
          updateStatus(`Rendering page previews ${completed}/${total}...`, "info");
        },
      });

      setFile(selectedFile);
      setBytes(validatedBytes);
      setPages(snapshots);
      setActivePageIndex(0);
      setSummary({
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        pageCount: pdf.numPages,
      });

      const totalTextUnits = snapshots.reduce(
        (sum, snapshot) => sum + snapshot.textUnits.length,
        0,
      );

      updateStatus(
        `PDF ready. ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"} loaded with ${totalTextUnits} text unit${totalTextUnits === 1 ? "" : "s"} available for Smart Highlight snapping.`,
        "success",
      );

      try {
        await pdf.destroy();
      } catch {
        // PDF.js cleanup can safely fail silently after snapshots are complete.
      }
    } catch (error) {
      console.error(error);
      clearDocumentState();
      updateStatus(
        error instanceof Error ? error.message : "Unable to read this PDF. Please try another file.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDragComplete(dragBounds: NormalizedRect) {
    if (!activePage) {
      return;
    }

    const result = createSmartHighlightFromDrag({
      pageIndex: activePage.pageIndex,
      dragBounds,
      textUnits: activePage.textUnits,
      style: {
        color: selectedColor,
        opacity: selectedOpacity,
      },
      createLayerId: createUuid,
      createRegionId: createUuid,
    });

    if (!result.layer) {
      updateStatus(
        "That drag was too small or did not produce a reliable highlight region. Try a slightly clearer selection.",
        "info",
      );
      return;
    }

    commitLayers([...layers, result.layer], result.layer.id);

    if (result.status === "created-from-text-snap") {
      updateStatus(
        `Smart highlight created from detected PDF text. ${result.selectedRegionCount} precise region${result.selectedRegionCount === 1 ? "" : "s"} added.`,
        "success",
      );
      return;
    }

    updateStatus(
      "Freeform fallback highlight created. This page area did not expose a reliable text target yet.",
      "success",
    );
  }

  function handleDeleteLayer(layerId: string) {
    const nextLayers = layers.filter((layer) => layer.id !== layerId);
    commitLayers(nextLayers, selectedLayerId === layerId ? null : selectedLayerId);
    updateStatus("Highlight removed.", "success");
  }

  function handleClearPageHighlights() {
    if (!activePage || selectedPageLayers.length === 0) {
      return;
    }

    const nextLayers = layers.filter((layer) => layer.pageIndex !== activePage.pageIndex);
    commitLayers(nextLayers, null);
    updateStatus(`${activePage.pageLabel} highlights cleared.`, "success");
  }

  function handleUndo() {
    const previous = history.undo[history.undo.length - 1];

    if (!previous) {
      return;
    }

    setHistory((current) => ({
      undo: current.undo.slice(0, -1),
      redo: [...current.redo, cloneLayerArray(layers)],
    }));
    setLayers(previous);
    setSelectedLayerId(null);
    updateStatus("Undo applied.", "success");
  }

  function handleRedo() {
    const next = history.redo[history.redo.length - 1];

    if (!next) {
      return;
    }

    setHistory((current) => ({
      undo: [...current.undo, cloneLayerArray(layers)],
      redo: current.redo.slice(0, -1),
    }));
    setLayers(next);
    setSelectedLayerId(null);
    updateStatus("Redo applied.", "success");
  }

  function handleSelectedColorChange(color: string) {
    setSelectedColor(color);

    if (!selectedLayer) {
      return;
    }

    const nextLayers = layers.map((layer) =>
      layer.id === selectedLayer.id
        ? updateHighlightLayerStyle(layer, { color })
        : layer,
    );

    commitLayers(nextLayers, selectedLayer.id);
    updateStatus("Selected highlight color updated.", "success");
  }

  function handleSelectedOpacityChange(opacity: number) {
    setSelectedOpacity(opacity);

    if (!selectedLayer) {
      return;
    }

    const nextLayers = layers.map((layer) =>
      layer.id === selectedLayer.id
        ? updateHighlightLayerStyle(layer, { opacity })
        : layer,
    );

    commitLayers(nextLayers, selectedLayer.id);
    updateStatus("Selected highlight opacity updated.", "success");
  }

  async function handleExport() {
    if (!bytes || pages.length === 0) {
      updateStatus("Upload a PDF first.", "error");
      return;
    }

    if (layers.length === 0) {
      updateStatus("Add at least one highlight before exporting.", "info");
      return;
    }

    setExporting(true);
    updateStatus("Preparing highlighted PDF export...", "info");

    try {
      const blob = await exportHighlightedPdf({
        originalBytes: bytes,
        layers,
        pages,
      });

      const safeName = file?.name.replace(/\.pdf$/i, "") || "PDFMantra-highlighted";
      downloadBlob(blob, `${safeName}-highlighted.pdf`);
      updateStatus("Highlighted PDF exported successfully. Download started.", "success");
    } catch (error) {
      console.error(error);
      updateStatus(
        "Export failed. This PDF may be encrypted or contain unsupported page geometry.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  }

  function goToPreviousPage() {
    setActivePageIndex((current) => Math.max(0, current - 1));
    setSelectedLayerId(null);
  }

  function goToNextPage() {
    setActivePageIndex((current) => Math.min(Math.max(0, pages.length - 1), current + 1));
    setSelectedLayerId(null);
  }

  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-120px] top-[-120px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-180px] left-[-100px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative max-w-5xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                  <Highlighter size={14} />
                  PDFMantra Standalone Smart Highlight Engine
                </div>

                <h1 className="max-w-4xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                  Highlight PDF with smart text snapping and clean export.
                </h1>

                <p className="mt-5 max-w-3xl text-base font-medium leading-8 text-indigo-50/95">
                  Drag over a PDF page. Text-based pages snap to intended content, while scanned or image-only areas use a clean freeform fallback. Same-color overlaps are composed before export so highlights do not darken accidentally.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </section>

            <div className="grid xl:grid-cols-[1fr_390px]">
              <section className="min-h-[820px] border-r border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                    <FileText size={22} />
                  </div>

                  <div className="font-semibold tracking-[-0.02em] text-slate-950">
                    {summary?.fileName ?? "Drop PDF here"}
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-500">
                    {summary
                      ? `${summary.pageCount} page${summary.pageCount === 1 ? "" : "s"} · ${formatFileSize(summary.fileSize)}`
                      : "Click here or drag a PDF to open the Smart Highlight workspace."}
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    <Upload size={17} />
                    Choose PDF
                  </div>
                </div>

                {pages.length > 0 && activePage && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Page navigation
                      </div>
                      <div className="mt-1 text-lg font-semibold tracking-[-0.03em] text-slate-950">
                        {activePage.pageLabel} of {pages.length}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={goToPreviousPage}
                        disabled={activePageIndex === 0}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ArrowLeft size={16} />
                        Prev
                      </button>

                      <button
                        type="button"
                        onClick={goToNextPage}
                        disabled={activePageIndex >= pages.length - 1}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Next
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  {busy ? (
                    <div className="flex min-h-[540px] items-center justify-center rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-800">
                        <Loader2 className="animate-spin text-indigo-600" size={18} />
                        Preparing Smart Highlight workspace
                      </div>
                    </div>
                  ) : activePage ? (
                    <HighlightPageSurface
                      page={activePage}
                      layers={layers}
                      selectedLayerId={selectedLayerId}
                      onDragComplete={handleDragComplete}
                      onSelectLayer={(layerId) => setSelectedLayerId(layerId)}
                    />
                  ) : (
                    <div className="flex min-h-[540px] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white/80 text-center shadow-sm">
                      <div className="max-w-md px-6">
                        <Highlighter className="mx-auto text-slate-400" size={42} />
                        <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-slate-950">
                          Upload a PDF to begin
                        </h2>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                          This standalone tool uses the new Smart Highlight engine only. No old editor code is involved.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                        Highlight Controls
                      </h2>
                      <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                        Defaults apply to new drags. Selecting an existing highlight lets you restyle it directly.
                      </p>
                    </div>
                    {file && (
                      <button
                        type="button"
                        onClick={clearDocumentState}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
                        aria-label="Remove PDF"
                      >
                        <X size={17} />
                      </button>
                    )}
                  </div>

                  <div className="mt-5">
                    <div className="text-sm font-semibold text-slate-800">Color</div>
                    <div className="mt-3 grid grid-cols-5 gap-2">
                      {HIGHLIGHT_COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => handleSelectedColorChange(preset.value)}
                          className={`h-11 rounded-2xl border transition ${
                            selectedColor === preset.value
                              ? "border-slate-950 ring-2 ring-slate-950/15"
                              : "border-slate-200 hover:border-slate-400"
                          }`}
                          style={{ backgroundColor: preset.value }}
                          aria-label={`Use ${preset.label} highlight`}
                          title={preset.label}
                        />
                      ))}
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
                      <span>Opacity</span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs text-slate-600">
                        {Math.round(selectedOpacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.15}
                      max={0.75}
                      step={0.01}
                      value={selectedOpacity}
                      onChange={(event) => handleSelectedOpacityChange(Number(event.target.value))}
                      className="mt-3 w-full"
                    />
                  </label>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleUndo}
                      disabled={history.undo.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Undo2 size={16} />
                      Undo
                    </button>

                    <button
                      type="button"
                      onClick={handleRedo}
                      disabled={history.redo.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RotateCcw size={16} />
                      Redo
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={exporting || !bytes || layers.length === 0}
                    className="btn-primary mt-5 w-full"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Exporting
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Export Highlighted PDF
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-slate-950">
                        {activePage ? `${activePage.pageLabel} Highlights` : "Highlights"}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        {activePage
                          ? `${getPageLayerCount(layers, activePage.pageIndex)} highlight${getPageLayerCount(layers, activePage.pageIndex) === 1 ? "" : "s"} on this page`
                          : "Upload a PDF first."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleClearPageHighlights}
                      disabled={!activePage || selectedPageLayers.length === 0}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      Clear Page
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {selectedPageLayers.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-500">
                        Drag across the page preview to create your first highlight.
                      </div>
                    ) : (
                      selectedPageLayers
                        .slice()
                        .reverse()
                        .map((layer) => (
                          <div
                            key={layer.id}
                            className={`rounded-2xl border p-4 transition ${
                              layer.id === selectedLayerId
                                ? "border-indigo-300 bg-indigo-50"
                                : "border-slate-200 bg-white hover:border-indigo-200"
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedLayerId(layer.id)}
                              className="block w-full text-left"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="text-sm font-semibold text-slate-950">
                                  {layer.creationSource === "text-drag-snap"
                                    ? "Smart text highlight"
                                    : "Freeform fallback highlight"}
                                </div>
                                <div className="h-5 w-5 rounded-full border border-white shadow-sm" style={{ backgroundColor: layer.style.color }} />
                              </div>
                              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                                {getLayerPreviewText(layer)}
                              </p>
                              <div className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {getLayerRegionCount(layer)} region{getLayerRegionCount(layer) === 1 ? "" : "s"} · {Math.round(layer.style.opacity * 100)}% opacity
                              </div>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteLayer(layer.id)}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${createStatusClassName(statusTone)}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
