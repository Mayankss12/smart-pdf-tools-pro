"use client";

import type { EditorController, EditorObject } from "../hooks/useEditor";

type EditorLayerControlsProps = {
  readonly editor: EditorController;
};

function LayerButton({
  label,
  title,
  disabled,
  onClick,
}: {
  readonly label: string;
  readonly title: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {label}
    </button>
  );
}

function getObjectLabel(object: EditorObject) {
  if (object.type === "image" && object.data.note === "Copied area") {
    return "Copied area";
  }

  if (object.type === "image") return "Image / area";
  if (object.type === "signature") return "Signature";
  if (object.type === "text") return "Text";
  if (object.type === "highlight") return "Highlight";
  if (object.type === "whiteout") return "Whiteout";

  return "Object";
}

export function EditorLayerControls({ editor }: EditorLayerControlsProps) {
  const selectedObjectId = editor.selectedObjectId;
  const selectedObject = editor.selectedObject;

  if (!selectedObjectId || !selectedObject) {
    return null;
  }

  const locked = Boolean(selectedObject.locked);
  const opacity = Math.round((selectedObject.data.opacity ?? 1) * 100);
  const objectLabel = getObjectLabel(selectedObject);

  return (
    <div className="border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
        <span className="shrink-0 rounded-xl bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400 ring-1 ring-slate-200">
          {objectLabel}
        </span>

        <LayerButton
          label="Back"
          title="Send selected object to back"
          disabled={locked}
          onClick={() => editor.sendToBack(selectedObjectId)}
        />
        <LayerButton
          label="-1"
          title="Send selected object backward"
          disabled={locked}
          onClick={() => editor.sendBackward(selectedObjectId)}
        />
        <LayerButton
          label="+1"
          title="Bring selected object forward"
          disabled={locked}
          onClick={() => editor.bringForward(selectedObjectId)}
        />
        <LayerButton
          label="Front"
          title="Bring selected object to front"
          disabled={locked}
          onClick={() => editor.bringToFront(selectedObjectId)}
        />
        <LayerButton
          label={locked ? "Unlock" : "Lock"}
          title={locked ? "Unlock selected object" : "Lock selected object"}
          onClick={() => editor.toggleObjectLock(selectedObjectId)}
        />

        <div className="ml-1 flex h-8 shrink-0 items-center gap-2 rounded-xl bg-white px-2 ring-1 ring-slate-200">
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">
            Opacity
          </span>
          <input
            type="range"
            min={10}
            max={100}
            value={opacity}
            onChange={(event) => {
              editor.setObjectOpacity(selectedObjectId, Number(event.target.value) / 100);
            }}
            className="h-1 w-28 accent-violet-600"
            aria-label="Selected object opacity"
          />
          <span className="w-8 text-right text-[10px] font-black text-slate-500">
            {opacity}%
          </span>
        </div>

        {locked ? (
          <span className="ml-1 shrink-0 rounded-xl bg-slate-200 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-600">
            Position locked
          </span>
        ) : null}
      </div>
    </div>
  );
}
