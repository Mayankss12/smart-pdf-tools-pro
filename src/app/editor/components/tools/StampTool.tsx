"use client";

import { Stamp as StampIcon } from "lucide-react";

import type {
  EditorObject,
  EditorObjectBox,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";
import { buildStampLines } from "@/lib/editor/editor-stamp";

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
  const format = object.data.stampFormat ?? "rectangle";
  const color = object.data.stampColor ?? "#166534";
  const lines = object.data.stampPreset
    ? buildStampLines({
        preset: object.data.stampPreset,
        format,
        authorizedName: object.data.stampAuthorizedName ?? "",
        date: object.data.stampDate ?? "",
        color,
      })
    : [object.data.stampLabel || "Stamp"];

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
          className="h-full w-full select-none object-contain"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center border-[3px] bg-transparent px-2 text-center font-black leading-tight ${
            format === "rectangle"
              ? "rounded-md"
              : "rounded-full"
          }`}
          style={{ borderColor: color, color }}
        >
          <span>
            {lines.map((line, index) => (
              <span
                key={`${line}-${index}`}
                className={index === 0 ? "block text-[11px] uppercase" : "mt-0.5 block text-[8px] normal-case"}
              >
                {line}
              </span>
            ))}
          </span>
        </div>
      )}
    </EditorObjectFrame>
  );
}
