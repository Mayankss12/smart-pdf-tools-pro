"use client";

import { ImagePlus, Stamp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  EDITOR_STAMP_FORMATS,
  EDITOR_STAMP_PRESETS,
  buildStampLines,
  type EditorStampDefinition,
  type EditorStampFormat,
  type EditorStampPreset,
} from "@/lib/editor/editor-stamp";

type EditorStampComposerProps = {
  readonly open: boolean;
  readonly pageNumber: number;
  readonly onClose: () => void;
  readonly onUpload: () => void;
  readonly onCreate: (definition: EditorStampDefinition) => void;
};

const STAMP_COLORS = ["#166534", "#1d4ed8", "#7c3aed", "#b45309", "#b91c1c", "#111827"];

export function EditorStampComposer({
  open,
  pageNumber,
  onClose,
  onUpload,
  onCreate,
}: EditorStampComposerProps) {
  const firstFieldRef = useRef<HTMLSelectElement | null>(null);
  const [preset, setPreset] = useState<EditorStampPreset>("Approved");
  const [format, setFormat] = useState<EditorStampFormat>("rectangle");
  const [authorizedName, setAuthorizedName] = useState("");
  const [includeDate, setIncludeDate] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [color, setColor] = useState("#166534");

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => firstFieldRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  const definition: EditorStampDefinition = {
    preset,
    format,
    authorizedName,
    date: includeDate ? date : "",
    color,
  };
  const lines = buildStampLines(definition);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4" role="presentation" onMouseDown={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="stamp-composer-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Page {pageNumber}</p>
            <h2 id="stamp-composer-title" className="mt-1 text-xl font-black text-slate-950">Create a stamp</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">Generate an official stamp or upload your own transparent artwork.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 p-2 text-slate-500" aria-label="Close stamp creator"><X size={17} /></button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-xs font-black text-slate-600">Status
            <select ref={firstFieldRef} value={preset} onChange={(event) => setPreset(event.target.value as EditorStampPreset)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
              {EDITOR_STAMP_PRESETS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-xs font-black text-slate-600">Format
            <select value={format} onChange={(event) => setFormat(event.target.value as EditorStampFormat)} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm capitalize">
              {EDITOR_STAMP_FORMATS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        </div>

        <label className="mt-4 block text-xs font-black text-slate-600">Authorized name
          <input value={authorizedName} onChange={(event) => setAuthorizedName(event.target.value)} maxLength={80} placeholder="e.g. Mayank Singh" className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="text-xs font-black text-slate-600">Date
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} disabled={!includeDate} className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm disabled:bg-slate-100" />
          </label>
          <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600">
            <input type="checkbox" checked={includeDate} onChange={(event) => setIncludeDate(event.target.checked)} /> Include date
          </label>
        </div>

        <fieldset className="mt-4">
          <legend className="text-xs font-black text-slate-600">Ink color</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {STAMP_COLORS.map((value) => (
              <button key={value} type="button" onClick={() => setColor(value)} className={`h-9 w-9 rounded-full border-2 ${color === value ? "border-violet-500 ring-2 ring-violet-200" : "border-white"}`} style={{ backgroundColor: value }} aria-label={`Use ${value} stamp color`} aria-pressed={color === value} />
            ))}
          </div>
        </fieldset>

        <div className="mt-5 rounded-2xl bg-slate-50 p-4">
          <div className="mx-auto flex min-h-24 max-w-xs items-center justify-center">
            <div
              className={`flex items-center justify-center border-[3px] bg-transparent px-5 py-3 text-center font-black uppercase leading-tight ${format === "rectangle" ? "rounded-md" : format === "pill" ? "rounded-full" : "aspect-square w-36 rounded-full px-3"}`}
              style={{ borderColor: color, color }}
            >
              <span>{lines.map((line, index) => <span key={`${line}-${index}`} className={index === 0 ? "block text-base" : "mt-1 block text-[10px] normal-case"}>{line}</span>)}</span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={onUpload} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 text-sm font-black text-slate-700"><ImagePlus size={17} /> Upload artwork</button>
          <button type="button" onClick={() => onCreate(definition)} className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-700 text-sm font-black text-white"><Stamp size={17} /> Add stamp</button>
        </div>
      </section>
    </div>
  );
}
