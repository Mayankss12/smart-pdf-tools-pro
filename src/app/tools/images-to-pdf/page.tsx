"use client";

import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileImage,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { PdfEngineError, downloadBlob, formatFileSize, type PdfProcessingResult } from "@/lib/pdf-engine";
import {
  convertImagesToPdfEngine,
  getImageToPdfRejectedSummary,
  validateImageFiles,
} from "@/lib/pdf-image-engine";

type ImageQueueItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function createQueueId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;
  return "Conversion failed. Please check your images and try again.";
}

export default function ImagesToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<ImageQueueItem[]>([]);
  const [status, setStatus] = useState("Upload JPG, PNG, or WebP images to convert into PDF.");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PdfProcessingResult | null>(null);

  function addImages(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const incomingFiles = Array.from(selectedFiles);
    const validation = validateImageFiles(incomingFiles);
    const preparedImages = validation.accepted.map((file) => ({
      id: createQueueId(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    if (preparedImages.length > 0) {
      setImages((current) => [...current, ...preparedImages]);
      setResult(null);
    }

    const messageParts: string[] = [];
    if (preparedImages.length > 0) {
      messageParts.push(`Added ${preparedImages.length} image${preparedImages.length > 1 ? "s" : ""}.`);
    }

    const rejectedSummary = getImageToPdfRejectedSummary(validation.rejected);
    if (rejectedSummary) messageParts.push(rejectedSummary);

    setStatus(messageParts.join(" ") || "No supported images were selected.");
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
    setResult(null);
    setStatus("Image order updated.");
  }

  function removeImage(id: string) {
    setImages((current) => {
      const item = current.find((image) => image.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((image) => image.id !== id);
    });
    setResult(null);
    setStatus("Image removed from queue.");
  }

  function clearImages() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setResult(null);
    setStatus("Upload JPG, PNG, or WebP images to convert into PDF.");
  }

  async function handleConvert() {
    if (images.length === 0 || busy) {
      setStatus("Upload at least one supported image first.");
      return;
    }

    setBusy(true);
    setResult(null);
    setStatus("Converting images with PDFMantra image engine...");

    try {
      const output = await convertImagesToPdfEngine(images.map((image) => image.file));
      setResult(output);
      downloadBlob(output.blob, output.fileName);
      setStatus(`PDF created successfully from ${images.length} image${images.length > 1 ? "s" : ""}. Download started.`);
    } catch (error) {
      setResult(null);
      setStatus(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const totalSize = images.reduce((sum, item) => sum + item.file.size, 0);
  const canConvert = images.length > 0 && !busy;
  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("no supported");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-[2rem] border border-violet-100 bg-white shadow-[0_18px_50px_rgba(91,63,193,0.08)]">
            <section className="bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 px-6 py-12 text-white sm:px-10 lg:px-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide ring-1 ring-white/20">
                <FileImage size={14} />
                PDFMantra Image Engine
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                Images to PDF
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                Upload JPG, PNG, or WebP images, arrange the order, and convert them into one clean PDF.
              </p>
            </section>

            <section className="grid gap-0 lg:grid-cols-[1fr_360px]">
              <div className="border-r border-violet-100 bg-slate-50/70 p-5 sm:p-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => addImages(event.target.files || undefined)}
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addImages(event.dataTransfer.files);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
                  }}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer rounded-[1.75rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                >
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <Upload size={24} />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.02em] text-slate-950">Drop images here</div>
                  <div className="mt-2 text-sm font-medium text-slate-500">JPG, PNG, and WebP supported. PDF follows the order below.</div>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-slate-950">Image Order</h2>
                      <p className="mt-1 text-sm text-slate-600">Images are converted from top to bottom.</p>
                    </div>

                    {images.length > 0 ? (
                      <button
                        type="button"
                        onClick={clearImages}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={15} />
                        Clear all
                      </button>
                    ) : null}
                  </div>

                  {images.length === 0 ? (
                    <div className="mt-5 flex min-h-72 items-center justify-center rounded-[1.35rem] border border-dashed border-violet-100 bg-violet-50/40 text-center">
                      <div>
                        <ImageIcon className="mx-auto text-violet-300" size={38} />
                        <div className="mt-3 text-[15px] font-semibold text-slate-950">No images selected</div>
                        <p className="mt-1 text-sm text-slate-600">Add images to preview and convert them into PDF.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {images.map((item, index) => (
                        <div key={item.id} className="overflow-hidden rounded-[1.5rem] border border-violet-100 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                          <div className="flex items-center justify-between border-b border-violet-100 bg-slate-50 px-4 py-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-slate-900">{index + 1}. {item.file.name}</div>
                              <div className="text-xs font-semibold text-slate-500">{formatFileSize(item.file.size)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeImage(item.id)}
                              disabled={busy}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="flex min-h-52 items-center justify-center bg-slate-100 p-4">
                            <img src={item.previewUrl} alt={item.file.name} className="max-h-56 rounded-xl object-contain shadow-sm" />
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-violet-100 bg-white p-3">
                            <button
                              type="button"
                              onClick={() => moveImage(index, "up")}
                              disabled={index === 0 || busy}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp size={15} />
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveImage(index, "down")}
                              disabled={index === images.length - 1 || busy}
                              className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown size={15} />
                              Down
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <aside className="bg-white p-5 sm:p-6">
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">Conversion Summary</h2>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Images</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{images.length || "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Input size</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{images.length ? formatFileSize(totalSize) : "-"}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Output</div>
                      <div className="mt-1 text-xl font-semibold text-slate-950">{result ? formatFileSize(result.outputSize) : "-"}</div>
                    </div>
                  </div>

                  <button type="button" onClick={handleConvert} disabled={!canConvert} className="btn-primary mt-5 w-full">
                    {busy ? (
                      <><Loader2 className="animate-spin" size={18} /> Processing</>
                    ) : (
                      <><Download size={18} /> Convert & Download</>
                    )}
                  </button>
                </div>

                <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${statusLooksLikeError ? "border-red-100 bg-red-50 text-red-700" : "border-indigo-100 bg-indigo-50 text-indigo-800"}`}>
                  <div className="mb-1 flex items-center gap-2 font-semibold"><CheckCircle2 size={16} /> Status</div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-violet-100 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><FileImage size={16} /> Engine details</div>
                  WebP images are converted through browser canvas before PDF embedding. JPG and PNG are embedded directly where possible.
                </div>
              </aside>
            </section>
          </div>
        </section>
      </main>
    </>
  );
}
