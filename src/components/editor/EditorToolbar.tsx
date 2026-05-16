"use client";

import {
  ChevronDown,
  FileImage,
  Highlighter,
  ImagePlus,
  Layers,
  MousePointer2,
  Move,
  PenLine,
  RotateCcw,
  Type,
  Wand2,
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
        "inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition",
        active
          ? "border-[#3157d5] bg-[#3157d5] text-white shadow-sm"
          : "border-transparent bg-transparent text-slate-700 hover:border-[#d3deee] hover:bg-white hover:text-slate-950",
      ].join(" ")}
    >
      <Icon size={16} strokeWidth={2.15} />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 hidden h-7 w-px bg-[#cfd9e7] sm:block" />;
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
    <div className="border-b border-[#cfd9e7] bg-[#eaf0f7] px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-1.5">
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

        <ToolbarDivider />

        <ToolbarButton
          label="Edit Text"
          icon={Wand2}
          active={activeTool === "edit"}
          onClick={() => onSelectTool("edit")}
        />

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

        <ToolbarDivider />

        <ToolbarButton
          label="Image"
          icon={ImagePlus}
          onClick={onImageClick}
        />

        <ToolbarButton
          label="Sign"
          icon={PenLine}
          onClick={onSignatureClick}
        />

        <div className="ml-auto">
          <details className="relative">
            <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-lg border border-transparent px-3 text-sm font-medium text-slate-700 transition hover:border-[#d3deee] hover:bg-white hover:text-slate-950">
              More
              <ChevronDown size={15} />
            </summary>

            <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-[#d3deee] bg-white p-2 shadow-[0_22px_70px_rgba(15,23,42,0.18)]">
              <button
                type="button"
                onClick={onSignatureImageClick}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <FileImage size={16} />
                Signature Image
              </button>

              <button
                type="button"
                onClick={onClearPage}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Layers size={16} />
                Clear Current Page
              </button>

              <button
                type="button"
                onClick={onReset}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
              >
                <RotateCcw size={16} />
                Reset All Edits
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
