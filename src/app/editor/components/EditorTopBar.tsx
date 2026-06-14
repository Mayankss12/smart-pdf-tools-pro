"use client";

import { Download, Minus, Plus, Share2 } from "lucide-react";
import type { EditorController } from "../hooks/useEditor";

export function EditorTopBar({
  editor,
  onOpenFile,
  onExport,
  onShare,
}: {
  editor: EditorController;
  onOpenFile: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onMenuAction?: (action: string) => void;
}) {
  return (
    <header className="flex h-[60px] items-center justify-between border-b border-slate-200 bg-white px-4">
      <div className="flex items-center gap-4">
        <div className="rounded-xl bg-violet-600 px-3 py-2 text-sm font-black text-white">PM</div>
        <button onClick={onOpenFile} className="text-sm font-bold text-slate-700">File</button>
        <button className="text-sm font-bold text-slate-700">Edit</button>
        <button className="text-sm font-bold text-slate-700">View</button>
        <button className="text-sm font-bold text-slate-700">Insert</button>
        <button className="text-sm font-bold text-slate-700">Help</button>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={editor.zoomOut} className="rounded-lg border p-2"><Minus size={14} /></button>
        <span className="w-14 text-center text-sm font-bold">{Math.round(editor.zoom * 100)}%</span>
        <button onClick={editor.zoomIn} className="rounded-lg border p-2"><Plus size={14} /></button>
        <button onClick={onExport} disabled={!editor.file} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><Download size={15} className="inline" /> Export</button>
        <button onClick={onShare} disabled={!editor.file} className="rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-40"><Share2 size={15} className="inline" /> Share</button>
      </div>
    </header>
  );
}