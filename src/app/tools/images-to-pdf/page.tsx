"use client";

import { Header } from "@/components/Header";
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
import { PDFDocument } from "pdf-lib";
import { useRef, useState } from "react";

type ImageFile = {
  id: string;
  file: File;
  previewUrl: string;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type.startsWith("image/") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
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

async function imageFileToBytes(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function getImageDimensions(file: File) {
  const url = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image dimensions."));
      img.src = url;
    });

    return {
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function convertImagesToPdf(items: ImageFile[]) {
  const pdfDoc = await PDFDocument.create();

  for (const item of items) {
    const bytes = await imageFileToBytes(item.file);
    const name = item.file.name.toLowerCase();

    let embeddedImage;

    if (item.file.type === "image/png" || name.endsWith(".png")) {
      embeddedImage = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImage = await pdfDoc.embedJpg(bytes);
    }

    const dimensions = await getImageDimensions(item.file);

    const maxWidth = 595.28;
    const maxHeight = 841.89;

    const ratio = Math.min(
      maxWidth / dimensions.width,
      maxHeight / dimensions.height
    );

    const imageWidth = dimensions.width * ratio;
    const imageHeight = dimensions.height * ratio;

    const page = pdfDoc.addPage([maxWidth, maxHeight]);

    page.drawImage(embeddedImage, {
      x: (maxWidth - imageWidth) / 2,
      y: (maxHeight - imageHeight) / 2,
      width: imageWidth,
      height: imageHeight,
    });
  }

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function ImagesToPdfPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<ImageFile[]>([]);
  const [status, setStatus] = useState("Upload images to convert into PDF.");
  const [busy, setBusy] = useState(false);

  function addImages(selectedFiles?: FileList | File[]) {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const incomingFiles = Array.from(selectedFiles);
    const imageFiles = incomingFiles.filter(isImageFile);
    const rejectedCount = incomingFiles.length - imageFiles.length;

    if (imageFiles.length === 0) {
      setStatus("Please upload JPG, PNG, or WebP images.");
      return;
    }

    const preparedImages = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((prev) => [...prev, ...preparedImages]);

    const messageParts = [
      `Added ${preparedImages.length} image${
        preparedImages.length > 1 ? "s" : ""
      }.`,
    ];

    if (rejectedCount > 0) {
      messageParts.push(
        `${rejectedCount} unsupported file${
          rejectedCount > 1 ? "s were" : " was"
        } ignored.`
      );
    }

    setStatus(messageParts.join(" "));
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
    setStatus("Upload images to convert into PDF.");
  }

  async function handleConvert() {
    if (images.length === 0) {
      setStatus("Upload at least one image first.");
      return;
    }

    setBusy(true);
    setStatus("Converting images into PDF...");

    try {
      const pdfBlob = await convertImagesToPdf(images);

      downloadBlob(pdfBlob, "PDFMantra-images.pdf");
      setStatus("PDF created successfully. Download started.");
    } catch (error) {
      console.error(error);
      setStatus(
        "Conversion failed. Please try JPG or PNG images if WebP is unsupported."
      );
    } finally {
      setBusy(false);
    }
  }

  const totalSize = images.reduce((sum, item) => sum + item.file.size, 0);

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                    <FileImage size={14} />
                    PDFMantra Image Tool
                  </div>

                  <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                    Images to PDF
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                    Upload images, arrange the order, preview them, and convert
                    everything into one PDF.
                  </p>
                </div>

                <div className="hidden rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20 lg:block">
                  Click the drop zone below to upload images
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
            </div>

            <div className="grid lg:grid-cols-[1fr_360px]">
              <section className="min-h-[720px] border-r border-slate-200 bg-slate-50/70 p-5">
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
                  className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <ImageIcon size={23} />
                  </div>

                  <div className="font-black text-slate-950">
                    Drop images here
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    JPG, PNG and WebP supported. PDF follows the order below.
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                    <Upload size={17} />
                    Click here to choose images
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Image Order
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Images are converted from top to bottom.
                      </p>
                    </div>

                    {images.length > 0 && (
                      <button
                        onClick={clearImages}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Clear All
                      </button>
                    )}
                  </div>

                  {images.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <ImageIcon className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No images selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Add images to preview and convert them into PDF.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {images.map((item, index) => (
                        <div
                          key={item.id}
                          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                        >
                          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-700 text-xs font-black text-white">
                                {index + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="max-w-40 truncate text-sm font-black text-slate-900">
                                  {item.file.name}
                                </div>
                                <div className="text-xs font-bold text-slate-500">
                                  {formatFileSize(item.file.size)}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => removeImage(item.id)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
                              title="Remove"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="flex min-h-52 items-center justify-center bg-slate-100 p-4">
                            <img
                              src={item.previewUrl}
                              alt={item.file.name}
                              className="max-h-56 rounded-2xl object-contain shadow-sm"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-white p-3">
                            <button
                              onClick={() => moveImage(index, "up")}
                              disabled={index === 0}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp size={15} />
                              Up
                            </button>

                            <button
                              onClick={() => moveImage(index, "down")}
                              disabled={index === images.length - 1}
                              className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Down
                              <ArrowDown size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    PDF Summary
                  </h2>

                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Images
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {images.length}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Total size
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {images.length > 0 ? formatFileSize(totalSize) : "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConvert}
                    disabled={busy || images.length === 0}
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
                        Convert & Download
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("unsupported")
                      ? "border-red-100 bg-red-50 text-red-700"
                      : "border-amber-100 bg-amber-50 text-amber-900"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2 font-black">
                    <CheckCircle2 size={16} />
                    Status
                  </div>
                  {status}
                </div>

                <div className="mt-5 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                  <div className="font-black">How order works</div>
                  <p className="mt-2">
                    Each image becomes one PDF page. The first image in the
                    list becomes page 1.
                  </p>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
