"use client";

import {
  ChevronDown,
  FileImage,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Move,
  PenLine,
  RotateCcw,
  Type,
  Wand2,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ActiveTool } from "@/lib/editor/types";

type EditorToolbarProps = {
  activeTool: ActiveTool;
  onSelectTool: (tool: ActiveTool) => void;
  onImageClick: () => void;
  onSignatureClick: () => void;
  onSignatureImageClick: () => void;
  onClearPage: () => void;
  onReset: () => void;
};

type ToolbarButtonProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

function ToolbarButton({
  label,
  icon: Icon,
  active = false,
  onClick,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition",
        active
          ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
      ].join(" ")}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function EditorToolbar({
  activeTool,
  onSelectTool,
  onImageClick,
  onSignatureClick,
  onSignatureImageClick,
  onClearPage,
  onReset,
}: EditorToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4">
      <ToolbarButton
        label="Select"
        icon={MousePointer2}
        active={activeTool === "select"}
        onClick={() => onSelectTool("select")}
      />

      <ToolbarButton
        label="Object"
        icon={Move}
        active={activeTool === "object"}
        onClick={() => onSelectTool("object")}
      />

      <ToolbarButton
        label="Edit Text"
        icon={Wand2}
        active={activeTool === "edit"}
        onClick={() => onSelectTool("edit")}
      />

      <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:block" />

      <ToolbarButton
        label="Text"
        icon={Type}
        active={activeTool === "text"}
        onClick={() => onSelectTool("text")}
      />

      <ToolbarButton
        label="Highlight"
        icon={Highlighter}
        active={activeTool === "highlight"}
        onClick={() => onSelectTool("highlight")}
      />

      <ToolbarButton label="Image" icon={ImagePlus} onClick={onImageClick} />

      <ToolbarButton label="Sign" icon={PenLine} onClick={onSignatureClick} />

      <div className="ml-auto">
        <details className="relative">
          <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
            More
            <ChevronDown size={15} />
          </summary>

          <div className="absolute right-0 top-12 z-50 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
            <button
              type="button"
              onClick={onSignatureImageClick}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <FileImage size={16} />
              Signature Image
            </button>

            <button
              type="button"
              onClick={onClearPage}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Layers size={16} />
              Clear Current Page
            </button>

            <button
              type="button"
              onClick={onReset}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              <RotateCcw size={16} />
              Reset All Edits
            </button>
          </div>
        </details>
      </div>
    </div>
  );
}
