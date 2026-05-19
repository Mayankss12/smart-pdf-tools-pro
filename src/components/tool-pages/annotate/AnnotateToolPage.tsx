"use client";

import {
  ArrowLeft,
  ArrowRight,
  Circle,
  Download,
  FileText,
  Highlighter,
  Loader2,
  MousePointer2,
  MoveRight,
  PenLine,
  RotateCcw,
  Square,
  StickyNote,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import type {
  AnnotationLayer,
  AnnotationStyle,
  AnnotationTool,
  TextNoteAnnotation,
} from "@/engines/annotation/types";
import { ANNOTATION_COLOR_PRESETS } from "./annotateToolTypes";
import type {
  AnnotatePageSnapshot,
  AnnotateUploadSummary,
} from "./annotateToolTypes";
import { AnnotatePageSurface } from "./AnnotatePageSurface";
import {
  buildAllAnnotatePageSnapshots,
  downloadBlob,
  exportAnnotatedPdf,
  formatFileSize,
  loadPdfDocumentFromBytes,
  validatePdfFile,
} from "./annotateToolRuntime";

const RENDER_SCALE = 1.08;
const DEFAULT_COLOR = ANNOTATION_COLOR_PRESETS[0].value;
const DEFAULT_PEN_COLOR = "#111827";
const DEFAULT_OPACITY = 0.78;
const DEFAULT_STROKE_WIDTH = 4;
const DEFAULT_NOTE_FONT_SIZE = 14;
const DEFAULT_NOTE_BACKGROUND = "#FFF4B8";

interface HistoryState {
  readonly undo: readonly (readonly AnnotationLayer[])[];
  readonly redo: readonly (readonly AnnotationLayer[])[];
}

interface ToolOption {
  readonly tool: AnnotationTool;
  readonly label: string;
  readonly description: string;
  readonly icon: typeof MousePointer2;
}

const TOOL_OPTIONS: readonly ToolOption[] = [
  {
    tool: "select",
    label: "Select",
    description: "Pick an existing annotation to edit or delete.",
    icon: MousePointer2,
  },
  {
    tool: "highlighter-pen",
    label: "Highlighter",
    description: "Draw marker-style highlighting freely with your pointer.",
    icon: Highlighter,
  },
  {
    tool: "pen",
    label: "Pen",
    description: "Draw ink strokes for handwriting, marking, and review.",
    icon: PenLine,
  },
  {
    tool: "rectangle",
    label: "Rectangle",
    description: "Draw a rectangular outline around content.",
    icon: Square,
  },
  {
    tool: "ellipse",
    label: "Ellipse",
    description: "Circle content with a clean oval shape.",
    icon: Circle,
  },
  {
    tool: "line",
    label: "Line",
    description: "Draw a straight line between two points.",
    icon: MoveRight,
  },
  {
    tool: "arrow",
    label: "Arrow",
    description: "Point at important content with an arrow.",
    icon: ArrowRight,
  },
  {
    tool: "text-note",
    label: "Text Note",
    description: "Place a visible note card and edit its message.",
    icon: StickyNote,
  },
] as const;

function createStatusClassName(tone: "info" | "success" | "error"): string {
  if (tone === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]";
}

function cloneAnnotations(annotations: readonly AnnotationLayer[]): readonly AnnotationLayer[] {
  return [...annotations];
}

function getToolLabel(tool: AnnotationTool): string {
  return TOOL_OPTIONS.find((option) => option.tool === tool)?.label ?? "Select";
}

function getAnnotationKindLabel(annotation: AnnotationLayer): string {
  switch (annotation.kind) {
    case "highlighter-stroke":
      return "Highlighter stroke";
    case "ink-stroke":
      return "Pen stroke";
    case "rectangle":
      return "Rectangle";
    case "ellipse":
      return "Ellipse";
    case "line":
      return "Line";
    case "arrow":
      return "Arrow";
    case "text-note":
      return "Text note";
    default:
      return "Annotation";
  }
}

function getAnnotationSummary(annotation: AnnotationLayer): string {
  if (annotation.kind === "text-note") {
    const noteText = annotation.text.trim();
    return noteText.length > 0
      ? noteText.length > 74
        ? `${noteText.slice(0, 71)}...`
        : noteText
      : "Empty note";
  }

  if (annotation.kind === "highlighter-stroke" || annotation.kind === "ink-stroke") {
    return `${annotation.points.length} captured point${annotation.points.length === 1 ? "" : "s"}`;
  }

  return `${Math.round(annotation.style.opacity * 100)}% opacity · ${annotation.style.strokeWidth}px stroke`;
}

function isTextNote(annotation: AnnotationLayer | null): annotation is TextNoteAnnotation {
  return annotation?.kind === "text-note";
}

function pageAnnotationCount(
  annotations: readonly AnnotationLayer[],
  pageIndex: number,
): number {
  return annotations.filter((annotation) => annotation.pageIndex === pageIndex).length;
}

function resolveToolDefaultStyle(tool: AnnotationTool): AnnotationStyle {
  if (tool === "highlighter-pen") {
    return {
      color: DEFAULT_COLOR,
      opacity: 0.46,
      strokeWidth: 15,
    };
  }

  if (tool === "pen") {
    return {
      color: DEFAULT_PEN_COLOR,
      opacity: 1,
      strokeWidth: DEFAULT_STROKE_WIDTH,
    };
  }

  return {
    color: "#6550E8",
    opacity: DEFAULT_OPACITY,
    strokeWidth: DEFAULT_STROKE_WIDTH,
  };
}

export function AnnotateToolPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [summary, setSummary] = useState<AnnotateUploadSummary | null>(null);
  const [pages, setPages] = useState<readonly AnnotatePageSnapshot[]>([]);
  const [activePageIndex, setActivePageIndex] = useState(0);

  const [annotations, setAnnotations] = useState<readonly AnnotationLayer[]>([]);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryState>({ undo: [], redo: [] });

  const [activeTool, setActiveTool] = useState<AnnotationTool>("highlighter-pen");
  const [style, setStyle] = useState<AnnotationStyle>(resolveToolDefaultStyle("highlighter-pen"));
  const [noteFontSize, setNoteFontSize] = useState(DEFAULT_NOTE_FONT_SIZE);
  const [noteBackgroundColor, setNoteBackgroundColor] = useState(DEFAULT_NOTE_BACKGROUND);

  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to open the advanced annotation workspace.");
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">("info");

  const activePage = pages[activePageIndex] ?? null;
  const selectedAnnotation = annotations.find((annotation) => annotation.id === selectedAnnotationId) ?? null;
  const selectedPageAnnotations = useMemo(
    () => (activePage ? annotations.filter((annotation) => annotation.pageIndex === activePage.pageIndex) : []),
    [activePage, annotations],
  );

  function updateStatus(nextStatus: string, tone: "info" | "success" | "error" = "info") {
    setStatus(nextStatus);
    setStatusTone(tone);
  }

  function commitAnnotations(nextAnnotations: readonly AnnotationLayer[], nextSelectedId?: string | null) {
    setHistory((current) => ({
      undo: [...current.undo, cloneAnnotations(annotations)],
      redo: [],
    }));
    setAnnotations(nextAnnotations);
    setSelectedAnnotationId(
      typeof nextSelectedId === "undefined" ? selectedAnnotationId : nextSelectedId,
    );
  }

  function handleToolChange(tool: AnnotationTool) {
    setActiveTool(tool);
    setSelectedAnnotationId(null);

    if (tool !== "select") {
      setStyle(resolveToolDefaultStyle(tool));
    }

    updateStatus(`${getToolLabel(tool)} tool active.`, "info");
  }

  function clearDocumentState() {
    setFile(null);
    setBytes(null);
    setSummary(null);
    setPages([]);
    setActivePageIndex(0);
    setAnnotations([]);
    setSelectedAnnotationId(null);
    setHistory({ undo: [], redo: [] });
    setActiveTool("highlighter-pen");
    setStyle(resolveToolDefaultStyle("highlighter-pen"));
    setNoteFontSize(DEFAULT_NOTE_FONT_SIZE);
    setNoteBackgroundColor(DEFAULT_NOTE_BACKGROUND);
    updateStatus("Upload a PDF to open the advanced annotation workspace.", "info");
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) {
      return;
    }

    setBusy(true);
    setAnnotations([]);
    setSelectedAnnotationId(null);
    setHistory({ undo: [], redo: [] });
    updateStatus("Validating PDF and preparing annotation workspace...", "info");

    try {
      const validatedBytes = await validatePdfFile(selectedFile);
      const pdf = await loadPdfDocumentFromBytes(validatedBytes);

      updateStatus(`Rendering page previews 0/${pdf.numPages}...`, "info");

      const snapshots = await buildAllAnnotatePageSnapshots({
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

      updateStatus(
        `PDF ready. ${pdf.numPages} page${pdf.numPages === 1 ? "" : "s"} loaded for advanced annotation.`,
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

  function handleCreateAnnotation(annotation: AnnotationLayer) {
    commitAnnotations([...annotations, annotation], annotation.id);
    setActiveTool("select");
    updateStatus(`${getAnnotationKindLabel(annotation)} added. Select it to review or delete it.`, "success");
  }

  function handleSelectAnnotation(annotationId: string | null) {
    setSelectedAnnotationId(annotationId);

    if (!annotationId) {
      return;
    }

    const annotation = annotations.find((candidate) => candidate.id === annotationId);

    if (!annotation) {
      return;
    }

    setStyle(annotation.style);

    if (annotation.kind === "text-note") {
      setNoteFontSize(annotation.fontSize);
      setNoteBackgroundColor(annotation.backgroundColor);
    }

    updateStatus(`${getAnnotationKindLabel(annotation)} selected.`, "info");
  }

  function handleDeleteAnnotation(annotationId: string) {
    const nextAnnotations = annotations.filter((annotation) => annotation.id !== annotationId);
    commitAnnotations(nextAnnotations, selectedAnnotationId === annotationId ? null : selectedAnnotationId);
    updateStatus("Annotation removed.", "success");
  }

  function handleDeleteSelected() {
    if (!selectedAnnotation) {
      return;
    }

    handleDeleteAnnotation(selectedAnnotation.id);
  }

  function handleClearPage() {
    if (!activePage || selectedPageAnnotations.length === 0) {
      return;
    }

    const nextAnnotations = annotations.filter((annotation) => annotation.pageIndex !== activePage.pageIndex);
    commitAnnotations(nextAnnotations, null);
    updateStatus(`${activePage.pageLabel} annotations cleared.`, "success");
  }

  function handleUndo() {
    const previous = history.undo[history.undo.length - 1];

    if (!previous) {
      return;
    }

    setHistory((current) => ({
      undo: current.undo.slice(0, -1),
      redo: [...current.redo, cloneAnnotations(annotations)],
    }));
    setAnnotations(previous);
    setSelectedAnnotationId(null);
    updateStatus("Undo applied.", "success");
  }

  function handleRedo() {
    const next = history.redo[history.redo.length - 1];

    if (!next) {
      return;
    }

    setHistory((current) => ({
      undo: [...current.undo, cloneAnnotations(annotations)],
      redo: current.redo.slice(0, -1),
    }));
    setAnnotations(next);
    setSelectedAnnotationId(null);
    updateStatus("Redo applied.", "success");
  }

  function updateSelectedAnnotationStyle(patch: Partial<AnnotationStyle>) {
    setStyle((current) => ({ ...current, ...patch }));

    if (!selectedAnnotation) {
      return;
    }

    const nextAnnotations = annotations.map((annotation) =>
      annotation.id === selectedAnnotation.id
        ? {
            ...annotation,
            style: {
              ...annotation.style,
              ...patch,
            },
          }
        : annotation,
    );

    commitAnnotations(nextAnnotations, selectedAnnotation.id);
    updateStatus("Selected annotation style updated.", "success");
  }

  function updateSelectedTextNote(patch: Partial<Pick<TextNoteAnnotation, "text" | "fontSize" | "backgroundColor">>) {
    if (!isTextNote(selectedAnnotation)) {
      return;
    }

    if (typeof patch.fontSize === "number") {
      setNoteFontSize(patch.fontSize);
    }

    if (typeof patch.backgroundColor === "string") {
      setNoteBackgroundColor(patch.backgroundColor);
    }

    const nextAnnotations = annotations.map((annotation) =>
      annotation.id === selectedAnnotation.id && annotation.kind === "text-note"
        ? {
            ...annotation,
            ...patch,
          }
        : annotation,
    );

    commitAnnotations(nextAnnotations, selectedAnnotation.id);
    updateStatus("Text note updated.", "success");
  }

  async function handleExport() {
    if (!bytes || pages.length === 0) {
      updateStatus("Upload a PDF first.", "error");
      return;
    }

    if (annotations.length === 0) {
      updateStatus("Add at least one annotation before exporting.", "info");
      return;
    }

    setExporting(true);
    updateStatus("Preparing annotated PDF export...", "info");

    try {
      const blob = await exportAnnotatedPdf({
        originalBytes: bytes,
        annotations,
        pages,
      });

      const safeName = file?.name.replace(/\.pdf$/i, "") || "PDFMantra-annotated";
      downloadBlob(blob, `${safeName}-annotated.pdf`);
      updateStatus("Annotated PDF exported successfully. Download started.", "success");
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
    setSelectedAnnotationId(null);
  }

  function goToNextPage() {
    setActivePageIndex((current) => Math.min(Math.max(0, pages.length - 1), current + 1));
    setSelectedAnnotationId(null);
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={PenLine}
            eyebrow="PDFMantra Annotate PDF"
            title="Annotate PDFs with pen, marker, notes, arrows, and shapes."
            description="This is the advanced standalone annotation workspace: draw highlighter and ink strokes, add clean review shapes, place notes, manage annotations, and export the marked PDF directly."
            meta={
              <div className="grid min-w-[220px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{summary?.pageCount ?? "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{annotations.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Marks</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedPageAnnotations.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Page</div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] xl:grid-cols-[1fr_410px]">
            <section className="min-h-[820px] min-w-0 border-r border-[var(--border-light)] bg-[var(--bg-base)] p-4 sm:p-6">
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
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-5 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] sm:p-6"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  <FileText size={22} />
                </div>

                <div className="font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {summary?.fileName ?? "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {summary
                    ? `${summary.pageCount} page${summary.pageCount === 1 ? "" : "s"} · ${formatFileSize(summary.fileSize)}`
                    : "Click here or drag a PDF to open the Annotate PDF workspace."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              {pages.length > 0 && activePage && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                      Page navigation
                    </div>
                    <div className="mt-1 text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      {activePage.pageLabel} of {pages.length}
                    </div>
                    <div className="mt-2 inline-flex items-center rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-1 text-xs font-semibold text-[var(--violet-600)]">
                      {getToolLabel(activeTool)} active
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={goToPreviousPage}
                      disabled={activePageIndex === 0}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowLeft size={16} />
                      Prev
                    </button>

                    <button
                      type="button"
                      onClick={goToNextPage}
                      disabled={activePageIndex >= pages.length - 1}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--border-light)] bg-[var(--bg-card)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-5">
                {busy ? (
                  <div className="flex min-h-[540px] items-center justify-center rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-3 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-5 py-4 text-sm font-semibold text-[var(--violet-600)]">
                      <Loader2 className="animate-spin" size={18} />
                      Preparing annotation workspace
                    </div>
                  </div>
                ) : activePage ? (
                  <AnnotatePageSurface
                    page={activePage}
                    annotations={annotations}
                    selectedAnnotationId={selectedAnnotationId}
                    activeTool={activeTool}
                    style={style}
                    noteFontSize={noteFontSize}
                    noteBackgroundColor={noteBackgroundColor}
                    onCreateAnnotation={handleCreateAnnotation}
                    onSelectAnnotation={handleSelectAnnotation}
                  />
                ) : (
                  <div className="flex min-h-[540px] items-center justify-center rounded-[1.75rem] border border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] text-center shadow-[var(--shadow-soft)]">
                    <div className="max-w-md px-6">
                      <PenLine className="mx-auto text-[var(--violet-400)]" size={42} />
                      <h2 className="display-font mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                        Upload a PDF to annotate
                      </h2>
                      <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                        Pen, marker, shapes, arrows, notes, undo, redo, and PDF export are built into this workspace.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-4 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="display-font text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Annotation Tools
                    </h2>
                    <p className="mt-1 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                      Choose the tool first, then draw directly on the PDF canvas.
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

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {TOOL_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = activeTool === option.tool;

                    return (
                      <button
                        key={option.tool}
                        type="button"
                        onClick={() => handleToolChange(option.tool)}
                        className={`rounded-[1.1rem] border p-3 text-left transition ${
                          active
                            ? "border-[var(--border-focus)] bg-[var(--violet-50)] shadow-[var(--shadow-soft)]"
                            : "border-[var(--border-light)] bg-white hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)]"
                        }`}
                        aria-pressed={active}
                        title={option.description}
                      >
                        <Icon size={18} className="text-[var(--violet-600)]" />
                        <div className="mt-2 text-sm font-semibold text-[var(--text-primary)]">
                          {option.label}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5 border-t border-[var(--border-light)] pt-5">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">Color</div>
                  <div className="mt-3 grid grid-cols-6 gap-2">
                    {ANNOTATION_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => updateSelectedAnnotationStyle({ color: preset.value })}
                        className={`h-10 rounded-2xl border transition ${
                          style.color === preset.value
                            ? "border-[var(--text-primary)] ring-2 ring-[rgba(24,21,46,0.12)]"
                            : "border-[var(--border-light)] hover:border-[var(--border-focus)]"
                        }`}
                        style={{ backgroundColor: preset.value }}
                        aria-label={`Use ${preset.label} annotation color`}
                        title={preset.label}
                      />
                    ))}
                  </div>
                </div>

                <label className="mt-5 block">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text-primary)]">
                    <span>Opacity</span>
                    <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {Math.round(style.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.01}
                    value={style.opacity}
                    onChange={(event) => updateSelectedAnnotationStyle({ opacity: Number(event.target.value) })}
                    className="mt-3 w-full"
                  />
                </label>

                <label className="mt-5 block">
                  <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--text-primary)]">
                    <span>Stroke width</span>
                    <span className="rounded-full border border-[var(--border-light)] bg-white px-3 py-1 text-xs text-[var(--text-secondary)]">
                      {style.strokeWidth}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={28}
                    step={1}
                    value={style.strokeWidth}
                    onChange={(event) => updateSelectedAnnotationStyle({ strokeWidth: Number(event.target.value) })}
                    className="mt-3 w-full"
                  />
                </label>

                {isTextNote(selectedAnnotation) ? (
                  <div className="mt-5 rounded-[1.25rem] border border-[var(--border-light)] bg-white p-4">
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Edit selected note</div>
                    <textarea
                      value={selectedAnnotation.text}
                      onChange={(event) => updateSelectedTextNote({ text: event.target.value })}
                      className="mt-3 min-h-28 w-full rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)] px-3 py-3 text-sm font-medium text-[var(--text-primary)] outline-none transition focus:border-[var(--border-focus)]"
                    />
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Font size</span>
                        <input
                          type="number"
                          min={10}
                          max={34}
                          value={selectedAnnotation.fontSize}
                          onChange={(event) => updateSelectedTextNote({ fontSize: Number(event.target.value) || DEFAULT_NOTE_FONT_SIZE })}
                          className="mt-2 w-full rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold text-[var(--text-secondary)]">Note fill</span>
                        <input
                          type="color"
                          value={selectedAnnotation.backgroundColor}
                          onChange={(event) => updateSelectedTextNote({ backgroundColor: event.target.value })}
                          className="mt-2 h-10 w-full cursor-pointer rounded-2xl border border-[var(--border-light)] bg-white p-1"
                        />
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={history.undo.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Undo2 size={16} />
                    Undo
                  </button>

                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={history.redo.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={16} />
                    Redo
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    disabled={!selectedAnnotation}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>

                  <button
                    type="button"
                    onClick={handleClearPage}
                    disabled={!activePage || selectedPageAnnotations.length === 0}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={16} />
                    Clear Page
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || !bytes || annotations.length === 0}
                  className="btn-primary mt-5 w-full"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Exporting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Export Annotated PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="display-font text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      {activePage ? `${activePage.pageLabel} Items` : "Annotations"}
                    </h3>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      {activePage
                        ? `${pageAnnotationCount(annotations, activePage.pageIndex)} annotation${pageAnnotationCount(annotations, activePage.pageIndex) === 1 ? "" : "s"} on this page`
                        : "Upload a PDF first."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedPageAnnotations.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--violet-50)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)]">
                      Pick a tool and draw on the PDF canvas to create your first annotation.
                    </div>
                  ) : (
                    selectedPageAnnotations
                      .slice()
                      .reverse()
                      .map((annotation) => (
                        <div
                          key={annotation.id}
                          className={`rounded-[1.25rem] border p-4 transition ${
                            annotation.id === selectedAnnotationId
                              ? "border-[var(--border-focus)] bg-[var(--violet-50)]"
                              : "border-[var(--border-light)] bg-[var(--bg-card)] hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleSelectAnnotation(annotation.id)}
                            className="block w-full text-left"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-[var(--text-primary)]">
                                {getAnnotationKindLabel(annotation)}
                              </div>
                              <div
                                className="h-5 w-5 rounded-full border border-white shadow-sm"
                                style={{ backgroundColor: annotation.style.color }}
                              />
                            </div>
                            <p className="mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">
                              {getAnnotationSummary(annotation)}
                            </p>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteAnnotation(annotation.id)}
                            className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
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
                  <PenLine size={16} />
                  Status
                </div>
                {status}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
