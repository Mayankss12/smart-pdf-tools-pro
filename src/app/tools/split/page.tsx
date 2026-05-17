"use client";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
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

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Scissors}
            eyebrow="PDFMantra Split PDF"
            title="Split PDFs into clean page groups."
            description="Upload one PDF, preview its pages, define ranges like 1-4,5-8, and download separate files for every group you create."
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
            <section className="min-h-[700px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
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
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  <FileText size={22} />
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                    : "Click here or drag one PDF to begin."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <div>
                    <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Visual Page Map
                    </h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      Highlighted pages are included in your current split groups.
                    </p>
                  </div>

                  {file && (
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  )}
                </div>

                {busy && thumbs.length === 0 ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
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
                          className={`overflow-hidden rounded-[1.25rem] border bg-[var(--bg-card)] shadow-[var(--shadow-soft)] transition ${
                            isSelected
                              ? "border-[var(--border-focus)] ring-4 ring-[rgba(101,80,232,0.12)]"
                              : "border-[var(--border-light)]"
                          }`}
                        >
                          <div
                            className={`border-b px-3 py-2 text-xs font-semibold ${
                              isSelected
                                ? "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                                : "border-[var(--border-light)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
                            }`}
                          >
                            Page {thumb.pageNumber}
                          </div>

                          <div className="flex min-h-40 items-start justify-center bg-[var(--bg-panel)] p-2">
                            <img
                              src={thumb.url}
                              alt={`Page ${thumb.pageNumber}`}
                              className="max-h-56 rounded border border-[var(--border-light)] bg-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={38} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">
                        No PDF preview yet
                      </div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                        Upload a PDF to see page thumbnails and split planning.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                  Split Planner
                </h2>

                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Use commas to create separate output files. Example{" "}
                  <span className="rounded-lg border border-[var(--violet-border)] bg-white px-2 py-1 font-semibold text-[var(--violet-600)]">
                    1-4,5-8
                  </span>{" "}
                  creates two PDFs.
                </p>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyPreset("1-1,2-2")}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                  >
                    First 2
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPreset("1-4,5-8")}
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                  >
                    4-page sets
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      applyPreset(pageCount ? `1-${pageCount}` : "1-3")
                    }
                    className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)]"
                  >
                    All pages
                  </button>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    Page groups
                  </span>

                  <input
                    value={pageInput}
                    onChange={(event) => setPageInput(event.target.value)}
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
                        <div
                          key={`${group.label}-${index}`}
                          className="rounded-xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-medium text-[var(--text-secondary)]"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[var(--text-primary)]">
                              Split file {index + 1}
                            </span>
                            <span className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-2.5 py-1 text-xs font-semibold text-[var(--violet-600)]">
                              {group.pages.length} page
                              {group.pages.length > 1 ? "s" : ""}
                            </span>
                          </div>

                          <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">
                            Pages {group.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-[var(--violet-600)]">
                      Upload a PDF to preview split output.
                    </p>
                  )}
                </div>

                {file && unassignedPages.length > 0 && (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
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
                      <span>Splitting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Split & Download</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Sparkles size={16} />
                  Smart grouping
                </div>
                Each comma-separated group becomes a separate PDF file.
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--violet-border)] bg-[var(--violet-50)] p-4 text-sm font-medium leading-6 text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
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
