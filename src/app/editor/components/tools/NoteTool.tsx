"use client";

import { StickyNote } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import type {
  EditorObject,
  EditorObjectBox,
  EditorObjectData,
} from "../../hooks/useEditor";
import { EditorObjectFrame } from "./EditorObjectFrame";

type NoteToolProps = {
  readonly object: EditorObject;
  readonly selected: boolean;
  readonly pageScale: number;
  readonly onSelect: (id: string) => void;
  readonly onUpdateData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly onUpdateBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly onDelete: (id: string) => void;
};

export function NoteTool({
  object,
  selected,
  pageScale,
  onSelect,
  onUpdateData,
  onUpdateBox,
  onDelete,
}: NoteToolProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [editing, setEditing] = useState(false);
  const text = object.data.text ?? "";
  const fontSize = object.data.fontSize ?? 14;
  const backgroundColor = object.data.backgroundColor ?? "#fef3c7";
  const textColor = object.data.color ?? "#78350f";

  useEffect(() => {
    if (!selected || object.locked) {
      setEditing(false);
    }
  }, [object.locked, selected]);

  function beginEditing() {
    if (object.locked) return;

    onSelect(object.id);
    setEditing(true);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.blur();
    }
  }

  const toolbarContent = (
    <>
      <span className="flex shrink-0 items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700">
        <StickyNote size={14} />
        Note
      </span>

      <span className="h-5 w-px shrink-0 bg-slate-200" />

      <span className="shrink-0 rounded-xl bg-white px-2.5 py-1 text-[11px] font-black text-slate-500 ring-1 ring-slate-200">
        Double-click to edit
      </span>
    </>
  );

  return (
    <EditorObjectFrame
      object={object}
      selected={selected}
      pageScale={pageScale}
      minWidth={96}
      minHeight={72}
      toolbarLabel="Note"
      toolbarContent={toolbarContent}
      onSelect={onSelect}
      onUpdateBox={onUpdateBox}
      onDelete={onDelete}
    >
      <div
        className="relative h-full w-full overflow-hidden rounded-sm border border-amber-300 shadow-[0_8px_18px_rgba(120,53,15,0.14)]"
        style={{ backgroundColor }}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-amber-400/70" />
        <textarea
          ref={textareaRef}
          value={text}
          readOnly={!editing}
          tabIndex={editing ? 0 : -1}
          onChange={(event) => {
            onUpdateData(object.id, { text: event.target.value });
          }}
          onBlur={() => setEditing(false)}
          onKeyDown={handleKeyDown}
          onPointerDown={(event) => {
            if (editing) {
              event.stopPropagation();
              onSelect(object.id);
            }
          }}
          onDoubleClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            beginEditing();
          }}
          className={[
            "block h-full w-full resize-none overflow-auto border-0 bg-transparent outline-none",
            editing ? "cursor-text select-text" : "cursor-move select-none",
          ].join(" ")}
          style={{
            color: textColor,
            fontSize: fontSize * pageScale,
            lineHeight: 1.3,
            padding: `${10 * pageScale}px`,
            paddingTop: `${12 * pageScale}px`,
          }}
          spellCheck
          aria-label="Edit PDF note"
        />
      </div>
    </EditorObjectFrame>
  );
}
