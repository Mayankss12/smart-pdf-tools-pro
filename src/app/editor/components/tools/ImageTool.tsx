"use client";

import { Image as ImageIcon } from "lucide-react";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type ImageToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function ImageTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateBox,
  onDelete,
}: ImageToolProps) {
  const imageDataUrl = object.data.imageDataUrl;

  const toolbarContent = (
    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-sky-50 px-2.5 py-1 text-xs font-black text-sky-700">
      <ImageIcon size={14} />
      Image
    </span>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={48}
      minHeight={32}
      toolbarLabel="Image"
      toolbarContent={toolbarContent}
      directDrag
      preserveAspectRatioOnCornerResize
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt="PDF image overlay"
          draggable={false}
          className="h-full w-full select-none object-fill"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-slate-300 bg-slate-50 text-[11px] font-black text-slate-400">
          Image
        </div>
      )}
    </EditorObjectFrame>
  );
}
