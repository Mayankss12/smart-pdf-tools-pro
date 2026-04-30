"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Download,
  FileSignature,
  FileText,
  Grip,
  Image as ImageIcon,
  Loader2,
  PenLine,
  RotateCcw,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { MouseEvent, useEffect, useMemo, useRef, useState } from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type SignatureMode = "text" | "image";
type SignatureStyle = "clean" | "bold" | "italic";

type SignaturePosition = {
  xPercent: number;
  yPercent: number;
};

type SignatureImage = {
  file: File;
  previewUrl: string;
  pngBytes: Uint8Array;
  width: number;
  height: number;
};

const STYLE_OPTIONS: Array<{
  value: SignatureStyle;
  label: string;
  font: StandardFonts;
  previewClass: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    font: StandardFonts.Helvetica,
    previewClass: "font-semibold not-italic",
  },
  {
    value: "bold",
    label: "Bold",
    font: StandardFonts.HelveticaBold,
    previewClass: "font-black not-italic",
  },
  {
    value: "italic",
    label: "Italic",
    font: StandardFonts.HelveticaOblique,
    previewClass: "font-semibold italic",
  },
];

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
}

function isSignatureImageFile(file: File) {
  const name = file.name.toLowerCase();

  return (
    file.type.startsWith("image/") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
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

async function loadPdfFromFile(file: File) {
  const buffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: buffer.slice(0),
  });

  return loadingTask.promise;
}

async function renderPdfPageToPng(
  pdf: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale: number
) {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to create canvas preview.");
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

  return canvas.toDataURL("image/png");
}

async function convertImageToPngBytes(file: File): Promise<{
  pngBytes: Uint8Array;
  width: number;
  height: number;
}> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read signature image."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to process signature image.");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((outputBlob) => {
        if (!outputBlob) {
          reject(new Error("Unable to convert signature image."));
          return;
        }

        resolve(outputBlob);
      }, "image/png");
    });

    const arrayBuffer = await blob.arrayBuffer();

    return {
      pngBytes: new Uint8Array(arrayBuffer),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function addTextSignatureToPdf({
  file,
  signerName,
  position,
  fontSize,
  style,
}: {
  file: File;
  signerName: string;
  position: SignaturePosition;
  fontSize: number;
  style: SignatureStyle;
}) {
  const selectedStyle =
    STYLE_OPTIONS.find((option) => option.value === style) || STYLE_OPTIONS[0];

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const font = await pdfDoc.embedFont(selectedStyle.font);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("This PDF has no pages.");
  }

  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();
  const label = `Signed by ${signerName}`;
  const textWidth = font.widthOfTextAtSize(label, fontSize);

  const x = Math.min(
    Math.max(12, (position.xPercent / 100) * width - textWidth / 2),
    width - textWidth - 12
  );

  const y = Math.min(
    Math.max(12, height - (position.yPercent / 100) * height - fontSize / 2),
    height - fontSize - 12
  );

  firstPage.drawText(label, {
    x,
    y,
    size: fontSize,
    font,
    color: rgb(0.18, 0.14, 0.52),
    opacity: 0.95,
  });

  firstPage.drawLine({
    start: { x, y: y - 6 },
    end: { x: x + Math.min(textWidth, 180), y: y - 6 },
    thickness: 1,
    color: rgb(0.18, 0.14, 0.52),
    opacity: 0.65,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

async function addImageSignatureToPdf({
  file,
  signatureImage,
  position,
  imageWidthPercent,
}: {
  file: File;
  signatureImage: SignatureImage;
  position: SignaturePosition;
  imageWidthPercent: number;
}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("This PDF has no pages.");
  }

  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const embeddedImage = await pdfDoc.embedPng(signatureImage.pngBytes);

  const imageWidth = width * (imageWidthPercent / 100);
  const imageHeight =
    imageWidth * (signatureImage.height / Math.max(signatureImage.width, 1));

  const x = Math.min(
    Math.max(12, (position.xPercent / 100) * width - imageWidth / 2),
    width - imageWidth - 12
  );

  const y = Math.min(
    Math.max(12, height - (position.yPercent / 100) * height - imageHeight / 2),
    height - imageHeight - 12
  );

  firstPage.drawImage(embeddedImage, {
    x,
    y,
    width: imageWidth,
    height: imageHeight,
    opacity: 0.98,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function FillSignPage() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const dragAreaRef = useRef<HTMLDivElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>("text");
  const [signerName, setSignerName] = useState("Mayank Singh");
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>("italic");
  const [fontSize, setFontSize] = useState(16);

  const [signatureImage, setSignatureImage] = useState<SignatureImage | null>(
    null
  );
  const [imageWidthPercent, setImageWidthPercent] = useState(24);

  const [position, setPosition] = useState<SignaturePosition>({
    xPercent: 78,
    yPercent: 88,
  });

  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState(
    "Upload a PDF, choose signature type, place it on page 1, then export."
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      if (!isDragging || !dragAreaRef.current) return;

      const rect = dragAreaRef.current.getBoundingClientRect();

      const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
      const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

      setPosition({
        xPercent: Math.min(96, Math.max(4, xPercent)),
        yPercent: Math.min(96, Math.max(4, yPercent)),
      });
    }

    function handleMouseUp() {
      if (isDragging) {
        setIsDragging(false);
        setStatus("Signature position updated.");
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const selectedPreviewClass = useMemo(() => {
    return (
      STYLE_OPTIONS.find((option) => option.value === signatureStyle)
        ?.previewClass || STYLE_OPTIONS[0].previewClass
    );
  }, [signatureStyle]);

  async function handlePdfFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Rendering PDF preview...");

    try {
      setFile(selectedFile);
      setPreviews([]);

      const pdf = await loadPdfFromFile(selectedFile);
      setPageCount(pdf.numPages);

      const nextPreviews: PdfPagePreview[] = [];
      const pagesToPreview = Math.min(pdf.numPages, 12);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.35);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);
      setStatus(
        `PDF loaded with ${pdf.numPages} page${
          pdf.numPages > 1 ? "s" : ""
        }. Drag signature on page 1 preview to set placement.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignatureImage(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isSignatureImageFile(selectedFile)) {
      setStatus("Please upload PNG, JPG, or WebP signature image.");
      return;
    }

    setBusy(true);
    setStatus("Importing signature image...");

    try {
      if (signatureImage) {
        URL.revokeObjectURL(signatureImage.previewUrl);
      }

      const converted = await convertImageToPngBytes(selectedFile);

      setSignatureImage({
        file: selectedFile,
        previewUrl: URL.createObjectURL(selectedFile),
        pngBytes: converted.pngBytes,
        width: converted.width,
        height: converted.height,
      });

      setSignatureMode("image");
      setStatus("Signature image imported. Drag it on page 1 preview.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to import signature image. Try PNG or JPG.");
    } finally {
      setBusy(false);
    }
  }

  function clearPdf() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setStatus("Upload a PDF, choose signature type, place it on page 1, then export.");
  }

  function clearSignatureImage() {
    if (signatureImage) {
      URL.revokeObjectURL(signatureImage.previewUrl);
    }

    setSignatureImage(null);
    setSignatureMode("text");
    setStatus("Signature image removed. Text signature mode selected.");
  }

  function resetPosition() {
    setPosition({
      xPercent: 78,
      yPercent: 88,
    });

    setStatus("Signature position reset.");
  }

  function startDrag(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    setStatus("Dragging signature position...");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (signatureMode === "text" && !signerName.trim()) {
      setStatus("Enter signer name first.");
      return;
    }

    if (signatureMode === "image" && !signatureImage) {
      setStatus("Upload a signature image first.");
      return;
    }

    setBusy(true);
    setStatus("Adding signature to PDF...");

    try {
      const blob =
        signatureMode === "image" && signatureImage
          ? await addImageSignatureToPdf({
              file,
              signatureImage,
              position,
              imageWidthPercent,
            })
          : await addTextSignatureToPdf({
              file,
              signerName: signerName.trim(),
              position,
              fontSize,
              style: signatureStyle,
            });

      downloadBlob(blob, "PDFMantra-signed.pdf");
      setStatus("Signed PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error ? error.message : "Signature export failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function renderSignaturePreview() {
    if (signatureMode === "image") {
      if (!signatureImage) {
        return (
          <div className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-lg ring-1 ring-slate-200">
            Upload signature image
          </div>
        );
      }

      return (
        <div
          onMouseDown={startDrag}
          className="absolute z-20 cursor-move rounded-2xl border border-indigo-300 bg-white/80 p-2 shadow-xl ring-4 ring-indigo-100"
          style={{
            left: `${position.xPercent}%`,
            top: `${position.yPercent}%`,
            transform: "translate(-50%, -50%)",
            width: `${imageWidthPercent * 2.2}px`,
            minWidth: 70,
            maxWidth: 220,
          }}
          title="Drag signature image"
        >
          <div className="mb-1 flex items-center gap-1 text-[10px] font-black text-indigo-700">
            <Grip size={11} />
            Drag
          </div>
          <img
            src={signatureImage.previewUrl}
            alt="Signature preview"
            className="h-auto w-full object-contain"
          />
        </div>
      );
    }

    return (
      <div
        onMouseDown={startDrag}
        className={`absolute z-20 inline-flex cursor-move items-center gap-1 rounded-2xl border border-indigo-300 bg-white/95 px-3 py-2 text-indigo-700 shadow-xl ring-4 ring-indigo-100 ${selectedPreviewClass}`}
        style={{
          left: `${position.xPercent}%`,
          top: `${position.yPercent}%`,
          transform: "translate(-50%, -50%)",
          fontSize: Math.max(11, fontSize * 0.78),
        }}
        title="Drag signature"
      >
        <Grip size={12} />
        Signed by {signerName || "Your name"}
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-7xl px-5 py-8">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white shadow-xl shadow-indigo-100/50">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold ring-1 ring-white/20">
                  <FileSignature size={14} />
                  PDFMantra Fill & Sign
                </div>

                <h1 className="text-4xl font-black tracking-[-0.03em] md:text-5xl">
                  Fill & Sign PDF
                </h1>

                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Add a text signature or import your signature image, place it
                  visually on page 1, and export a signed PDF.
                </p>

                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handlePdfFile(event.target.files?.[0])}
                />

                <input
                  ref={signatureInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    handleSignatureImage(event.target.files?.[0])
                  }
                />
              </div>
            </div>

            <div className="grid lg:grid-cols-[1fr_400px]">
              <section className="min-h-[720px] border-r border-slate-200 bg-slate-50/70 p-5">
                <div
                  onClick={() => pdfInputRef.current?.click()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handlePdfFile(event.dataTransfer.files?.[0]);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      pdfInputRef.current?.click();
                    }
                  }}
                  className="cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-white p-6 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                    <FileText size={23} />
                  </div>

                  <div className="font-black text-slate-950">
                    {file ? file.name : "Drop PDF here"}
                  </div>

                  <div className="mt-1 text-sm font-semibold text-slate-500">
                    {file
                      ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded`
                      : "Click here or drag a PDF to begin."}
                  </div>

                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 px-4 py-2 text-sm font-black text-indigo-700">
                    <Upload size={17} />
                    Click here to choose PDF
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Signature Placement
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        Drag the signature on page 1 preview. Export applies it
                        to the first page.
                      </p>
                    </div>

                    {file && (
                      <button
                        onClick={clearPdf}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition hover:bg-red-100"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    )}
                  </div>

                  {busy && previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl bg-slate-50">
                      <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 font-bold shadow-sm">
                        <Loader2
                          className="animate-spin text-indigo-600"
                          size={18}
                        />
                        Rendering preview
                      </div>
                    </div>
                  ) : previews.length === 0 ? (
                    <div className="mt-5 flex min-h-80 items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                      <div>
                        <PenLine className="mx-auto text-slate-400" size={38} />
                        <div className="mt-3 font-black text-slate-900">
                          No PDF selected
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          Upload a PDF to preview signature placement.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                      {previews.map((preview) => {
                        const isPrimary = preview.pageNumber === 1;

                        return (
                          <div
                            key={preview.pageNumber}
                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                              <div className="text-sm font-black text-slate-800">
                                Page {preview.pageNumber}
                              </div>

                              {isPrimary && (
                                <div className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                                  Drag signature
                                </div>
                              )}
                            </div>

                            <div
                              ref={isPrimary ? dragAreaRef : null}
                              className="relative flex min-h-56 items-center justify-center overflow-hidden bg-slate-100 p-4"
                            >
                              <img
                                src={preview.previewUrl}
                                alt={`Page ${preview.pageNumber}`}
                                className="max-h-64 rounded border border-slate-200 bg-white shadow-sm"
                              />

                              {isPrimary && renderSignaturePreview()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              <aside className="bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Signature Settings
                  </h2>

                  <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white p-2">
                    <button
                      onClick={() => setSignatureMode("text")}
                      className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                        signatureMode === "text"
                          ? "bg-indigo-700 text-white shadow-md shadow-indigo-100"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Text Signature
                    </button>

                    <button
                      onClick={() => setSignatureMode("image")}
                      className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                        signatureMode === "image"
                          ? "bg-indigo-700 text-white shadow-md shadow-indigo-100"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Image Signature
                    </button>
                  </div>

                  {signatureMode === "text" ? (
                    <>
                      <label className="mt-4 block">
                        <span className="text-sm font-black text-slate-800">
                          Signer name
                        </span>

                        <input
                          value={signerName}
                          onChange={(event) =>
                            setSignerName(event.target.value)
                          }
                          placeholder="Enter signer name"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="text-sm font-black text-slate-800">
                          Signature style
                        </span>

                        <select
                          value={signatureStyle}
                          onChange={(event) =>
                            setSignatureStyle(
                              event.target.value as SignatureStyle
                            )
                          }
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        >
                          {STYLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="mt-4 block">
                        <span className="flex justify-between text-sm font-black text-slate-800">
                          Text size
                          <span>{fontSize}px</span>
                        </span>

                        <input
                          type="range"
                          min={10}
                          max={36}
                          value={fontSize}
                          onChange={(event) =>
                            setFontSize(Number(event.target.value))
                          }
                          className="mt-3 w-full"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => signatureInputRef.current?.click()}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-5 py-4 text-sm font-black text-indigo-700 transition hover:bg-indigo-50"
                      >
                        <ImageIcon size={18} />
                        Import Signature Image
                      </button>

                      {signatureImage ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-black text-slate-900">
                                {signatureImage.file.name}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-500">
                                Imported for current session
                              </div>
                            </div>

                            <button
                              onClick={clearSignatureImage}
                              className="rounded-xl border border-red-100 bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
                              title="Remove signature image"
                            >
                              <X size={15} />
                            </button>
                          </div>

                          <div className="mt-4 flex min-h-24 items-center justify-center rounded-2xl bg-slate-50 p-3">
                            <img
                              src={signatureImage.previewUrl}
                              alt="Imported signature"
                              className="max-h-28 object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-500">
                          Upload a transparent PNG signature for best result.
                          JPG and WebP are also supported.
                        </div>
                      )}

                      <label className="mt-4 block">
                        <span className="flex justify-between text-sm font-black text-slate-800">
                          Image size
                          <span>{imageWidthPercent}% page width</span>
                        </span>

                        <input
                          type="range"
                          min={8}
                          max={55}
                          value={imageWidthPercent}
                          onChange={(event) =>
                            setImageWidthPercent(Number(event.target.value))
                          }
                          className="mt-3 w-full"
                        />
                      </label>
                    </>
                  )}

                  <button
                    onClick={resetPosition}
                    disabled={!file}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RotateCcw size={17} />
                    Reset Position
                  </button>

                  <div className="mt-5 rounded-2xl bg-white p-4">
                    <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                      PDF pages
                    </div>
                    <div className="mt-1 text-3xl font-black text-slate-950">
                      {pageCount || "-"}
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
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
                        Export Signed PDF
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`mt-5 rounded-3xl border p-4 text-sm font-bold leading-6 ${
                    status.toLowerCase().includes("failed") ||
                    status.toLowerCase().includes("valid") ||
                    status.toLowerCase().includes("unable")
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
                  <div className="font-black">Saved signatures later</div>
                  <p className="mt-2">
                    Signature saving will be added later for logged-in
                    subscription users. For now, imported signatures are used in
                    this browser session only.
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
