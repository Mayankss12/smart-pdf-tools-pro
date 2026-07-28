"use client";

import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Loader2,
  RotateCcw,
  RotateCw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import {
  DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS,
  type EditorPageNumberPosition,
  type EditorPageNumberSettings,
} from "@/lib/editor/editor-page-numbering";
import type {
  EditorBlankPageSize,
  EditorPageInsertion,
  EditorPageRotationDirection,
} from "@/lib/pdf-tools/editor-page-management";

export type EditorPageDialogMode =
  | "add"
  | "reorder"
  | "rotate"
  | "numbers"
  | null;

type EditorPageToolsDialogProps = {
  readonly mode: EditorPageDialogMode;
  readonly pdfDocument: PDFDocumentProxy | null;
  readonly activePageNumber: number;
  readonly pageCount: number;
  readonly busy: boolean;
  readonly pageNumberSettings?: EditorPageNumberSettings;
  readonly hasPageNumbers: boolean;
  readonly onClose: () => void;
  readonly onAdd: (options: {
    readonly insertion: EditorPageInsertion;
    readonly size: EditorBlankPageSize;
  }) => Promise<void>;
  readonly onReorder: (pageOrder: readonly number[]) => Promise<void>;
  readonly onRotate: (direction: EditorPageRotationDirection) => Promise<void>;
  readonly onApplyPageNumbers: (
    settings: EditorPageNumberSettings,
  ) => Promise<void>;
  readonly onRemovePageNumbers: () => void;
};

function ReorderThumbnail({
  pdfDocument,
  pageNumber,
}: {
  readonly pdfDocument: PDFDocumentProxy;
  readonly pageNumber: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: { readonly cancel: () => void; readonly promise: Promise<void> } | null =
      null;

    async function render() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.2 });
      const context = canvas.getContext("2d");
      if (!context || cancelled) return;

      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      renderTask = page.render({ canvasContext: context, viewport });

      try {
        await renderTask.promise;
      } finally {
        page.cleanup();
      }
    }

    void render();

    return () => {
      cancelled = true;
      try {
        renderTask?.cancel();
      } catch {
        // Rendering may already be complete.
      }
    };
  }, [pageNumber, pdfDocument]);

  return <canvas ref={canvasRef} className="max-h-28 max-w-full bg-white shadow-sm" />;
}

function getDialogTitle(mode: Exclude<EditorPageDialogMode, null>) {
  if (mode === "add") return "Add blank page";
  if (mode === "reorder") return "Reorder pages";
  if (mode === "rotate") return "Rotate current page";
  return "Page number settings";
}

const PAGE_NUMBER_POSITIONS: readonly EditorPageNumberPosition[] = [
  "top-left",
  "top-center",
  "top-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
];
const PAGE_INSERTIONS: readonly EditorPageInsertion[] = ["before", "after"];
const PAGE_SIZE_OPTIONS: readonly {
  readonly value: EditorBlankPageSize;
  readonly label: string;
}[] = [
  { value: "same", label: "Same as current" },
  { value: "a4", label: "A4" },
  { value: "letter", label: "Letter" },
];
const PAGE_ROTATION_OPTIONS: readonly {
  readonly direction: EditorPageRotationDirection;
  readonly label: string;
  readonly icon: LucideIcon;
}[] = [
  {
    direction: "counter-clockwise",
    label: "90° counter-clockwise",
    icon: RotateCcw,
  },
  {
    direction: "clockwise",
    label: "90° clockwise",
    icon: RotateCw,
  },
];

function isPageNumberPosition(value: string): value is EditorPageNumberPosition {
  return PAGE_NUMBER_POSITIONS.some((position) => position === value);
}

export function EditorPageToolsDialog({
  mode,
  pdfDocument,
  activePageNumber,
  pageCount,
  busy,
  pageNumberSettings = DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS,
  hasPageNumbers,
  onClose,
  onAdd,
  onReorder,
  onRotate,
  onApplyPageNumbers,
  onRemovePageNumbers,
}: EditorPageToolsDialogProps) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const [insertion, setInsertion] = useState<EditorPageInsertion>("after");
  const [size, setSize] = useState<EditorBlankPageSize>("same");
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [draggedPage, setDraggedPage] = useState<number | null>(null);
  const [numberSettings, setNumberSettings] =
    useState<EditorPageNumberSettings>(pageNumberSettings);

  useEffect(() => {
    if (!mode) return;
    setPageOrder(Array.from({ length: pageCount }, (_, index) => index + 1));
    setNumberSettings(pageNumberSettings);
  }, [mode, pageCount, pageNumberSettings]);

  useEffect(() => {
    if (!mode) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
      if (event.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleEscape);
    window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    });
    return () => window.removeEventListener("keydown", handleEscape);
  }, [busy, mode, onClose]);

  if (!mode) return null;

  function movePage(pageNumber: number, direction: -1 | 1) {
    setPageOrder((current) => {
      const index = current.indexOf(pageNumber);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function dropPage(targetPage: number) {
    if (!draggedPage || draggedPage === targetPage) return;

    setPageOrder((current) => {
      const next = current.filter((pageNumber) => pageNumber !== draggedPage);
      const targetIndex = next.indexOf(targetPage);
      next.splice(Math.max(0, targetIndex), 0, draggedPage);
      return next;
    });
    setDraggedPage(null);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-page-dialog-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2
              id="editor-page-dialog-title"
              className="text-lg font-black tracking-tight text-slate-950"
            >
              {getDialogTitle(mode)}
            </h2>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Page {activePageNumber} of {pageCount}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed"
            aria-label="Close page settings"
          >
            <X size={18} />
          </button>
        </header>

        <div className="max-h-[calc(92vh-76px)] overflow-y-auto p-5">
          {mode === "add" ? (
            <div className="space-y-5">
              <fieldset>
                <legend className="text-sm font-black text-slate-800">Placement</legend>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {PAGE_INSERTIONS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setInsertion(value)}
                      className={[
                        "rounded-xl border px-4 py-3 text-sm font-bold capitalize focus:outline-none focus:ring-2 focus:ring-violet-500",
                        insertion === value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {value} current page
                    </button>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className="text-sm font-black text-slate-800">Page size</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setSize(option.value)}
                      className={[
                        "rounded-xl border px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-violet-500",
                        size === option.value
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-slate-200 text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>

              <button
                type="button"
                onClick={() => void onAdd({ insertion, size })}
                disabled={busy}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-wait disabled:bg-slate-400"
              >
                {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                Add page
              </button>
            </div>
          ) : null}

          {mode === "reorder" && pdfDocument ? (
            <div>
              <p className="mb-4 text-sm font-semibold leading-6 text-slate-600">
                Drag thumbnails or use the arrow buttons. Changes are applied only
                after confirmation.
              </p>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {pageOrder.map((pageNumber, index) => (
                  <article
                    key={pageNumber}
                    draggable={!busy}
                    onDragStart={() => setDraggedPage(pageNumber)}
                    onDragEnd={() => setDraggedPage(null)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => dropPage(pageNumber)}
                    className={[
                      "rounded-2xl border bg-slate-50 p-3",
                      draggedPage === pageNumber
                        ? "border-violet-500 opacity-60"
                        : "border-slate-200",
                    ].join(" ")}
                  >
                    <div className="flex min-h-28 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                      <ReorderThumbnail
                        pdfDocument={pdfDocument}
                        pageNumber={pageNumber}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-black text-slate-700">
                        <GripVertical size={14} />
                        Page {pageNumber}
                      </span>
                      <span className="text-[10px] font-black uppercase text-violet-600">
                        Position {index + 1}
                      </span>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => movePage(pageNumber, -1)}
                          disabled={index === 0 || busy}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-35"
                          aria-label={`Move page ${pageNumber} earlier`}
                        >
                          <ArrowUp size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => movePage(pageNumber, 1)}
                          disabled={index === pageOrder.length - 1 || busy}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-35"
                          aria-label={`Move page ${pageNumber} later`}
                        >
                          <ArrowDown size={14} />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onReorder(pageOrder)}
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700 disabled:cursor-wait disabled:bg-slate-400"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                  Confirm order
                </button>
              </div>
            </div>
          ) : null}

          {mode === "rotate" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {PAGE_ROTATION_OPTIONS.map(({ direction, label, icon: Icon }) => (
                <button
                  key={direction}
                  type="button"
                  onClick={() => void onRotate(direction)}
                  disabled={busy}
                  className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-wait disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 size={26} className="animate-spin" />
                  ) : (
                    <Icon size={26} />
                  )}
                  {label}
                </button>
              ))}
            </div>
          ) : null}

          {mode === "numbers" ? (
            <div className="grid gap-5 md:grid-cols-[1fr_220px]">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-black text-slate-700">
                  Position
                  <select
                    value={numberSettings.position}
                    onChange={(event) => {
                      const position = event.target.value;
                      if (!isPageNumberPosition(position)) return;
                      setNumberSettings((current) => ({
                        ...current,
                        position,
                      }));
                    }}
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="top-left">Top left</option>
                    <option value="top-center">Top center</option>
                    <option value="top-right">Top right</option>
                    <option value="bottom-left">Bottom left</option>
                    <option value="bottom-center">Bottom center</option>
                    <option value="bottom-right">Bottom right</option>
                  </select>
                </label>
                <label className="text-xs font-black text-slate-700">
                  Page range
                  <input
                    value={numberSettings.pageRange}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        pageRange: event.target.value,
                      }))
                    }
                    placeholder="all or 1-3, 5"
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Starting number
                  <input
                    type="number"
                    min={0}
                    value={numberSettings.startNumber}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        startNumber: Math.max(0, Number(event.target.value)),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Font size
                  <input
                    type="number"
                    min={8}
                    max={72}
                    value={numberSettings.fontSize}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        fontSize: Math.max(
                          8,
                          Math.min(72, Number(event.target.value)),
                        ),
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Prefix
                  <input
                    value={numberSettings.prefix}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        prefix: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Suffix
                  <input
                    value={numberSettings.suffix}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        suffix: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  />
                </label>
                <label className="text-xs font-black text-slate-700">
                  Text color
                  <input
                    type="color"
                    value={numberSettings.color}
                    onChange={(event) =>
                      setNumberSettings((current) => ({
                        ...current,
                        color: event.target.value,
                      }))
                    }
                    className="mt-1 h-10 w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                  />
                </label>
              </div>

              <aside className="rounded-2xl border border-slate-200 bg-slate-100 p-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                  Preview
                </div>
                <div className="relative mt-3 aspect-[3/4] rounded-lg border border-slate-300 bg-white shadow-sm">
                  <span
                    className={[
                      "absolute max-w-[90%] truncate font-bold",
                      numberSettings.position.startsWith("top")
                        ? "top-3"
                        : "bottom-3",
                      numberSettings.position.endsWith("left")
                        ? "left-3"
                        : numberSettings.position.endsWith("right")
                          ? "right-3"
                          : "left-1/2 -translate-x-1/2",
                    ].join(" ")}
                    style={{
                      color: numberSettings.color,
                      fontSize: Math.max(9, Math.min(18, numberSettings.fontSize)),
                    }}
                  >
                    {numberSettings.prefix}
                    {numberSettings.startNumber}
                    {numberSettings.suffix}
                  </span>
                </div>
              </aside>

              <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                {hasPageNumbers ? (
                  <button
                    type="button"
                    onClick={onRemovePageNumbers}
                    disabled={busy}
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 hover:bg-red-100"
                  >
                    <Trash2 size={16} />
                    Remove numbers
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  disabled={busy}
                  className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-black text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void onApplyPageNumbers(numberSettings)}
                  disabled={busy}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-black text-white hover:bg-violet-700 disabled:cursor-wait disabled:bg-slate-400"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : null}
                  Apply numbers
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
