"use client";

import { type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, EyeOff, Loader2, RotateCcw, Trash2, Upload, X } from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize, validatePdfFile } from "@/lib/pdf-engine";
import { loadRedactionPreview, permanentlyRedactPdf } from "@/lib/pdf-redaction-client";
import { stageOneOutputName, STAGE_ONE_MAX_FILE_SIZE_MB, type RedactionArea } from "@/lib/pdf-stage-one";

type Draft = { x: number; y: number; width: number; height: number };

export function PdfRedactToolClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);
  const [areas, setAreas] = useState<RedactionArea[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a PDF and draw permanent redaction areas.");
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const { recordExport } = useEntitlement();

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    setBusy(true);
    setStatus(`Rendering page ${pageNumber}…`);
    void loadRedactionPreview(bytes, pageNumber).then((result) => {
      if (cancelled) return;
      setPreview({ url: result.url, width: result.width, height: result.height });
      setPageCount(result.pageCount);
      setStatus("Drag over text or images to mark them for permanent removal.");
      setError(false);
    }).catch((reason) => {
      if (cancelled) return;
      setError(true);
      setStatus(reason instanceof Error ? reason.message : "Preview failed.");
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; };
  }, [bytes, pageNumber]);

  const currentAreas = useMemo(() => areas.filter((area) => area.pageNumber === pageNumber), [areas, pageNumber]);

  async function selectFile(selected?: File) {
    if (!selected) return;
    try {
      validatePdfFile(selected, { maxSizeMb: STAGE_ONE_MAX_FILE_SIZE_MB });
      const nextBytes = await readValidatedPdfBytes(selected, STAGE_ONE_MAX_FILE_SIZE_MB);
      setFile(selected); setBytes(nextBytes); setPageNumber(1); setAreas([]); setConfirmed(false); setError(false);
      setStatus(`${selected.name} loaded (${formatFileSize(selected.size)}).`);
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "Unable to load PDF."); }
  }

  function point(event: PointerEvent<HTMLDivElement>) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) { const value = point(event); if (!value || busy) return; event.currentTarget.setPointerCapture(event.pointerId); dragStartRef.current = value; setDraft({ ...value, width: 0, height: 0 }); }
  function pointerMove(event: PointerEvent<HTMLDivElement>) { const start = dragStartRef.current; const value = point(event); if (!start || !value) return; setDraft({ x: Math.min(start.x, value.x), y: Math.min(start.y, value.y), width: Math.abs(value.x - start.x), height: Math.abs(value.y - start.y) }); }
  function pointerUp(event: PointerEvent<HTMLDivElement>) { if (!dragStartRef.current || !draft) return; event.currentTarget.releasePointerCapture(event.pointerId); if (draft.width > 0.005 && draft.height > 0.005) setAreas((current) => [...current, { pageNumber, xRatio: draft.x, yRatio: draft.y, widthRatio: draft.width, heightRatio: draft.height }]); dragStartRef.current = null; setDraft(null); setConfirmed(false); }

  function reset() { setFile(null); setBytes(null); setPreview(null); setAreas([]); setPageCount(0); setPageNumber(1); setConfirmed(false); setBusy(false); setProgress(0); setError(false); setStatus("Choose a PDF and draw permanent redaction areas."); if (inputRef.current) inputRef.current.value = ""; }

  async function exportPdf() {
    if (!file || !bytes || !areas.length || !confirmed || busy) return;
    setBusy(true); setError(false); setProgress(5);
    try {
      const output = await permanentlyRedactPdf({ input: bytes, areas, onProgress: (value, message) => { setProgress(value); setStatus(message); } });
      const entitlement = await recordExport({ toolKey: "redact", exportKind: "clean" });
      if (!entitlement.allowed) throw new Error(entitlement.error || "Export limit reached.");
      downloadBlob(new Blob([output as BlobPart], { type: "application/pdf" }), stageOneOutputName("redacted", file.name));
      setProgress(100); setStatus("Redacted PDF flattened, verified, and downloaded.");
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "Redaction failed."); }
    finally { setBusy(false); }
  }

  return <><Header /><main className="min-h-screen bg-slate-50"><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><EyeOff size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Permanent visual redaction</p><h1 className="mt-1 text-3xl font-bold">Redact PDF</h1><p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">Draw areas to remove. Export rasterizes every page so covered source content is not retained.</p></div></header><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => void selectFile(event.target.files?.[0])} />{!file ? <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[430px] w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white"><Upload size={27} /></span><span className="mt-5 text-xl font-bold">Choose a PDF to redact</span><span className="mt-2 text-sm text-slate-500">PDF only · up to {STAGE_ONE_MAX_FILE_SIZE_MB} MB · processed locally</span></button> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><div className="rounded-3xl border border-slate-200 bg-slate-200 p-3 shadow-sm"><div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-white p-3"><button type="button" onClick={() => setPageNumber((value) => Math.max(1, value - 1))} disabled={busy || pageNumber <= 1} className="rounded-lg border p-2"><ChevronLeft size={17} /></button><span className="text-sm font-bold">Page {pageNumber} of {pageCount || "…"}</span><button type="button" onClick={() => setPageNumber((value) => Math.min(pageCount, value + 1))} disabled={busy || pageNumber >= pageCount} className="rounded-lg border p-2"><ChevronRight size={17} /></button></div>{preview ? <div ref={stageRef} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} className="relative mx-auto touch-none select-none overflow-hidden bg-white shadow" style={{ maxWidth: preview.width, aspectRatio: `${preview.width}/${preview.height}`, cursor: "crosshair" }}><img src={preview.url} alt={`PDF page ${pageNumber}`} draggable={false} className="h-full w-full" />{currentAreas.map((area, index) => <button key={`${area.xRatio}-${area.yRatio}-${index}`} type="button" aria-label={`Remove redaction area ${index + 1}`} onClick={(event) => { event.stopPropagation(); setAreas((current) => current.filter((candidate) => candidate !== area)); setConfirmed(false); }} className="absolute border-2 border-red-500 bg-black/90" style={{ left: `${area.xRatio * 100}%`, top: `${area.yRatio * 100}%`, width: `${area.widthRatio * 100}%`, height: `${area.heightRatio * 100}%` }} />)}{draft ? <span className="pointer-events-none absolute border-2 border-red-500 bg-black/70" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.width * 100}%`, height: `${draft.height * 100}%` }} /> : null}</div> : <div className="flex min-h-[500px] items-center justify-center"><Loader2 className="animate-spin text-violet-600" /></div>}</div><aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate font-bold">{file.name}</p><p className="mt-1 text-xs font-semibold text-slate-500">{areas.length} redaction area{areas.length === 1 ? "" : "s"}</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-lg border p-2"><X size={17} /></button></div><div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900"><div className="flex gap-2"><AlertTriangle size={17} className="shrink-0" /><p>Permanent export removes selectable text, forms, links, and digital signatures because each page is rebuilt as an image.</p></div></div><button type="button" onClick={() => setAreas([])} disabled={busy || !areas.length} className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-bold"><Trash2 size={16} />Clear all areas</button><label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-xs font-semibold leading-5"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} className="mt-1" /><span>I reviewed every area and understand the export is irreversible and fully flattened.</span></label><div className={`mt-4 rounded-xl border px-3 py-3 text-xs font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`} role={error ? "alert" : "status"}>{status}{busy ? <div className="mt-2 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-violet-600" style={{ width: `${progress}%` }} /></div> : null}</div><button type="button" onClick={() => void exportPdf()} disabled={busy || !areas.length || !confirmed} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}Redact & Download</button><button type="button" onClick={reset} disabled={busy} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-slate-600"><RotateCcw size={16} />Start over</button></aside></div>}</section></main></>;
}
