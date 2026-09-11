"use client";

import { ChevronLeft, ChevronRight, Download, FileInput, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { downloadBlob, safeFileBaseName } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { createEditorFormFields, type EditorFormFieldConfig, type EditorFormFieldType } from "@/lib/pdf-tools/editor-form-engine";
import { getEditorPageGeometry } from "@/lib/pdf-tools/editor-page-geometry";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

type FieldRegion = {
  readonly id: string;
  readonly pageNumber: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly config: EditorFormFieldConfig;
};

type Draft = { startX: number; startY: number; x: number; y: number; width: number; height: number };
const MAX_FORM_FIELDS = 200;

function download(bytes: Uint8Array, name: string) {
  downloadBlob(new Blob([bytes], { type: "application/pdf" }), name);
}

function defaultConfig(type: EditorFormFieldType, index: number): EditorFormFieldConfig {
  const name = `${type}_${String(index).padStart(3, "0")}`;
  if (type === "dropdown") return { type, name, options: ["Option 1", "Option 2"], defaultValue: "Option 1" };
  if (type === "radio") return { type, name: `choice_${String(index).padStart(3, "0")}`, optionValue: "Option 1" };
  if (type === "checkbox") return { type, name, checked: false };
  return { type, name, defaultValue: "", multiline: false };
}

function normalizeDraft(startX: number, startY: number, currentX: number, currentY: number): Draft {
  return {
    startX,
    startY,
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

export function PdfFormCreatorClient() {
  const { recordExport } = useEntitlement();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const renderTaskRef = useRef<{ cancel(): void } | null>(null);
  const pdfRef = useRef<import("pdfjs-dist").PDFDocumentProxy | null>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [fieldType, setFieldType] = useState<EditorFormFieldType>("text");
  const [fields, setFields] = useState<FieldRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a PDF, then drag fields onto each page.");
  const [previewSize, setPreviewSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setSelectedId(null);
    setDraft(null);
  }, [pageNumber]);

  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !canvasRef.current) return;
    let cancelled = false;
    void (async () => {
      const page = await pdf.getPage(pageNumber);
      if (cancelled) return;
      const viewport = page.getViewport({ scale: Math.min(1.35, 900 / page.getViewport({ scale: 1 }).width) });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      setPreviewSize({ width: canvas.width, height: canvas.height });
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) return;
      context.fillStyle = "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      renderTaskRef.current?.cancel();
      const task = page.render({ canvasContext: context, viewport });
      renderTaskRef.current = task;
      try { await task.promise; } catch (error) { if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) setStatus("Unable to render this page."); }
      page.cleanup();
    })();
    return () => { cancelled = true; renderTaskRef.current?.cancel(); };
  }, [pageNumber, file]);

  useEffect(() => () => { renderTaskRef.current?.cancel(); void pdfRef.current?.destroy(); }, []);

  async function selectFile(selected?: File) {
    if (!selected || busy) return;
    setBusy(true);
    setStatus("Opening PDF…");
    try {
      const bytes = await readValidatedPdfBytes(selected, 100);
      const pdfjs = await import("pdfjs-dist");
      configurePdfJsWorker(pdfjs);
      await pdfRef.current?.destroy();
      const pdf = await pdfjs.getDocument({ data: bytes.slice() }).promise;
      if (!pdf.numPages) throw new Error("This PDF contains no pages.");
      pdfRef.current = pdf;
      bytesRef.current = bytes;
      setFile(selected);
      setPageCount(pdf.numPages);
      setPageNumber(1);
      setFields([]);
      setSelectedId(null);
      setStatus("Drag on a page to create an interactive field.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to open this PDF.");
    } finally { setBusy(false); }
  }

  function pointerPoint(event: ReactPointerEvent<HTMLDivElement>) {
    const rect = stageRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function pointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy || fields.length >= MAX_FORM_FIELDS || !stageRef.current) return;
    if ((event.target as HTMLElement).closest("button[data-form-field]")) return;
    const point = pointerPoint(event);
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(null);
    setDraft(normalizeDraft(point.x, point.y, point.x, point.y));
  }

  function pointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draft) return;
    const point = pointerPoint(event);
    setDraft(normalizeDraft(draft.startX, draft.startY, point.x, point.y));
  }

  function pointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draft) return;
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    const index = fields.length + 1;
    const width = draft.width < 0.02 ? (fieldType === "checkbox" || fieldType === "radio" ? 0.04 : 0.28) : draft.width;
    const height = draft.height < 0.015 ? (fieldType === "checkbox" || fieldType === "radio" ? 0.04 : 0.06) : draft.height;
    const id = `field-${Date.now()}-${index}`;
    const next: FieldRegion = {
      id,
      pageNumber,
      x: Math.min(draft.x, 1 - width),
      y: Math.min(draft.y, 1 - height),
      width: Math.min(width, 1 - draft.x),
      height: Math.min(height, 1 - draft.y),
      config: defaultConfig(fieldType, index),
    };
    setFields((current) => [...current, next]);
    setSelectedId(id);
    setDraft(null);
    setStatus(`${fieldType} field added. Configure it in the inspector.`);
  }

  function updateSelected(patch: Partial<EditorFormFieldConfig>) {
    if (!selectedId) return;
    setFields((current) => current.map((field) => field.id === selectedId ? { ...field, config: { ...field.config, ...patch } as EditorFormFieldConfig } : field));
  }

  async function exportPdf() {
    const bytes = bytesRef.current;
    if (!file || !bytes || !fields.length || busy) return;
    setBusy(true);
    setStatus("Creating interactive AcroForm fields…");
    try {
      const prepared = await prepareEntitledExport({
        toolKey: "form-creator",
        recordExport,
        prepare: async () => {
          const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
          const objects = fields.map((field) => {
            const geometry = getEditorPageGeometry(pdf.getPage(field.pageNumber - 1));
            return {
              id: field.id,
              pageNumber: field.pageNumber,
              box: {
                x: field.x * geometry.viewportWidth,
                y: field.y * geometry.viewportHeight,
                width: field.width * geometry.viewportWidth,
                height: field.height * geometry.viewportHeight,
              },
              data: { formField: field.config },
            };
          });
          const created = await createEditorFormFields({ pdfDoc: pdf, objects, getGeometry: getEditorPageGeometry });
          const output = await pdf.save({ addDefaultPage: false });
          return { output, createdCount: created.createdCount };
        },
      });
      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }
      download(prepared.output.output, `PDFMantra-form-${safeFileBaseName(file.name)}.pdf`);
      setStatus(`${prepared.output.createdCount} interactive field${prepared.output.createdCount === 1 ? "" : "s"} created and downloaded.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create the form PDF.");
    } finally { setBusy(false); }
  }

  const selected = fields.find((field) => field.id === selectedId && field.pageNumber === pageNumber) ?? null;
  const pageFields = fields.filter((field) => field.pageNumber === pageNumber);

  return <><Header /><main className="min-h-screen bg-slate-50 text-slate-950"><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><FileInput size={22}/></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Interactive AcroForm authoring</p><h1 className="mt-1 text-3xl font-black">PDF Form Creator</h1><p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base">Create text fields, checkboxes, dropdowns, and radio groups directly in your PDF.</p></div></header><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event)=>{void selectFile(event.target.files?.[0]); event.currentTarget.value="";}}/>{!file?<button type="button" onClick={()=>inputRef.current?.click()} disabled={busy} className="flex min-h-[430px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white"><Upload size={36} className="text-violet-600"/><span className="mt-4 text-xl font-black">Choose a PDF to turn into a form</span><span className="mt-2 text-sm font-semibold text-slate-500">Local processing · up to 100 MB</span></button>:<div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_350px]"><section className="rounded-3xl border border-slate-200 bg-slate-200 p-3"><div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-3"><div className="flex items-center gap-2"><button type="button" onClick={()=>setPageNumber((value)=>Math.max(1,value-1))} disabled={pageNumber<=1||busy} className="rounded-xl border p-2"><ChevronLeft size={17}/></button><span className="text-sm font-black">Page {pageNumber} of {pageCount}</span><button type="button" onClick={()=>setPageNumber((value)=>Math.min(pageCount,value+1))} disabled={pageNumber>=pageCount||busy} className="rounded-xl border p-2"><ChevronRight size={17}/></button></div><div className="flex items-center gap-2"><select value={fieldType} onChange={(event)=>setFieldType(event.target.value as EditorFormFieldType)} className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-bold"><option value="text">Text field</option><option value="checkbox">Checkbox</option><option value="dropdown">Dropdown</option><option value="radio">Radio option</option></select><span className="hidden text-xs font-bold text-slate-500 sm:inline"><Plus size={13} className="inline"/> Drag to add</span></div></div><div ref={stageRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} className="relative mx-auto touch-none select-none overflow-hidden bg-white shadow-xl" style={{width:previewSize.width||undefined,aspectRatio:previewSize.width&&previewSize.height?`${previewSize.width}/${previewSize.height}`:undefined,cursor:"crosshair"}}><canvas ref={canvasRef} className="block h-auto max-w-full"/>{pageFields.map((field)=><button data-form-field key={field.id} type="button" onClick={(event)=>{event.stopPropagation();setSelectedId(field.id)}} className={`absolute flex items-center justify-center border-2 text-[10px] font-black ${selectedId===field.id?"border-violet-700 bg-transparent text-violet-950 shadow-[0_0_0_1px_rgba(109,40,217,0.18)]":"border-violet-400 bg-transparent text-violet-700"}`} style={{left:`${field.x*100}%`,top:`${field.y*100}%`,width:`${field.width*100}%`,height:`${field.height*100}%`}}>{field.config.type}</button>)}{draft?<span className="pointer-events-none absolute border-2 border-violet-700 bg-violet-500/20" style={{left:`${draft.x*100}%`,top:`${draft.y*100}%`,width:`${draft.width*100}%`,height:`${draft.height*100}%`}}/>:null}</div></section><aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div><h2 className="font-black">Field inspector</h2><p className="mt-1 text-xs font-semibold text-slate-500">{fields.length}/{MAX_FORM_FIELDS} fields</p></div><button type="button" onClick={()=>{setFile(null);setFields([]);setPreviewSize({width:0,height:0});void pdfRef.current?.destroy();pdfRef.current=null;bytesRef.current=null;}} className="rounded-xl border p-2" aria-label="Close PDF"><X size={16}/></button></div>{selected?<div className="mt-5 space-y-3"><label className="block text-xs font-black text-slate-600">Field type<select value={selected.config.type} onChange={(event)=>updateSelected({...defaultConfig(event.target.value as EditorFormFieldType, fields.indexOf(selected)+1),name:selected.config.name})} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"><option value="text">Text</option><option value="checkbox">Checkbox</option><option value="dropdown">Dropdown</option><option value="radio">Radio option</option></select></label><label className="block text-xs font-black text-slate-600">Field name<input value={selected.config.name} onChange={(event)=>updateSelected({name:event.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label>{selected.config.type==="dropdown"?<label className="block text-xs font-black text-slate-600">Options<input value={(selected.config.options??[]).join(", ")} onChange={(event)=>updateSelected({options:event.target.value.split(",").map((value)=>value.trim()).filter(Boolean)})} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label>:null}{selected.config.type==="radio"?<label className="block text-xs font-black text-slate-600">Option value<input value={selected.config.optionValue??""} onChange={(event)=>updateSelected({optionValue:event.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label>:null}{selected.config.type==="text"||selected.config.type==="dropdown"?<label className="block text-xs font-black text-slate-600">Default value<input value={selected.config.defaultValue??""} onChange={(event)=>updateSelected({defaultValue:event.target.value})} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label>:null}<div className="grid grid-cols-2 gap-2 text-xs font-bold"><label className="rounded-xl border p-3"><input type="checkbox" checked={Boolean(selected.config.required)} onChange={(event)=>updateSelected({required:event.target.checked})} className="mr-2"/>Required</label><label className="rounded-xl border p-3"><input type="checkbox" checked={Boolean(selected.config.readOnly)} onChange={(event)=>updateSelected({readOnly:event.target.checked})} className="mr-2"/>Read-only</label>{selected.config.type==="text"?<label className="rounded-xl border p-3"><input type="checkbox" checked={Boolean(selected.config.multiline)} onChange={(event)=>updateSelected({multiline:event.target.checked})} className="mr-2"/>Multiline</label>:null}{selected.config.type==="checkbox"?<label className="rounded-xl border p-3"><input type="checkbox" checked={Boolean(selected.config.checked)} onChange={(event)=>updateSelected({checked:event.target.checked})} className="mr-2"/>Checked</label>:null}</div><button type="button" onClick={()=>{setFields((current)=>current.filter((field)=>field.id!==selected.id));setSelectedId(null)}} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-black text-red-600"><Trash2 size={16}/>Delete field</button></div>:<div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-600">Drag on the current page or select an existing field to configure it.</div>}<div role="status" className="mt-5 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs font-bold leading-5 text-violet-800">{status}</div><button type="button" onClick={()=>void exportPdf()} disabled={!fields.length||busy} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 text-sm font-black text-white disabled:opacity-40">{busy?<Loader2 size={18} className="animate-spin"/>:<Download size={18}/>}Create form PDF</button></aside></div>}</section></main></>;
}
