"use client";

import { Header } from "@/components/Header";
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
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

type SplitGroup = {
  label: string;
  pages: number[];
};

type PdfThumb = {
  pageNumber: number;
  url: string;
};

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

function uniqueSortedNumbers(numbers: number[]) {
  return Array.from(new Set(numbers)).sort((a, b) => a - b);
}

function parseSplitGroups(input: string, totalPages: number): SplitGroup[] {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error("Enter page groups first. Example: 1-4,5-8");
  }

  const rawGroups = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (rawGroups.length === 0) {
    throw new Error("Enter valid page groups. Example: 1-4,5-8");
  }

  return rawGroups.map((groupText) => {
    const pages: number[] = [];

    if (groupText.includes("-")) {
      const pieces = groupText.split("-").map((part) => part.trim());

      if (pieces.length !== 2 || !pieces[0] || !pieces[1]) {
        throw new Error(`Invalid range: ${groupText}`);
      }

      const start = Number(pieces[0]);
      const end = Number(pieces[1]);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid page number in range: ${groupText}`);
      }

      if (start <= 0 || end <= 0) {
        throw new Error("Page number 0 is invalid. Pages start from 1.");
      }

      if (start > end) {
        throw new Error(`Invalid reversed range: ${groupText}`);
      }

      if (end > totalPages) {
        throw new Error(
          `Page ${end} is outside this PDF. Total pages: ${totalPages}.`
        );
      }

      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
    } else {
      const page = Number(groupText);

      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: ${groupText}`);
      }

      if (page <= 0) {
        throw new Error("Page number 0 is invalid. Pages start from 1.");
      }

      if (page > totalPages) {
        throw new Error(
          `Page ${page} is outside this PDF. Total pages: ${totalPages}.`
        );
      }

      pages.push(page);
    }

    return {
      label: groupText,
      pages: uniqueSortedNumbers(pages),
    };
  });
}

async function splitPdfIntoGroups(file: File, groups: SplitGroup[]) {
  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);

  const outputs: { blob: Blob; fileName: string; group: SplitGroup }[] = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const newPdf = await PDFDocument.create();

    const copiedPages = await newPdf.copyPages(
      sourcePdf,
      group.pages.map((pageNumber) => pageNumber - 1)
    );

    copiedPages.forEach((page) => newPdf.addPage(page));

    const pdfBytes = await newPdf.save();
    const cleanBaseName = file.name.replace(/\.pdf$/i, "");
    const safeGroupName = group.label.replace(/[^0-9,-]/g, "");

    outputs.push({
      blob: new Blob([pdfBytes], { type: "application/pdf" }),
      fileName: `PDFMantra-${cleanBaseName}-split-${index + 1}-${safeGroupName}.pdf`,
      group,
    });
  }

  return outputs;
}

async function getPdfPageCount(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);

  return pdf.getPageCount();
}

async function renderPdfThumbnails(
  file: File,
  maxPages = 16
): Promise<PdfThumb[]> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  const pdf = await loadingTask.promise;

  const thumbnails: PdfThumb[] = [];
  const totalToRender = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= totalToRender; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.34 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) continue;

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

    thumbnails.push({
      pageNumber,
      url: canvas.toDataURL("image/png"),
    });
  }

  return thumbnails;
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

export default function SplitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageInput, setPageInput] = useState("1-4,5-8");
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PdfThumb[]>([]);
  const [status, setStatus] = useState("Upload a PDF and define split groups.");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const groups = useMemo(() => {
    if (!pageCount) return [];

    try {
      return parseSplitGroups(pageInput, pageCount);
    } catch {
      return [];
    }
  }, [pageInput, pageCount]);

  const selectedPageSet = useMemo(() => {
    return new Set(groups.flatMap((group) => group.pages));
  }, [groups]);

  const unassignedPages = useMemo(() => {
    if (!pageCount) return [];

    const allPages = Array.from({ length: pageCount }, (_, index) => index + 1);

    return allPages.filter((page) => !selectedPageSet.has(page));
  }, [pageCount, selectedPageSet]);

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Loading PDF preview...");

    try {
      setFile(selectedFile);
      setThumbs([]);

      const totalPages = await getPdfPageCount(selectedFile);
      setPageCount(totalPages);

      const renderedThumbs = await renderPdfThumbnails(selectedFile, 16);
      setThumbs(renderedThumbs);

      setStatus(
        `PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Define groups like 1-4,5-8.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setThumbs([]);
      setStatus("Unable to load this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSplit() {
    if (!file) {
      setStatus("Please upload one PDF first.");
      return;
    }

    setBusy(true);

    try {
      const parsedGroups = parseSplitGroups(pageInput, pageCount);

      setStatus(
        `Creating ${parsedGroups.length} split file${
          parsedGroups.length > 1 ? "s" : ""
        }...`
      );

      const outputs = await splitPdfIntoGroups(file, parsedGroups);

      for (const output of outputs) {
        downloadBlob(output.blob, output.fileName);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setStatus(
        `Done. Downloaded ${outputs.length} split PDF${
          outputs.length > 1 ? "s" : ""
        }.`
      );
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Split failed.");
    } finally {
      setBusy(false);
    }
  }

  function clearFile() {
    setFile(null);
    setPageCount(0);
    setThumbs([]);
    setStatus("Upload a PDF and define split groups.");
  }

  function applyPreset(preset: string) {
    setPageInput(preset);
    setStatus(`Preset applied: ${preset}`);
  }

  const hasValidGroups = Boolean(file && groups.length > 0);
  const canSplit = Boolean(file && groups.length > 0 && !busy);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--pm-bg)] text-slate-950">
        <section className="relative overflow-hidden border-b border-violet-100/90">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[-15rem] top-[-13rem] h-[34rem] w-[34rem] rounded-full bg-violet-200/45 blur-3xl" />
            <div className="absolute right-[-16rem] top-[-10rem] h-[34rem] w-[34rem] rounded-full bg-rose-200/42 blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="grid gap-7 lg:grid-cols-[1fr_360px] lg:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8]/90 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700 shadow-sm backdrop-blur">
                  <Scissors size={13} />
                  PDFMantra Split Tool
                </div>

                <h1 className="display-font mt-5 max-w-4xl text-[2.35rem] font-medium leading-[1.08] tracking-[-0.045em] text-slate-950 sm:text-[2.9rem] lg:text-[3.35rem]">
                  Split PDFs into
                  <span className="block bg-gradient-to-r from-violet-700 via-violet-600 to-rose-500 bg-clip-text text-transparent">
                    clean page groups.
                  </span>
                </h1>

                <p className="mt-4 max-w-2xl text-[15px] font-medium leading-7 text-slate-600 sm:text-base">
                  Upload one PDF, preview its pages, define ranges like 1-4,5-8, and download separate files for each group.
                </p>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/84 p-4 shadow-[0_24px_70px_rgba(91,63,193,0.11)] backdrop-blur">
                <div className="grid grid-cols-3 divide-x divide-violet-100 text-center">
                  <div className="px-3 py-4">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-slate-950">
                      {pageCount || "-"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Pages
                    </div>
                  </div>

                  <div className="px-3 py-4">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-slate-950">
                      {groups.length || "-"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Outputs
                    </div>
                  </div>

                  <div className="px-3 py-4">
                    <div className="text-[1.45rem] font-bold tracking-[-0.03em] text-slate-950">
                      {selectedPageSet.size || "-"}
                    </div>
                    <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                      Selected
                    </div>
                  </div>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => handleFile(event.target.files?.[0])}
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid overflow-hidden rounded-[2rem] border border-violet-100 bg-[#fffdf8]/82 shadow-[0_18px_50px_rgba(91,63,193,0.08)] lg:grid-cols-[1fr_390px]">
            <section className="min-h-[700px] border-r border-violet-100 bg-[#fffaf4]/72 p-5 sm:p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                className="cursor-pointer rounded-[1.8rem] border-2 border-dashed border-violet-200 bg-gradient-to-br from-[#fffdf8] via-violet-50/52 to-rose-50/42 p-6 text-center transition hover:border-violet-400 hover:bg-white"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[1.15rem] bg-gradient-to-r from-violet-600 to-rose-500 text-white shadow-[0_18px_42px_rgba(91,63,193,0.22)]">
                  <FileText size={22} />
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-slate-950">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-slate-600">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                    : "Click here or drag one PDF to begin."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-violet-100 bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              <div className="mt-5 rounded-[1.8rem] border border-violet-100 bg-[#fffdf8]/92 p-5 shadow-[0_14px_36px_rgba(91,63,193,0.06)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-medium tracking-[-0.035em] text-slate-950">
                      Visual Page Map
                    </h2>
                    <p className="mt-1 text-sm font-medium text-slate-600">
                      Highlighted pages are included in your current split groups.
                    </p>
                  </div>

                  {file && (
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-rose-50/90 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  )}
                </div>

                {busy && thumbs.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] bg-violet-50/45">
                    <div className="flex items-center gap-2 rounded-full bg-[#fffdf8] px-4 py-3 text-sm font-semibold text-violet-700 shadow-sm">
                      <Loader2 className="animate-spin" size={18} />
                      Rendering preview
                    </div>
                  </div>
                ) : thumbs.length > 0 ? (
                  <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                    {thumbs.map((thumb) => {
                      const isSelected = selectedPageSet.has(thumb.pageNumber);

                      return (
                        <div
                          key={thumb.pageNumber}
                          className={`overflow-hidden rounded-[1.25rem] border bg-[#fffdf8] shadow-sm transition ${
                            isSelected
                              ? "border-violet-300 ring-4 ring-violet-100"
                              : "border-violet-100"
                          }`}
                        >
                          <div
                            className={`border-b px-3 py-2 text-xs font-semibold ${
                              isSelected
                                ? "border-violet-200 bg-violet-50/80 text-violet-700"
                                : "border-violet-100 bg-[#fffaf4] text-slate-600"
                            }`}
                          >
                            Page {thumb.pageNumber}
                          </div>

                          <div className="flex min-h-40 items-start justify-center bg-[#fffaf4] p-2">
                            <img
                              src={thumb.url}
                              alt={`Page ${thumb.pageNumber}`}
                              className="max-h-56 rounded border border-violet-100 bg-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-violet-100 bg-violet-50/30 text-center">
                    <div>
                      <FileText className="mx-auto text-violet-300" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-slate-950">
                        No PDF preview yet
                      </div>
                      <p className="mt-1 text-sm font-medium text-slate-600">
                        Upload a PDF to see page thumbnails and split planning.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[#fffdf8]/86 p-5 sm:p-6">
              <div className="rounded-[1.8rem] border border-violet-100 bg-gradient-to-br from-violet-50/72 via-[#fffdf8] to-rose-50/58 p-5 shadow-[0_14px_36px_rgba(91,63,193,0.06)]">
                <h2 className="display-font text-[1.75rem] font-medium tracking-[-0.035em] text-slate-950">
                  Split Planner
                </h2>

                <p className="mt-2 text-sm font-medium leading-6 text-slate-600">
                  Use commas to create separate output files. Example{" "}
                  <span className="rounded-lg bg-[#fffdf8] px-2 py-1 font-semibold text-violet-700">
                    1-4,5-8
                  </span>{" "}
                  creates two PDFs.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("1-1,2-2")}
                    className="rounded-2xl border border-violet-100 bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700"
                  >
                    First 2
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("1-4,5-8")}
                    className="rounded-2xl border border-violet-100 bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700"
                  >
                    4-page sets
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(pageCount ? `1-${pageCount}` : "1-3")
                    }
                    className="rounded-2xl border border-violet-100 bg-[#fffdf8] px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-violet-200 hover:bg-violet-50/70 hover:text-violet-700"
                  >
                    All pages
                  </button>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-slate-800">
                    Page groups
                  </span>

                  <input
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
                    placeholder="Example: 1-4,5-8"
                    className="input-premium mt-2"
                  />
                </label>

                <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/64 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-violet-800">
                    <Layers size={17} />
                    Output files
                  </div>

                  {hasValidGroups ? (
                    <div className="mt-3 space-y-2">
                      {groups.map((group, index) => (
                        <div
                          key={`${group.label}-${index}`}
                          className="rounded-xl bg-[#fffdf8] px-3 py-3 text-sm font-medium text-slate-700"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-900">
                              Split file {index + 1}
                            </span>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">
                              {group.pages.length} page
                              {group.pages.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-medium text-slate-500">
                            Pages {group.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-violet-700">
                      Upload a PDF to preview split output.
                    </p>
                  )}
                </div>

                {file && unassignedPages.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-sm font-medium leading-6 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertTriangle size={16} />
                      Pages not included
                    </div>
                    {unassignedPages.length > 12
                      ? `${unassignedPages.length} pages are not included in the output groups.`
                      : `Pages ${unassignedPages.join(", ")} are not included.`}
                  </div>
                )}

                <button
                  onClick={handleSplit}
                  disabled={!canSplit}
                  className="btn-primary mt-5 w-full"
                >
                  {busy ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      Splitting
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Split & Download
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-[#fffdf8] p-4 text-sm font-medium leading-6 text-slate-600 shadow-[0_12px_28px_rgba(91,63,193,0.05)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                  <Sparkles size={16} />
                  Smart grouping
                </div>
                Each comma-separated group becomes a separate PDF file.
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-violet-50/72 p-4 text-sm font-medium leading-6 text-violet-800 shadow-[0_12px_28px_rgba(91,63,193,0.05)]">
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
