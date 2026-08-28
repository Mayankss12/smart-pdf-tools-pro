"use client";

/* Comparison previews are generated data URLs; Next Image optimization does not apply. */
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight, Download, FileDiff, Loader2, RefreshCcw, StopCircle, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { downloadBlob } from "@/lib/pdf-engine";
import { comparePdfFiles, serializePdfComparison, type PdfComparisonResult } from "@/lib/pdf-compare-engine";

type Slot = "original" | "revised";

export function PdfCompareToolClient() {
  const { recordExport } = useEntitlement();
  const originalRef = useRef<HTMLInputElement | null>(null);
  const revisedRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [revised, setRevised] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState<"strict" | "balanced" | "relaxed">("balanced");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Choose an original PDF and a revised PDF.");
  const [result, setResult] = useState<PdfComparisonResult | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [view, setView] = useState<"difference" | "side-by-side">("difference");
  useEffect(() => () => abortRef.current?.abort(), []);

  function select(slot: Slot, file?: File) {
    if (!file || busy) return;
    if (slot === "original") setOriginal(file); else setRevised(file);
    setResult(null); setActivePage(1); setStatus(`${file.name} selected. Choose the other PDF or start comparison.`);
  }

  async function run() {
    if (!original || !revised || busy) return;
    const controller = new AbortController(); abortRef.current = controller; setBusy(true); setResult(null); setProgress(0);
    try {
      const prepared = await prepareEntitledExport({
        toolKey: "compare",
        recordExport,
        prepare: () => comparePdfFiles(original, revised, { sensitivity, signal: controller.signal, onProgress(completed,total,message){setProgress(Math.round(completed/Math.max(1,total)*100));setStatus(message);} }),
      });
      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }
      const next = prepared.output;
      setResult(next); setProgress(100); setActivePage(next.pages.find((page)=>page.status!=="same")?.pageNumber??1);
      setStatus(next.changedPages?`${next.changedPages} changed page${next.changedPages===1?"":"s"} detected.`:"No material visual or text difference was detected at this sensitivity.");
    } catch (error) {
      setStatus(controller.signal.aborted?"Comparison cancelled.":error instanceof Error?error.message:"Unable to compare these PDFs.");
    } finally { if (abortRef.current===controller) abortRef.current=null; setBusy(false); }
  }

  function reset(){abortRef.current?.abort();setOriginal(null);setRevised(null);setResult(null);setProgress(0);setActivePage(1);setStatus("Choose an original PDF and a revised PDF.");}
  const page = result?.pages.find((item)=>item.pageNumber===activePage)??null;

  function exportReport(){if(!result)return;downloadBlob(new Blob([serializePdfComparison(result)],{type:"application/json"}),`PDFMantra-comparison-${Date.now()}.json`);}

  return <><Header/><main className="min-h-screen bg-slate-50 text-slate-950"><section className="mx-auto max-w-7xl px-4 py-8 sm:px-6"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><FileDiff size={22}/></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Visual and text analysis</p><h1 className="mt-1 text-3xl font-black">Compare PDFs</h1><p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base">Find changed pages, pixel differences, and added or removed text locally.</p></div></header><input ref={originalRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event)=>{select("original",event.target.files?.[0]);event.currentTarget.value="";}}/><input ref={revisedRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event)=>{select("revised",event.target.files?.[0]);event.currentTarget.value="";}}/><div className="grid gap-4 md:grid-cols-2">{(["original","revised"] as const).map((slot)=>{const file=slot==="original"?original:revised;const ref=slot==="original"?originalRef:revisedRef;return <button key={slot} type="button" onClick={()=>ref.current?.click()} disabled={busy} className="flex min-h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white p-5"><Upload size={25} className="text-violet-600"/><span className="mt-3 text-sm font-black uppercase tracking-[0.12em] text-violet-700">{slot} PDF</span><span className="mt-2 max-w-full truncate text-base font-black">{file?.name??"Choose file"}</span></button>})}</div><div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><label className="text-xs font-black text-slate-600">Sensitivity<select value={sensitivity} onChange={(event)=>setSensitivity(event.target.value as typeof sensitivity)} disabled={busy} className="ml-3 h-10 rounded-xl border px-3 text-sm"><option value="strict">Strict</option><option value="balanced">Balanced</option><option value="relaxed">Relaxed</option></select></label><div className="flex gap-2">{busy?<button type="button" onClick={()=>abortRef.current?.abort()} className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-black text-red-600"><StopCircle size={16}/>Cancel</button>:<button type="button" onClick={()=>void run()} disabled={!original||!revised} className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white disabled:opacity-40"><FileDiff size={16}/>Compare PDFs</button>}<button type="button" onClick={reset} disabled={busy} className="inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-black"><RefreshCcw size={16}/>Reset</button></div></div><div role="status" className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-bold text-violet-800">{busy?<Loader2 size={17} className="mr-2 inline animate-spin"/>:null}{status}{busy?<div className="mt-3 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-violet-600" style={{width:`${progress}%`}}/></div>:null}</div>{result&&page?<div className="mt-5 grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]"><aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="font-black">Comparison summary</h2><div className="mt-4 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{result.changedPages}</p><p className="text-[10px] font-black uppercase text-slate-500">Changed</p></div><div className="rounded-xl bg-slate-50 p-3"><p className="text-xl font-black">{result.pages.length}</p><p className="text-[10px] font-black uppercase text-slate-500">Compared</p></div></div><button type="button" onClick={exportReport} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border text-sm font-black"><Download size={15}/>JSON report</button><div className="mt-4 max-h-[520px] space-y-2 overflow-auto">{result.pages.map((item)=><button key={item.pageNumber} type="button" onClick={()=>setActivePage(item.pageNumber)} className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-black ${activePage===item.pageNumber?"border-violet-400 bg-violet-50":"border-slate-200"}`}><span>Page {item.pageNumber}</span><span className={item.status==="same"?"text-emerald-600":"text-red-600"}>{item.status}</span></button>)}</div></aside><section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><button onClick={()=>setActivePage((value)=>Math.max(1,value-1))} disabled={activePage<=1} className="rounded-xl border p-2"><ChevronLeft size={16}/></button><span className="text-sm font-black">Page {activePage}</span><button onClick={()=>setActivePage((value)=>Math.min(result.pages.length,value+1))} disabled={activePage>=result.pages.length} className="rounded-xl border p-2"><ChevronRight size={16}/></button></div><div className="flex rounded-xl bg-slate-100 p-1"><button onClick={()=>setView("difference")} className={`rounded-lg px-3 py-2 text-xs font-black ${view==="difference"?"bg-white shadow":""}`}>Difference</button><button onClick={()=>setView("side-by-side")} className={`rounded-lg px-3 py-2 text-xs font-black ${view==="side-by-side"?"bg-white shadow":""}`}>Side by side</button></div></div><div className={`mt-4 gap-3 ${view==="side-by-side"?"grid md:grid-cols-2":"block"}`}>{view==="difference"?<img src={page.differencePreview??page.revisedPreview??page.originalPreview??""} alt={`Difference view for page ${activePage}`} className="mx-auto max-h-[720px] max-w-full border bg-white"/>:<>{page.originalPreview?<img src={page.originalPreview} alt={`Original page ${activePage}`} className="w-full border"/>:<div className="rounded-xl bg-slate-100 p-8 text-center font-bold">Page absent</div>}{page.revisedPreview?<img src={page.revisedPreview} alt={`Revised page ${activePage}`} className="w-full border"/>:<div className="rounded-xl bg-slate-100 p-8 text-center font-bold">Page absent</div>}</>}</div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><p className="text-lg font-black">{page.visualDifferencePercent}%</p><p className="text-xs font-bold text-slate-500">Visual pixels changed</p></div><div className="rounded-xl bg-emerald-50 p-3"><p className="text-lg font-black text-emerald-700">+{page.textDifference.added.length}</p><p className="text-xs font-bold text-emerald-700">Added token sample</p></div><div className="rounded-xl bg-red-50 p-3"><p className="text-lg font-black text-red-700">-{page.textDifference.removed.length}</p><p className="text-xs font-bold text-red-700">Removed token sample</p></div></div>{page.textDifference.added.length||page.textDifference.removed.length?<div className="mt-3 rounded-xl border p-3 text-xs font-semibold leading-5"><p><strong>Added:</strong> {page.textDifference.added.slice(0,24).join(" · ")||"None"}</p><p className="mt-2"><strong>Removed:</strong> {page.textDifference.removed.slice(0,24).join(" · ")||"None"}</p></div>:null}</section></div>:null}</section></main></>;
}
