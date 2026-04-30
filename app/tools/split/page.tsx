"use client";

import { Header } from "@/components/Header";
import {
  Download,
  FileText,
  Loader2,
  Scissors,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
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

async function renderPdfThumbnails(file: File, maxPages = 12): Promise<PdfThumb[]> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: buffer.slice(0) });
  const pdf = await loadingTask.promise;

  const thumbnails: PdfThumb[] = [];
  const totalToRender = Math.min(pdf.numPages, maxPages);

  for (let pageNumber = 1; pageNumber <= totalToRender; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.32 });

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

export default function SplitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageInput, setPageInput] = useState("1-4,5-8");
  const [pageCount, setPageCount] = useState(0);
  const [thumbs, setThumbs] = useState<PdfThumb[]>([]);
  const [status, setStatus] = useState("Upload a PDF and enter split groups.");
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

  async function handleFile(selectedFile?: File) {
    if (!selectedFile) return;

    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
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
        `PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Enter groups like 1-4,5-8.`
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

      setStatus(`Creating ${parsedGroups.length} split file${parsedGroups.length > 1 ? "s" : ""}...`);

      const outputs = await splitPdfIntoGroups(file, parsedGroups);

      for (const output of outputs) {
        downloadBlob(output.blob, output.fileName);

        // Small delay helps browser handle multiple downloads better.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      setStatus(
        `Done. Downloaded ${outputs.length} split PDF${outputs.length > 1 ? "s" : ""}.`
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
    setStatus("Upload a PDF and enter split groups.");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                    <Scissors size={14} />
                    PDFMantra Split Tool
                  </div>

                  <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                    Split PDF
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                    Split one PDF into separate files using groups like{" "}
                    <span className="rounded bg-white/15 px-2 py-1">1-4,5-8</span>.
                  </p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/20 transition hover:bg-amber-300"
                >
                  <Upload size={18} />
                  Upload PDF
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </div>
            </div>

            <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
              <section className="min-h-[720px] border-r border-slate-200 bg-slate-50/70 p-5">
                <div
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  className="rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <FileText size={23} />
                  </div>

                  <div className="font-black text-slate-950">
                    {file ? file.name : "Drop your PDF here"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    {file
                      ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                      : "Click upload or drag one PDF file here."}
                  </div>

                  {file && (
                    <button
                      onClick={clearFile}
                      className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                    >
                      <X size={15} />
                      Remove PDF
                    </button>
                  )}
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-950">
                        PDF Preview
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Showing up to first 16 pages for quick selection.
                      </p>
                    </div>
                  </div>

                  {busy && thumbs.length === 0 ? (
                    <div className="mt-5 flex min-h-64 items-center justify-center rounded-3xl bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={18} />
                        Rendering preview
                      </div>
                    </div>
                  ) : thumbs.length > 0 ? (
                    <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                      {thumbs.map((thumb) => (
                        <div
                          key={thumb.pageNumber}
                          className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm"
                        >
                          <div className="border-b border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                            Page {thumb.pageNumber}
                          </div>
                          <div className="flex min-h-40 items-start justify-center bg-slate-100 p-2">
                            <img
                              src={thumb.url}
                              alt={`Page ${thumb.pageNumber}`}
                              className="max-h-56 rounded border border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-5 flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <FileText className="mx-auto text-slate-400" size={36} />
                        <div className="mt-3 font-black text-slate-800">
                          No PDF preview yet
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to see page thumbnails.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Split Settings
                  </h2>

                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Use comma to create separate split files. Example:{" "}
                    <span className="rounded-lg bg-white px-2 py-1 font-black text-indigo-700">
                      1-4,5-8
                    </span>{" "}
                    creates two PDFs.
                  </p>

                  <label className="mt-5 block">
                    <span className="text-sm font-black text-slate-800">
                      Page groups
                    </span>

                    <input
                      value={pageInput}
                      onChange={(event) => setPageInput(event.target.value)}
                      placeholder="Example: 1-4,5-8"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                    <div className="flex items-center gap-2 text-sm font-black text-indigo-800">
                      <CheckCircle2 size={17} />
                      Output summary
                    </div>

                    {file && groups.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {groups.map((group, index) => (
                          <div
                            key={`${group.label}-${index}`}
                            className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-700"
                          >
                            File {index + 1}: pages {group.label}
                            <div className="text-xs font-semibold text-slate-500">
                              {group.pages.length} page
                              {group.pages.length > 1 ? "s" : ""}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm font-semibold text-indigo-700">
                        Upload a PDF to preview split output.
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleSplit}
                    disabled={busy || !file}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-4 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Processing
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Split into files
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("invalid") ||
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("outside") ||
                    status.toLowerCase().includes("reversed")
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-black">
                    <AlertTriangle size={16} />
                    Status
                  </div>
                  {status}
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-600">
                  <div className="font-black text-slate-950">Examples</div>
                  <div className="mt-2 space-y-1">
                    <div>
                      <span className="font-black text-indigo-700">1-4</span> = one PDF
                    </div>
                    <div>
                      <span className="font-black text-indigo-700">1-4,5-8</span> = two PDFs
                    </div>
                    <div>
                      <span className="font-black text-indigo-700">1-4,5,6-7</span> = three PDFs
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
