"use client";

import { Eraser } from "lucide-react";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type WhiteoutToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function WhiteoutTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateBox,
  onDelete,
}: WhiteoutToolProps) {
  const toolbarContent = (
    <>
      <span className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
        <Eraser size={14} />
        Whiteout
      </span>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <span className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
        Covers PDF content with white overlay
      </span>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={50}
      minHeight={22}
      toolbarLabel="Whiteout"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <div className="h-full w-full rounded-sm bg-white" />
    </EditorObjectFrame>
  );
}
