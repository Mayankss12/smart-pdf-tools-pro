"use client";

import type { EditorController } from "../hooks/useEditor";

export function EditorStatusBar({ editor }: { editor: EditorController }) {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500">
      <span>{editor.totalPages ? `Page ${editor.activePageNumber} of ${editor.totalPages}` : "No document"}</span>
      <span>All saved</span>
      <span>{Math.round(editor.zoom * 100)}%</span>
    </footer>
  );
}