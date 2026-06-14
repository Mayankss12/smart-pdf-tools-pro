"use client";

import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Download,
  FilePlus2,
  FolderOpen,
  Highlighter,
  Image as ImageIcon,
  Languages,
  Minus,
  MousePointer2,
  PenLine,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Share2,
  Square,
  Stamp,
  StickyNote,
  Trash2,
  Type,
} from "lucide-react";
import type { ComponentType } from "react";

import type { EditorController } from "../hooks/useEditor";
import type { EditorTool } from "../hooks/useActiveTool";

type ToolButtonConfig = {
  readonly id: EditorTool;
  readonly label: string;
  readonly shortcut: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly enabled: boolean;
  readonly pro?: boolean;
};

type ActionButtonConfig = {
  readonly id: string;
  readonly label: string;
  readonly shortcut: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly enabled: boolean;
  readonly pro?: boolean;
  readonly onClick?: () => void;
};

type ToolGroup = {
  readonly title: string;
  readonly items: ToolButtonConfig[];
};

type ActionGroup = {
  readonly title: string;
  readonly items: ActionButtonConfig[];
};

type EditorTopBarProps = {
  readonly editor: EditorController;
  readonly onOpenFile: () => void;
  readonly onExport?: () => void;
  readonly onShare?: () => void;
  readonly onUnavailableTool?: (label: string) => void;
  readonly onAddBlankPage?: () => void;
  readonly onDeleteCurrentPage?: () => void;
  readonly onRotateCurrentPage?: () => void;
};

function formatPageLabel(editor: EditorController) {
  if (!editor.pdfDocument) return "No PDF";
  return `Page ${editor.activePageNumber} of ${editor.totalPages}`;
}

function ToolButton({
  item,
  activeTool,
  onSelect,
}: {
  readonly item: ToolButtonConfig;
  readonly activeTool: EditorTool;
  readonly onSelect: (tool: EditorTool) => void;
}) {
  const Icon = item.icon;
  const active = activeTool === item.id;

  return (
    <button
      type="button"
      disabled={!item.enabled}
      title={`${item.label} (${item.shortcut})`}
      onClick={() => onSelect(item.id)}
      className={[
        "relative flex h-12 w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border text-[9px] font-black leading-none transition duration-200 sm:h-14 sm:w-16 sm:text-[10px]",
        active
          ? "border-violet-300 bg-violet-100 text-violet-700 ring-2 ring-violet-500/25 shadow-[0_10px_24px_rgba(124,58,237,0.14)]"
          : "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100",
        !item.enabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {item.pro ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] font-black text-white sm:-right-1 sm:-top-1 sm:text-[8px]">
          PRO
        </span>
      ) : null}

      <Icon size={18} className="sm:h-5 sm:w-5" />
      <span className="mt-1 max-w-[58px] truncate sm:mt-1.5">{item.label}</span>
    </button>
  );
}

function ActionButton({
  item,
  onFallback,
}: {
  readonly item: ActionButtonConfig;
  readonly onFallback?: (label: string) => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      disabled={!item.enabled}
      title={`${item.label} (${item.shortcut})`}
      onClick={() => {
        if (item.onClick) {
          item.onClick();
          return;
        }

        onFallback?.(item.label);
      }}
      className={[
        "relative flex h-12 w-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border text-[9px] font-black leading-none transition duration-200 sm:h-14 sm:w-16 sm:text-[10px]",
        "border-transparent bg-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100",
        !item.enabled ? "cursor-not-allowed opacity-40" : "",
      ].join(" ")}
    >
      {item.pro ? (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-violet-600 px-1.5 py-0.5 text-[7px] font-black text-white sm:-right-1 sm:-top-1 sm:text-[8px]">
          PRO
        </span>
      ) : null}

      <Icon size={18} className="sm:h-5 sm:w-5" />
      <span className="mt-1 max-w-[58px] truncate sm:mt-1.5">{item.label}</span>
    </button>
  );
}

function GroupLabel({ title }: { readonly title: string }) {
  return (
    <div className="mb-1 hidden px-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 sm:block">
      {title}
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-10 w-px shrink-0 bg-slate-200 sm:mx-2 sm:h-12" />;
}

export function EditorTopBar({
  editor,
  onOpenFile,
  onExport,
  onShare,
  onUnavailableTool,
  onAddBlankPage,
  onDeleteCurrentPage,
  onRotateCurrentPage,
}: EditorTopBarProps) {
  const hasDocument = Boolean(editor.file && editor.pdfDocument);
  const canGoPrevious = hasDocument && editor.activePageNumber > 1;
  const canGoNext = hasDocument && editor.activePageNumber < editor.totalPages;

  const toolGroups: ToolGroup[] = [
    {
      title: "Home",
      items: [
        { id: "select", label: "Select", shortcut: "V", icon: MousePointer2, enabled: hasDocument },
        { id: "text", label: "Text", shortcut: "T", icon: Type, enabled: hasDocument },
        { id: "image", label: "Image", shortcut: "I", icon: ImageIcon, enabled: hasDocument },
        { id: "signature", label: "Sign", shortcut: "S", icon: PenLine, enabled: hasDocument },
      ],
    },
    {
      title: "Comment",
      items: [
        { id: "highlight", label: "Highlight", shortcut: "H", icon: Highlighter, enabled: hasDocument },
        { id: "note", label: "Note", shortcut: "N", icon: StickyNote, enabled: hasDocument },
        { id: "draw", label: "Draw", shortcut: "D", icon: Pencil, enabled: hasDocument },
        { id: "shape", label: "Shape", shortcut: "R", icon: Square, enabled: hasDocument },
        { id: "stamp", label: "Stamp", shortcut: "M", icon: Stamp, enabled: hasDocument },
      ],
    },
    {
      title: "Edit",
      items: [
        { id: "whiteout", label: "Whiteout", shortcut: "W", icon: Square, enabled: hasDocument },
      ],
    },
    {
      title: "Tools",
      items: [
        { id: "ocr", label: "OCR", shortcut: "O", icon: Brain, enabled: hasDocument, pro: true },
        { id: "translate", label: "Translate", shortcut: "L", icon: Languages, enabled: hasDocument, pro: true },
        { id: "find", label: "Find", shortcut: "F", icon: Search, enabled: hasDocument },
      ],
    },
  ];

  const pageActions: ActionGroup = {
    title: "Page",
    items: [
      {
        id: "add-page",
        label: "Add",
        shortcut: "A",
        icon: FilePlus2,
        enabled: hasDocument,
        onClick: onAddBlankPage,
      },
      {
        id: "delete-page",
        label: "Delete",
        shortcut: "Del",
        icon: Trash2,
        enabled: hasDocument,
        onClick: onDeleteCurrentPage,
      },
      {
        id: "rotate-page",
        label: "Rotate",
        shortcut: "Ctrl+R",
        icon: RotateCw,
        enabled: hasDocument,
        onClick: onRotateCurrentPage,
      },
    ],
  };

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)]">
            PM
          </div>

          <div className="min-w-0 max-w-[72px] sm:max-w-[240px] lg:max-w-[360px]">
            <div className="truncate text-xs font-black tracking-[-0.02em] text-slate-950 sm:text-sm">
              {editor.fileMeta?.name || "PDFMantra Editor"}
            </div>
            <div className="truncate text-[11px] font-bold text-slate-500 sm:text-xs">
              {formatPageLabel(editor)}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={onOpenFile}
            className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 sm:px-3"
            aria-label="Open PDF"
          >
            <FolderOpen size={16} />
            <span className="hidden sm:inline">Open</span>
          </button>

          <div className="hidden items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 md:flex">
            <button
              type="button"
              onClick={() => editor.setActivePage(editor.activePageNumber - 1)}
              disabled={!canGoPrevious}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>

            <div className="min-w-[82px] text-center text-xs font-black text-slate-700">
              {hasDocument ? `${editor.activePageNumber} / ${editor.totalPages}` : "No PDF"}
            </div>

            <button
              type="button"
              onClick={() => editor.setActivePage(editor.activePageNumber + 1)}
              disabled={!canGoNext}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={editor.zoomOut}
              disabled={!hasDocument}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom out"
            >
              <Minus size={15} />
            </button>

            <div className="hidden min-w-[54px] text-center text-xs font-black text-slate-700 sm:block">
              {Math.round(editor.zoom * 100)}%
            </div>

            <button
              type="button"
              onClick={editor.zoomIn}
              disabled={!hasDocument}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-white hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-35"
              aria-label="Zoom in"
            >
              <Plus size={15} />
            </button>
          </div>

          <button
            type="button"
            onClick={onExport}
            disabled={!hasDocument}
            className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-3 text-sm font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
            aria-label="Export PDF"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            type="button"
            onClick={onShare}
            disabled={!hasDocument}
            className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 lg:inline-flex"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="flex h-[3.75rem] min-w-0 items-center gap-1 overflow-x-auto border-t border-slate-100 px-2 sm:h-16 sm:gap-2 sm:px-4">
        {toolGroups.map((group, groupIndex) => (
          <div key={group.title} className="flex shrink-0 items-center">
            {groupIndex > 0 ? <Separator /> : null}

            <div>
              <GroupLabel title={group.title} />

              <div className="flex items-center gap-1">
                {group.items.map((item) => (
                  <ToolButton
                    key={item.id}
                    item={item}
                    activeTool={editor.activeTool}
                    onSelect={editor.setActiveTool}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}

        <Separator />

        <div className="shrink-0">
          <GroupLabel title={pageActions.title} />

          <div className="flex items-center gap-1">
            {pageActions.items.map((item) => (
              <ActionButton
                key={item.id}
                item={item}
                onFallback={onUnavailableTool}
              />
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
