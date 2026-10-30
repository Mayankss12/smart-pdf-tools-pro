"use client";

import { useState } from "react";
import { Download, FileImage, FileText, Loader2, Upload } from "lucide-react";

import { useEntitlement } from "@/hooks/useEntitlement";
import { confirmPdfCompatibility } from "@/lib/pdf-document-safety";
import { downloadBlob, formatFileSize, validatePdfFile } from "@/lib/pdf-engine";
import {
  PAGE_SIZES,
  alternateMixPdfPages,
  extractEmbeddedImages,
  grayscalePdfPages,
  nUpPdfPages,
  resizePdfPages,
  type MixOrder,
  type NUpCount,
  type PageSizeKey,
} from "@/lib/pdf-phase-one-engine";

export type PhaseOneMode = "grayscale" | "n-up" | "resize" | "extract-images" | "alternate-mix";

const CONFIG: Record<PhaseOneMode, { title: string; description: string; action: string; toolKey: string; note: string }> = {
  grayscale: {
    title: "Grayscale PDF",
    description: "Turn every page into a black-and-white visual copy in your browser.",
    action: "Convert & download PDF",
    toolKey: "grayscale-pdf",
    note: "Grayscale rebuilds pages as images. Text selection, links, forms, and interactive annotations are flattened; do not use it when those features must remain editable.",
  },
  "n-up": {
    title: "N-up PDF",
    description: "Place two, four, six, or nine original pages on each print sheet.",
    action: "Create & download PDF",
    toolKey: "n-up-pdf",
    note: "Page artwork and selectable text remain vector content. Interactive forms, links, comments, and original bookmarks are not carried into the new print sheets.",
  },
  resize: {
    title: "Resize PDF Pages",
    description: "Fit each page proportionally onto a chosen paper size without rasterizing its text.",
    action: "Resize & download PDF",
    toolKey: "resize-pdf",
    note: "Content keeps its proportions and is placed at the lower-left. Whitespace may remain on the top or right when aspect ratios differ. Annotations scale with their pages.",
  },
  "extract-images": {
    title: "Extract Images from PDF",
    description: "Download embedded JPEG and supported RGB/gray images as a ZIP archive.",
    action: "Extract & download ZIP",
    toolKey: "extract-images",
    note: "This extracts embedded images, not full-page screenshots. Unsupported masks, CMYK, JPEG 2000, and complex color spaces are skipped and reported.",
  },
  "alternate-mix": {
    title: "Alternate & Mix PDFs",
    description: "Interleave pages from two PDFs, with an option to reverse the second file.",
    action: "Mix & download PDF",
    toolKey: "alternate-mix",
    note: "Original pages, selectable text, and bookmarks are preserved. If one PDF has more pages, its remaining pages are appended in their selected order.",
  },
};

function FilePicker({ label, file, onChange, disabled }: { label: string; file: File | null; onChange: (file: File | null) => void; disabled: boolean }) {
  return (
    <label className="block min-w-0 rounded-2xl border border-dashed border-violet-300 bg-violet-50/40 p-5 transition hover:bg-violet-50">
      <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><Upload size={18} />{label}</span>
      <span className="mt-2 block truncate text-sm text-slate-600">{file ? `${file.name} · ${formatFileSize(file.size)}` : "Choose a PDF file (up to 80 MB)"}</span>
      <input
        className="mt-3 block w-full min-w-0 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-2 file:font-semibold file:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)}
      />
    </label>
  );
}

function SelectField<T extends string>({ label, value, options, onChange, disabled }: {
  label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void; disabled: boolean;
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

export function PhaseOnePdfToolClient({ mode }: { readonly mode: PhaseOneMode }) {
  const config = CONFIG[mode];
  const { recordExport } = useEntitlement();
  const [first, setFirst] = useState<File | null>(null);
  const [second, setSecond] = useState<File | null>(null);
  const [paper, setPaper] = useState<PageSizeKey | "custom">("a4");
  const [landscape, setLandscape] = useState(false);
  const [customWidth, setCustomWidth] = useState(210);
  const [customHeight, setCustomHeight] = useState(297);
  const [count, setCount] = useState<NUpCount>(4);
  const [dpi, setDpi] = useState<120 | 150>(150);
  const [startWith, setStartWith] = useState<MixOrder>("first");
  const [reverseSecond, setReverseSecond] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Choose your PDF to begin.");
  const [error, setError] = useState("");
  const [output, setOutput] = useState<{ blob: Blob; fileName: string } | null>(null);

  function replaceFirst(file: File | null) { setFirst(file); setOutput(null); setError(""); setStatus(file ? "PDF selected. Choose options and export." : "Choose your PDF to begin."); }
  function replaceSecond(file: File | null) { setSecond(file); setOutput(null); setError(""); }

  async function process() {
    if (busy) return;
    setError("");
    setOutput(null);
    try {
      validatePdfFile(first);
      if (mode === "alternate-mix") validatePdfFile(second);
      setBusy(true);
      setStatus("Checking document compatibility...");
      const files = mode === "alternate-mix" ? [first!, second!] : [first!];
      const compatibility = await confirmPdfCompatibility(files, config.title);
      if (!compatibility.confirmed) { setStatus("Cancelled. Your originals were not changed."); return; }
      setStatus("Processing in your browser. Large files may take a moment...");
      let result: { blob: Blob; fileName: string };
      if (mode === "grayscale") result = await grayscalePdfPages(first!, dpi);
      else if (mode === "n-up") result = await nUpPdfPages(first!, { count, size: paper === "custom" ? "a4" : paper, landscape });
      else if (mode === "resize") {
        const preset = paper === "custom" ? { width: customWidth * 72 / 25.4, height: customHeight * 72 / 25.4 } : PAGE_SIZES[paper];
        result = await resizePdfPages(first!, { width: landscape ? preset.height : preset.width, height: landscape ? preset.width : preset.height });
      } else if (mode === "extract-images") {
        const extracted = await extractEmbeddedImages(first!);
        result = extracted;
        setStatus(`Extracted ${extracted.count} image${extracted.count === 1 ? "" : "s"}${extracted.skipped ? `; skipped ${extracted.skipped} unsupported image${extracted.skipped === 1 ? "" : "s"}` : ""}.`);
      } else result = await alternateMixPdfPages(first!, second!, { startWith, reverseSecond });
      const allowance = await recordExport({ toolKey: config.toolKey, exportKind: "clean" });
      if (!allowance.allowed) throw new Error(allowance.error || "Export limit reached. Sign in or try again later.");
      downloadBlob(result.blob, result.fileName);
      setOutput(result);
      if (mode !== "extract-images") setStatus(`Download started: ${result.fileName} (${formatFileSize(result.blob.size)}).`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Processing failed. Please try another PDF.";
      setError(message);
      setStatus("Processing failed.");
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-b from-violet-50/70 to-white px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <a className="text-sm font-semibold text-violet-700 hover:underline" href="/tools">← All PDF tools</a>
        <div className="mt-5 rounded-[2rem] border border-violet-100 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-700">{mode === "extract-images" ? <FileImage size={25} /> : <FileText size={25} />}</div>
            <div><h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{config.title}</h1><p className="mt-2 max-w-2xl text-slate-600">{config.description}</p></div>
          </div>
          <div className="mt-8 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(270px,0.75fr)]">
            <section className="min-w-0 space-y-4" aria-label="PDF files">
              <FilePicker label={mode === "alternate-mix" ? "First PDF" : "Upload PDF"} file={first} onChange={replaceFirst} disabled={busy} />
              {mode === "alternate-mix" && <FilePicker label="Second PDF" file={second} onChange={replaceSecond} disabled={busy} />}
              <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">{config.note}</p>
            </section>
            <section className="min-w-0 space-y-4" aria-label="Options">
              {mode === "grayscale" && <SelectField label="Output quality" value={String(dpi)} options={[{ value: "120", label: "120 DPI - smaller file" }, { value: "150", label: "150 DPI - sharper" }]} onChange={(value) => setDpi(Number(value) as 120 | 150)} disabled={busy} />}
              {mode === "n-up" && <SelectField label="Pages per sheet" value={String(count)} options={[2, 4, 6, 9].map((value) => ({ value: String(value), label: `${value} pages` }))} onChange={(value) => setCount(Number(value) as NUpCount)} disabled={busy} />}
              {(mode === "n-up" || mode === "resize") && <SelectField<PageSizeKey | "custom"> label="Paper size" value={paper} options={[...Object.entries(PAGE_SIZES).map(([value, size]) => ({ value: value as PageSizeKey | "custom", label: size.label })), ...(mode === "resize" ? [{ value: "custom" as const, label: "Custom (millimetres)" }] : [])]} onChange={setPaper} disabled={busy} />}
              {mode === "resize" && paper === "custom" && <div className="grid grid-cols-2 gap-3">{[["Width (mm)", customWidth, setCustomWidth], ["Height (mm)", customHeight, setCustomHeight]].map(([label, value, setValue]) => <label key={String(label)} className="text-sm font-semibold text-slate-700">{String(label)}<input type="number" min="25.4" max="705" step="0.1" value={value as number} onChange={(event) => (setValue as (value: number) => void)(Number(event.target.value))} disabled={busy} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-3" /></label>)}</div>}
              {(mode === "n-up" || mode === "resize") && <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={landscape} onChange={(event) => setLandscape(event.target.checked)} disabled={busy} className="h-5 w-5 accent-violet-600" /> Landscape output</label>}
              {mode === "alternate-mix" && <><SelectField<MixOrder> label="First page comes from" value={startWith} options={[{ value: "first", label: "First PDF" }, { value: "second", label: "Second PDF" }]} onChange={setStartWith} disabled={busy} /><label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={reverseSecond} onChange={(event) => setReverseSecond(event.target.checked)} disabled={busy} className="h-5 w-5 accent-violet-600" /> Reverse second PDF before mixing</label></>}
              <button type="button" disabled={busy || !first || (mode === "alternate-mix" && !second)} onClick={process} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-5 font-bold text-white transition hover:bg-violet-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{busy ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}{busy ? "Processing..." : config.action}</button>
              <p role={error ? "alert" : "status"} className={`text-sm ${error ? "font-semibold text-red-700" : output ? "font-semibold text-emerald-700" : "text-slate-600"}`}>{error || status}</p>
              {output && <button type="button" onClick={() => downloadBlob(output.blob, output.fileName)} className="text-sm font-semibold text-violet-700 underline">Download again</button>}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
