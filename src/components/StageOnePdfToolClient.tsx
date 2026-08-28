"use client";

import { type FormEvent, useRef, useState } from "react";
import {
  CheckCircle2,
  Crop,
  Download,
  FileCheck2,
  FileCog,
  Hash,
  Loader2,
  RotateCcw,
  Upload,
  Wrench,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize, validatePdfFile } from "@/lib/pdf-engine";
import {
  addBatesNumbers,
  cropPdf,
  readPdfMetadata,
  stageOneOutputName,
  STAGE_ONE_MAX_FILE_SIZE_MB,
  updatePdfMetadata,
  type BatesPosition,
  type MetadataUpdate,
} from "@/lib/pdf-stage-one";
import { runPdfStructuralWorker } from "@/lib/pdf-structural-client";

export type StageOneSimpleMode = "repair" | "flatten" | "metadata" | "crop" | "bates";

const COPY = {
  repair: {
    title: "Repair PDF",
    description: "Rebuild recoverable PDF structure and cross-reference data locally.",
    action: "Repair & Download",
    output: "repaired",
    icon: Wrench,
  },
  flatten: {
    title: "Flatten PDF",
    description: "Freeze form fields and annotations into page content before sharing.",
    action: "Flatten & Download",
    output: "flattened",
    icon: FileCheck2,
  },
  metadata: {
    title: "Edit PDF Metadata",
    description: "Review, update, or remove document title, author, subject, and keywords.",
    action: "Save Metadata",
    output: "metadata",
    icon: FileCog,
  },
  crop: {
    title: "Crop PDF",
    description: "Apply precise page margins while preserving vector text and image quality.",
    action: "Crop & Download",
    output: "cropped",
    icon: Crop,
  },
  bates: {
    title: "Bates Numbering",
    description: "Apply consistent audit-ready numbering across every page.",
    action: "Number & Download",
    output: "bates-numbered",
    icon: Hash,
  },
} as const;

const initialMetadata: MetadataUpdate = {
  title: "",
  author: "",
  subject: "",
  keywords: "",
  creator: "",
  producer: "",
};

export function StageOnePdfToolClient({ mode }: { readonly mode: StageOneSimpleMode }) {
  const copy = COPY[mode];
  const Icon = copy.icon;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Choose a PDF to begin.");
  const [kind, setKind] = useState<"idle" | "error" | "success">("idle");
  const [metadata, setMetadata] = useState<MetadataUpdate>(initialMetadata);
  const [clearMetadata, setClearMetadata] = useState(false);
  const [margins, setMargins] = useState({ top: 18, right: 18, bottom: 18, left: 18 });
  const [bates, setBates] = useState({
    prefix: "PDFM-",
    suffix: "",
    startNumber: 1,
    digits: 6,
    position: "bottom-right" as BatesPosition,
    fontSize: 10,
    margin: 24,
  });
  const { recordExport } = useEntitlement();

  async function selectFile(selected?: File) {
    if (!selected || busy) return;
    try {
      validatePdfFile(selected, { maxSizeMb: STAGE_ONE_MAX_FILE_SIZE_MB });
      setFile(selected);
      setKind("idle");
      setProgress(0);
      setStatus(`${selected.name} is ready (${formatFileSize(selected.size)}).`);
      if (mode === "metadata") {
        const values = await readPdfMetadata(await readValidatedPdfBytes(selected, STAGE_ONE_MAX_FILE_SIZE_MB));
        setMetadata({
          title: values.title,
          author: values.author,
          subject: values.subject,
          keywords: values.keywords,
          creator: values.creator,
          producer: values.producer,
        });
      }
    } catch (error) {
      setFile(null);
      setKind("error");
      setStatus(error instanceof Error ? error.message : "Unable to read this PDF.");
    }
  }

  function reset() {
    abortRef.current?.abort();
    setFile(null);
    setBusy(false);
    setProgress(0);
    setKind("idle");
    setStatus("Choose a PDF to begin.");
    setMetadata(initialMetadata);
    setClearMetadata(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function process(event: FormEvent) {
    event.preventDefault();
    if (!file || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setKind("idle");
    setProgress(8);
    try {
      const bytes = await readValidatedPdfBytes(file, STAGE_ONE_MAX_FILE_SIZE_MB);
      let output: Uint8Array;
      if (mode === "repair" || mode === "flatten") {
        const result = await runPdfStructuralWorker({
          operation: mode,
          input: bytes.slice().buffer,
          signal: controller.signal,
          onProgress: (value, message) => {
            setProgress(value);
            setStatus(message);
          },
        });
        output = result.output;
      } else if (mode === "metadata") {
        setStatus(clearMetadata ? "Removing metadata…" : "Writing metadata…");
        setProgress(48);
        output = await updatePdfMetadata(bytes, { ...metadata, clearAll: clearMetadata });
      } else if (mode === "crop") {
        setStatus("Applying crop boxes…");
        setProgress(48);
        output = await cropPdf(bytes, margins);
      } else {
        setStatus("Applying Bates sequence…");
        setProgress(48);
        output = await addBatesNumbers(bytes, bates);
      }

      setProgress(88);
      setStatus("Checking export allowance…");
      const entitlement = await recordExport({ toolKey: mode, exportKind: "clean" });
      if (!entitlement.allowed) throw new Error(entitlement.error || "Export limit reached.");
      downloadBlob(new Blob([output as BlobPart], { type: "application/pdf" }), stageOneOutputName(copy.output, file.name));
      setProgress(100);
      setKind("success");
      setStatus(`${copy.title} completed and downloaded.`);
    } catch (error) {
      setKind("error");
      setStatus(error instanceof Error ? error.message : `${copy.title} failed.`);
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <header className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon size={22} /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-violet-700">Local PDF workspace</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">{copy.title}</h1>
              <p className="mt-2 text-sm font-medium text-slate-600 sm:text-base">{copy.description}</p>
            </div>
          </header>

          <form onSubmit={process} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.07)]">
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => void selectFile(event.target.files?.[0])} />
            {!file ? (
              <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[390px] w-full flex-col items-center justify-center bg-gradient-to-b from-violet-50/50 to-white px-6 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600 text-white"><Upload size={27} /></span>
                <span className="mt-5 text-xl font-bold">Choose a PDF</span>
                <span className="mt-2 text-sm font-medium text-slate-500">PDF only · up to {STAGE_ONE_MAX_FILE_SIZE_MB} MB · processed on this device</span>
              </button>
            ) : (
              <div className="p-5 sm:p-7">
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="min-w-0"><p className="truncate font-bold">{file.name}</p><p className="mt-1 text-sm text-slate-500">{formatFileSize(file.size)} · local processing</p></div>
                  <button type="button" onClick={reset} disabled={busy} aria-label="Remove PDF" className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"><X size={17} /></button>
                </div>

                {mode === "metadata" ? <MetadataFields value={metadata} onChange={setMetadata} disabled={busy || clearMetadata} clearAll={clearMetadata} onClearAll={setClearMetadata} /> : null}
                {mode === "crop" ? <CropFields value={margins} onChange={setMargins} disabled={busy} /> : null}
                {mode === "bates" ? <BatesFields value={bates} onChange={setBates} disabled={busy} /> : null}
                {mode === "flatten" ? <Notice>Flattening is irreversible. Form fields and annotations become fixed page content; keep the original file.</Notice> : null}
                {mode === "repair" ? <Notice>Repair rebuilds recoverable structure. It cannot recover content missing from the source file.</Notice> : null}

                <div className={`mt-6 rounded-xl border px-4 py-3 text-sm font-semibold ${kind === "error" ? "border-red-200 bg-red-50 text-red-700" : kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}`} role={kind === "error" ? "alert" : "status"}>
                  <div className="flex items-center gap-2">{kind === "success" ? <CheckCircle2 size={17} /> : busy ? <Loader2 size={17} className="animate-spin" /> : null}<span>{status}</span></div>
                  {busy ? <div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div> : null}
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button type="submit" disabled={busy} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}{busy ? "Processing…" : copy.action}</button>
                  <button type="button" onClick={reset} disabled={busy} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700"><RotateCcw size={17} />Reset</button>
                </div>
              </div>
            )}
          </form>
        </section>
      </main>
    </>
  );
}

function Notice({ children }: { readonly children: React.ReactNode }) {
  return <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">{children}</p>;
}

function MetadataFields({ value, onChange, disabled, clearAll, onClearAll }: { value: MetadataUpdate; onChange: (value: MetadataUpdate) => void; disabled: boolean; clearAll: boolean; onClearAll: (value: boolean) => void }) {
  const fields: Array<[keyof MetadataUpdate, string]> = [["title", "Title"], ["author", "Author"], ["subject", "Subject"], ["keywords", "Keywords (comma separated)"], ["creator", "Creator"], ["producer", "Producer"]];
  return <div className="mt-6"><label className="flex items-center gap-3 text-sm font-bold"><input type="checkbox" checked={clearAll} onChange={(event) => onClearAll(event.target.checked)} />Remove the PDF information dictionary</label><div className="mt-4 grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className="text-sm font-bold text-slate-700">{label}<input value={String(value[key] ?? "")} onChange={(event) => onChange({ ...value, [key]: event.target.value })} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100 disabled:bg-slate-100" /></label>)}</div></div>;
}

function CropFields({ value, onChange, disabled }: { value: { top: number; right: number; bottom: number; left: number }; onChange: (value: { top: number; right: number; bottom: number; left: number }) => void; disabled: boolean }) {
  return <div className="mt-6"><p className="text-sm font-bold text-slate-800">Margins in PDF points (72 points = 1 inch)</p><div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">{(["top", "right", "bottom", "left"] as const).map((key) => <label key={key} className="text-sm font-bold capitalize text-slate-700">{key}<input type="number" min={0} step={1} value={value[key]} onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>)}</div><Notice>Crop boxes hide content outside the selected page area without degrading text or images. Hidden content is not a security redaction.</Notice></div>;
}

type BatesFormValue = { prefix: string; suffix: string; startNumber: number; digits: number; position: BatesPosition; fontSize: number; margin: number };
function BatesFields({ value, onChange, disabled }: { value: BatesFormValue; onChange: (value: BatesFormValue) => void; disabled: boolean }) {
  return <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><TextField label="Prefix" value={value.prefix} onChange={(prefix) => onChange({ ...value, prefix })} disabled={disabled} /><TextField label="Suffix" value={value.suffix} onChange={(suffix) => onChange({ ...value, suffix })} disabled={disabled} /><NumberField label="Start number" value={value.startNumber} min={0} onChange={(startNumber) => onChange({ ...value, startNumber })} disabled={disabled} /><NumberField label="Zero padding" value={value.digits} min={1} max={12} onChange={(digits) => onChange({ ...value, digits })} disabled={disabled} /><label className="text-sm font-bold text-slate-700">Position<select value={value.position} onChange={(event) => onChange({ ...value, position: event.target.value as BatesPosition })} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3">{["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"].map((position) => <option key={position}>{position}</option>)}</select></label><NumberField label="Font size" value={value.fontSize} min={6} max={48} onChange={(fontSize) => onChange({ ...value, fontSize })} disabled={disabled} /></div>;
}

function TextField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean }) { return <label className="text-sm font-bold text-slate-700">{label}<input value={value} maxLength={80} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>; }
function NumberField({ label, value, min, max, onChange, disabled }: { label: string; value: number; min: number; max?: number; onChange: (value: number) => void; disabled: boolean }) { return <label className="text-sm font-bold text-slate-700">{label}<input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} disabled={disabled} className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3" /></label>; }
