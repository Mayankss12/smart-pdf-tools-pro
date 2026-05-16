"use client";

import {
  Highlighter,
  ImagePlus,
  MousePointer2,
  Move,
  PenLine,
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
      </div>
    </div>
  );
}
