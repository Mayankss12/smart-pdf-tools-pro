"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FolderOpen,
  ListFilter,
  Loader2,
  Lock,
  Minus,
  MoreHorizontal,
  Plus,
  ServerOff,
  Share2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  EDITOR_TOOL_DEFINITIONS,
  EDITOR_TOOL_GROUPS,
  resolveEditorTool,
  type EditorToolbarItemId,
  type EditorToolContext,
  type ResolvedEditorTool,
} from "@/lib/editor/editor-tool-registry";

import type { EditorController } from "../hooks/useEditor";

type EditorTopBarProps = {
  readonly editor: EditorController;
  readonly toolContext: EditorToolContext;
  readonly busyToolId?: EditorToolbarItemId | null;
  readonly busyProgress?: number | null;
  readonly onOpenFile: () => void;
  readonly onExport?: () => void;
  readonly onShare?: () => void;
  readonly onToolAction: (toolId: EditorToolbarItemId) => void;
  readonly onUnavailableTool: (message: string) => void;
};

function formatPageLabel(editor: EditorController) {
  if (!editor.pdfDocument) return "No PDF";
  return `Page ${editor.activePageNumber} of ${editor.totalPages}`;
}

function getToolTooltip(tool: ResolvedEditorTool) {
  const shortcut = tool.definition.shortcut
    ? `Shortcut: ${tool.definition.shortcut}.`
    : "No keyboard shortcut.";
  const state = tool.enabled
    ? "Available."
    : `Unavailable: ${tool.disabledReason ?? "This tool is disabled."}`;

  return `${tool.definition.label}. ${shortcut} ${state}`;
}

function ToolBadge({ tool }: { readonly tool: ResolvedEditorTool }) {
  if (tool.enabled) return null;

  const backendRequired =
    tool.definition.availability === "requires-backend";
  const Icon = backendRequired ? ServerOff : Lock;

  return (
    <span
      className={[
        "absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full border shadow-sm",
        backendRequired
          ? "border-amber-300 bg-amber-50 text-amber-700"
          : "border-slate-300 bg-white text-slate-500",
      ].join(" ")}
      aria-hidden="true"
    >
      <Icon size={9} />
    </span>
  );
}

function RibbonButton({
  tool,
  active,
  busy,
  progress,
  tabIndex,
  onClick,
  onKeyDown,
  buttonRef,
  compact = false,
}: {
  readonly tool: ResolvedEditorTool;
  readonly active: boolean;
  readonly busy: boolean;
  readonly progress?: number | null;
  readonly tabIndex?: number;
  readonly onClick: () => void;
  readonly onKeyDown?: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  readonly buttonRef?: (element: HTMLButtonElement | null) => void;
  readonly compact?: boolean;
}) {
  const Icon = tool.definition.icon;
  const tooltip = getToolTooltip(tool);

  return (
    <button
      ref={buttonRef}
      type="button"
      tabIndex={tabIndex}
      aria-disabled={!tool.enabled}
      aria-pressed={tool.definition.kind === "tool" ? active : undefined}
      aria-label={tooltip}
      title={tooltip}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={[
        "relative flex shrink-0 flex-col items-center justify-center rounded-xl border text-center font-black transition duration-150 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2",
        compact ? "min-h-16 w-full px-2 py-2 text-[11px]" : "h-16 w-[68px] px-1 text-[10px]",
        active
          ? "border-violet-400 bg-violet-100 text-violet-800 shadow-sm"
          : tool.enabled
            ? "border-transparent bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
            : "cursor-not-allowed border-dashed border-slate-300 bg-slate-100 text-slate-500",
      ].join(" ")}
    >
      <ToolBadge tool={tool} />
      {busy ? (
        <Loader2 size={19} className="animate-spin text-violet-600" />
      ) : (
        <Icon size={19} />
      )}
      <span className="mt-1 block w-full whitespace-normal leading-[1.05rem]">
        {tool.definition.label}
      </span>
      {busy && typeof progress === "number" ? (
        <span className="mt-0.5 text-[9px] text-violet-700">
          {Math.round(progress)}%
        </span>
      ) : null}
    </button>
  );
}

export function EditorTopBar({
  editor,
  toolContext,
  busyToolId,
  busyProgress,
  onOpenFile,
  onExport,
  onShare,
  onToolAction,
  onUnavailableTool,
}: EditorTopBarProps) {
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [rovingIndex, setRovingIndex] = useState(0);
  const mobileToolsButtonRef = useRef<HTMLButtonElement | null>(null);
  const mobileToolsPanelRef = useRef<HTMLDivElement | null>(null);
  const desktopButtonRefs = useRef(
    new Map<EditorToolbarItemId, HTMLButtonElement>(),
  );
  const hasDocument = toolContext.hasDocument;
  const canGoPrevious = hasDocument && editor.activePageNumber > 1;
  const canGoNext = hasDocument && editor.activePageNumber < editor.totalPages;
  const resolvedTools = EDITOR_TOOL_DEFINITIONS.map((definition) =>
    resolveEditorTool(definition, toolContext),
  ).filter((tool) => tool.visible);

  useEffect(() => {
    if (!mobileToolsOpen) return;

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusFirst = () => {
      mobileToolsPanelRef.current
        ?.querySelector<HTMLElement>(focusableSelector)
        ?.focus();
    };
    const frame = window.requestAnimationFrame(focusFirst);

    function handleMobileDialogKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileToolsOpen(false);
        window.requestAnimationFrame(() =>
          mobileToolsButtonRef.current?.focus(),
        );
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        mobileToolsPanelRef.current?.querySelectorAll<HTMLElement>(
          focusableSelector,
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

    window.addEventListener("keydown", handleMobileDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleMobileDialogKeyDown);
    };
  }, [mobileToolsOpen]);

  function activateTool(tool: ResolvedEditorTool) {
    if (!tool.enabled) {
      onUnavailableTool(
        tool.disabledReason ?? `${tool.definition.label} is unavailable.`,
      );
      return;
    }

    onToolAction(tool.definition.id);
    if (mobileToolsOpen) setMobileToolsOpen(false);
  }

  function focusRovingTool(nextIndex: number) {
    const normalized =
      (nextIndex + resolvedTools.length) % Math.max(1, resolvedTools.length);
    setRovingIndex(normalized);
    const tool = resolvedTools[normalized];
    if (tool) desktopButtonRefs.current.get(tool.definition.id)?.focus();
  }

  function handleRovingKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      focusRovingTool(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      focusRovingTool(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusRovingTool(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusRovingTool(resolvedTools.length - 1);
    }
  }

  return (
    <header className="relative z-50 shrink-0 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex min-h-14 min-w-0 items-center justify-between gap-2 px-2 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)]">
            PM
          </div>
          <div className="min-w-0 max-w-[92px] sm:max-w-[260px]">
            <div className="truncate text-xs font-black text-slate-950 sm:text-sm">
              {editor.fileMeta?.name || "PDFMantra Editor"}
            </div>
            <div className="truncate text-[11px] font-bold text-slate-500">
              {formatPageLabel(editor)}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenFile}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 sm:px-3"
            aria-label="Open PDF"
            title="Open PDF"
          >
            <FolderOpen size={16} />
            <span className="hidden sm:inline">Open</span>
          </button>

          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex">
            <button
              type="button"
              onClick={() => editor.setActivePage(editor.activePageNumber - 1)}
              disabled={!canGoPrevious}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Previous page"
              title={canGoPrevious ? "Previous page" : "Already on the first page"}
            >
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-[82px] text-center text-xs font-black text-slate-700">
              {hasDocument
                ? `${editor.activePageNumber} / ${editor.totalPages}`
                : "No PDF"}
            </div>
            <button
              type="button"
              onClick={() => editor.setActivePage(editor.activePageNumber + 1)}
              disabled={!canGoNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Next page"
              title={canGoNext ? "Next page" : "Already on the last page"}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:flex">
            <button
              type="button"
              onClick={editor.zoomOut}
              disabled={!hasDocument}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Zoom out"
              title={hasDocument ? "Zoom out" : "Open a PDF to zoom"}
            >
              <Minus size={15} />
            </button>
            <div className="min-w-[50px] text-center text-xs font-black text-slate-700">
              {Math.round(editor.zoom * 100)}%
            </div>
            <button
              type="button"
              onClick={editor.zoomIn}
              disabled={!hasDocument}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:text-slate-300"
              aria-label="Zoom in"
              title={hasDocument ? "Zoom in" : "Open a PDF to zoom"}
            >
              <Plus size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={!hasDocument}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-black text-white shadow-sm transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-400"
            aria-label={hasDocument ? "Export PDF" : "Open a PDF before exporting"}
            title={hasDocument ? "Export PDF" : "Open a PDF before exporting"}
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            disabled={!hasDocument}
            className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 hover:border-violet-300 hover:bg-violet-50 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:text-slate-300 xl:inline-flex"
            title={hasDocument ? "Share PDF" : "Open a PDF before sharing"}
          >
            <Share2 size={16} />
            Share
          </button>

          <button
            ref={mobileToolsButtonRef}
            type="button"
            onClick={() => setMobileToolsOpen((current) => !current)}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500 lg:hidden"
            aria-expanded={mobileToolsOpen}
            aria-controls="editor-mobile-tools"
          >
            {mobileToolsOpen ? <X size={16} /> : <MoreHorizontal size={16} />}
            Tools
          </button>
        </div>
      </div>

      <div
        role="toolbar"
        aria-label="PDF editor tools"
        className="hidden min-h-[5.75rem] min-w-0 items-start gap-3 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 lg:flex"
      >
        {EDITOR_TOOL_GROUPS.map((group, groupIndex) => {
          const groupTools = resolvedTools.filter(
            (tool) => tool.definition.group === group.id,
          );

          return (
            <div
              key={group.id}
              className={[
                "flex shrink-0 items-center gap-3",
                groupIndex < EDITOR_TOOL_GROUPS.length - 1
                  ? "border-r border-slate-200 pr-3"
                  : "",
              ].join(" ")}
            >
              <div>
                <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                  {group.label}
                </div>
                <div className="flex items-center gap-1">
                  {groupTools.map((tool) => {
                    const index = resolvedTools.findIndex(
                      (item) => item.definition.id === tool.definition.id,
                    );
                    const active =
                      tool.definition.kind === "tool" &&
                      editor.activeTool === tool.definition.id;

                    return (
                      <RibbonButton
                        key={tool.definition.id}
                        tool={tool}
                        active={active}
                        busy={busyToolId === tool.definition.id}
                        progress={
                          busyToolId === tool.definition.id ? busyProgress : null
                        }
                        tabIndex={index === rovingIndex ? 0 : -1}
                        buttonRef={(element) => {
                          if (element) {
                            desktopButtonRefs.current.set(
                              tool.definition.id,
                              element,
                            );
                          } else {
                            desktopButtonRefs.current.delete(tool.definition.id);
                          }
                        }}
                        onClick={() => activateTool(tool)}
                        onKeyDown={(event) => handleRovingKeyDown(event, index)}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {mobileToolsOpen ? (
        <div
          ref={mobileToolsPanelRef}
          id="editor-mobile-tools"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-mobile-tools-title"
          className="absolute left-0 right-0 top-full max-h-[72vh] overflow-y-auto border-t border-slate-200 bg-white p-3 shadow-2xl lg:hidden"
        >
          <div
            id="editor-mobile-tools-title"
            className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500"
          >
            <ListFilter size={15} />
            Editor tools
          </div>
          {EDITOR_TOOL_GROUPS.map((group) => {
            const groupTools = resolvedTools.filter(
              (tool) => tool.definition.group === group.id,
            );
            return (
              <section key={group.id} className="mb-4">
                <h2 className="mb-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                  {group.label}
                </h2>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {groupTools.map((tool) => (
                    <RibbonButton
                      key={tool.definition.id}
                      tool={tool}
                      active={
                        tool.definition.kind === "tool" &&
                        editor.activeTool === tool.definition.id
                      }
                      busy={busyToolId === tool.definition.id}
                      progress={
                        busyToolId === tool.definition.id ? busyProgress : null
                      }
                      compact
                      onClick={() => activateTool(tool)}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
