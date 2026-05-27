"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  FileText,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PdfEngineError, formatFileSize, loadPdfDocument, validatePdfFile } from "@/lib/pdf-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Unable to inspect this PDF. It may be encrypted, damaged, or unsupported.";
}

export default function WatermarkRemoverPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("Upload a PDF you own or are authorized to edit.");
  const [busy, setBusy] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [removalTarget, setRemovalTarget] = useState("PDFMantra");

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setStatus("Inspecting PDF for pro removal workflow...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setStatus(`PDF inspected successfully. ${pdf.getPageCount()} page${pdf.getPageCount() > 1 ? "s" : ""} detected.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setStatus("Upload a PDF you own or are authorized to edit.");
  }

  function handleStartProFlow() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!authorized) {
      setStatus("Confirm that you own this PDF or are authorized to remove the mark before continuing.");
      return;
    }

    setStatus(
      "Pro removal workflow is ready for backend processing. Next build step will connect this screen to account gating, secure upload, and server-side removal jobs.",
    );
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("confirm");

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
                <Crown size={14} />
                Pro workflow
              </div>

              <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                Watermark Remover for authorized PDF cleanup.
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                This pro workflow is designed for documents you own or are allowed to edit. It prepares the secure inspection and backend-removal flow instead of offering unsafe fake overlay hiding.
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
                accept="application/pdf"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-slate-50 p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                  <Upload size={24} />
                </div>
                <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                  {file ? file.name : "Drop authorized PDF here"}
                </div>
                <div className="mt-2 text-sm font-medium text-slate-500">
                  {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} • ${formatFileSize(file.size)}` : "Click here or drag a PDF to inspect."}
                </div>
              </div>

              {file ? (
                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Selected file</div>
                      <div className="mt-1 truncate text-lg font-semibold text-slate-950">{file.name}</div>
                      <div className="mt-1 text-sm text-slate-500">{pageCount} pages inspected</div>
                    </div>
                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={15} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                {[
                  [ShieldCheck, "Authorized cleanup", "Built for PDFs you own or are allowed to edit."],
                  [LockKeyhole, "Pro gated", "Connects cleanly to account, plan, and server jobs."],
                  [Wand2, "Backend ready", "Prepared for deeper text/object/image mark removal."],
                ].map(([Icon, title, description]) => (
                  <div key={String(title)} className="rounded-[1.5rem] border border-violet-100 bg-slate-50 p-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <Icon size={20} />
                    </div>
                    <h3 className="mt-4 text-sm font-bold text-slate-950">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </section>

            <aside className="rounded-[2rem] border border-violet-100 bg-white p-5 shadow-[0_18px_50px_rgba(91,63,193,0.08)] sm:p-6">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Removal Setup</h2>

                <label className="mt-4 block">
                  <span className="text-sm font-semibold text-slate-800">Known mark text</span>
                  <input
                    value={removalTarget}
                    onChange={(event) => setRemovalTarget(event.target.value)}
                    placeholder="Example: PDFMantra / CONFIDENTIAL"
                    className="input-premium mt-2"
                  />
                </label>

                <label className="mt-5 flex cursor-pointer gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                  <input
                    type="checkbox"
                    checked={authorized}
                    onChange={(event) => setAuthorized(event.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                  />
                  <span>I confirm I own this PDF or I am authorized to remove the mark from it.</span>
                </label>

                <button
                  type="button"
                  onClick={handleStartProFlow}
                  disabled={busy || !file}
                  className="btn-primary mt-5 w-full"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Inspecting
                    </>
                  ) : (
                    <>
                      <Crown size={18} />
                      Start Pro Removal Flow
                    </>
                  )}
                </button>
              </div>

              <div
                className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${
                  statusLooksLikeError
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-indigo-100 bg-indigo-50 text-indigo-800"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Status
                </div>
                {status}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <AlertTriangle size={16} />
                  Proper removal note
                </div>
                A true remover should edit PDF content streams, text objects, or image objects on the backend. Browser-only white overlay hiding is not treated as final removal.
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-violet-50 p-4 text-sm font-medium leading-6 text-violet-800">
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <Sparkles size={16} />
                  Next backend step
                </div>
                Connect this page to protected upload, plan verification, job status, and secure output delivery.
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
