"use client";

import { Copy, Download, FileImage, Highlighter, Image as ImageIcon, Layers, MousePointer2, PenLine, RotateCcw, Trash2 } from "lucide-react";
import type { ActiveTool } from "@/lib/editor/types";
import { EditorIconButton } from "./EditorIconButton";

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

export function EditorToolbar(props: EditorToolbarProps) {
  const { activeTool, hasSelectedLayer, onSelectTool, onImageClick, onSignatureClick, onSignatureImageClick, onDelete, onDuplicate, onClearPage, onReset, onExport } = props;
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-1">
        <EditorIconButton label="Edit" description="Hover text and click to edit visually." active={activeTool === "edit"} onClick={() => onSelectTool("edit")}><MousePointer2 size={17} /></EditorIconButton>
        <EditorIconButton label="Text" description="Drag on the page to draw a text box." active={activeTool === "text"} tone="indigo" onClick={() => onSelectTool("text")}><span className="text-base font-black">T</span></EditorIconButton>
        <EditorIconButton label="Highlight" description="Select PDF text to highlight like a marker." active={activeTool === "highlight"} tone="amber" onClick={() => onSelectTool("highlight")}><Highlighter size={17} /></EditorIconButton>
      </div>
      <div className="flex items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-1">
        <EditorIconButton label="Image" description="Insert an image." tone="sky" onClick={onImageClick}><ImageIcon size={17} /></EditorIconButton>
        <EditorIconButton label="Sign" description="Add typed signature." tone="violet" onClick={onSignatureClick}><PenLine size={17} /></EditorIconButton>
        <EditorIconButton label="Sign image" description="Upload signature image." tone="violet" onClick={onSignatureImageClick}><FileImage size={17} /></EditorIconButton>
      </div>
      <div className="flex items-center gap-2 rounded-3xl border border-slate-100 bg-slate-50 p-1">
        <EditorIconButton label="Duplicate" description="Duplicate selected layer." disabled={!hasSelectedLayer} onClick={onDuplicate}><Copy size={17} /></EditorIconButton>
        <EditorIconButton label="Delete" description="Delete selected layer." disabled={!hasSelectedLayer} tone="red" onClick={onDelete}><Trash2 size={17} /></EditorIconButton>
        <EditorIconButton label="Clear page" description="Clear current page." onClick={onClearPage}><Layers size={17} /></EditorIconButton>
        <EditorIconButton label="Reset" description="Clear all layers." onClick={onReset}><RotateCcw size={17} /></EditorIconButton>
      </div>
      <div className="ml-auto">
        <EditorIconButton label="Export" description="Download edited PDF." tone="emerald" onClick={onExport}><Download size={17} /></EditorIconButton>
      </div>
    </div>
  );
}
