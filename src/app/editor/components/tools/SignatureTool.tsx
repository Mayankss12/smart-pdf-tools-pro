"use client";

import { PenLine } from "lucide-react";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type SignatureToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function SignatureTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateBox,
  onDelete,
}: SignatureToolProps) {
  const imageDataUrl = object.data.imageDataUrl;

  const toolbarContent = (
    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700">
      <PenLine size={14} />
      Signature
    </span>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={72}
      minHeight={24}
      toolbarLabel="Signature"
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
          alt="PDF signature overlay"
          draggable={false}
          className="h-full w-full select-none object-contain"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-emerald-300 bg-emerald-50 text-[11px] font-black text-emerald-500">
          Signature
        </div>
      )}
    </EditorObjectFrame>
  );
}
