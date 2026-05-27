"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  SlidersHorizontal,
  Sparkles,
  Type,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import { addTextStampToPdf, type StampFontStyle } from "@/lib/pdf-stamp-engine";

type FontStyle = StampFontStyle;

const FONT_OPTIONS: Array<{ value: FontStyle; label: string; previewClass: string }> = [
  { value: "regular", label: "Regular", previewClass: "font-medium not-italic" },
  { value: "bold", label: "Bold", previewClass: "font-semibold not-italic" },
  { value: "italic", label: "Italic", previewClass: "font-medium italic" },
  { value: "boldItalic", label: "Bold Italic", previewClass: "font-semibold italic" },
];

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Export failed. This PDF may be encrypted, damaged, or unsupported.";
}

export default function WatermarkPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [watermarkText, setWatermarkText] = useState("PDFMantra");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(0.18);
  const [angle, setAngle] = useState(-32);
  const [fontStyle, setFontStyle] = useState<FontStyle>("bold");
  const [status, setStatus] = useState("Upload a PDF to add watermark.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  const selectedFontPreviewClass = useMemo(() => {
    return FONT_OPTIONS.find((font) => font.value === fontStyle)?.previewClass || FONT_OPTIONS[0].previewClass;
  }, [fontStyle]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResult(null);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);

      setFile(selectedFile);
      setPageCount(pdf.getPageCount());
      setStatus(`PDF loaded with ${pdf.getPageCount()} page${pdf.getPageCount() > 1 ? "s" : ""}. Adjust watermark settings.`);
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setResult(null);
    setStatus("Upload a PDF to add watermark.");
  }

  function applyPreset(nextText: string, nextAngle: number, nextOpacity: number) {
    setWatermarkText(nextText);
    setAngle(nextAngle);
    setOpacity(nextOpacity);
    setResult(null);
    setStatus(`Preset applied: ${nextText}`);
  }

  async function handleExport() {
    if (!file || busy) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!watermarkText.trim()) {
      setStatus("Enter watermark text first.");
      return;
    }

    setBusy(true);
    setResult(null);
    setStatus("Applying watermark with PDFMantra engine...");

    try {
      const output = await addTextStampToPdf(file, {
        text: watermarkText.trim(),
        fontSize,
        opacity,
        angle,
        fontStyle,
      });

      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus("Watermarked PDF exported successfully. Download started.");
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const statusIsError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("valid") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("encrypted") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <Type size={14} />
                PDFMantra Engine Tool
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Add Watermark PDF
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Upload a PDF, customize text, font style, opacity, and angle, then export through the PDFMantra stamp engine.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_390px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
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
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Upload size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">{file ? file.name : "Drop PDF here"}</div>
                  <div className="mt-2 text-sm font-medium text-slate-500">
                    {file ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}` : "Click here or drag a PDF to begin."}
                  </div>
                </div>

                {file ? (
                  <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="text-sm font-bold uppercase tracking-wide text-slate-500">Selected file</div>
                        <div className="mt-1 truncate text-lg font-semibold text-slate-950">{file.name}</div>
                        <div className="mt-1 text-sm text-slate-500">Original size: {formatFileSize(file.size)}</div>
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

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Live Watermark Preview</h2>
                  <p className="mt-1 text-sm text-slate-600">Preview is visual. The actual PDF export applies these same settings.</p>

                  <div className="mt-5 flex min-h-96 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-slate-100 p-6 text-center">
                    <div className="relative h-80 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                      <div className="absolute left-4 right-4 top-5 space-y-2">
                        {Array.from({ length: 12 }).map((_, index) => (
                          <div key={index} className="h-2 rounded-full bg-slate-200" />
                        ))}
                      </div>
                      {watermarkText.trim() ? (
                        <div
                          className={`pointer-events-none absolute left-1/2 top-1/2 max-w-[18rem] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-indigo-700 ${selectedFontPreviewClass}`}
                          style={{
                            transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                            fontSize: Math.max(14, fontSize * 0.45),
                            opacity,
                          }}
                        >
                          {watermarkText}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Watermark Studio</h2>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => applyPreset("CONFIDENTIAL", -32, 0.16)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Confidential</button>
                    <button type="button" onClick={() => applyPreset("DRAFT", -25, 0.18)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Draft</button>
                    <button type="button" onClick={() => applyPreset("APPROVED", 0, 0.2)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Approved</button>
                  </div>

                  <label className="mt-5 block">
                    <span className="text-sm font-semibold text-slate-800">Watermark text</span>
                    <input value={watermarkText} onChange={(event) => setWatermarkText(event.target.value)} placeholder="Example: Confidential" className="input-premium mt-2" />
                  </label>

                  <label className="mt-4 block">
                    <span className="text-sm font-semibold text-slate-800">Font style</span>
                    <select value={fontStyle} onChange={(event) => setFontStyle(event.target.value as FontStyle)} className="input-premium mt-2">
                      {FONT_OPTIONS.map((font) => (
                        <option key={font.value} value={font.value}>{font.label}</option>
                      ))}
                    </select>
                  </label>

                  <label className="mt-4 block">
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-800">Font size <span>{fontSize}px</span></span>
                    <input type="range" min={16} max={120} value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="mt-2 w-full" />
                  </label>

                  <label className="mt-4 block">
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-800">Opacity <span>{Math.round(opacity * 100)}%</span></span>
                    <input type="range" min={5} max={60} value={Math.round(opacity * 100)} onChange={(event) => setOpacity(Number(event.target.value) / 100)} className="mt-2 w-full" />
                  </label>

                  <label className="mt-4 block">
                    <span className="flex items-center justify-between text-sm font-semibold text-slate-800">Angle <span>{angle}°</span></span>
                    <input type="range" min={-60} max={60} value={angle} onChange={(event) => setAngle(Number(event.target.value))} className="mt-2 w-full" />
                  </label>

                  <div className="mt-5 rounded-2xl bg-white p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                    <div className="mt-1 text-xl font-semibold text-slate-950">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  </div>

                  <button type="button" onClick={handleExport} disabled={busy || !file} className="btn-primary mt-5 w-full">
                    {busy ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing</>
                    ) : (
                      <><Download size={18} /> Export Watermarked PDF</>
                    )}
                  </button>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                  <div className="mb-1 flex items-center gap-2 font-semibold"><SlidersHorizontal size={16} /> Engine settings</div>
                  Text, opacity, angle, and font style are applied during actual PDF export.
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusIsError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><Sparkles size={16} /> Professional note</div>
                  This tool uses a dedicated PDF stamp engine for stable browser-side watermark output.
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
