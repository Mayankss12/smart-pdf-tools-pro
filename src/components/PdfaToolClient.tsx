"use client";

import { AlertTriangle, Archive, CheckCircle2, Download, FileCheck2, Loader2, RefreshCcw, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { downloadBlob, safeFileBaseName } from "@/lib/pdf-engine";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { inspectPdfaReadiness, preparePdfForArchival, type PdfaReport } from "@/lib/pdfa-engine";

export function PdfaToolClient() {
  const { recordExport } = useEntitlement();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const bytesRef = useRef<Uint8Array | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<PdfaReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose a PDF to run an archival-readiness preflight.");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [language, setLanguage] = useState("en-US");

  async function inspect(selected?: File) {
    if (!selected || busy) return;
    setBusy(true);
    setReport(null);
    setStatus("Inspecting PDF/A declarations and archival requirements…");
    try {
      const bytes = await readValidatedPdfBytes(selected, 100);
      const next = await inspectPdfaReadiness(bytes);
      bytesRef.current = bytes;
      setFile(selected);
      setReport(next);
      setStatus(next.appearsPdfa ? "No blocking marker was found. Certified validation is still required." : "The preflight found items that need archival conversion or correction.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to inspect this PDF.");
    } finally { setBusy(false); }
  }

  async function prepare() {
    if (!file || !bytesRef.current || busy) return;
    setBusy(true);
    setStatus("Removing active-content entries and normalizing archival metadata…");
    try {
      const prepared = await prepareEntitledExport({
        toolKey: "pdfa",
        recordExport,
        prepare: () => preparePdfForArchival(bytesRef.current!, { title, author, language }),
      });
      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }
      downloadBlob(new Blob([prepared.output], { type: "application/pdf" }), `PDFMantra-archive-prepared-${safeFileBaseName(file.name)}.pdf`);
      const next = await inspectPdfaReadiness(prepared.output);
      setReport(next);
      setStatus("Prepared PDF downloaded. It is not labelled or certified as PDF/A; validate it with an ISO-conformance validator before regulated archiving.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to prepare this PDF.");
    } finally { setBusy(false); }
  }

  function reset() {
    setFile(null); setReport(null); setBusy(false); setStatus("Choose a PDF to run an archival-readiness preflight.");
    bytesRef.current = null; if (inputRef.current) inputRef.current.value = "";
  }

  return <><Header/><main className="min-h-screen bg-slate-50 text-slate-950"><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Archive size={22}/></span><div><p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">Archival readiness</p><h1 className="mt-1 text-3xl font-black">PDF/A Preflight & Preparation</h1><p className="mt-2 text-sm font-semibold text-slate-600 sm:text-base">Check common PDF/A requirements and safely prepare metadata and active-content settings.</p></div></header><input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event)=>{void inspect(event.target.files?.[0]);event.currentTarget.value="";}}/>{!file?<button type="button" onClick={()=>inputRef.current?.click()} disabled={busy} className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white"><Upload size={36} className="text-violet-600"/><span className="mt-4 text-xl font-black">Choose a PDF to preflight</span><span className="mt-2 text-sm font-semibold text-slate-500">Local inspection · up to 100 MB</span></button>:<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black">Conformance checks</h2><p className="mt-1 text-sm font-semibold text-slate-500">{report?.declaredPart?`Declared PDF/A-${report.declaredPart}${report.declaredConformance?.toLowerCase()??""}`:"No complete PDF/A declaration"}</p></div><button type="button" onClick={reset} className="rounded-xl border p-2" aria-label="Close PDF"><RefreshCcw size={16}/></button></div><div className="mt-5 space-y-3">{report?.checks.map((check)=><div key={check.id} className={`flex gap-3 rounded-2xl border p-4 ${check.status==="pass"?"border-emerald-200 bg-emerald-50":check.status==="warning"?"border-amber-200 bg-amber-50":"border-red-200 bg-red-50"}`}>{check.status==="pass"?<CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700"/>:check.status==="warning"?<AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700"/>:<XCircle size={18} className="mt-0.5 shrink-0 text-red-700"/>}<div><p className="text-sm font-black">{check.label}</p><p className="mt-1 text-xs font-semibold leading-5 text-slate-700">{check.message}</p></div></div>)}</div><div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-semibold leading-6 text-slate-700"><FileCheck2 size={18} className="mb-2 text-violet-700"/><strong>Standards-honest result:</strong> this browser preflight detects common blockers but is not an ISO 19005 certification. Use veraPDF or an accredited archival workflow for final compliance evidence.</div></section><aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Prepare archival copy</h2><p className="mt-2 text-xs font-semibold leading-5 text-slate-500">Removes catalog JavaScript, launch actions, attachments, and portfolio entries; adds language and normalized document metadata. It does not falsely label the file as PDF/A.</p><label className="mt-4 block text-xs font-black text-slate-600">Title<input value={title} onChange={(event)=>setTitle(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label><label className="mt-3 block text-xs font-black text-slate-600">Author<input value={author} onChange={(event)=>setAuthor(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm"/></label><label className="mt-3 block text-xs font-black text-slate-600">Document language<input value={language} onChange={(event)=>setLanguage(event.target.value)} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" placeholder="en-US"/></label><div role="status" className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs font-bold leading-5 text-violet-800">{status}</div><button type="button" onClick={()=>void prepare()} disabled={busy} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 text-sm font-black text-white disabled:opacity-40">{busy?<Loader2 className="animate-spin" size={18}/>:<Download size={18}/>}Download prepared PDF</button></aside></div>}</section></main></>;
}
