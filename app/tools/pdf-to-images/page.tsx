"use client";

import { Header } from "@/components/Header";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
  imageBytes: Uint8Array;
  imageKind: "png" | "jpg";
  width: number;
  height: number;
};

type PageMode = "a4" | "image";
type FitMode = "contain" | "cover";

const A4 = {
  width: 595.28,
  height: 841.89,
};

function isImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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

async function readImage(file: File): Promise<ImageItem> {
  const previewUrl = URL.createObjectURL(file);
  const name = file.name.toLowerCase();

  const isJpg =
    file.type === "image/jpeg" ||
    file.type === "image/jpg" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg");

  const canUseOriginal =
    isJpg ||
    file.type === "image/png" ||
    name.endsWith(".png");

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to read image."));
    img.src = previewUrl;
  });

  if (canUseOriginal) {
    return {
      id: crypto.randomUUID(),
      file,
      previewUrl,
      imageBytes: new Uint8Array(await file.arrayBuffer()),
      imageKind: isJpg ? "jpg" : "png",
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    URL.revokeObjectURL(previewUrl);
    throw new Error("Unable to process image.");
  }

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (outputBlob) =>
        outputBlob
          ? resolve(outputBlob)
          : reject(new Error("Unable to convert image.")),
      "image/png"
    );
  });

  return {
    id: crypto.randomUUID(),
    file,
    previewUrl,
    imageBytes: new Uint8Array(await blob.arrayBuffer()),
    imageKind: "png",
    width: image.naturalWidth,
    height: image.naturalHeight,
  };
}

async function createPdfFromImages({
  images,
  pageMode,
  fitMode,
  margin,
}: {
  images: ImageItem[];
  pageMode: PageMode;
  fitMode: FitMode;
  margin: number;
}) {
  const pdfDoc = await PDFDocument.create();

  for (const image of images) {
    const embeddedImage =
      image.imageKind === "jpg"
        ? await pdfDoc.embedJpg(image.imageBytes)
        : await pdfDoc.embedPng(image.imageBytes);

    const pageWidth = pageMode === "image" ? image.width : A4.width;
    const pageHeight = pageMode === "image" ? image.height : A4.height;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const usableWidth = Math.max(20, pageWidth - margin * 2);
    const usableHeight = Math.max(20, pageHeight - margin * 2);

    const scale =
      fitMode === "cover"
        ? Math.max(usableWidth / image.width, usableHeight / image.height)
        : Math.min(usableWidth / image.width, usableHeight / image.height);

    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;

    page.drawImage(embeddedImage, {
      x: pageWidth / 2 - drawWidth / 2,
      y: pageHeight / 2 - drawHeight / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function ImagesToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [pageMode, setPageMode] = useState<PageMode>("a4");
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [margin, setMargin] = useState(24);
  const [status, setStatus] = useState("Upload images to create a PDF.");
  const [busy, setBusy] = useState(false);

  async function addImages(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const incomingFiles = Array.from(selectedFiles);
    const imageFiles = incomingFiles.filter(isImageFile);
    const rejectedCount = incomingFiles.length - imageFiles.length;

    if (imageFiles.length === 0) {
      setStatus("Please upload PNG, JPG, JPEG, or WebP images.");
      return;
    }

    setBusy(true);
    setStatus("Reading images and preparing preview...");

    try {
      const preparedImages: ImageItem[] = [];

      for (const file of imageFiles) {
        preparedImages.push(await readImage(file));
      }

      setImages((prev) => [...prev, ...preparedImages]);

      const messageParts = [
        `Added ${preparedImages.length} image${
          preparedImages.length > 1 ? "s" : ""
        }.`,
      ];

      if (rejectedCount > 0) {
        messageParts.push(
          `${rejectedCount} non-image file${
            rejectedCount > 1 ? "s were" : " was"
          } ignored.`
        );
      }

      setStatus(messageParts.join(" "));
    } catch (error) {
      console.error(error);
      setStatus("Unable to read one or more images. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function moveImage(index: number, direction: "up" | "down") {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });

    setStatus("Image order updated.");
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const item = prev.find((image) => image.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return prev.filter((image) => image.id !== id);
    });

    setStatus("Image removed.");
  }

  function clearImages() {
    images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setImages([]);
    setStatus("Upload images to create a PDF.");
  }

  async function handleCreatePdf() {
    if (images.length === 0) {
      setStatus("Upload at least one image first.");
      return;
    }

    setBusy(true);
    setStatus("Creating PDF from images...");

    try {
      const blob = await createPdfFromImages({
        images,
        pageMode,
        fitMode,
        margin,
      });

      downloadBlob(blob, "PDFMantra-images-to-pdf.pdf");
      setStatus(`Created PDF with ${images.length} page${images.length > 1 ? "s" : ""}. Download started.`);
    } catch (error) {
      console.error(error);
      setStatus("Unable to create PDF. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const totalSize = images.reduce((sum, item) => sum + item.file.size, 0);

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
                    <ImageIcon size={14} />
                    PDFMantra Image Tool
                  </div>

                  <h1 className="max-w-3xl text-4xl font-semibold leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl">
                    Create a PDF from images in a clean visual sequence.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-indigo-50/95">
                    Upload JPG, PNG, JPEG, or WebP images, arrange the order,
                    choose page layout, then export one polished PDF.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">{images.length}</div>
                      <div className="mt-1 text-xs font-medium text-indigo-50">
                        Images
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">
                        {images.length || "-"}
                      </div>
                      <div className="mt-1 text-xs font-medium text-indigo-50">
                        PDF pages
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white/12 p-4 ring-1 ring-white/15">
                      <div className="text-2xl font-semibold">
                        {images.length ? formatFileSize(totalSize) : "-"}
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
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => addImages(event.target.files || undefined)}
                />
              </div>
            </section>

            <div className="grid lg:grid-cols-[1fr_390px]">
              <section className="min-h-[700px] border-r border-slate-200 bg-slate-50/70 p-5 sm:p-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addImages(event.dataTransfer.files);
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
                    <FileImage size={22} />
                  </div>

                  <div className="font-semibold tracking-[-0.02em] text-slate-950">
                    Drop images here
                  </div>

                  <div className="mt-1 text-sm font-medium text-slate-500">
                    Add one or more images. The PDF follows the visual order below.
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700">
                    <Upload size={17} />
                    Choose images
                  </div>
                </div>

                <div className="mt-5 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-semibold tracking-[-0.03em] text-slate-950">
                        Image PDF Queue
                      </h2>
                      <p className="mt-1 text-sm font-medium text-slate-500">
                        Reorder images before creating the final PDF.
                      </p>
                    </div>

                    {images.length > 0 && (
                      <button
                        onClick={clearImages}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Clear all
                      </button>
                    )}
                  </div>

                  {busy && images.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-sm">
                        <Loader2 className="animate-spin text-indigo-600" size={18} />
                        Preparing images
                      </div>
                    </div>
                  ) : images.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <ImageIcon className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-semibold text-slate-900">
                          No images selected
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                          Upload images to build your PDF.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {images.map((item, index) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="text-sm font-semibold text-slate-800">
                              Page {index + 1}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => moveImage(index, "up")}
                                disabled={index === 0}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Move up"
                              >
                                <ArrowUp size={15} />
                              </button>

                              <button
                                onClick={() => moveImage(index, "down")}
                                disabled={index === images.length - 1}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Move down"
                              >
                                <ArrowDown size={15} />
                              </button>

                              <button
                                onClick={() => removeImage(item.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
                                title="Remove"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="flex min-h-64 items-center justify-center bg-slate-100 p-4">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="max-h-72 rounded border border-slate-200 bg-white object-contain shadow-sm"
                            />
                          </div>

                          <div className="border-t border-slate-200 bg-white p-4">
                            <div className="truncate text-sm font-semibold text-slate-950">
                              {item.file.name}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-medium">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
                                {formatFileSize(item.file.size)}
                              </span>

                              <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">
                                {item.width} × {item.height}
                              </span>
                            </div>
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
                    PDF Layout
                  </h2>

                  <div className="mt-4 space-y-3">
                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200">
                      <input
                        type="radio"
                        name="pageMode"
                        checked={pageMode === "a4"}
                        onChange={() => setPageMode("a4")}
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <div className="font-semibold text-slate-900">
                          A4 pages
                        </div>
                        <div className="mt-1 text-sm font-medium leading-5 text-slate-500">
                          Best for professional documents and printable files.
                        </div>
                      </div>
                    </label>

                    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-indigo-200">
                      <input
                        type="radio"
                        name="pageMode"
                        checked={pageMode === "image"}
                        onChange={() => setPageMode("image")}
                        className="mt-1 h-4 w-4"
                      />

                      <div>
                        <div className="font-semibold text-slate-900">
                          Match image size
                        </div>
                        <div className="mt-1 text-sm font-medium leading-5 text-slate-500">
                          Creates each PDF page using the original image dimensions.
                        </div>
                      </div>
                    </label>
                  </div>

                  <div className="mt-5">
                    <div className="text-sm font-semibold text-slate-800">
                      Image fitting
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFitMode("contain")}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          fitMode === "contain"
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Fit inside
                      </button>

                      <button
                        type="button"
                        onClick={() => setFitMode("cover")}
                        className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                          fitMode === "cover"
                            ? "border-indigo-600 bg-indigo-600 text-white"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        Fill page
                      </button>
                    </div>
                  </div>

                  <label className="mt-5 block">
                    <span className="flex justify-between text-sm font-semibold text-slate-800">
                      Margin
                      <span>{margin}px</span>
                    </span>

                    <input
                      type="range"
                      min={0}
                      max={80}
                      value={margin}
                      onChange={(event) => setMargin(Number(event.target.value))}
                      className="mt-3 w-full accent-indigo-600"
                    />
                  </label>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Images
                      </div>
                      <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {images.length}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Output pages
                      </div>
                      <div className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
                        {images.length || "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleCreatePdf}
                    disabled={busy || images.length === 0}
                    className="btn-primary mt-5 w-full"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Creating PDF
                      </>
                    ) : (
                      <>
                        <Download size={18} />
                        Create & Download PDF
                      </>
                    )}
                  </button>
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4 text-sm font-medium leading-6 text-indigo-800">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 text-sm font-medium leading-6 text-slate-600">
                  <div className="mb-1 flex items-center gap-2 font-semibold text-slate-900">
                    <FileText size={16} />
                    Smart sequence
                  </div>
                  Each image becomes one PDF page in the exact order shown in the queue.
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
