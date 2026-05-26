"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileStack,
  FileText,
  GripVertical,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  mergePdfFiles,
  validatePdfFile,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

type MergeQueueItem = {
  id: string;
  file: File;
};

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) {
    return error.message;
  }

  return "Merge failed. Please check your PDFs and try again.";
}

export default function MergePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<MergeQueueItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Upload two or more PDFs to merge.");
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  function addFiles(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const incomingFiles = Array.from(selectedFiles);
    const validItems: MergeQueueItem[] = [];
    const rejectedMessages: string[] = [];

    for (const file of incomingFiles) {
      try {
        validatePdfFile(file);
        validItems.push({ id: createQueueId(), file });
      } catch (error) {
        rejectedMessages.push(`${file.name}: ${getErrorMessage(error)}`);
      }
    }

    if (validItems.length > 0) {
      setItems((current) => [...current, ...validItems]);
      setResult(null);
    }

    const messages = [];

    if (validItems.length > 0) {
      messages.push(`Added ${validItems.length} PDF${validItems.length > 1 ? "s" : ""}.`);
    }

    if (rejectedMessages.length > 0) {
      messages.push(`${rejectedMessages.length} file${rejectedMessages.length > 1 ? "s were" : " was"} rejected.`);
    }

    setStatus(messages.join(" ") || "No valid PDFs were selected.");
  }

  function moveItem(index: number, direction: "up" | "down") {
    setItems((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    setResult(null);
    setStatus("Merge order updated.");
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    setResult(null);
    setStatus("PDF removed from the merge queue.");
  }

  function clearItems() {
    setItems([]);
    setResult(null);
    setStatus("Upload two or more PDFs to merge.");
  }

  async function handleMerge() {
    if (items.length < 2 || busy) {
      setStatus("Please upload at least two PDFs to merge.");
      return;
    }

    setBusy(true);
    setStatus("Merging PDFs with PDFMantra engine...");

    try {
      const output = await mergePdfFiles(items.map((item) => item.file));
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus(`Merged ${items.length} PDFs successfully. Download started.`);
    } catch (error) {
      console.error(error);
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const totalSize = items.reduce((sum, item) => sum + item.file.size, 0);
  const canMerge = items.length >= 2 && !busy;
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("rejected") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={FileStack}
            eyebrow="PDFMantra Engine Tool"
            title="Merge PDFs in a controlled document queue."
            description="Upload multiple PDFs, arrange the exact sequence, and export one polished PDF using the shared PDFMantra processing engine."
            meta={
              <div className="grid min-w-[260px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Files</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length >= 2 ? "Ready" : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">State</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length ? formatFileSize(totalSize) : "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Size</div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files || undefined)}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] lg:grid-cols-[1fr_380px]">
            <section className="min-h-[620px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  addFiles(event.dataTransfer.files);
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
                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">Drop PDFs here</div>
                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">Upload two or more PDFs. The final document follows the exact queue below.</div>
                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Upload size={17} />
                  Choose PDFs
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Merge Queue</h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Move files up or down before export. Order is preserved exactly.</p>
                  </div>

                  {items.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearItems}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <X size={15} />
                      Clear all
                    </button>
                  ) : null}
                </div>

                {items.length === 0 ? (
                  <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDFs in queue</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Add PDFs to build your merge sequence.</p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={item.id}
                        className="grid gap-4 rounded-[1.35rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 shadow-[var(--shadow-soft)] transition hover:border-[var(--violet-border)] hover:bg-[var(--violet-50)] md:grid-cols-[54px_1fr_auto]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] text-sm font-bold text-[var(--violet-600)]">
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-start gap-2">
                            <GripVertical size={18} className="mt-0.5 shrink-0 text-[var(--violet-400)]" />
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{item.file.name}</div>
                              <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold">
                                <span className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-1 text-[var(--violet-600)]">{formatFileSize(item.file.size)}</span>
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-emerald-700">Position {index + 1}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 md:flex-col">
                          <button
                            type="button"
                            onClick={() => moveItem(index, "up")}
                            disabled={index === 0 || busy}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move up"
                          >
                            <ArrowUp size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, "down")}
                            disabled={index === items.length - 1 || busy}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40"
                            title="Move down"
                          >
                            <ArrowDown size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            disabled={busy}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Remove"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Merge Summary</h2>

                <div className="mt-4 space-y-3">
                  <div className="rounded-[1.25rem] border border-[var(--border-light)] bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Files selected</div>
                    <div className="mt-1 text-[1.9rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length}</div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--border-light)] bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Input size</div>
                    <div className="mt-1 text-[1.9rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{items.length ? formatFileSize(totalSize) : "-"}</div>
                  </div>
                  <div className="rounded-[1.25rem] border border-[var(--border-light)] bg-white p-4">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Output size</div>
                    <div className="mt-1 text-[1.9rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{result ? formatFileSize(result.outputSize) : "-"}</div>
                  </div>
                </div>

                <button type="button" onClick={handleMerge} disabled={!canMerge} className="btn-primary mt-5 w-full">
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Merging</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Merge & Download</span>
                    </>
                  )}
                </button>

                <div className="mt-4 rounded-[1.25rem] border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Engine order
                  </div>
                  The exported PDF follows this queue from top to bottom.
                </div>
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
