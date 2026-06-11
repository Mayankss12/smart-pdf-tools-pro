"use client";

import {
  type DragEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  CircleHelp,
  Download,
  FileArchive,
  Gauge,
  Layers,
  Loader2,
  RotateCcw,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useCompress, type CompressionLevel } from "@/hooks/useCompress";
import { formatFileSize, validatePdfFile } from "@/lib/pdf-engine";

type OpenPanel = "level" | "target" | "help" | null;

type LevelOption = {
  value: CompressionLevel;
  label: string;
  shortLabel: string;
  desc: string;
  badge: string;
};

type TargetOption = {
  label: string;
  value: number | null;
  desc: string;
};

const LEVELS: LevelOption[] = [
  {
    value: "low",
    label: "High Quality",
    shortLabel: "Quality",
    desc: "Near-lossless compression with the cleanest visual output.",
    badge: "Best quality",
  },
  {
    value: "medium",
    label: "Balanced",
    shortLabel: "Balanced",
    desc: "Good reduction while keeping the PDF clear for daily sharing.",
    badge: "Recommended",
  },
  {
    value: "high",
    label: "Smallest Size",
    shortLabel: "Small",
    desc: "Strong compression for smaller files with a quality trade-off.",
    badge: "Max reduction",
  },
];

const TARGET_SIZES: TargetOption[] = [
  { label: "No limit", value: null, desc: "Use selected quality mode only." },
  { label: "Under 2 MB", value: 2 * 1024 * 1024, desc: "Good for email attachments." },
  { label: "Under 1 MB", value: 1 * 1024 * 1024, desc: "Compact sharing size." },
  { label: "Under 500 KB", value: 500 * 1024, desc: "Small upload portals." },
  { label: "Under 200 KB", value: 200 * 1024, desc: "Aggressive compression." },
  { label: "Under 100 KB", value: 100 * 1024, desc: "Very aggressive target." },
];

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
          : active
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {icon}
      <span className="pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition delay-300 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/75">
      <div
        className="h-full rounded-full bg-violet-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function formatTargetLabel(targetBytes: number | null) {
  return TARGET_SIZES.find((target) => target.value === targetBytes)?.label ?? "Custom target";
}

export default function CompressPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [targetBytes, setTargetBytes] = useState<number | null>(null);
  const [status, setStatus] = useState("Upload a PDF to compress and download.");
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);

  const { recordExport } = useEntitlement();
  const { compress, download, reset, isLoading, progress, result, error } = useCompress();

  const selectedLevel = useMemo(() => {
    return LEVELS.find((item) => item.value === level) ?? LEVELS[1];
  }, [level]);

  const savedPercent = result?.savedPercent ?? 0;
  const savedBytes = result?.savedBytes ?? 0;
  const compressionWorked = !!result && result.savedBytes > 0;

  const outputMessage = useMemo(() => {
    if (!result) return "No compressed output yet.";
    if (result.savedBytes > 0) {
      return `${result.savedPercent}% smaller · saved ${formatFileSize(result.savedBytes)}`;
    }
    return "This PDF was already optimized. Minimal reduction was possible.";
  }, [result]);

  const isError =
    !!error ||
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("unable");

  function togglePanel(nextPanel: OpenPanel) {
    setOpenPanel((current) => (current === nextPanel ? null : nextPanel));
  }

  function handleFile(selectedFile?: File) {
    if (!selectedFile || isLoading) return;

    try {
      validatePdfFile(selectedFile);
      setFile(selectedFile);
      reset();
      setOpenPanel(null);
      setStatus(`Ready — ${selectedFile.name} (${formatFileSize(selectedFile.size)})`);
    } catch (err) {
      setFile(null);
      reset();
      setOpenPanel(null);
      setStatus(err instanceof Error ? err.message : "Invalid file.");
    }
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (isLoading) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function clearFile() {
    setFile(null);
    reset();
    setOpenPanel(null);
    setStatus("Upload a PDF to compress and download.");
  }

  function resetSettings() {
    setLevel("medium");
    setTargetBytes(null);
    reset();
    setOpenPanel(null);
    setStatus(file ? "Compression settings reset." : "Upload a PDF to compress and download.");
  }

  async function handleCompress() {
    if (!file || isLoading) return;

    setOpenPanel(null);
    setStatus(
      targetBytes
        ? `Compressing to ${formatTargetLabel(targetBytes).toLowerCase()}...`
        : "Compressing PDF...",
    );

    try {
      const compressedResult = await compress(file, level, targetBytes);

      if (compressedResult) {
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

        download(compressedResult);

        if (targetBytes) {
          setStatus(
            compressedResult.targetMet
              ? `Target reached. Output: ${formatFileSize(compressedResult.compressedSize)} (${compressedResult.savedPercent}% saved). Download started.`
              : `Best achievable: ${formatFileSize(compressedResult.compressedSize)}. Target size is too aggressive for this PDF. Download started.`,
          );
        } else {
          setStatus(
            compressedResult.savedBytes > 0
              ? `Compressed by ${compressedResult.savedPercent}% — saved ${formatFileSize(compressedResult.savedBytes)}. Download started.`
              : "PDF already optimized — minimal reduction possible. Download started.",
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

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <FileArchive size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Compress PDF</h1>
              <p className="text-sm text-slate-500">
                Reduce PDF file size with quality presets and target-size control.
              </p>
            </div>
          </div>

          {file ? (
            <div
              ref={toolbarRef}
              className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  Original {formatFileSize(file.size)}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {selectedLevel.shortLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {formatTargetLabel(targetBytes)}
                </span>
                {result ? (
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                      compressionWorked
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {compressionWorked ? `${savedPercent}% saved` : "Already optimized"}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("level")}
                    disabled={isLoading}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <SlidersHorizontal size={15} />
                    {selectedLevel.shortLabel}
                  </button>

                  {openPanel === "level" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="space-y-2">
                        {LEVELS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setLevel(option.value);
                              reset();
                              setStatus(`${option.label} mode selected.`);
                            }}
                            disabled={isLoading}
                            className={`w-full rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              level === option.value
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-600 hover:bg-violet-50"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-bold">{option.label}</span>
                              <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                                {option.badge}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-medium leading-5">{option.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("target")}
                    disabled={isLoading}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Gauge size={15} />
                    Target
                  </button>

                  {openPanel === "target" ? (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="grid grid-cols-2 gap-2">
                        {TARGET_SIZES.map((option) => (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setTargetBytes(option.value);
                              reset();
                              setStatus(`${option.label} target selected.`);
                            }}
                            disabled={isLoading}
                            className={`rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              targetBytes === option.value
                                ? "border-violet-500 bg-violet-50 text-violet-700"
                                : "border-slate-200 text-slate-600 hover:bg-violet-50"
                            }`}
                          >
                            <div className="text-sm font-bold">{option.label}</div>
                            <div className="mt-1 text-[11px] font-medium leading-4">{option.desc}</div>
                          </button>
                        ))}
                      </div>

                      {targetBytes ? (
                        <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                          Target mode may reduce quality more aggressively to reach the selected size.
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                          No limit uses the selected quality mode without forcing a file-size target.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <IconButton
                  label="Reset"
                  icon={<RotateCcw size={16} />}
                  onClick={resetSettings}
                  disabled={isLoading}
                />

                <IconButton
                  label="Help"
                  icon={<CircleHelp size={16} />}
                  onClick={() => togglePanel("help")}
                  active={openPanel === "help"}
                />

                <IconButton
                  label="Remove file"
                  icon={<X size={16} />}
                  onClick={clearFile}
                  disabled={isLoading}
                  danger
                />

                <button
                  type="button"
                  onClick={handleCompress}
                  disabled={!file || isLoading}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {isLoading ? `Compressing ${progress}%` : result ? "Compress Again" : "Compress"}
                </button>
              </div>

              {openPanel === "help" ? (
                <div className="absolute right-3 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                  This tool uses browser-side canvas compression. Some already-optimized PDFs may show little reduction. Target-size mode tries harder but can reduce visual quality.
                </div>
              ) : null}
            </div>
          ) : null}

          <section
            onDrop={handleUploadDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {!file ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {isLoading ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDF here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse file or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  Browser-side compression · Quality presets · Target size
                </div>
              </button>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        Selected PDF
                      </div>
                      <div className="mt-1 truncate text-lg font-bold text-slate-900">{file.name}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-500">
                        Original size: {formatFileSize(file.size)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      disabled={isLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Upload size={16} />
                      Change PDF
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                        <span>Compressing PDF...</span>
                        <span>{progress}%</span>
                      </div>
                      <ProgressBar value={progress} />
                    </div>
                  ) : null}

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        <FileArchive size={14} />
                        Original
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">{formatFileSize(file.size)}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        <Layers size={14} />
                        Output
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {result ? formatFileSize(result.compressedSize) : "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        <Sparkles size={14} />
                        Saved
                      </div>
                      <div className={`mt-2 text-xl font-bold ${compressionWorked ? "text-emerald-600" : "text-slate-900"}`}>
                        {result ? (compressionWorked ? `${savedPercent}%` : "0%") : "—"}
                      </div>
                    </div>
                  </div>

                  {result ? (
                    <div
                      className={`mt-5 rounded-2xl border p-4 ${
                        compressionWorked
                          ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                          : "border-amber-100 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <CheckCircle2 size={16} />
                        Compression result
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6">{outputMessage}</p>
                      <p className="mt-1 text-xs font-semibold opacity-80">
                        Quality used: {Math.round(result.qualityUsed * 100)}% · Mode: {selectedLevel.label}
                        {targetBytes ? ` · Target: ${formatTargetLabel(targetBytes)}` : ""}
                      </p>
                    </div>
                  ) : null}
                </div>

                <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Compression profile
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">{selectedLevel.label}</div>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{selectedLevel.desc}</p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Target size
                    </div>
                    <div className="mt-2 text-lg font-bold text-slate-900">{formatTargetLabel(targetBytes)}</div>
                    <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                      {targetBytes
                        ? "The engine will try to meet this size using stronger compression."
                        : "No forced size limit. Uses selected compression quality only."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleCompress}
                    disabled={!file || isLoading}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                    {isLoading ? `Compressing ${progress}%` : result ? "Compress Again" : "Compress & Download"}
                  </button>
                </aside>
              </div>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${isError ? "text-red-600" : "text-slate-500"}`}>
            {file && !isError && !isLoading
              ? result
                ? outputMessage
                : `${selectedLevel.label} · ${formatTargetLabel(targetBytes)} · ready to compress`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
