"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  FileCode2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Upload,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { formatFileSize, safeFileBaseName } from "@/lib/pdf-engine";
import {
  createStructuredPdf,
  parseCsvBlocks,
  parseMarkdownBlocks,
  parseSafeHtmlBlocks,
  type StructuredBlock,
} from "@/lib/conversions/structured-pdf-engine";

type StructuredFormat = "markdown" | "html" | "csv";

const SAMPLE: Record<StructuredFormat, string> = {
  markdown:
    "# PDFMantra document\n\nThis is a **safe Markdown** preview.\n\n- Selectable Unicode text\n- Lists and tables\n\n| Feature | Status |\n| --- | --- |\n| PDF output | Ready |",
  html:
    "<h1>PDFMantra document</h1><p>Safe HTML becomes selectable PDF text.</p><blockquote>Scripts and external resources are removed.</blockquote><table><tr><th>Feature</th><th>Status</th></tr><tr><td>PDF output</td><td>Ready</td></tr></table>",
  csv: "Name,Status,Count\nAlpha,Ready,12\nBeta,Review,8",
};

function parseBlocks(format: StructuredFormat, source: string) {
  if (format === "markdown") return parseMarkdownBlocks(source);
  if (format === "html") return parseSafeHtmlBlocks(source);
  return parseCsvBlocks(source);
}

function decodeTextFile(bytes: ArrayBuffer) {
  const utf8 = new TextDecoder("utf-8").decode(bytes);
  const replacementRatio =
    (utf8.match(/\uFFFD/g)?.length ?? 0) / Math.max(1, utf8.length);
  return replacementRatio > 0.01
    ? new TextDecoder("windows-1252").decode(bytes)
    : utf8;
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

function blockPreview(block: StructuredBlock, index: number) {
  if (block.kind === "page-break") {
    return (
      <div key={index} className="my-3 border-t border-dashed border-slate-300 pt-2 text-xs font-bold text-slate-400">
        Page break
      </div>
    );
  }
  if (block.kind === "table-row") {
    return (
      <div key={index} className={`grid gap-2 border-b border-slate-200 py-2 text-xs ${block.header ? "font-bold" : "font-medium"}`} style={{ gridTemplateColumns: `repeat(${Math.max(1, block.cells.length)},minmax(0,1fr))` }}>
        {block.cells.map((cell, cellIndex) => (
          <span key={`${index}-${cellIndex}`} className="truncate">{cell}</span>
        ))}
      </div>
    );
  }
  const text =
    block.kind === "list"
      ? `${block.ordered ? `${block.index}.` : "•"} ${block.text}`
      : block.kind === "quote"
        ? `“${block.text}”`
        : block.text;
  return (
    <div
      key={index}
      className={
        block.kind === "heading"
          ? "mt-3 font-bold text-slate-950"
          : block.kind === "code"
            ? "my-2 whitespace-pre-wrap rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-100"
            : block.kind === "quote"
              ? "my-2 border-l-4 border-violet-300 pl-3 text-sm italic text-slate-600"
              : "my-2 text-sm leading-6 text-slate-700"
      }
    >
      {text}
    </div>
  );
}

export function StructuredToPdfPage({
  format,
}: {
  readonly format: StructuredFormat;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { recordExport } = useEntitlement();
  const [source, setSource] = useState(SAMPLE[format]);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [title, setTitle] = useState(
    `${format === "markdown" ? "Markdown" : format.toUpperCase()} Document`,
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(
    `Paste ${format.toUpperCase()} or upload a source file.`,
  );
  const [result, setResult] = useState<{
    pages: number;
    outputSize: number;
    replacements: number;
  } | null>(null);
  const blocks = useMemo(() => parseBlocks(format, source), [format, source]);

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setStatus("Source files are limited to 5 MB.");
      return;
    }
    const text = decodeTextFile(await file.arrayBuffer());
    setSource(text);
    setSourceFileName(file.name);
    setResult(null);
    setStatus(`${file.name} loaded with ${text.length.toLocaleString()} characters.`);
  }

  async function convert() {
    if (!source.trim() || busy) {
      setStatus("Add printable content before converting.");
      return;
    }
    setBusy(true);
    setResult(null);
    setStatus("Creating selectable PDF...");
    try {
      const prepared = await prepareEntitledExport({
        toolKey: `${format}-to-pdf`,
        recordExport,
        prepare: () =>
          createStructuredPdf({
            title,
            blocks,
            landscape: format === "csv",
          }),
      });
      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }
      const outputSize = downloadPdf(
        prepared.output.bytes,
        `PDFMantra-${safeFileBaseName(sourceFileName ?? title)}.pdf`,
      );
      setResult({
        pages: prepared.output.pageCount,
        outputSize,
        replacements: prepared.output.replacementCount,
      });
      setStatus(
        `PDF created with ${prepared.output.pageCount} page${prepared.output.pageCount === 1 ? "" : "s"} and ${prepared.output.blockCount} document blocks. Download started.`,
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Conversion failed.");
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setSource(SAMPLE[format]);
    setSourceFileName(null);
    setResult(null);
    setStatus(`Paste ${format.toUpperCase()} or upload a source file.`);
  }

  const accept =
    format === "markdown"
      ? ".md,.markdown,text/markdown,text/plain"
      : format === "html"
        ? ".html,.htm,text/html"
        : ".csv,text/csv,text/plain";

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <FileCode2 size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {format === "markdown" ? "Markdown" : format.toUpperCase()} to PDF
              </h1>
              <p className="text-sm text-slate-500">
                Safe structured content with selectable Unicode output.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1fr_320px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                ref={inputRef}
                type="file"
                accept={accept}
                className="hidden"
                onChange={(event) => {
                  void loadFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-bold">Source</h2>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                >
                  <Upload size={15} /> Upload
                </button>
              </div>
              <label className="mt-3 block">
                <span className="sr-only">Source content</span>
                <textarea
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value);
                    setResult(null);
                  }}
                  className="min-h-[560px] w-full resize-y rounded-2xl border border-slate-200 p-4 font-mono text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                />
              </label>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-bold">Safe preview</h2>
                <span className="text-xs font-bold text-slate-400">
                  {blocks.length} blocks
                </span>
              </div>
              <div className="mt-3 max-h-[560px] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
                {blocks.length ? (
                  blocks.map(blockPreview)
                ) : (
                  <p className="text-sm text-slate-500">
                    No printable content detected.
                  </p>
                )}
              </div>
            </section>

            <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block text-xs font-bold text-slate-500">
                Document title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm"
                />
              </label>
              {sourceFileName ? (
                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs font-semibold text-slate-600">
                  {sourceFileName} · {formatFileSize(new Blob([source]).size)}
                </div>
              ) : null}
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-xs font-semibold leading-6 text-emerald-800">
                <ShieldCheck className="mb-2" size={18} />
                Your content stays in your browser. Scripts, embedded HTML, unsafe URLs, and external resource loading are not executed.
              </div>
              <div className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-xs font-semibold leading-6 text-violet-800">
                {status}
              </div>
              {result ? (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
                  {result.pages} pages · {formatFileSize(result.outputSize)}
                  {result.replacements
                    ? ` · ${result.replacements} glyph fallbacks`
                    : ""}
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void convert()}
                disabled={busy || !blocks.length}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Download size={17} />
                )}
                Create PDF
              </button>
              <button
                type="button"
                onClick={reset}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600"
              >
                <RefreshCcw size={16} /> Reset
              </button>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
