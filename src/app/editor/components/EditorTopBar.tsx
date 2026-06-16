"use client";

import {
  ArrowUpDown,
  Brain,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  FilePlus2,
  FolderOpen,
  Hash,
  Highlighter,
  Image as ImageIcon,
  Languages,
  Lock,
  Minus,
  MousePointer2,
  PenLine,
  Pencil,
  Plus,
  Redo2,
  RotateCw,
  ScanLine,
  Search,
  Share2,
  Square,
  Stamp,
  StickyNote,
  Trash2,
  Type,
  Undo2,
} from "lucide-react";
import type { ComponentType } from "react";

import type { EditorController } from "../hooks/useEditor";
import type { EditorTool } from "../hooks/useActiveTool";

type ToolStatus = "working" | "locked";

type RibbonTool = {
  readonly id: string;
  readonly label: string;
  readonly shortcut: string;
  readonly icon: ComponentType<{ size?: number; className?: string }>;
  readonly status: ToolStatus;
  readonly tool?: EditorTool;
  readonly action?: () => void;
  readonly active?: boolean;
  readonly disabled?: boolean;
};

type ToolGroup = {
  readonly label: string;
  readonly tools: RibbonTool[];
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

const OPEN_IMAGE_PICKER_EVENT = "pdfmantra:editor-open-image-picker";
const OPEN_SIGNATURE_PICKER_EVENT = "pdfmantra:editor-open-signature-picker";

function formatPageLabel(editor: EditorController) {
  if (!editor.pdfDocument) return "No PDF";
  return `Page ${editor.activePageNumber} of ${editor.totalPages}`;
}

function RibbonGroup({
  group,
  isLast,
}: {
  readonly group: ToolGroup;
  readonly isLast: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <div className="shrink-0">
        <div className="mb-1 px-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          {group.label}
        </div>

        <div className="flex items-center gap-1">
          {group.tools.map((tool) => (
            <RibbonButton key={tool.id} tool={tool} />
          ))}
        </div>
      </div>

      {!isLast ? <div className="h-12 w-px bg-slate-200" /> : null}
    </div>
  );
}

function RibbonButton({ tool }: { readonly tool: RibbonTool }) {
  const Icon = tool.icon;
  const locked = tool.status === "locked";
  const disabled = locked || tool.disabled;

  return (
    <button
      type="button"
      disabled={disabled}
      title={`${tool.label} (${tool.shortcut})`}
      onClick={() => {
        if (disabled) return;

        if (tool.action) {
          tool.action();
        }
      }}
      className={[
        "relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl border text-[10px] font-black leading-none transition duration-200",
        tool.active
          ? "border-violet-300 bg-violet-100 text-violet-700 ring-2 ring-violet-400 shadow-[0_10px_24px_rgba(124,58,237,0.14)]"
          : "border-transparent text-slate-700",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950",
      ].join(" ")}
      aria-label={tool.label}
    >
      {locked ? (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
          <Lock size={10} />
        </span>
      ) : null}

      <Icon size={20} />
      <span className="mt-1.5 max-w-[50px] truncate">{tool.label}</span>
    </button>
  );
}

export function EditorTopBar({
  editor,
  onOpenFile,
  onExport,
  onShare,
  onAddBlankPage,
  onRotateCurrentPage,
}: EditorTopBarProps) {
  const hasDocument = Boolean(editor.file && editor.pdfDocument);
  const hasSelectedObject = Boolean(editor.selectedObjectId);
  const selectedObjectLocked = Boolean(editor.selectedObject?.locked);
  const canGoPrevious = hasDocument && editor.activePageNumber > 1;
  const canGoNext = hasDocument && editor.activePageNumber < editor.totalPages;

  const selectTool = (tool: EditorTool) => {
    editor.setActiveTool(tool);
  };

  const openPickerFromToolbar = (eventName: string) => {
    editor.setActiveTool("select");

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(eventName));
    }
  };

  const toolGroups: ToolGroup[] = [
    {
      label: "Add",
      tools: [
        {
          id: "select",
          label: "Select",
          shortcut: "V",
          icon: MousePointer2,
          status: "working",
          active: editor.activeTool === "select",
          disabled: !hasDocument,
          action: () => selectTool("select"),
        },
        {
          id: "text",
          label: "Text",
          shortcut: "T",
          icon: Type,
          status: "working",
          active: editor.activeTool === "text",
          disabled: !hasDocument,
          action: () => selectTool("text"),
        },
        {
          id: "image",
          label: "Image",
          shortcut: "Browse",
          icon: ImageIcon,
          status: "working",
          disabled: !hasDocument,
          action: () => openPickerFromToolbar(OPEN_IMAGE_PICKER_EVENT),
        },
        {
          id: "signature",
          label: "Sign",
          shortcut: "Browse",
          icon: PenLine,
          status: "working",
          disabled: !hasDocument,
          action: () => openPickerFromToolbar(OPEN_SIGNATURE_PICKER_EVENT),
        },
        {
          id: "shape",
          label: "Shape",
          shortcut: "R",
          icon: Square,
          status: "locked",
        },
        {
          id: "draw",
          label: "Draw",
          shortcut: "D",
          icon: Pencil,
          status: "locked",
        },
      ],
    },
    {
      label: "Markup",
      tools: [
        {
          id: "highlight",
          label: "Highlight",
          shortcut: "H",
          icon: Highlighter,
          status: "working",
          active: editor.activeTool === "highlight",
          disabled: !hasDocument,
          action: () => selectTool("highlight"),
        },
        {
          id: "copy-area",
          label: "Copy Area",
          shortcut: "Drag",
          icon: ScanLine,
          status: "working",
          active: editor.activeTool === "copy-area",
          disabled: !hasDocument,
          action: () => selectTool("copy-area"),
        },
        {
          id: "note",
          label: "Note",
          shortcut: "N",
          icon: StickyNote,
          status: "locked",
        },
        {
          id: "whiteout",
          label: "Whiteout",
          shortcut: "W",
          icon: Square,
          status: "working",
          active: editor.activeTool === "whiteout",
          disabled: !hasDocument,
          action: () => selectTool("whiteout"),
        },
        {
          id: "stamp",
          label: "Stamp",
          shortcut: "M",
          icon: Stamp,
          status: "locked",
        },
      ],
    },
    {
      label: "Smart",
      tools: [
        {
          id: "ocr",
          label: "OCR",
          shortcut: "O",
          icon: Brain,
          status: "locked",
        },
        {
          id: "object-select",
          label: "Object",
          shortcut: "Obj",
          icon: MousePointer2,
          status: "locked",
        },
        {
          id: "text-select",
          label: "Text Sel",
          shortcut: "OCR",
          icon: Type,
          status: "locked",
        },
        {
          id: "translate",
          label: "Translate",
          shortcut: "L",
          icon: Languages,
          status: "locked",
        },
        {
          id: "find",
          label: "Find",
          shortcut: "F",
          icon: Search,
          status: "locked",
        },
      ],
    },
    {
      label: "Pages",
      tools: [
        {
          id: "add-page",
          label: "Add",
          shortcut: "A",
          icon: FilePlus2,
          status: onAddBlankPage ? "working" : "locked",
          disabled: !hasDocument,
          action: onAddBlankPage,
        },
        {
          id: "reorder",
          label: "Reorder",
          shortcut: "Drag",
          icon: ArrowUpDown,
          status: "locked",
        },
        {
          id: "rotate",
          label: "Rotate",
          shortcut: "Ctrl+R",
          icon: RotateCw,
          status: onRotateCurrentPage ? "working" : "locked",
          disabled: !hasDocument,
          action: onRotateCurrentPage,
        },
        {
          id: "number",
          label: "Number",
          shortcut: "#",
          icon: Hash,
          status: "locked",
        },
      ],
    },
    {
      label: "Actions",
      tools: [
        {
          id: "undo",
          label: "Undo",
          shortcut: "Ctrl+Z",
          icon: Undo2,
          status: "working",
          disabled: !hasDocument || !editor.canUndo,
          action: editor.undo,
        },
        {
          id: "redo",
          label: "Redo",
          shortcut: "Ctrl+Y",
          icon: Redo2,
          status: "working",
          disabled: !hasDocument || !editor.canRedo,
          action: editor.redo,
        },
        {
          id: "duplicate-selected",
          label: "Duplicate",
          shortcut: "Ctrl+D",
          icon: Copy,
          status: "working",
          disabled: !hasDocument || !hasSelectedObject || selectedObjectLocked,
          action: () => {
            if (!editor.selectedObjectId) return;
            editor.duplicateObject(editor.selectedObjectId);
          },
        },
        {
          id: "delete-selected",
          label: "Delete",
          shortcut: "Del",
          icon: Trash2,
          status: "working",
          disabled: !hasDocument || !hasSelectedObject || selectedObjectLocked,
          action: () => {
            if (!editor.selectedObjectId) return;
            editor.deleteObject(editor.selectedObjectId);
          },
        },
      ],
    },
  ];

  return (
    <header className="shrink-0 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-sm font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)]">
            PM
          </div>

          <div className="min-w-0 max-w-[76px] sm:max-w-[240px] xl:max-w-[360px]">
            <div className="truncate text-xs font-black tracking-[-0.02em] text-slate-950 sm:text-sm">
              {editor.fileMeta?.name || "PDFMantra Editor"}
            </div>
            <div className="truncate text-[11px] font-bold text-slate-500 sm:text-xs">
              {formatPageLabel(editor)}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 sm:gap-2">
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
            className="hidden h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40 xl:inline-flex"
          >
            <Share2 size={16} />
            <span>Share</span>
          </button>
        </div>
      </div>

      <div className="flex h-[5.75rem] min-w-0 items-start gap-3 overflow-x-auto border-t border-slate-100 bg-white px-2 py-2 sm:px-4 xl:justify-center">
        {toolGroups.map((group, index) => (
          <RibbonGroup
            key={group.label}
            group={group}
            isLast={index === toolGroups.length - 1}
          />
        ))}
      </div>
    </header>
  );
}
