"use client";

import { useRef, useState } from "react";
import { Download, Files, GitMerge, Loader2, Trash2, Upload } from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { createZipBlob } from "@/lib/browser-zip";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize, safeFileBaseName, validatePdfFile } from "@/lib/pdf-engine";
import { addBatesNumbers, STAGE_ONE_BATCH_MAX_FILES, STAGE_ONE_BATCH_MAX_TOTAL_MB, STAGE_ONE_MAX_FILE_SIZE_MB, updatePdfMetadata } from "@/lib/pdf-stage-one";
import { runPdfStructuralWorker } from "@/lib/pdf-structural-client";

type Operation = "repair" | "flatten" | "remove-metadata" | "bates";
const OPERATIONS: Array<{ id: Operation; label: string; detail: string }> = [
  { id: "repair", label: "Repair", detail: "Rebuild recoverable structure" },
  { id: "remove-metadata", label: "Remove metadata", detail: "Clear document properties" },
  { id: "flatten", label: "Flatten", detail: "Freeze fields and annotations" },
  { id: "bates", label: "Bates number", detail: "Apply PDFM-000001 sequence" },
];

async function applyOperation(bytes: Uint8Array, operation: Operation, sequenceOffset = 0) {
  if (operation === "repair" || operation === "flatten") {
    return (await runPdfStructuralWorker({ operation, input: bytes.slice().buffer })).output;
  }
  if (operation === "remove-metadata") return updatePdfMetadata(bytes, { clearAll: true });
  return addBatesNumbers(bytes, { prefix: "PDFM-", suffix: "", startNumber: sequenceOffset + 1, digits: 6, position: "bottom-right", fontSize: 10, margin: 24 });
}

export function BatchWorkflowToolClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"batch" | "workflow">("batch");
  const [files, setFiles] = useState<File[]>([]);
  const [batchOperation, setBatchOperation] = useState<Operation>("repair");
  const [workflow, setWorkflow] = useState<Operation[]>(["repair", "remove-metadata", "flatten"]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Choose PDF files and configure processing.");
  const [error, setError] = useState(false);
  const { recordExport } = useEntitlement();

  function selectFiles(list: FileList | null) {
    if (!list || busy) return;
    try {
      const selected = Array.from(list).slice(0, STAGE_ONE_BATCH_MAX_FILES);
      if (!selected.length) return;
      selected.forEach((file) => validatePdfFile(file, { maxSizeMb: STAGE_ONE_MAX_FILE_SIZE_MB }));
      const total = selected.reduce((sum, file) => sum + file.size, 0);
      if (total > STAGE_ONE_BATCH_MAX_TOTAL_MB * 1024 * 1024) throw new Error(`Batch total exceeds ${STAGE_ONE_BATCH_MAX_TOTAL_MB} MB.`);
      setFiles(tab === "workflow" ? selected.slice(0, 1) : selected);
      setStatus(`${tab === "workflow" ? 1 : selected.length} PDF file${selected.length === 1 ? "" : "s"} ready.`);
      setError(false);
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "Unable to add these files."); }
  }

  function toggleWorkflow(operation: Operation) {
    setWorkflow((current) => current.includes(operation) ? current.filter((item) => item !== operation) : OPERATIONS.map((item) => item.id).filter((item) => [...current, operation].includes(item)));
  }

  async function process() {
    if (!files.length || busy) return;
    if (tab === "workflow" && !workflow.length) { setError(true); setStatus("Select at least one workflow step."); return; }
    setBusy(true); setError(false); setProgress(2);
    try {
      const entitlement = await recordExport({ toolKey: tab === "batch" ? "batch-processing" : "workflow-chaining", exportKind: "clean" });
      if (!entitlement.allowed) throw new Error(entitlement.error || "Your current plan does not include this operation.");
      const outputs: Array<{ name: string; data: Uint8Array }> = [];
      for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
        const file = files[fileIndex];
        let bytes = await readValidatedPdfBytes(file, STAGE_ONE_MAX_FILE_SIZE_MB);
        const steps = tab === "batch" ? [batchOperation] : workflow;
        for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
          setStatus(`${file.name}: ${OPERATIONS.find((item) => item.id === steps[stepIndex])?.label ?? steps[stepIndex]}…`);
          bytes = await applyOperation(bytes, steps[stepIndex]);
          const complete = fileIndex * steps.length + stepIndex + 1;
          setProgress(Math.round(complete / (files.length * steps.length) * 92));
        }
        outputs.push({ name: `${safeFileBaseName(file.name)}-${tab === "batch" ? batchOperation : "workflow"}.pdf`, data: bytes });
      }
      if (outputs.length === 1) downloadBlob(new Blob([outputs[0].data as BlobPart], { type: "application/pdf" }), outputs[0].name);
      else downloadBlob(await createZipBlob(outputs.map((output) => ({ fileName: output.name, blob: new Blob([output.data as BlobPart], { type: "application/pdf" }) }))), `pdfmantra-${batchOperation}-batch.zip`);
      setProgress(100); setStatus(`${outputs.length} processed file${outputs.length === 1 ? "" : "s"} downloaded.`);
    } catch (reason) { setError(true); setStatus(reason instanceof Error ? reason.message : "Processing failed."); }
    finally { setBusy(false); }
  }

  function switchTab(next: "batch" | "workflow") { if (busy) return; setTab(next); setFiles(next === "workflow" ? files.slice(0, 1) : files); setError(false); setStatus("Choose PDF files and configure processing."); }

  return <><Header /><main className="min-h-screen bg-slate-50"><section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><header className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">{tab === "batch" ? <Files size={22} /> : <GitMerge size={22} />}</span><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Advanced automation</p><h1 className="mt-1 text-3xl font-bold">Batch & Workflow Processing</h1><p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">Process several PDFs consistently or chain verified local operations on one document.</p></div></header><div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"><div className="grid grid-cols-2 border-b"><button type="button" onClick={() => switchTab("batch")} className={`h-14 text-sm font-bold ${tab === "batch" ? "bg-violet-50 text-violet-700" : "text-slate-500"}`}>Batch files</button><button type="button" onClick={() => switchTab("workflow")} className={`h-14 text-sm font-bold ${tab === "workflow" ? "bg-violet-50 text-violet-700" : "text-slate-500"}`}>Chain workflow</button></div><div className="grid lg:grid-cols-[1fr_360px]"><div className="border-b p-5 sm:p-7 lg:border-b-0 lg:border-r"><input ref={inputRef} type="file" multiple={tab === "batch"} accept="application/pdf,.pdf" className="hidden" onChange={(event) => selectFiles(event.target.files)} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex min-h-[180px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/40"><Upload className="text-violet-600" /><span className="mt-3 font-bold">{tab === "batch" ? "Choose up to 20 PDFs" : "Choose one PDF"}</span><span className="mt-1 text-xs font-semibold text-slate-500">{STAGE_ONE_BATCH_MAX_TOTAL_MB} MB total limit</span></button><div className="mt-4 space-y-2">{files.map((file, index) => <div key={`${file.name}-${file.lastModified}`} className="flex items-center justify-between rounded-xl border bg-slate-50 px-3 py-2"><div className="min-w-0"><p className="truncate text-sm font-bold">{file.name}</p><p className="text-xs text-slate-500">{formatFileSize(file.size)}</p></div><button type="button" onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))} disabled={busy} aria-label={`Remove ${file.name}`} className="p-2 text-slate-500"><Trash2 size={16} /></button></div>)}</div></div><aside className="p-5 sm:p-7"><p className="text-sm font-bold text-slate-900">{tab === "batch" ? "Apply to every file" : "Workflow order"}</p><div className="mt-3 space-y-2">{OPERATIONS.map((operation, index) => tab === "batch" ? <label key={operation.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${batchOperation === operation.id ? "border-violet-400 bg-violet-50" : "border-slate-200"}`}><input type="radio" name="batch-operation" checked={batchOperation === operation.id} onChange={() => setBatchOperation(operation.id)} disabled={busy} className="mt-1" /><span><span className="block text-sm font-bold">{operation.label}</span><span className="text-xs text-slate-500">{operation.detail}</span></span></label> : <label key={operation.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${workflow.includes(operation.id) ? "border-violet-400 bg-violet-50" : "border-slate-200"}`}><span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-600 text-xs font-bold text-white">{index + 1}</span><input type="checkbox" checked={workflow.includes(operation.id)} onChange={() => toggleWorkflow(operation.id)} disabled={busy} className="mt-1" /><span><span className="block text-sm font-bold">{operation.label}</span><span className="text-xs text-slate-500">{operation.detail}</span></span></label>)}</div><div className={`mt-4 rounded-xl border p-3 text-xs font-semibold leading-5 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-slate-50 text-slate-600"}`} role={error ? "alert" : "status"}>{busy ? <Loader2 size={16} className="mr-2 inline animate-spin" /> : null}{status}{busy ? <div className="mt-2 h-2 rounded-full bg-white"><div className="h-full rounded-full bg-violet-600" style={{ width: `${progress}%` }} /></div> : null}</div><button type="button" onClick={() => void process()} disabled={busy || !files.length} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-bold text-white disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{tab === "batch" ? "Run Batch" : "Run Workflow"}</button></aside></div></div></section></main></>;
}
