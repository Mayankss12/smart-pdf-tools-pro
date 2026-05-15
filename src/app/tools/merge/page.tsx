"use client";

import { Header } from "@/components/Header";
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Download,
  FileStack,
  FileText,
  GripVertical,
  Loader2,
  Merge,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

type MergeFile = {
  id: string;
  file: File;
  thumbUrl?: string;
  pageCount?: number;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

async function renderFirstPageThumbnail(file: File) {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 0.42 });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    return {
      thumbUrl: "",
      pageCount: pdf.numPages,
    };
  }

  const outputScale = window.devicePixelRatio || 1;

  canvas.width = Math.floor(viewport.width * outputScale);
  canvas.height = Math.floor(viewport.height * outputScale);
  canvas.style.width = `${viewport.width}px`;
  canvas.style.height = `${viewport.height}px`;

  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

  await page.render({
    canvasContext: context,
    viewport,
  }).promise;

  return {
    thumbUrl: canvas.toDataURL("image/png"),
    pageCount: pdf.numPages,
  };
}

async function mergePdfFiles(files: File[]) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const sourcePdf = await PDFDocument.load(arrayBuffer);

    const copiedPages = await mergedPdf.copyPages(
      sourcePdf,
      sourcePdf.getPageIndices()
    );

    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function MergePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<MergeFile[]>([]);
  const [status, setStatus] = useState("Upload two or more PDFs to merge.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  async function addFiles(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const incomingFiles = Array.from(selectedFiles);
    const pdfFiles = incomingFiles.filter(isPdfFile);
    const rejectedCount = incomingFiles.length - pdfFiles.length;

    if (pdfFiles.length === 0) {
      setStatus("Please upload valid PDF files only.");
      return;
    }

    setBusy(true);
    setStatus("Reading PDFs and preparing previews...");

    try {
      const preparedFiles: MergeFile[] = [];

      for (const file of pdfFiles) {
        const item: MergeFile = {
          id: crypto.randomUUID(),
          file,
        };

        try {
          const preview = await renderFirstPageThumbnail(file);
          item.thumbUrl = preview.thumbUrl;
          item.pageCount = preview.pageCount;
        } catch (error) {
          console.error(error);
          item.thumbUrl = "";
        }

        preparedFiles.push(item);
      }

      setFiles((prev) => [...prev, ...preparedFiles]);

      const messageParts = [
        `Added ${preparedFiles.length} PDF file${
          preparedFiles.length > 1 ? "s" : ""
        }.`,
      ];

      if (rejectedCount > 0) {
        messageParts.push(
          `${rejectedCount} non-PDF file${
            rejectedCount > 1 ? "s were" : " was"
          } ignored.`
        );
      }

      setStatus(messageParts.join(" "));
    } catch (error) {
      console.error(error);
      setStatus("Unable to add PDFs. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function moveFile(index: number, direction: "up" | "down") {
    setFiles((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    setStatus("Merge order updated.");
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((item) => item.id !== id));
    setStatus("PDF removed from merge list.");
  }

  function clearFiles() {
    setFiles([]);
    setStatus("Upload two or more PDFs to merge.");
  }

  async function handleMerge() {
    if (files.length < 2) {
      setStatus("Please upload at least 2 PDFs to merge.");
      return;
    }

    setBusy(true);
    setStatus("Merging PDFs in the selected order...");

    try {
      const orderedFiles = files.map((item) => item.file);
      const mergedBlob = await mergePdfFiles(orderedFiles);

      downloadBlob(mergedBlob, "PDFMantra-merged.pdf");
      setStatus(`Merged ${files.length} PDFs successfully. Download started.`);
    } catch (error) {
      console.error(error);
      setStatus("Merge failed. Please check your PDFs and try again.");
    } finally {
      setBusy(false);
    }
  }

  const totalPages = files.reduce((sum, item) => sum + (item.pageCount || 0), 0);
  const totalSize = files.reduce((sum, item) => sum + item.file.size, 0);
  const canMerge = files.length >= 2 && !busy;

  return (
    <>
      <Header />

      <main className="page-shell">
        <section className="page-container">
          <div className="surface overflow-hidden">
            <section className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-indigo-700 via-violet-700 to-purple-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="absolute right-[-140px] top-[-140px] h-80 w-80 rounded-full bg-white/10 blur-3xl" />
              <div className="absolute bottom-[-160px] left-[-120px] h-96 w-96 rounded-full bg-amber-300/10 blur-3xl" />

              <div className="relative grid gap-8 lg:grid-cols-[1fr_360px] lg:items-center">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white ring-1 ring-white/20">
                    <Merge size={14} />
                    PDFMantra Merge Tool
                  </div>

                  <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                    Merge PDFs in a clean visual sequence.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                    Upload multiple PDFs, preview the first page, arrange the exact order,
                    then merge everything into one polished document.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">{files.length}</div>
                      <div className="mt-1 text-xs font-medium text-indigo-50">
                        Files
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">
                        {totalPages || "-"}
                      </div>
                      <div className="mt-1 text-xs font-medium text-indigo-50">
                        Pages
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">
                        {files.length ? formatFileSize(totalSize) : "-"}
                      </div>
                      <div className="mt-1 text-xs font-medium text-indigo-50">
                        Size
                      </div>
                    </div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => addFiles(event.target.files || undefined)}
                />
              </div>
            </section>

            <div className="grid lg:grid-cols-[1fr_380px]">
              <section className="min-h-[700px] border-r border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addFiles(event.dataTransfer.files);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      fileInputRef.current?.click();
                    }
                  }}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-sm shadow-indigo-200">
                    <FileStack size={22} />
                  </div>

                  <div className="font-semibold tracking-[-0.02em] text-slate-950">
                    Drop PDFs here
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-500">
                    Upload two or more PDFs. The final document follows the sequence below.
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    <Upload size={17} />
                    Choose PDFs
                  </div>
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                        Smart Merge Queue
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Reorder files before merging. Top file becomes the first part of the final PDF.
                      </p>
                    </div>

                    {files.length > 0 && (
                      <button
                        onClick={clearFiles}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Clear all
                      </button>
                    )}
                  </div>

                  {busy && files.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        Preparing PDFs
                      </div>
                    </div>
                  ) : files.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <FileText className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-semibold text-slate-900">
                          No PDFs in queue
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Add multiple PDFs to build your merge sequence.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {files.map((item, index) => (
                        <div
                          key={item.id}
                          className="group grid gap-4 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md md:grid-cols-[54px_84px_1fr_auto]"
                        >
                          <div className="flex items-start gap-3 md:block">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-semibold text-indigo-700">
                              {index + 1}
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                            {item.thumbUrl ? (
                              <img
                                src={item.thumbUrl}
                                alt={`Preview of ${item.file.name}`}
                                className="h-28 w-full object-contain"
                              />
                            ) : (
                              <div className="flex h-28 items-center justify-center">
                                <FileText size={26} className="text-slate-400" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-start gap-2">
                              <GripVertical
                                size={18}
                                className="mt-0.5 shrink-0 text-slate-300"
                              />
                              <div className="min-w-0">
                                <div className="truncate text-base font-semibold tracking-[-0.02em] text-slate-950">
                                  {item.file.name}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                    {formatFileSize(item.file.size)}
                                  </span>

                                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                                    {item.pageCount
                                      ? `${item.pageCount} page${
                                          item.pageCount > 1 ? "s" : ""
                                        }`
                                      : "Pages loading"}
                                  </span>

                                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                    Position {index + 1}
                                  </span>
                                </div>

                                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">
                                  This PDF will be placed{" "}
                                  <span className="font-semibold text-slate-800">
                                    {index === 0
                                      ? "at the beginning"
                                      : index === files.length - 1
                                        ? "at the end"
                                        : `after file ${index}`}
                                  </span>{" "}
                                  in the merged document.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 md:flex-col">
                            <button
                              onClick={() => moveFile(index, "up")}
                              disabled={index === 0}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Move up"
                            >
                              <ArrowUp size={17} />
                            </button>

                            <button
                              onClick={() => moveFile(index, "down")}
                              disabled={index === files.length - 1}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Move down"
                            >
                              <ArrowDown size={17} />
                            </button>

                            <button
                              onClick={() => removeFile(item.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
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

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                    Merge Summary
                  </h2>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Files selected
                      </div>
                      <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {files.length}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total pages
                      </div>
                      <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {totalPages || "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Total size
                      </div>
                      <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {files.length > 0 ? formatFileSize(totalSize) : "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleMerge}
                    disabled={!canMerge}
                    className="btn-primary mt-5 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Merging
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Merge & Download
                      </>
                    )}
                  </button>

                  <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={16} />
                      Smart order
                    </div>
                    The final PDF follows the exact order shown in the merge queue.
                  </div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <ArrowRight size={16} />
                    Workflow
                  </div>
                  Add PDFs, review the sequence, adjust order, then merge into
                  one document.
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
