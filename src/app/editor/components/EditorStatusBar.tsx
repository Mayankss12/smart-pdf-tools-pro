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
  const pageLabel = editor.totalPages
    ? `Page ${editor.activePageNumber} of ${editor.totalPages}`
    : "No document";
  const saveLabel = getSaveStatusLabel(editor.saveState, editor.unsavedChanges);
  const zoomLabel = `${Math.round(editor.zoom * 100)}%`;

  return (
    <footer className="grid h-8 shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-500">
      <span className="min-w-0 truncate" title={pageLabel}>
        {pageLabel}
      </span>
      <span className="min-w-0 truncate text-center" title={saveLabel}>
        {saveLabel}
      </span>
      <span className="shrink-0 justify-self-end tabular-nums" title={`Zoom ${zoomLabel}`}>
        {zoomLabel}
      </span>
    </footer>
  );
}
