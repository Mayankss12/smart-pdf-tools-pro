"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import {
  inspectRemovableWatermarks,
  removeCompatibleWatermarks,
  type RemovableWatermarkInspection,
} from "@/lib/pdf-watermark-removal-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError || error instanceof Error) return error.message;
  return "Unable to process this PDF. It may be encrypted, damaged, or unsupported.";
}

export function WatermarkRemoverClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<RemovableWatermarkInspection | null>(null);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);
  const [status, setStatus] = useState("Upload a PDF you own or are authorized to edit.");
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;
    setBusy(true);
    setResult(null);
    setAuthorized(false);
    setProgress(0);
    setStatus("Inspecting PDF for compatible removable watermarks...");

    try {
      validatePdfFile(selectedFile);
      const nextInspection = await inspectRemovableWatermarks(selectedFile);
      setFile(selectedFile);
      setInspection(nextInspection);
      setStatus(
        nextInspection.compatibleMarks
          ? `${nextInspection.compatibleMarks} compatible watermark ${nextInspection.compatibleMarks === 1 ? "item" : "items"} found.`
          : "No compatible removable watermark was found. The original file has not been changed.",
      );
    } catch (error) {
      setFile(null);
      setInspection(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setInspection(null);
    setResult(null);
    setAuthorized(false);
    setProgress(0);
    setStatus("Upload a PDF you own or are authorized to edit.");
  }

  async function handleRemoveWatermarks() {
    if (!file || !inspection?.compatibleMarks || !authorized || busy) return;
    setBusy(true);
    setResult(null);
    setProgress(0);
    setStatus("Removing compatible watermark objects locally...");

    try {
      const removal = await removeCompatibleWatermarks(file, {
        authorized,
        onProgress: ({ completed, total }) => {
          setProgress(Math.round((completed / Math.max(1, total)) * 100));
        },
      });
      setResult(removal.result);
      setStatus(
        `${removal.removedMarks} compatible watermark ${removal.removedMarks === 1 ? "item" : "items"} removed. Review the downloaded PDF before sharing.`,
      );
      downloadBlob(removal.result.blob, removal.result.fileName);
    } catch (error) {
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("damaged") ||
    status.toLowerCase().includes("no compatible");
  const canRemove = Boolean(file && inspection?.compatibleMarks && authorized && !busy);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>
          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/88 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                <Sparkles size={14} /> Local compatible removal
              </div>
              <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                Remove compatible PDF watermarks you are authorized to edit.
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                PDFMantra removes its own tagged watermarks and standard PDF watermark annotations locally. Flattened page artwork is never hidden with a white overlay or falsely reported as removed.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-6 lg:grid-cols-[1fr_390px]">
            <section className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_18px_50px_rgba(91,63,193,0.08)] sm:p-6">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(event) => {
                  void handleFile(event.currentTarget.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <div
                onClick={() => !busy && fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (!busy) void handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (!busy && (event.key === "Enter" || event.key === " ")) fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-slate-50 p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  {busy ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  {file ? file.name : "Drop authorized PDF here"}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-500">
                  {file && inspection
                    ? `${inspection.pageCount} page${inspection.pageCount === 1 ? "" : "s"} • ${formatFileSize(file.size)}`
                    : "Click here or drag a PDF to inspect it locally."}
                </div>
              </div>

              {file && inspection ? (
                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                      <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Compatible items</div>
                      <div className="mt-2 text-3xl font-semibold text-slate-950">{inspection.compatibleMarks}</div>
                      <div className="mt-1 text-sm text-slate-500">
                        {inspection.taggedContentBlocks} tagged content block{inspection.taggedContentBlocks === 1 ? "" : "s"} · {inspection.watermarkAnnotations} annotation{inspection.watermarkAnnotations === 1 ? "" : "s"}
                      </div>
                    </div>
                    <button type="button" onClick={clearFile} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50">
                      <X size={15} /> Remove file
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  { icon: ShieldCheck, title: "Authorized cleanup", description: "Only process documents you own or may edit." },
                  { icon: FileCheck2, title: "Object-level removal", description: "Compatible content is removed from PDF structures." },
                  { icon: Sparkles, title: "Runs locally", description: "Inspection and removal stay in your browser." },
                ].map(({ icon: Icon, title, description }) => (
                  <div key={title} className="rounded-[1.5rem] border border-violet-100 bg-slate-50 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Icon size={20} /></div>
                    <h3 className="mt-4 text-sm font-bold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_18px_50px_rgba(91,63,193,0.08)] sm:p-6">
              <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Removal confirmation</h2>
              <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                <input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
                <span>I confirm I own this PDF or I am authorized to remove its watermark.</span>
              </label>

              {busy && file ? (
                <div className="mt-5" aria-live="polite">
                  <div className="mb-2 flex justify-between text-xs font-bold text-violet-700"><span>Processing locally</span><span>{progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-violet-100"><div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              ) : null}

              <button type="button" onClick={() => void handleRemoveWatermarks()} disabled={!canRemove} className="btn-primary mt-5 w-full">
                {busy ? <><Loader2 className="animate-spin" size={18} /> Processing</> : <><ShieldCheck size={18} /> Remove compatible marks</>}
              </button>

              {result ? (
                <button type="button" onClick={() => downloadBlob(result.blob, result.fileName)} className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white text-sm font-bold text-violet-700 hover:bg-violet-50">
                  <Download size={17} /> Download again
                </button>
              ) : null}

              <div role={statusLooksLikeError ? "alert" : "status"} className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                {status}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><AlertTriangle size={16} /> Supported scope</div>
                This tool does not guess at logos or text baked into scanned page images. Use the editor or redaction workflow for manual visual cleanup.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
