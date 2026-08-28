"use client";

import { useRef, useState } from "react";
import { BookOpen, Download, FileSearch, Loader2, Package, Scissors, Upload, X } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { createZipBlob } from "@/lib/browser-zip";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize, safeFileBaseName, validatePdfFile } from "@/lib/pdf-engine";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import { splitPdfAtPages, splitPdfByApproximateSize, STAGE_ONE_MAX_FILE_SIZE_MB } from "@/lib/pdf-stage-one";

type Mode = "size" | "bookmark" | "text";
configurePdfJsWorker(pdfjsLib);

async function bookmarkStartPages(bytes: Uint8Array) {
  const task = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await task.promise;
  try {
    const outline = await pdf.getOutline();
    if (!outline?.length) throw new Error("This PDF has no top-level bookmarks.");
    const starts: number[] = [];
    for (const item of outline) {
      const destination = typeof item.dest === "string" ? await pdf.getDestination(item.dest) : item.dest;
      if (!destination?.[0]) continue;
      const pageIndex = await pdf.getPageIndex(destination[0]);
      starts.push(pageIndex + 1);
    }
    if (!starts.length) throw new Error("No bookmark page destinations could be resolved.");
    return starts;
  } finally { await task.destroy(); }
}

async function textStartPages(bytes: Uint8Array, query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (needle.length < 2) throw new Error("Enter at least two characters to match.");
  const task = pdfjsLib.getDocument({ data: bytes.slice() });
  const pdf = await task.promise;
  try {
    const starts: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").toLocaleLowerCase();
      if (text.includes(needle)) starts.push(pageNumber);
      page.cleanup();
    }
    if (!starts.length) throw new Error("No selectable page text matched. Scanned PDFs need OCR first.");
    return starts;
  } finally { await task.destroy(); }
}

export function AdvancedSplitToolClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<Mode>("size");
  const [targetMb, setTargetMb] = useState(5);
  const [query, setQuery] = useState("Chapter");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a PDF to build an advanced split plan.");
  const [error, setError] = useState(false);
  const { recordExport } = useEntitlement();

  async function selectFile(selected?: File) {
    if (!selected) return;
    try { validatePdfFile(selected, { maxSizeMb: STAGE_ONE_MAX_FILE_SIZE_MB }); setFile(selected); setStatus(`${selected.name} is ready (${formatFileSize(selected.size)}).`); setError(false); }
    catch (reason) { setFile(null); setError(true); setStatus(reason instanceof Error ? reason.message : "Invalid PDF."); }
  }
  async function run() {
    if (!file || busy) return;
    setBusy(true); setError(false);
    try {
      const bytes = await readValidatedPdfBytes(file, STAGE_ONE_MAX_FILE_SIZE_MB);
      let outputs: Uint8Array[];
      if (mode === "size") { setStatus("Grouping pages by approximate output size…"); outputs = await splitPdfByApproximateSize(bytes, targetMb * 1024 * 1024); }
      else { setStatus(mode === "bookmark" ? "Resolving bookmark destinations…" : "Searching selectable page text…"); const starts = mode === "bookmark" ? await bookmarkStartPages(bytes) : await textStartPages(bytes, query); outputs = await splitPdfAtPages(bytes, starts); }
      const entitlement = await recordExport({ toolKey: "advanced-split", exportKind: "clean" });
      if (!entitlement.allowed) throw new Error(entitlement.error || "Export limit reached.");
      const base = safeFileBaseName(file.name);
      if (outputs.length === 1) downloadBlob(new Blob([outputs[0] as BlobPart], { type: "application/pdf" }), `${base}-part-1.pdf`);
      else {
        const zip = await createZipBlob(outputs.map((output, index) => ({ fileName: `${base}-part-${index + 1}.pdf`, blob: new Blob([output as BlobPart], { type: "application/pdf" }) })));
        downloadBlob(zip, `${base}-advanced-split.zip`);
      }
      setStatus(`${outputs.length} split file${outputs.length === 1 ? "" : "s"} created and downloaded.`);
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "Advanced split failed."); }
    finally { setBusy(false); }
  }
  function reset() { setFile(null); setBusy(false); setError(false); setStatus("Choose a PDF to build an advanced split plan."); if (inputRef.current) inputRef.current.value = ""; }

  return <><Header /><main className="min-h-screen bg-slate-50"><section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Scissors size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Advanced document splitting</p><h1 className="mt-1 text-3xl font-bold">Advanced Split PDF</h1><p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">Split large PDFs by approximate size, top-level bookmarks, or matching page text.</p></div></header><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => void selectFile(event.target.files?.[0])} />{!file ? <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[390px] w-full flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white"><Upload size={27} /></span><span className="mt-5 text-xl font-bold">Choose a PDF</span></button> : <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between rounded-2xl bg-slate-50 p-4"><div className="min-w-0"><p className="truncate font-bold">{file.name}</p><p className="mt-1 text-sm text-slate-500">{formatFileSize(file.size)}</p></div><button type="button" onClick={reset} disabled={busy} className="rounded-xl border bg-white p-2"><X size={17} /></button></div><div className="mt-6 grid gap-3 sm:grid-cols-3">{([{ id: "size", label: "By file size", icon: Package }, { id: "bookmark", label: "By bookmarks", icon: BookOpen }, { id: "text", label: "By page text", icon: FileSearch }] as const).map((item) => <button key={item.id} type="button" onClick={() => setMode(item.id)} disabled={busy} className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${mode === item.id ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`}><item.icon size={17} />{item.label}</button>)}</div>{mode === "size" ? <label className="mt-5 block text-sm font-bold text-slate-700">Approximate maximum per file (MB)<input type="number" min={0.1} max={100} step={0.1} value={targetMb} onChange={(event) => setTargetMb(Number(event.target.value))} className="mt-2 h-11 w-full rounded-xl border px-3" /></label> : null}{mode === "text" ? <label className="mt-5 block text-sm font-bold text-slate-700">Start a new part on pages containing<input value={query} onChange={(event) => setQuery(event.target.value)} className="mt-2 h-11 w-full rounded-xl border px-3" /></label> : null}{mode === "bookmark" ? <p className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold text-violet-900">Each top-level bookmark begins a new output document. Nested bookmarks stay within their parent part.</p> : null}<div className={`mt-5 rounded-xl border p-3 text-sm font-semibold ${error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`} role={error ? "alert" : "status"}>{busy ? <Loader2 size={17} className="mr-2 inline animate-spin" /> : null}{status}</div><button type="button" onClick={() => void run()} disabled={busy} className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}Split & Download</button></div>}</section></main></>;
}
