"use client";

import { useRef, useState } from "react";
import { CheckCircle2, Download, FileArchive, Loader2, Upload, X } from "lucide-react";

import { Header } from "@/components/Header";
import { ToolLandingState } from "@/components/tool-kit/ToolLandingState";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useCompress, type CompressionLevel } from "@/hooks/useCompress";
import { formatFileSize, validatePdfFile } from "@/lib/pdf-engine";

const LEVELS: { value: CompressionLevel; label: string; desc: string }[] = [
  { value: "low", label: "Low", desc: "Near-lossless — subtle reduction, maximum quality" },
  { value: "medium", label: "Medium", desc: "Balanced — real reduction, clean output" },
  { value: "high", label: "High", desc: "Strong — smallest size, minor quality trade-off" },
];

const TARGET_SIZES: { label: string; value: number | null }[] = [
  { label: "No limit", value: null },
  { label: "Under 2 MB", value: 2 * 1024 * 1024 },
  { label: "Under 1 MB", value: 1 * 1024 * 1024 },
  { label: "Under 500 KB", value: 500 * 1024 },
  { label: "Under 200 KB", value: 200 * 1024 },
  { label: "Under 100 KB", value: 100 * 1024 },
];

export default function CompressPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [targetBytes, setTargetBytes] = useState<number | null>(null);
  const [status, setStatus] = useState("Upload a PDF to compress and download.");

  const { recordExport } = useEntitlement();
  const { compress, download, reset, isLoading, progress, result, error } = useCompress();

  function handleFile(f?: File) {
    if (!f) return;

    try {
      validatePdfFile(f);
      setFile(f);
      reset();
      setStatus(`Ready — ${f.name} (${formatFileSize(f.size)})`);
    } catch (err) {
      setFile(null);
      reset();
      setStatus(err instanceof Error ? err.message : "Invalid file.");
    }
  }

  function clearFile() {
    setFile(null);
    reset();
    setStatus("Upload a PDF to compress and download.");
  }

  async function handleCompress() {
    if (!file || isLoading) return;

    setStatus(
      targetBytes
        ? `Compressing to under ${TARGET_SIZES.find((t) => t.value === targetBytes)?.label.replace("Under ", "")}…`
        : "Compressing…",
    );

    try {
      const res = await compress(file, level, targetBytes);

      if (res) {
        setStatus("Checking export allowance...");

        const exportRecord = await recordExport({
          toolKey: "compress",
          exportKind: "clean",
        });

        if (!exportRecord.allowed) {
          const limitMessage =
            exportRecord.error ||
            (exportRecord.identityType === "guest"
              ? "Guest clean export limit reached for today. Sign in to get 5 clean exports/day."
              : `${exportRecord.planLabel} clean export limit reached for today.`);

          setStatus(limitMessage);
          return;
        }

        download(res);

        if (targetBytes) {
          setStatus(
            res.targetMet
              ? `Target reached. Output: ${formatFileSize(res.compressedSize)} (${res.savedPercent}% saved). Download started.`
              : `Best achievable: ${formatFileSize(res.compressedSize)} — target size too aggressive for this PDF. Download started.`,
          );
        } else {
          setStatus(
            res.savedBytes > 0
              ? `Compressed by ${res.savedPercent}% — saved ${formatFileSize(res.savedBytes)}. Download started.`
              : "PDF already optimised — minimal reduction possible. Download started.",
          );
        }
      } else {
        setStatus(error ?? "Compression failed. Please try a different file.");
      }
    } catch (err) {
      console.error(err);
      setStatus("Unable to verify export allowance. Please try again.");
    }
  }

  const isError =
    !!error ||
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("unable");

  if (!file) {
    return (
      <>
        <Header />
        <ToolLandingState
          icon={FileArchive}
          title="Compress PDF"
          description="Reduce file size while keeping quality acceptable."
          ctaLabel="Select PDF file"
          tips={["Low / Medium / High quality", "Target size option", "100% browser-side"]}
          onFileSelect={(selected) => handleFile(Array.isArray(selected) ? selected[0] : selected)}
        />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            {/* Hero */}
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <FileArchive size={14} /> PDFMantra Engine Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Compress PDF
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Choose a compression level or set a target file size. Processed entirely in your browser — no upload limits.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_400px]">
              {/* Left — dropzone */}
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />

                <div
                  onClick={() => inputRef.current?.click()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFile(e.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Upload size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>
                  <div className="mt-2 text-sm font-medium text-slate-500">
                    {file ? `${formatFileSize(file.size)} selected` : "Click or drag a PDF to begin."}
                  </div>
                </div>

                {file && (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Selected file</div>
                        <div className="mt-1 truncate text-lg font-semibold text-slate-950">{file.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Original: {formatFileSize(file.size)}</div>
                      </div>
                      <button
                        type="button"
                        onClick={clearFile}
                        className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right — controls + summary */}
              <aside className="space-y-4 bg-white p-5 sm:p-6">
                {/* Level selector */}
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Compression level
                  </h2>
                  <div className="grid gap-2">
                    {LEVELS.map(({ value, label, desc }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setLevel(value)}
                        className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                          level === value
                            ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                            : "border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                            level === value ? "border-indigo-600" : "border-slate-300"
                          }`}
                        >
                          {level === value && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                        </span>
                        <span>
                          <span className="block text-sm font-semibold text-slate-950">{label}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{desc}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target size */}
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Target file size
                  </h2>
                  <select
                    value={targetBytes ?? ""}
                    onChange={(e) => setTargetBytes(e.target.value ? Number(e.target.value) : null)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-950 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  >
                    {TARGET_SIZES.map(({ label, value }) => (
                      <option key={label} value={value ?? ""}>
                        {label}
                      </option>
                    ))}
                  </select>
                  {targetBytes && (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">
                      Target mode overrides level — quality is automatically reduced until the target is met.
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Summary</h2>
                  <div className="grid gap-3">
                    {[
                      { label: "Original", val: file ? formatFileSize(file.size) : "—" },
                      { label: "Output", val: result ? formatFileSize(result.compressedSize) : "—" },
                      {
                        label: "Reduction",
                        val: result ? `${result.savedPercent}%` : "—",
                        green: result && result.savedPercent > 0,
                      },
                    ].map(({ label, val, green }) => (
                      <div key={label} className="rounded-2xl bg-white p-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
                        <div className={`mt-1 text-xl font-semibold ${green ? "text-emerald-600" : "text-slate-950"}`}>
                          {val}
                        </div>
                      </div>
                    ))}
                  </div>

                  {isLoading && (
                    <div className="mt-4 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-1.5 rounded-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={!file || isLoading}
                    className="btn-primary mt-5 w-full"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={18} /> Compressing… {progress}%
                      </>
                    ) : (
                      <>
                        <Download size={18} /> Compress &amp; Download
                      </>
                    )}
                  </button>
                </div>

                {/* Status */}
                <div
                  className={`rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${
                    isError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} /> Status
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
