"use client";

import { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Presentation,
  RefreshCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { formatFileSize, safeFileBaseName } from "@/lib/pdf-engine";
import {
  extractOfficeText,
  type OfficeInputFormat,
} from "@/lib/conversions/office-open-xml-reader";
import { createTextPdf } from "@/lib/text-to-pdf-engine";

type UiState = "idle" | "ready" | "processing" | "completed" | "failed" | "usage-limit";

const FORMAT_META: Record<
  OfficeInputFormat,
  {
    readonly label: string;
    readonly accept: string;
    readonly toolKey: string;
    readonly quality: string;
  }
> = {
  docx: {
    label: "Word",
    accept:
      ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    toolKey: "docx-to-pdf",
    quality:
      "Text and paragraph order are converted into a clean PDF. Complex Word layouts, floating objects, tracked changes, headers, and exact typography are not fully reconstructed.",
  },
  xlsx: {
    label: "Excel",
    accept:
      ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    toolKey: "xlsx-to-pdf",
    quality:
      "Worksheet cell values are exported as tab-separated rows. Charts, formulas as visual objects, merged-cell layout, print areas, and exact spreadsheet styling may differ.",
  },
  pptx: {
    label: "PowerPoint",
    accept:
      ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation",
    toolKey: "pptx-to-pdf",
    quality:
      "Slide text is converted page-by-page. Image-only slides, animations, transitions, charts, and exact slide geometry require a full rendering provider and are not reconstructed locally.",
  },
};

function iconFor(format: OfficeInputFormat) {
  if (format === "xlsx") return FileSpreadsheet;
  if (format === "pptx") return Presentation;
  return FileText;
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  return blob.size;
}

export function OfficeToPdfConversionPage({
  format,
}: {
  readonly format: OfficeInputFormat;
}) {
  const meta = FORMAT_META[format];
  const Icon = iconFor(format);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { recordExport } = useEntitlement();
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UiState>("idle");
  const [status, setStatus] = useState(`Upload a ${meta.label} file to create a PDF.`);
  const [result, setResult] = useState<{
    readonly outputSize: number;
    readonly pages: number;
    readonly characters: number;
    readonly replacements: number;
  } | null>(null);

  function selectFile(selected: File | undefined) {
    if (!selected) return;
    const extension = `.${format}`;
    if (!selected.name.toLowerCase().endsWith(extension)) {
      setFile(null);
      setState("failed");
      setStatus(`Please choose a valid ${extension} file.`);
      return;
    }
    if (selected.size > 60 * 1024 * 1024) {
      setFile(null);
      setState("failed");
      setStatus("Office files are limited to 60 MB for browser conversion.");
      return;
    }
    setFile(selected);
    setResult(null);
    setState("ready");
    setStatus(`${selected.name} is ready for conversion.`);
  }

  async function convert() {
    if (!file || state === "processing") return;
    setState("processing");
    setResult(null);
    setStatus(`Reading ${meta.label} document structure...`);
    try {
      const prepared = await prepareEntitledExport({
        toolKey: meta.toolKey,
        recordExport,
        prepare: async () => {
          const extracted = await extractOfficeText(file, format);
          setStatus("Creating PDF pages...");
          const landscape = format !== "docx";
          const pdf = await createTextPdf({
            text: extracted.text,
            title: safeFileBaseName(file.name),
            headerText: file.name,
            footerText: `Converted from ${meta.label} by PDFMantra`,
            showPageNumbers: true,
            pageSize: landscape
              ? { width: 841.89, height: 595.28 }
              : { width: 595.28, height: 841.89 },
            font: "helvetica",
            fontSize: format === "xlsx" ? 9 : 11,
            lineHeight: format === "xlsx" ? 13 : 16,
            margin: 48,
          });
          return { extracted, pdf };
        },
      });
      if (!prepared.allowed) {
        setState("usage-limit");
        setStatus(prepared.message);
        return;
      }
      const outputSize = downloadPdf(
        prepared.output.pdf.bytes,
        `PDFMantra-${safeFileBaseName(file.name)}.pdf`,
      );
      setResult({
        outputSize,
        pages: prepared.output.pdf.pageCount,
        characters: prepared.output.extracted.characterCount,
        replacements: prepared.output.pdf.replacementCount,
      });
      setState("completed");
      setStatus("PDF created successfully. Download started.");
    } catch (error) {
      setState("failed");
      setStatus(
        error instanceof Error
          ? error.message
          : `Unable to convert this ${meta.label} document.`,
      );
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setState("idle");
    setStatus(`Upload a ${meta.label} file to create a PDF.`);
  }

  const busy = state === "processing";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Icon size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{meta.label} to PDF</h1>
              <p className="text-sm text-slate-500">Create a valid PDF locally from an Office Open XML document.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <input
                ref={inputRef}
                type="file"
                accept={meta.accept}
                className="hidden"
                onChange={(event) => {
                  selectFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={busy}
                className="flex min-h-64 w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-violet-50/50 p-8 text-center transition hover:border-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="text-violet-600" size={36} />
                <span className="mt-4 text-lg font-bold">{file ? `Replace ${meta.label} file` : `Choose a ${meta.label} file`}</span>
                <span className="mt-2 text-sm font-medium text-slate-500">.{format} package · up to 60 MB</span>
              </button>

              {file ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                  <div><div className="text-xs font-bold uppercase text-slate-400">File</div><div className="mt-1 truncate text-sm font-semibold">{file.name}</div></div>
                  <div><div className="text-xs font-bold uppercase text-slate-400">Size</div><div className="mt-1 text-sm font-semibold">{formatFileSize(file.size)}</div></div>
                </div>
              ) : null}

              <div className={`mt-4 rounded-2xl border p-4 text-sm font-semibold leading-6 ${state === "failed" || state === "usage-limit" ? "border-red-200 bg-red-50 text-red-700" : state === "completed" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-violet-100 bg-violet-50 text-violet-700"}`}>
                {busy ? <span className="inline-flex items-center gap-2"><Loader2 size={16} className="animate-spin" />{status}</span> : status}
              </div>

              {result ? (
                <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:grid-cols-4">
                  <div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={18} /> Completed</div>
                  <div className="text-sm font-semibold text-emerald-800">{result.pages} PDF pages</div>
                  <div className="text-sm font-semibold text-emerald-800">{result.characters.toLocaleString()} characters</div>
                  <div className="text-sm font-semibold text-emerald-800">{formatFileSize(result.outputSize)}</div>
                  {result.replacements ? <div className="sm:col-span-4 text-xs font-semibold text-amber-800">{result.replacements} unsupported glyph{result.replacements === 1 ? " was" : "s were"} replaced with a visible fallback.</div> : null}
                </div>
              ) : null}
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-bold">Conversion details</h2>
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <ShieldCheck size={19} className="text-emerald-600" />
                <h3 className="mt-2 text-sm font-bold">Browser processing</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">The Office package is read in this browser. Macro-enabled files are rejected.</p>
              </div>
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium leading-5 text-amber-900">{meta.quality}</div>
              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={() => void convert()}
                  disabled={!file || busy}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
                  Convert to PDF
                </button>
                <button type="button" onClick={reset} disabled={busy} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCcw size={16} />Reset</button>
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
