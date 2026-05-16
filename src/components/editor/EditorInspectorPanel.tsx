"use client";

import {
  Bold,
  Copy,
  Download,
  FileText,
  Highlighter,
  Italic,
  Loader2,
  Minus,
  MousePointer2,
  Move,
  Plus,
  Trash2,
  Type,
  Wand2,
} from "lucide-react";
import type {
  ActiveTool,
  ExportMode,
  PdfLayer,
} from "@/lib/editor/types";

type HighlightColorOption = {
  label: string;
  css: string;
  r: number;
  g: number;
  b: number;
};

type EditorInspectorPanelProps = {
  className?: string;
  activeTool: ActiveTool;
  selectedLayer?: PdfLayer;
  selectedLayerLabel: string;
  highlightColors: HighlightColorOption[];
  activeHighlightColor: number;
  totalPages: number;
  currentPage: number;
  layerCount: number;
  exportMode: ExportMode;
  exportRange: string;
  ocrText: string;
  ocrRewriteText: string;
  selectedTextRectsCount: number;
  ocrBusy: boolean;
  busy: boolean;
  onSetActiveHighlightColor: (index: number) => void;
  onUpdateLayer: (id: string, updates: Partial<PdfLayer>) => void;
  onDuplicateSelectedLayer: () => void;
  onDeleteSelectedLayer: () => void;
  onGetSelectedPdfTextForReplace: () => void;
  onReplaceSelectedTextVisually: () => void;
  onExtractCurrentPageText: () => void;
  onOcrRewriteTextChange: (value: string) => void;
  onExportModeChange: (mode: ExportMode) => void;
  onExportRangeChange: (value: string) => void;
  onExportPdf: () => void;
};

function ToolHint({
  activeTool,
}: {
  activeTool: ActiveTool;
}) {
  if (activeTool === "select") {
    return (
      <div className="rounded-xl border border-[#d8e2ef] bg-[#f7faff] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <MousePointer2 size={16} />
          Select text
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Drag across selectable PDF text to copy or use replacement tools.
        </p>
      </div>
    );
  }

  if (activeTool === "object") {
    return (
      <div className="rounded-xl border border-[#d8e2ef] bg-[#f7faff] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Move size={16} />
          Object mode
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Select visual layers to move, resize, duplicate, or delete them.
        </p>
      </div>
    );
  }

  if (activeTool === "edit") {
    return (
      <div className="rounded-xl border border-[#d8e2ef] bg-[#f7faff] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Wand2 size={16} />
          Edit text
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Hover PDF text and click it to create an editable visual text layer.
        </p>
      </div>
    );
  }

  if (activeTool === "text") {
    return (
      <div className="rounded-xl border border-[#d8e2ef] bg-[#f7faff] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Type size={16} />
          Add text
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Drag on the PDF page to place a new text box.
        </p>
      </div>
    );
  }

  if (activeTool === "highlight") {
    return (
      <div className="rounded-xl border border-[#d8e2ef] bg-[#f7faff] p-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Highlighter size={16} />
          Highlight
        </div>
        <p className="mt-1.5 text-xs leading-5 text-slate-600">
          Drag across PDF text to apply a marker-style highlight.
        </p>
      </div>
    );
  }

  return null;
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-[#d8e2ef] bg-white px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-base font-semibold text-slate-950">
        {value}
      </div>
    </div>
  );
}

export function EditorInspectorPanel({
  className = "",
  activeTool,
  selectedLayer,
  selectedLayerLabel,
  highlightColors,
  activeHighlightColor,
  totalPages,
  currentPage,
  layerCount,
  exportMode,
  exportRange,
  ocrText,
  ocrRewriteText,
  selectedTextRectsCount,
  ocrBusy,
  busy,
  onSetActiveHighlightColor,
  onUpdateLayer,
  onDuplicateSelectedLayer,
  onDeleteSelectedLayer,
  onGetSelectedPdfTextForReplace,
  onReplaceSelectedTextVisually,
  onExtractCurrentPageText,
  onOcrRewriteTextChange,
  onExportModeChange,
  onExportRangeChange,
  onExportPdf,
}: EditorInspectorPanelProps) {
  return (
    <aside
      className={[
        "border-t border-[#cfd9e7] bg-[#eef3f8] p-3 lg:col-span-2 xl:col-span-1 xl:border-l xl:border-t-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="space-y-3 xl:max-h-[calc(100vh-205px)] xl:overflow-y-auto xl:pr-1">
        <section className="overflow-hidden rounded-2xl border border-[#d4deeb] bg-white shadow-sm">
          <div className="border-b border-[#e0e7f0] bg-[#f8fafd] px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              Properties
            </div>
          </div>

          <div className="space-y-3 p-4">
            {selectedLayer ? (
              <>
                <div className="rounded-xl bg-[#eef4ff] px-3 py-2 text-sm font-semibold text-[#2143a7]">
                  {selectedLayerLabel}
                </div>

                {(selectedLayer.type === "text" ||
                  selectedLayer.type === "signature") &&
                !selectedLayer.imageUrl ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            isBold: !selectedLayer.isBold,
                          })
                        }
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
                          selectedLayer.isBold
                            ? "border-[#3157d5] bg-[#3157d5] text-white"
                            : "border-[#d8e2ef] bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <Bold size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            isItalic: !selectedLayer.isItalic,
                          })
                        }
                        className={[
                          "inline-flex h-10 w-10 items-center justify-center rounded-xl border transition",
                          selectedLayer.isItalic
                            ? "border-[#3157d5] bg-[#3157d5] text-white"
                            : "border-[#d8e2ef] bg-white text-slate-700 hover:bg-slate-50",
                        ].join(" ")}
                      >
                        <Italic size={17} />
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            fontSize: Math.max(
                              8,
                              (selectedLayer.fontSize || 15) - 1
                            ),
                          })
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8e2ef] bg-white text-slate-700 transition hover:bg-slate-50"
                      >
                        <Minus size={16} />
                      </button>

                      <div className="inline-flex h-10 min-w-[64px] items-center justify-center rounded-xl border border-[#d8e2ef] bg-white px-3 text-sm font-semibold text-slate-900">
                        {selectedLayer.fontSize || 15}px
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateLayer(selectedLayer.id, {
                            fontSize: Math.min(
                              72,
                              (selectedLayer.fontSize || 15) + 1
                            ),
                          })
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d8e2ef] bg-white text-slate-700 transition hover:bg-slate-50"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                ) : null}

                {selectedLayer.type === "highlight" ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Opacity
                      <select
                        value={selectedLayer.opacity ?? 0.5}
                        onChange={(event) =>
                          onUpdateLayer(selectedLayer.id, {
                            opacity: Number(event.target.value),
                          })
                        }
                        className="mt-2 h-11 w-full rounded-xl border border-[#d8e2ef] bg-white px-3 text-sm outline-none"
                      >
                        <option value={0.25}>Light</option>
                        <option value={0.4}>Medium</option>
                        <option value={0.55}>Strong</option>
                        <option value={0.7}>Dark</option>
                      </select>
                    </label>

                    <div>
                      <div className="mb-2 text-sm font-medium text-slate-700">
                        Color
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {highlightColors.map((color, index) => (
                          <button
                            key={color.label}
                            type="button"
                            title={color.label}
                            onClick={() =>
                              onUpdateLayer(
                                selectedLayer.id,
                                {
                                  highlightColorIndex: index,
                                  highlightColorCss: color.css,
                                  highlightColorR: color.r,
                                  highlightColorG: color.g,
                                  highlightColorB: color.b,
                                } as any
                              )
                            }
                            className="h-8 w-8 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200 transition hover:scale-105"
                            style={{
                              backgroundColor: color.css,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <button
                    type="button"
                    onClick={onDuplicateSelectedLayer}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8e2ef] bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <Copy size={16} />
                    Duplicate
                  </button>

                  <button
                    type="button"
                    onClick={onDeleteSelectedLayer}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Pages" value={totalPages} />
                  <MiniStat label="Current" value={currentPage} />
                  <MiniStat label="Edits" value={layerCount} />
                </div>

                <ToolHint activeTool={activeTool} />

                {activeTool === "highlight" ? (
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-700">
                      Marker color
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {highlightColors.map((color, index) => (
                        <button
                          key={color.label}
                          type="button"
                          title={color.label}
                          onClick={() => onSetActiveHighlightColor(index)}
                          className={[
                            "h-8 w-8 rounded-full border-2 shadow-sm transition hover:scale-105",
                            activeHighlightColor === index
                              ? "border-slate-900 ring-2 ring-slate-200"
                              : "border-white ring-1 ring-slate-200",
                          ].join(" ")}
                          style={{
                            backgroundColor: color.css,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>

        <details className="overflow-hidden rounded-2xl border border-[#d4deeb] bg-white shadow-sm">
          <summary className="cursor-pointer list-none bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-900">
            Selected Text Replace
          </summary>

          <div className="space-y-3 border-t border-[#e0e7f0] p-4">
            <textarea
              value={ocrText}
              readOnly
              placeholder="Selected text will appear here."
              className="h-24 w-full resize-none rounded-xl border border-[#d8e2ef] bg-slate-50 px-3 py-3 text-sm text-slate-700 outline-none"
            />

            <textarea
              value={ocrRewriteText}
              onChange={(event) => onOcrRewriteTextChange(event.target.value)}
              placeholder="Type replacement text here."
              className="h-24 w-full resize-none rounded-xl border border-[#d8e2ef] bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-[#3157d5]"
            />

            <div className="grid gap-2">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={onGetSelectedPdfTextForReplace}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-[#3157d5]"
              >
                <Wand2 size={16} />
                Get Selected Text
              </button>

              <button
                type="button"
                onClick={onReplaceSelectedTextVisually}
                disabled={!selectedTextRectsCount || !ocrRewriteText.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8e2ef] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus size={16} />
                Replace Visually
              </button>

              <button
                type="button"
                onClick={onExtractCurrentPageText}
                disabled={ocrBusy}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#d8e2ef] bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {ocrBusy ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    Reading
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Extract Page Text
                  </>
                )}
              </button>
            </div>
          </div>
        </details>

        <details className="overflow-hidden rounded-2xl border border-[#d4deeb] bg-white shadow-sm">
          <summary className="cursor-pointer list-none bg-[#f8fafd] px-4 py-3 text-sm font-semibold text-slate-900">
            Export Options
          </summary>

          <div className="space-y-3 border-t border-[#e0e7f0] p-4">
            <label className="block text-sm font-medium text-slate-700">
              Export mode
              <select
                value={exportMode}
                onChange={(event) =>
                  onExportModeChange(event.target.value as ExportMode)
                }
                className="mt-2 h-11 w-full rounded-xl border border-[#d8e2ef] bg-white px-3 text-sm outline-none"
              >
                <option value="full">Full edited PDF</option>
                <option value="current">Current page only</option>
                <option value="range">Page range</option>
              </select>
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Page range
              <input
                value={exportRange}
                onChange={(event) => onExportRangeChange(event.target.value)}
                disabled={exportMode !== "range"}
                placeholder="1-3,5"
                className="mt-2 h-11 w-full rounded-xl border border-[#d8e2ef] bg-white px-3 text-sm outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />
            </label>

            <button
              type="button"
              onClick={onExportPdf}
              disabled={busy}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-sm font-semibold text-white transition hover:bg-[#2748b3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </details>
      </div>
    </aside>
  );
}
