"use client";

import { useRef, useState } from "react";
import { PDFDocument } from "pdf-lib";
import { CheckCircle2, Download, FileArchive, Loader2, Upload, X } from "lucide-react";

import { Header } from "@/components/Header";

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function optimizePdf(file: File) {
  const inputBytes = await file.arrayBuffer();
  const pdf = await PDFDocument.load(inputBytes, { ignoreEncryption: true });

  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setProducer("PDFMantra");
  pdf.setCreator("PDFMantra");

  const outputBytes = await pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 50,
  });

  return new Blob([outputBytes], { type: "application/pdf" });
}

export default function CompressPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Upload a PDF to optimize and download.");
  const [outputSize, setOutputSize] = useState<number | null>(null);

  function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setFile(null);
      setOutputSize(null);
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setFile(selectedFile);
    setOutputSize(null);
    setStatus(`Ready to optimize ${selectedFile.name}.`);
  }

  function clearFile() {
    setFile(null);
    setOutputSize(null);
    setStatus("Upload a PDF to optimize and download.");
  }

  async function handleCompress() {
    if (!file || busy) return;

    setBusy(true);
    setStatus("Optimizing PDF...");

    try {
      const optimized = await optimizePdf(file);
      setOutputSize(optimized.size);
      downloadBlob(optimized, `PDFMantra-compressed-${file.name.replace(/\.pdf$/i, "")}.pdf`);

      const reduction = Math.round((1 - optimized.size / file.size) * 100);
      setStatus(
        optimized.size < file.size
          ? `Optimized successfully. Reduced by ${Math.max(0, reduction)}%. Download started.`
          : "PDF optimized and downloaded. This file was already compact, so size reduction may be minimal."
      );
    } catch (error) {
      console.error(error);
      setStatus("Compression failed. This PDF may be encrypted, damaged, or unsupported.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <FileArchive size={14} />
                PDFMantra Optimize Tool
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Compress PDF
              </h1>

              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Upload a PDF, optimize its structure in your browser, and download the processed file instantly.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Upload size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-500">
                    {file ? `${formatFileSize(file.size)} selected` : "Click here or drag a PDF to begin."}
                  </div>
                </div>

                {file ? (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div>
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Selected file</div>
                        <div className="mt-1 truncate text-lg font-semibold text-slate-950">{file.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Original size: {formatFileSize(file.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Compression Summary</h2>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Original</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{file ? formatFileSize(file.size) : "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{outputSize ? formatFileSize(outputSize) : "-"}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={!file || busy}
                    className="btn-primary mt-5 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Optimize & Download
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
