"use client";

import { useCallback } from "react";
import {
  Copy,
  FileImage,
  Layers,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { CommandRibbon } from "@/components/editor/ribbon/CommandRibbon";
import { useEditorRibbonShortcuts } from "@/components/editor/ribbon/useEditorRibbonShortcuts";
import type {
  ActiveTool,
  EditorCommandId,
} from "@/lib/editor/types";

type EditorToolbarProps = {
  activeTool: ActiveTool;
  hasSelectedLayer: boolean;
  onSelectTool: (tool: ActiveTool) => void;
  onImageClick: () => void;
  onSignatureClick: () => void;
  onSignatureImageClick: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onClearPage: () => void;
  onReset: () => void;
  onExport: () => void;
};

type UtilityActionProps = {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  tone?: "default" | "danger";
  onClick: () => void;
};

function UtilityAction({
  label,
  icon: Icon,
  disabled = false,
  tone = "default",
  onClick,
}: UtilityActionProps) {
  const toneClasses = disabled
    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
    : tone === "danger"
      ? "border-rose-200 bg-white text-rose-700 hover:border-rose-300 hover:bg-rose-50"
      : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-semibold transition duration-200",
        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        disabled ? "" : "hover:-translate-y-0.5 hover:shadow-sm",
        toneClasses,
      ].join(" ")}
    >
      <Icon size={15} strokeWidth={2.2} />
      <span>{label}</span>
    </button>
  );
}

function getRibbonActiveCommand(activeTool: ActiveTool): EditorCommandId | null {
  switch (activeTool) {
    case "select":
    case "object":
    case "edit":
    case "text":
    case "highlight":
      return activeTool;

    default:
      return null;
  }
}

export function EditorToolbar({
  activeTool,
  hasSelectedLayer,
  onSelectTool,
  onImageClick,
  onSignatureClick,
  onSignatureImageClick,
  onDelete,
  onDuplicate,
  onClearPage,
  onReset,
  onExport,
}: EditorToolbarProps) {
  const activeCommandId = getRibbonActiveCommand(activeTool);

  const handleRibbonCommand = useCallback(
    (commandId: EditorCommandId) => {
      switch (commandId) {
        case "select":
        case "object":
        case "edit":
        case "text":
        case "highlight":
          onSelectTool(commandId);
          return;

        case "image":
          onImageClick();
          return;

        case "signature":
          onSignatureClick();
          return;

        case "export":
          onExport();
          return;

        default:
          return;
      }
    },
    [
      onExport,
      onImageClick,
      onSelectTool,
      onSignatureClick,
    ],
  );

  useEditorRibbonShortcuts({
    enabled: true,
    onCommand: handleRibbonCommand,
  });

  return (
    <div className="space-y-3">
      <CommandRibbon
        activeCommandId={activeCommandId}
        hasDocument
        canUndo={false}
        canRedo={false}
        onCommandActivate={handleRibbonCommand}
      />

      <div className="flex flex-col gap-3 rounded-[1.45rem] border border-slate-200/90 bg-white/90 p-3 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <UtilityAction
            label="Sign Image"
            icon={FileImage}
            onClick={onSignatureImageClick}
          />

          <UtilityAction
            label="Duplicate"
            icon={Copy}
            disabled={!hasSelectedLayer}
            onClick={onDuplicate}
          />

          <UtilityAction
            label="Delete"
            icon={Trash2}
            disabled={!hasSelectedLayer}
            tone="danger"
            onClick={onDelete}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <UtilityAction
            label="Clear Page"
            icon={Layers}
            onClick={onClearPage}
          />

          <UtilityAction
            label="Reset All"
            icon={RotateCcw}
            onClick={onReset}
          />
        </div>
      </div>
    </div>
  );
}
