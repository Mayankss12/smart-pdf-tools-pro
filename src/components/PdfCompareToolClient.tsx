"use client";

/* Comparison previews are generated data URLs; Next Image optimization does not apply. */
/* eslint-disable @next/next/no-img-element */

import {
  ChevronLeft,
  ChevronRight,
  Download,
  FileDiff,
  FileJson2,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  StopCircle,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
import { prepareEntitledExport } from "@/lib/export-entitlement";
import { downloadBlob } from "@/lib/pdf-engine";
import {
  comparePdfFiles,
  serializePdfComparison,
  serializePdfComparisonCsv,
  type PdfComparisonResult,
  type PdfPageComparison,
  type TextLineChange,
} from "@/lib/pdf-compare-engine";

type Slot = "original" | "revised";
type ComparisonView = "difference" | "side-by-side";

const STATUS_STYLES: Record<PdfPageComparison["status"], string> = {
  same: "bg-emerald-50 text-emerald-700",
  changed: "bg-amber-50 text-amber-800",
  added: "bg-blue-50 text-blue-700",
  removed: "bg-red-50 text-red-700",
};

function pageMappingLabel(page: PdfPageComparison) {
  if (page.originalPageNumber && page.revisedPageNumber) {
    return page.originalPageNumber === page.revisedPageNumber
      ? `Page ${page.originalPageNumber}`
      : `Original ${page.originalPageNumber} → Revised ${page.revisedPageNumber}`;
  }
  if (page.originalPageNumber) return `Original page ${page.originalPageNumber}`;
  return `Revised page ${page.revisedPageNumber}`;
}

function LineChange({ change }: { readonly change: TextLineChange }) {
  if (change.type === "modified") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3">
        <p className="text-[11px] font-black uppercase tracking-wide text-amber-800">
          Modified line · {Math.round(change.similarity)}% text retained
        </p>
        <p className="mt-2 break-words text-sm font-semibold leading-6 text-red-700">
          <span aria-hidden="true">− </span>
          {change.original}
        </p>
        <p className="mt-1 break-words text-sm font-semibold leading-6 text-emerald-700">
          <span aria-hidden="true">+ </span>
          {change.revised}
        </p>
      </div>
    );
  }

  const added = change.type === "added";
  return (
    <div
      className={`rounded-xl border p-3 ${
        added
          ? "border-emerald-200 bg-emerald-50/70 text-emerald-800"
          : "border-red-200 bg-red-50/70 text-red-800"
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-wide">
        {added ? "Added line" : "Removed line"}
      </p>
      <p className="mt-1 break-words text-sm font-semibold leading-6">
        {added ? change.revised : change.original}
      </p>
    </div>
  );
}

function FileSlot({
  slot,
  file,
  disabled,
  onChoose,
}: {
  readonly slot: Slot;
  readonly file: File | null;
  readonly disabled: boolean;
  readonly onChoose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className="flex min-h-40 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-violet-200 bg-white p-5 text-center transition hover:border-violet-400 hover:bg-violet-50/30 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-60"
    >
      <Upload size={25} className="text-violet-600" />
      <span className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-violet-700">
        {slot} PDF
      </span>
      <span className="mt-2 max-w-full truncate text-base font-black text-slate-950">
        {file?.name ?? "Choose file"}
      </span>
      <span className="mt-1 text-xs font-semibold text-slate-500">
        PDF only · up to 100 MB
      </span>
    </button>
  );
}

export function PdfCompareToolClient() {
  const { recordExport } = useEntitlement();
  const originalRef = useRef<HTMLInputElement | null>(null);
  const revisedRef = useRef<HTMLInputElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [original, setOriginal] = useState<File | null>(null);
  const [revised, setRevised] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState<
    "strict" | "balanced" | "relaxed"
  >("balanced");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(
    "Choose an original PDF and a revised PDF.",
  );
  const [result, setResult] = useState<PdfComparisonResult | null>(null);
  const [activePage, setActivePage] = useState(1);
  const [view, setView] = useState<ComparisonView>("difference");

  useEffect(() => () => abortRef.current?.abort(), []);

  function select(slot: Slot, file?: File) {
    if (!file || busy) return;
    if (slot === "original") setOriginal(file);
    else setRevised(file);
    setResult(null);
    setActivePage(1);
    setStatus(
      `${file.name} selected. Choose the other PDF or start comparison.`,
    );
  }

  async function run() {
    if (!original || !revised || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setResult(null);
    setProgress(0);
    try {
      const prepared = await prepareEntitledExport({
        toolKey: "compare",
        recordExport,
        prepare: () =>
          comparePdfFiles(original, revised, {
            sensitivity,
            signal: controller.signal,
            onProgress(completed, total, message) {
              setProgress(
                Math.round((completed / Math.max(1, total)) * 100),
              );
              setStatus(message);
            },
          }),
      });
      if (!prepared.allowed) {
        setStatus(prepared.message);
        return;
      }
      const next = prepared.output;
      setResult(next);
      setProgress(100);
      setActivePage(
        next.pages.find((page) => page.status !== "same")?.pageNumber ?? 1,
      );
      const materialChanges =
        next.changedPages + next.addedPages + next.removedPages;
      setStatus(
        materialChanges
          ? `${materialChanges} material page change${materialChanges === 1 ? "" : "s"}: ${next.changedPages} modified, ${next.addedPages} inserted, ${next.removedPages} removed.`
          : "No material visual or text difference was detected at this sensitivity.",
      );
    } catch (error) {
      setStatus(
        controller.signal.aborted
          ? "Comparison cancelled."
          : error instanceof Error
            ? error.message
            : "Unable to compare these PDFs.",
      );
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setBusy(false);
    }
  }

  function reset() {
    abortRef.current?.abort();
    setOriginal(null);
    setRevised(null);
    setResult(null);
    setProgress(0);
    setActivePage(1);
    setStatus("Choose an original PDF and a revised PDF.");
  }

  function downloadReport(format: "json" | "csv") {
    if (!result) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const content =
      format === "json"
        ? serializePdfComparison(result)
        : serializePdfComparisonCsv(result);
    downloadBlob(
      new Blob([content], {
        type:
          format === "json"
            ? "application/json"
            : "text/csv;charset=utf-8",
      }),
      `PDFMantra-comparison-${stamp}.${format}`,
    );
  }

  const page =
    result?.pages.find((item) => item.pageNumber === activePage) ?? null;

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <header className="mb-6 flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <FileDiff size={22} />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-700">
                Aligned visual and text analysis
              </p>
              <h1 className="mt-1 text-3xl font-black">Compare PDFs</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600 sm:text-base">
                Match corresponding pages even after insertions, review visual
                differences, and inspect line-level text changes locally.
              </p>
            </div>
          </header>

          <input
            ref={originalRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              select("original", event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
          <input
            ref={revisedRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(event) => {
              select("revised", event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <FileSlot
              slot="original"
              file={original}
              disabled={busy}
              onChoose={() => originalRef.current?.click()}
            />
            <FileSlot
              slot="revised"
              file={revised}
              disabled={busy}
              onChoose={() => revisedRef.current?.click()}
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <label className="text-xs font-black text-slate-600">
              Sensitivity
              <select
                value={sensitivity}
                onChange={(event) =>
                  setSensitivity(event.target.value as typeof sensitivity)
                }
                disabled={busy}
                className="ml-3 h-10 rounded-xl border border-slate-200 px-3 text-sm text-slate-900"
              >
                <option value="strict">Strict</option>
                <option value="balanced">Balanced</option>
                <option value="relaxed">Relaxed</option>
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              {busy ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-black text-red-600"
                >
                  <StopCircle size={16} />
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void run()}
                  disabled={!original || !revised}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-violet-700 px-5 text-sm font-black text-white disabled:opacity-40"
                >
                  <FileDiff size={16} />
                  Compare PDFs
                </button>
              )}
              <button
                type="button"
                onClick={reset}
                disabled={busy}
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black"
              >
                <RefreshCcw size={16} />
                Reset
              </button>
            </div>
          </div>

          <div
            role="status"
            className="mt-4 rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-bold text-violet-800"
          >
            {busy ? (
              <Loader2 size={17} className="mr-2 inline animate-spin" />
            ) : null}
            {status}
            {busy ? (
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-violet-600 transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>

          {result && page ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="self-start rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24">
                <h2 className="font-black">Comparison summary</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {result.originalPages} original pages aligned with{" "}
                  {result.revisedPages} revised pages.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                  {[
                    [result.changedPages, "Modified"],
                    [result.addedPages, "Inserted"],
                    [result.removedPages, "Removed"],
                    [result.unchangedPages, "Unchanged"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xl font-black">{value}</p>
                      <p className="text-[10px] font-black uppercase text-slate-500">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => downloadReport("json")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-black"
                  >
                    <FileJson2 size={15} /> JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport("csv")}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 text-xs font-black"
                  >
                    <FileSpreadsheet size={15} /> CSV
                  </button>
                </div>
                <div className="mt-4 max-h-[520px] space-y-2 overflow-auto pr-1">
                  {result.pages.map((item) => (
                    <button
                      key={item.pageNumber}
                      type="button"
                      onClick={() => setActivePage(item.pageNumber)}
                      className={`flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs font-black ${
                        activePage === item.pageNumber
                          ? "border-violet-400 bg-violet-50"
                          : "border-slate-200"
                      }`}
                    >
                      <span>{pageMappingLabel(item)}</span>
                      <span
                        className={`rounded-md px-2 py-1 text-[10px] uppercase ${STATUS_STYLES[item.status]}`}
                      >
                        {item.status}
                      </span>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Previous comparison row"
                      onClick={() =>
                        setActivePage((value) => Math.max(1, value - 1))
                      }
                      disabled={activePage <= 1}
                      className="rounded-xl border border-slate-200 p-2 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-sm font-black">
                      {pageMappingLabel(page)}
                    </span>
                    <button
                      type="button"
                      aria-label="Next comparison row"
                      onClick={() =>
                        setActivePage((value) =>
                          Math.min(result.pages.length, value + 1),
                        )
                      }
                      disabled={activePage >= result.pages.length}
                      className="rounded-xl border border-slate-200 p-2 disabled:opacity-40"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    {(["difference", "side-by-side"] as const).map(
                      (candidate) => (
                        <button
                          key={candidate}
                          type="button"
                          onClick={() => setView(candidate)}
                          className={`rounded-lg px-3 py-2 text-xs font-black capitalize ${
                            view === candidate ? "bg-white shadow" : ""
                          }`}
                        >
                          {candidate.replaceAll("-", " ")}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <div
                  className={`mt-4 gap-3 ${
                    view === "side-by-side" ? "grid md:grid-cols-2" : "block"
                  }`}
                >
                  {view === "difference" ? (
                    page.differencePreview ? (
                      <img
                        src={page.differencePreview}
                        alt={`Difference view for ${pageMappingLabel(page)}`}
                        className="mx-auto max-h-[720px] max-w-full border border-slate-200 bg-white"
                      />
                    ) : (
                      <div className="flex min-h-72 items-center justify-center rounded-2xl bg-slate-100 p-8 text-center font-bold text-slate-600">
                        A difference overlay is unavailable because this page
                        exists in only one document. Use side-by-side view.
                      </div>
                    )
                  ) : (
                    <>
                      {page.originalPreview ? (
                        <img
                          src={page.originalPreview}
                          alt={`Original page ${page.originalPageNumber}`}
                          className="w-full border border-slate-200"
                        />
                      ) : (
                        <div className="rounded-xl bg-slate-100 p-8 text-center font-bold">
                          Page absent from original
                        </div>
                      )}
                      {page.revisedPreview ? (
                        <img
                          src={page.revisedPreview}
                          alt={`Revised page ${page.revisedPageNumber}`}
                          className="w-full border border-slate-200"
                        />
                      ) : (
                        <div className="rounded-xl bg-slate-100 p-8 text-center font-bold">
                          Page absent from revision
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-black">
                      {page.visualDifferencePercent}%
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      Visual pixels changed
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-black">
                      {page.textDifference.similarity}%
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      Text similarity
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-lg font-black">
                      {page.textDifference.changedLineCount}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      Changed line operations
                    </p>
                  </div>
                </div>

                {page.textDifference.lineChanges.length ? (
                  <div className="mt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="font-black">Line-level changes</h3>
                      <span className="text-xs font-semibold text-slate-500">
                        Showing up to 40 changes
                      </span>
                    </div>
                    <div className="space-y-2">
                      {page.textDifference.lineChanges.map((change, index) => (
                        <LineChange
                          key={`${change.type}-${index}-${change.original}-${change.revised}`}
                          change={change}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600">
                    No extractable line-level text change was found on this
                    page. Visual differences may still be present.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => downloadReport("json")}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black"
                  >
                    <Download size={14} /> Download full audit report
                  </button>
                </div>
              </section>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
