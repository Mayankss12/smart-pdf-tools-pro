"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Layers,
  Loader2,
  Scissors,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { createZipBlob } from "@/lib/browser-zip";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  parsePageGroups,
  safeFileBaseName,
  splitPdfIntoGroups,
  validatePdfFile,
  type PageGroup,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) {
    return error.message;
  }

  return "Split failed. Please check your PDF and page groups.";
}

function getSelectedPages(groups: PageGroup[]) {
  return new Set(groups.flatMap((group) => group.pages));
}

function getUnassignedPages(pageCount: number, groups: PageGroup[]) {
  const selectedPages = getSelectedPages(groups);
  return Array.from({ length: pageCount }, (_, index) => index + 1).filter(
    (pageNumber) => !selectedPages.has(pageNumber),
  );
}

function getPagePreviewNumbers(pageCount: number) {
  return Array.from({ length: Math.min(pageCount, 40) }, (_, index) => index + 1);
}

export default function SplitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("1-4,5-8");
  const [pageCount, setPageCount] = useState(0);
  const [status, setStatus] = useState("Upload one PDF and define split groups.");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<PdfProcessingResult[]>([]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const groups = useMemo(() => {
    if (!file || pageCount <= 0) return [];

    try {
      return parsePageGroups(pageInput, pageCount);
    } catch {
      return [];
    }
  }, [file, pageCount, pageInput]);

  const selectedPageSet = useMemo(() => getSelectedPages(groups), [groups]);
  const unassignedPages = useMemo(
    () => (file ? getUnassignedPages(pageCount, groups) : []),
    [file, groups, pageCount],
  );
  const pagePreviewNumbers = useMemo(() => getPagePreviewNumbers(pageCount), [pageCount]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    setBusy(true);
    setResults([]);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);
      setStatus(
        `PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Define groups like 1-4,5-8.`,
      );
    } catch (error) {
      setFile(null);
      setPageCount(0);
      setResults([]);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setResults([]);
    setStatus("Upload one PDF and define split groups.");
  }

  function applyPreset(preset: string) {
    setPageInput(preset);
    setResults([]);
    setStatus(`Preset applied: ${preset}`);
  }

  async function handleSplit() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    setBusy(true);
    setResults([]);

    try {
      const parsedGroups = parsePageGroups(pageInput, pageCount);
      setStatus(`Creating ${parsedGroups.length} split PDF${parsedGroups.length > 1 ? "s" : ""}...`);

      const outputs = await splitPdfIntoGroups(file, parsedGroups);
      setResults(outputs);

      if (outputs.length === 1) {
        downloadBlob(outputs[0].blob, outputs[0].fileName);
        setStatus("Split completed. Downloaded 1 PDF.");
      } else {
        setStatus(`Packaging ${outputs.length} PDFs into one ZIP...`);
        const zipBlob = await createZipBlob(
          outputs.map((output) => ({
            fileName: output.fileName,
            blob: output.blob,
          })),
        );

        downloadBlob(zipBlob, `PDFMantra-split-${safeFileBaseName(file.name)}.zip`);
        setStatus(`Split completed. Downloaded 1 ZIP containing ${outputs.length} PDFs.`);
      }
    } catch (error) {
      setResults([]);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const hasValidGroups = file && groups.length > 0;
  const canSplit = Boolean(file && groups.length > 0 && !busy);
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Scissors}
            eyebrow="PDFMantra Engine Tool"
            title="Split PDFs into controlled page groups."
            description="Upload one PDF, preview the file, define exact page ranges like 1-4,5-8, and export each group as a separate PDF. Multiple outputs download together as one ZIP."
            meta={
              <div className="grid min-w-[260px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{groups.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Outputs</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedPageSet.size || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Selected</div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] lg:grid-cols-[1fr_390px]">
            <section className="min-h-[620px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  <Upload size={22} />
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}`
                    : "Click here or drag one PDF to begin."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              {previewUrl ? (
                <div className="mt-5 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-soft)]">
                  <div className="flex flex-col justify-between gap-3 border-b border-[var(--border-light)] px-5 py-4 sm:flex-row sm:items-center">
                    <div>
                      <h2 className="display-font text-[1.6rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">PDF Preview</h2>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Preview the uploaded PDF before creating split groups.</p>
                    </div>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)] transition hover:bg-[var(--violet-100)]"
                    >
                      <FileText size={16} />
                      Open preview
                    </a>
                  </div>
                  <div className="h-[520px] bg-slate-100">
                    <iframe
                      title="Uploaded PDF preview"
                      src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`}
                      className="h-full w-full border-0 bg-white"
                    />
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Visual Page Grid</h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Selected pages are based on the current page groups. Up to 40 pages are shown in this fast browser map.</p>
                  </div>

                  {file ? (
                    <button
                      type="button"
                      onClick={clearFile}
                      disabled={busy}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  ) : null}
                </div>

                {busy && !file ? (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : pagePreviewNumbers.length > 0 ? (
                  <div className="mt-5 grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10">
                    {pagePreviewNumbers.map((pageNumber) => {
                      const isSelected = selectedPageSet.has(pageNumber);

                      return (
                        <div
                          key={pageNumber}
                          className={`rounded-[1.5rem] border px-3 py-4 text-center text-sm font-semibold transition shadow-sm ${
                            isSelected
                              ? "border-transparent bg-[var(--violet-50)] text-[var(--violet-700)] shadow-[0_12px_30px_rgba(101,80,232,0.12)] ring-1 ring-[rgba(101,80,232,0.20)]"
                              : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] shadow-[0_4px_10px_rgba(15,23,42,0.04)]"
                          }`}
                        >
                          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Page</div>
                          <div className="mt-2 text-[1rem] font-bold">{pageNumber}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to build split groups.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Split Planner</h2>

                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Use commas to create separate files. Example <span className="rounded-lg border border-[var(--violet-border)] bg-white px-2 py-1 font-semibold text-[var(--violet-600)]">1-4,5-8</span> creates two PDFs.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => applyPreset("1")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">Page 1</button>
                  <button type="button" onClick={() => applyPreset("1-4,5-8")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">4-page sets</button>
                  <button type="button" onClick={() => applyPreset(pageCount ? `1-${pageCount}` : "1-3")} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]">All pages</button>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Page groups</span>
                  <input
                    value={pageInput}
                    onChange={(event) => {
                      setPageInput(event.target.value);
                      setResults([]);
                    }}
                    placeholder="Example: 1-4,5-8"
                    className="input-premium mt-2"
                  />
                </label>

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)]">
                    <Layers size={17} />
                    Output files
                  </div>

                  {hasValidGroups ? (
                    <div className="mt-3 space-y-2">
                      {groups.map((group, index) => (
                        <div key={`${group.label}-${index}`} className="rounded-xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-medium text-[var(--text-secondary)]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[var(--text-primary)]">Split file {index + 1}</span>
                            <span className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-2.5 py-1 text-xs font-semibold text-[var(--violet-600)]">
                              {group.pages.length} page{group.pages.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">Pages {group.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-[var(--violet-600)]">Upload a PDF and enter valid page groups.</p>
                  )}
                </div>

                {file && unassignedPages.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertTriangle size={16} />
                      Pages not included
                    </div>
                    {unassignedPages.length > 12
                      ? `${unassignedPages.length} pages are not included in the output groups.`
                      : `Pages ${unassignedPages.join(", ")} are not included.`}
                  </div>
                ) : null}

                {results.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={16} />
                      Last output
                    </div>
                    {results.length === 1
                      ? "1 PDF created."
                      : `${results.length} PDFs created and packed into one ZIP.`}
                  </div>
                ) : null}

                <button type="button" onClick={handleSplit} disabled={!canSplit} className="btn-primary mt-5 w-full">
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Splitting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>{groups.length > 1 ? "Split & Download ZIP" : "Split & Download"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Sparkles size={16} />
                  Engine grouping
                </div>
                One group downloads as a PDF. Multiple groups download together as one ZIP file.
              </div>

              <div
                className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[var(--shadow-soft)] ${
                  statusLooksLikeError
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Status
                </div>
                {status}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}
