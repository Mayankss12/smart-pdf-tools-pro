"use client";

import { Stamp as StampIcon } from "lucide-react";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type StampToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function StampTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateBox,
  onDelete,
}: StampToolProps) {
  const imageDataUrl = object.data.imageDataUrl;

  const toolbarContent = (
    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
      <StampIcon size={14} />
      Stamp
    </span>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={48}
      minHeight={32}
      toolbarLabel="Stamp"
      toolbarContent={toolbarContent}
      preserveAspectRatioOnCornerResize
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      {imageDataUrl ? (
        <img
          src={imageDataUrl}
          alt="PDF stamp overlay"
          draggable={false}
          className="h-full w-full select-none object-fill"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-amber-300 bg-amber-50 text-[11px] font-black text-amber-500">
          Stamp
        </div>
      )}
    </EditorObjectFrame>
  );
}
