"use client";

import type { EditorController } from "../hooks/useEditor";

function getSaveStatusLabel(saveState: string, unsavedChanges: number): string {
  if (saveState === "saving") {
    return "Saving...";
  }
  if (saveState === "unsaved") {
    return unsavedChanges === 1 ? "1 unsaved change" : `${unsavedChanges} unsaved changes`;
  }
  return "All saved";
}

export function EditorStatusBar({ editor }: { editor: EditorController }) {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500">
      <span>{editor.totalPages ? `Page ${editor.activePageNumber} of ${editor.totalPages}` : "No document"}</span>
      <span>{getSaveStatusLabel(editor.saveState, editor.unsavedChanges)}</span>
      <span>{Math.round(editor.zoom * 100)}%</span>
    </footer>
  );
}