"use client";

import { Link2, Unlink } from "lucide-react";
import { useEffect, useState } from "react";

import { normalizeEditorLinkUrl } from "@/lib/pdf-tools/editor-link-engine";

import type { EditorController, EditorObjectData } from "../hooks/useEditor";

type LinkableEditorData = EditorObjectData & {
  readonly linkUrl?: string;
};

function getLinkUrl(data: EditorObjectData) {
  return (data as LinkableEditorData).linkUrl ?? "";
}

function createLinkPatch(linkUrl: string | undefined) {
  return { linkUrl } as unknown as Partial<EditorObjectData>;
}

export function EditorLinkControls({ editor }: { readonly editor: EditorController }) {
  const object = editor.selectedObject;
  const objectId = editor.selectedObjectId;
  const storedLink = object ? getLinkUrl(object.data) : "";
  const [value, setValue] = useState(storedLink);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setValue(storedLink);
    setMessage("");
  }, [objectId, storedLink]);

  if (!object || !objectId) return null;

  function applyLink() {
    const normalized = normalizeEditorLinkUrl(value);

    if (!normalized) {
      setMessage("Enter a valid http, https, or mailto link.");
      return;
    }

    editor.updateObjectData(objectId, createLinkPatch(normalized));
    setValue(normalized);
    setMessage("Clickable link applied.");
  }

  function removeLink() {
    editor.updateObjectData(objectId, createLinkPatch(undefined));
    setValue("");
    setMessage("Link removed.");
  }

  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white px-1.5 py-1 ring-1 ring-slate-200">
      <Link2 size={13} className="ml-1 text-violet-600" aria-hidden="true" />
      <input
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setMessage("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
          }
        }}
        placeholder="https://example.com"
        className="h-7 w-48 rounded-lg border-0 bg-transparent px-1 text-[11px] font-semibold text-slate-700 outline-none placeholder:text-slate-300"
        aria-label="Clickable link URL for selected object"
        title={message || "Add a clickable URL to this object"}
      />
      <button
        type="button"
        onClick={applyLink}
        className="h-7 rounded-lg bg-violet-600 px-2 text-[10px] font-black text-white transition hover:bg-violet-700"
        title="Apply clickable link"
      >
        Apply
      </button>
      {storedLink ? (
        <button
          type="button"
          onClick={removeLink}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600"
          aria-label="Remove clickable link"
          title="Remove clickable link"
        >
          <Unlink size={13} />
        </button>
      ) : null}
      {message ? <span className="sr-only" aria-live="polite">{message}</span> : null}
    </div>
  );
}
