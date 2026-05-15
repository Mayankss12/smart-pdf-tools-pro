"use client";

import { Header } from "@/components/Header";
import {
  CheckCircle2,
  Copy,
  Download,
  FileSignature,
  Grip,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  PenLine,
  Plus,
  RotateCcw,
  Trash2,
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

type SignatureBox = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type SignatureImage = {
  file: File;
  previewUrl: string;
  pngBytes: Uint8Array;
  width: number;
  height: number;
};

type SignatureItem = {
  id: string;
  pageNumber: number;
  mode: SignatureMode;
  box: SignatureBox;
  text: string;
  style: SignatureStyle;
  textFontSize: number;
  image?: SignatureImage;
};

type DragState =
  | {
      type: "move";
      signatureId: string;
      startClientX: number;
      startClientY: number;
      startBox: SignatureBox;
    }
  | {
      type: "resize";
      signatureId: string;
      handle: "nw" | "ne" | "sw" | "se";
      startClientX: number;
      startClientY: number;
      startBox: SignatureBox;
    }
  | null;

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

const DEFAULT_TEXT_BOX: SignatureBox = {
  xPercent: 58,
  yPercent: 76,
  widthPercent: 28,
  heightPercent: 8,
};

const DEFAULT_IMAGE_BOX: SignatureBox = {
  xPercent: 58,
  yPercent: 76,
  widthPercent: 26,
  heightPercent: 9,
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getSignaturePreviewClass(style: SignatureStyle) {
  return (
    STYLE_OPTIONS.find((option) => option.value === style)?.previewClass ||
    STYLE_OPTIONS[0].previewClass
  );
}

function getSignatureFont(style: SignatureStyle) {
  return (
    STYLE_OPTIONS.find((option) => option.value === style)?.font ||
    STYLE_OPTIONS[0].font
  );
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

async function applySignaturesToPdf({
  file,
  signatures,
}: {
  file: File;
  signatures: SignatureItem[];
}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("This PDF has no pages.");
  }

  const fontCache = new Map<SignatureStyle, Awaited<ReturnType<typeof pdfDoc.embedFont>>>();
  const imageCache = new Map<string, Awaited<ReturnType<typeof pdfDoc.embedPng>>>();

  for (const signature of signatures) {
    const pageIndex = clamp(signature.pageNumber - 1, 0, pages.length - 1);
    const targetPage = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    const boxWidth = (signature.box.widthPercent / 100) * pageWidth;
    const boxHeight = (signature.box.heightPercent / 100) * pageHeight;
    const boxX = (signature.box.xPercent / 100) * pageWidth;
    const boxYFromTop = (signature.box.yPercent / 100) * pageHeight;

    const pdfX = clamp(boxX, 8, pageWidth - boxWidth - 8);
    const pdfY = clamp(
      pageHeight - boxYFromTop - boxHeight,
      8,
      pageHeight - boxHeight - 8
    );

    if (signature.mode === "image") {
      if (!signature.image) continue;

      const cacheKey = `${signature.image.file.name}-${signature.image.file.size}`;

      let embeddedImage = imageCache.get(cacheKey);

      if (!embeddedImage) {
        embeddedImage = await pdfDoc.embedPng(signature.image.pngBytes);
        imageCache.set(cacheKey, embeddedImage);
      }

      targetPage.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: boxWidth,
        height: boxHeight,
        opacity: 0.98,
      });

      continue;
    }

    if (!signature.text.trim()) continue;

    let font = fontCache.get(signature.style);

    if (!font) {
      font = await pdfDoc.embedFont(getSignatureFont(signature.style));
      fontCache.set(signature.style, font);
    }

    const safeFontSize = clamp(signature.textFontSize, 8, 48);
    const textWidth = font.widthOfTextAtSize(signature.text, safeFontSize);
    const textX = clamp(pdfX + 6, 8, pageWidth - textWidth - 8);
    const textY = clamp(
      pdfY + boxHeight / 2 - safeFontSize / 2,
      8,
      pageHeight - safeFontSize - 8
    );

    targetPage.drawText(signature.text, {
      x: textX,
      y: textY,
      size: safeFontSize,
      font,
      color: rgb(0.18, 0.14, 0.52),
      opacity: 0.96,
    });
  }

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], {
    type: "application/pdf",
  });
}

export default function FillSignPage() {
  const pdfInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const activePageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [activePageNumber, setActivePageNumber] = useState(1);

  const [signatureMode, setSignatureMode] = useState<SignatureMode>("text");
  const [signerName, setSignerName] = useState("Mayank Singh");
  const [signatureStyle, setSignatureStyle] = useState<SignatureStyle>("italic");
  const [textFontSize, setTextFontSize] = useState(16);
  const [signatureImage, setSignatureImage] = useState<SignatureImage | null>(
    null
  );

  const [signatures, setSignatures] = useState<SignatureItem[]>([]);
  const [selectedSignatureId, setSelectedSignatureId] = useState<string | null>(
    null
  );
  const [status, setStatus] = useState(
    "Upload a PDF, click Add Signature, place it on any page, then export."
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  useEffect(() => {
    function handleMouseMove(event: globalThis.MouseEvent) {
      const dragState = dragStateRef.current;
      const pageBox = activePageRef.current;

      if (!dragState || !pageBox) return;

      const rect = pageBox.getBoundingClientRect();
      const dxPercent =
        ((event.clientX - dragState.startClientX) / rect.width) * 100;
      const dyPercent =
        ((event.clientY - dragState.startClientY) / rect.height) * 100;

      setSignatures((current) =>
        current.map((signature) => {
          if (signature.id !== dragState.signatureId) return signature;

          if (dragState.type === "move") {
            return {
              ...signature,
              box: {
                ...dragState.startBox,
                xPercent: clamp(
                  dragState.startBox.xPercent + dxPercent,
                  0,
                  100 - dragState.startBox.widthPercent
                ),
                yPercent: clamp(
                  dragState.startBox.yPercent + dyPercent,
                  0,
                  100 - dragState.startBox.heightPercent
                ),
              },
            };
          }

          const start = dragState.startBox;

          let nextX = start.xPercent;
          let nextY = start.yPercent;
          let nextWidth = start.widthPercent;
          let nextHeight = start.heightPercent;

          if (dragState.handle.includes("e")) {
            nextWidth = start.widthPercent + dxPercent;
          }

          if (dragState.handle.includes("s")) {
            nextHeight = start.heightPercent + dyPercent;
          }

          if (dragState.handle.includes("w")) {
            nextX = start.xPercent + dxPercent;
            nextWidth = start.widthPercent - dxPercent;
          }

          if (dragState.handle.includes("n")) {
            nextY = start.yPercent + dyPercent;
            nextHeight = start.heightPercent - dyPercent;
          }

          const minWidth = signature.mode === "image" ? 8 : 12;
          const minHeight = signature.mode === "image" ? 4 : 5;

          nextWidth = clamp(nextWidth, minWidth, 78);
          nextHeight = clamp(nextHeight, minHeight, 40);
          nextX = clamp(nextX, 0, 100 - nextWidth);
          nextY = clamp(nextY, 0, 100 - nextHeight);

          return {
            ...signature,
            box: {
              xPercent: nextX,
              yPercent: nextY,
              widthPercent: nextWidth,
              heightPercent: nextHeight,
            },
          };
        })
      );
    }

    function handleMouseUp() {
      if (dragStateRef.current) {
        dragStateRef.current = null;
        setStatus("Signature placement updated.");
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const activePreview = useMemo(() => {
    return previews.find((preview) => preview.pageNumber === activePageNumber);
  }, [activePageNumber, previews]);

  const activePageSignatures = useMemo(() => {
    return signatures.filter(
      (signature) => signature.pageNumber === activePageNumber
    );
  }, [activePageNumber, signatures]);

  const selectedSignature = useMemo(() => {
    return signatures.find((signature) => signature.id === selectedSignatureId);
  }, [selectedSignatureId, signatures]);

  async function handlePdfFile(selectedFile?: File) {
    if (!selectedFile) return;

    if (!isPdfFile(selectedFile)) {
      setStatus("Please upload a valid PDF file.");
      return;
    }

    setBusy(true);
    setStatus("Rendering PDF pages...");

    try {
      setFile(selectedFile);
      setPreviews([]);
      setActivePageNumber(1);
      setSignatures([]);
      setSelectedSignatureId(null);

      const pdf = await loadPdfFromFile(selectedFile);
      setPageCount(pdf.numPages);

      const nextPreviews: PdfPagePreview[] = [];
      const pagesToPreview = Math.min(pdf.numPages, 24);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.55);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);

      setStatus(
        `PDF loaded with ${pdf.numPages} page${
          pdf.numPages > 1 ? "s" : ""
        }. Click Add Signature when ready.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setSignatures([]);
      setSelectedSignatureId(null);
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
      setStatus("Signature image imported. Click Add Signature to place it.");
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
    setActivePageNumber(1);
    setSignatures([]);
    setSelectedSignatureId(null);
    setStatus("Upload a PDF, click Add Signature, place it on any page, then export.");
  }

  function clearSignatureImage() {
    if (signatureImage) {
      URL.revokeObjectURL(signatureImage.previewUrl);
    }

    setSignatureImage(null);
    setSignatureMode("text");
    setStatus("Signature image removed. Text signature selected.");
  }

  function selectPage(pageNumber: number) {
    setActivePageNumber(pageNumber);
    setSelectedSignatureId(null);
    setStatus(`Page ${pageNumber} selected. Add or move signatures here.`);
  }

  function getNewSignatureBox() {
    if (signatureMode === "image" && signatureImage) {
      const ratio = signatureImage.height / Math.max(signatureImage.width, 1);
      const widthPercent = 26;
      const heightPercent = clamp(widthPercent * ratio, 5, 16);

      return {
        ...DEFAULT_IMAGE_BOX,
        widthPercent,
        heightPercent,
      };
    }

    return DEFAULT_TEXT_BOX;
  }

  function addSignatureToPage(pageNumber = activePageNumber) {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (signatureMode === "text" && !signerName.trim()) {
      setStatus("Enter signature text/name first.");
      return;
    }

    if (signatureMode === "image" && !signatureImage) {
      setStatus("Import a signature image first.");
      return;
    }

    const id = crypto.randomUUID();

    const newSignature: SignatureItem = {
      id,
      pageNumber,
      mode: signatureMode,
      box: getNewSignatureBox(),
      text: signerName.trim(),
      style: signatureStyle,
      textFontSize,
      image: signatureMode === "image" ? signatureImage || undefined : undefined,
    };

    setSignatures((current) => [...current, newSignature]);
    setSelectedSignatureId(id);
    setActivePageNumber(pageNumber);
    setStatus(`Signature added to page ${pageNumber}. Drag or resize it.`);
  }

  function addSignatureToAllPages() {
    if (!file || pageCount === 0) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (signatureMode === "text" && !signerName.trim()) {
      setStatus("Enter signature text/name first.");
      return;
    }

    if (signatureMode === "image" && !signatureImage) {
      setStatus("Import a signature image first.");
      return;
    }

    const newSignatures: SignatureItem[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      newSignatures.push({
        id: crypto.randomUUID(),
        pageNumber,
        mode: signatureMode,
        box: getNewSignatureBox(),
        text: signerName.trim(),
        style: signatureStyle,
        textFontSize,
        image:
          signatureMode === "image" ? signatureImage || undefined : undefined,
      });
    }

    setSignatures((current) => [...current, ...newSignatures]);
    setSelectedSignatureId(newSignatures[0]?.id || null);
    setActivePageNumber(1);
    setStatus(`Signature added to all ${pageCount} pages.`);
  }

  function duplicateSelectedSignature() {
    if (!selectedSignature) {
      setStatus("Select a signature first.");
      return;
    }

    const duplicated: SignatureItem = {
      ...selectedSignature,
      id: crypto.randomUUID(),
      pageNumber: activePageNumber,
      box: {
        ...selectedSignature.box,
        xPercent: clamp(selectedSignature.box.xPercent + 3, 0, 95),
        yPercent: clamp(selectedSignature.box.yPercent + 3, 0, 95),
      },
    };

    setSignatures((current) => [...current, duplicated]);
    setSelectedSignatureId(duplicated.id);
    setStatus(`Signature duplicated on page ${activePageNumber}.`);
  }

  function deleteSelectedSignature() {
    if (!selectedSignatureId) {
      setStatus("Select a signature to delete.");
      return;
    }

    setSignatures((current) =>
      current.filter((signature) => signature.id !== selectedSignatureId)
    );
    setSelectedSignatureId(null);
    setStatus("Selected signature deleted.");
  }

  function resetSelectedPlacement() {
    if (!selectedSignatureId) {
      setStatus("Select a signature first.");
      return;
    }

    setSignatures((current) =>
      current.map((signature) => {
        if (signature.id !== selectedSignatureId) return signature;

        return {
          ...signature,
          box:
            signature.mode === "image"
              ? {
                  ...getNewSignatureBox(),
                }
              : {
                  ...DEFAULT_TEXT_BOX,
                },
        };
      })
    );

    setStatus("Selected signature placement reset.");
  }

  function resizeSelectedSignature(direction: "smaller" | "bigger") {
    if (!selectedSignatureId) {
      setStatus("Select a signature first.");
      return;
    }

    const delta = direction === "bigger" ? 3 : -3;

    setSignatures((current) =>
      current.map((signature) => {
        if (signature.id !== selectedSignatureId) return signature;

        return {
          ...signature,
          box: {
            ...signature.box,
            widthPercent: clamp(signature.box.widthPercent + delta, 8, 78),
            heightPercent: clamp(signature.box.heightPercent + delta * 0.45, 4, 40),
          },
        };
      })
    );

    setStatus(`Selected signature made ${direction}.`);
  }

  function startMove(event: MouseEvent<HTMLDivElement>, signature: SignatureItem) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedSignatureId(signature.id);

    dragStateRef.current = {
      type: "move",
      signatureId: signature.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: signature.box,
    };

    setStatus("Dragging signature...");
  }

  function startResize(
    event: MouseEvent<HTMLButtonElement>,
    signature: SignatureItem,
    handle: "nw" | "ne" | "sw" | "se"
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedSignatureId(signature.id);

    dragStateRef.current = {
      type: "resize",
      signatureId: signature.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: signature.box,
    };

    setStatus("Resizing signature...");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (signatures.length === 0) {
      setStatus("Add at least one signature first.");
      return;
    }

    setBusy(true);
    setStatus("Applying signatures and exporting PDF...");

    try {
      const blob = await applySignaturesToPdf({
        file,
        signatures,
      });

      downloadBlob(blob, "PDFMantra-signed.pdf");
      setStatus(`Signed PDF downloaded with ${signatures.length} signature(s).`);
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error ? error.message : "Signature export failed."
      );
    } finally {
      setBusy(false);
    }
  }

  function renderSignatureBox(signature: SignatureItem) {
    const isSelected = selectedSignatureId === signature.id;
    const previewClass = getSignaturePreviewClass(signature.style);

    return (
      <div
        key={signature.id}
        className="absolute z-20"
        style={{
          left: `${signature.box.xPercent}%`,
          top: `${signature.box.yPercent}%`,
          width: `${signature.box.widthPercent}%`,
          height: `${signature.box.heightPercent}%`,
        }}
        onMouseDown={() => setSelectedSignatureId(signature.id)}
      >
        <div
          onMouseDown={(event) => startMove(event, signature)}
          className={`group relative h-full w-full cursor-move rounded-xl bg-white/70 shadow-xl backdrop-blur-[1px] ${
            isSelected
              ? "border border-indigo-500 ring-4 ring-indigo-100"
              : "border border-indigo-300/60"
          }`}
          title="Drag signature"
        >
          {isSelected && (
            <div className="absolute left-2 right-2 top-1 z-30 flex h-5 items-center justify-center gap-1 rounded-full bg-indigo-600/90 text-[10px] font-black text-white opacity-90">
              <Grip size={11} />
              Drag
            </div>
          )}

          <div className="flex h-full w-full items-center justify-center overflow-hidden px-3 pt-5">
            {signature.mode === "image" ? (
              signature.image ? (
                <img
                  src={signature.image.previewUrl}
                  alt="Signature"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <div className="text-center text-xs font-black text-slate-500">
                  Signature image missing
                </div>
              )
            ) : (
              <div
                className={`w-full truncate text-center text-indigo-700 ${previewClass}`}
                style={{
                  fontSize: Math.max(10, signature.textFontSize * 0.82),
                }}
              >
                {signature.text || "Signature"}
              </div>
            )}
          </div>

          {isSelected && (
            <>
              <button
                type="button"
                onMouseDown={(event) => startResize(event, signature, "nw")}
                className="absolute -left-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-md"
                title="Resize"
              />

              <button
                type="button"
                onMouseDown={(event) => startResize(event, signature, "ne")}
                className="absolute -right-2 -top-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-md"
                title="Resize"
              />

              <button
                type="button"
                onMouseDown={(event) => startResize(event, signature, "sw")}
                className="absolute -bottom-2 -left-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-md"
                title="Resize"
              />

              <button
                type="button"
                onMouseDown={(event) => startResize(event, signature, "se")}
                className="absolute -bottom-2 -right-2 h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-md"
                title="Resize"
              />
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-[1500px] px-5 py-8">
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

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Add one or multiple text/image signatures, place them on any
                  page, resize them, and export your signed document.
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

            <div className="grid min-h-[760px] lg:grid-cols-[180px_1fr_410px]">
              <aside className="border-r border-slate-200 bg-slate-50 p-4">
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
                  className="cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-white p-4 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
                >
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-md shadow-indigo-100">
                    <Upload size={18} />
                  </div>

                  <div className="mt-3 text-sm font-black text-slate-950">
                    Upload PDF
                  </div>

                  <div className="mt-1 text-xs font-bold text-slate-500">
                    Click or drop file
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  <div className="text-sm font-black text-slate-950">Pages</div>
                  {file && (
                    <button
                      onClick={clearPdf}
                      className="rounded-lg bg-red-50 p-1.5 text-red-700 transition hover:bg-red-100"
                      title="Remove PDF"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-3">
                  {previews.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs font-bold text-slate-500">
                      No PDF uploaded
                    </div>
                  ) : (
                    previews.map((preview) => {
                      const count = signatures.filter(
                        (signature) => signature.pageNumber === preview.pageNumber
                      ).length;

                      return (
                        <button
                          key={preview.pageNumber}
                          onClick={() => selectPage(preview.pageNumber)}
                          className={`block w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                            activePageNumber === preview.pageNumber
                              ? "border-indigo-500 ring-4 ring-indigo-100"
                              : "border-slate-200 hover:border-indigo-200"
                          }`}
                        >
                          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                            <span>Page {preview.pageNumber}</span>
                            {count > 0 && (
                              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                                {count} sign
                              </span>
                            )}
                          </div>

                          <div className="bg-slate-100 p-2">
                            <img
                              src={preview.previewUrl}
                              alt={`Page ${preview.pageNumber}`}
                              className="mx-auto max-h-36 rounded border border-slate-200 bg-white"
                            />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <section className="bg-slate-100 p-5">
                <div className="mb-4 flex flex-col justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Document Signing Workspace
                    </h2>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      Select a page, click Add Signature, then drag and resize
                      the sign anywhere.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => addSignatureToPage(activePageNumber)}
                      disabled={!file}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-2 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Plus size={16} />
                      Add Sign
                    </button>

                    <button
                      onClick={handleExport}
                      disabled={busy || !file || signatures.length === 0}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Processing
                        </>
                      ) : (
                        <>
                          <Download size={16} />
                          Export
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex min-h-[630px] items-start justify-center overflow-auto rounded-3xl border border-slate-200 bg-slate-200/70 p-6">
                  {busy && previews.length === 0 ? (
                    <div className="mt-28 flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-700 shadow-sm">
                      <Loader2
                        className="animate-spin text-indigo-600"
                        size={18}
                      />
                      Rendering PDF
                    </div>
                  ) : !activePreview ? (
                    <div className="mt-28 max-w-md rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
                      <PenLine className="mx-auto text-slate-400" size={42} />
                      <div className="mt-4 text-xl font-black text-slate-950">
                        Upload a PDF to start signing
                      </div>
                      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
                        Your PDF will appear here as a large page preview.
                        Signatures are added only when you click Add Sign.
                      </p>
                    </div>
                  ) : (
                    <div
                      ref={activePageRef}
                      className="relative inline-block select-none rounded bg-white shadow-2xl shadow-slate-400/30"
                      onMouseDown={() => setSelectedSignatureId(null)}
                    >
                      <img
                        src={activePreview.previewUrl}
                        alt={`Active page ${activePageNumber}`}
                        className="block max-h-[900px] max-w-full rounded bg-white"
                        draggable={false}
                      />

                      {activePageSignatures.map(renderSignatureBox)}
                    </div>
                  )}
                </div>
              </section>

              <aside className="border-l border-slate-200 bg-white p-5">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <h2 className="text-xl font-black text-slate-950">
                    Signature Tools
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
                      Text
                    </button>

                    <button
                      onClick={() => setSignatureMode("image")}
                      className={`rounded-xl px-3 py-3 text-sm font-black transition ${
                        signatureMode === "image"
                          ? "bg-indigo-700 text-white shadow-md shadow-indigo-100"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Image
                    </button>
                  </div>

                  {signatureMode === "text" ? (
                    <>
                      <label className="mt-4 block">
                        <span className="text-sm font-black text-slate-800">
                          Signature text
                        </span>

                        <input
                          value={signerName}
                          onChange={(event) =>
                            setSignerName(event.target.value)
                          }
                          placeholder="Enter signature"
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        />
                      </label>

                      <label className="mt-4 block">
                        <span className="text-sm font-black text-slate-800">
                          Style
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
                          <span>{textFontSize}px</span>
                        </span>

                        <input
                          type="range"
                          min={9}
                          max={42}
                          value={textFontSize}
                          onChange={(event) =>
                            setTextFontSize(Number(event.target.value))
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
                                Current session only
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
                          Transparent PNG works best. JPG and WebP are also
                          supported.
                        </div>
                      )}
                    </>
                  )}

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => addSignatureToPage(activePageNumber)}
                      disabled={!file}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-4 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      <Plus size={16} />
                      Add Sign
                    </button>

                    <button
                      onClick={addSignatureToAllPages}
                      disabled={!file}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Copy size={16} />
                      All Pages
                    </button>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="text-sm font-black text-slate-900">
                      Selected Signature
                    </div>

                    <div className="mt-2 text-xs font-bold text-slate-500">
                      {selectedSignature
                        ? `Page ${selectedSignature.pageNumber} • ${selectedSignature.mode}`
                        : "No signature selected"}
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => resizeSelectedSignature("smaller")}
                        disabled={!selectedSignature}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Smaller
                      </button>

                      <button
                        onClick={() => resizeSelectedSignature("bigger")}
                        disabled={!selectedSignature}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Bigger
                      </button>

                      <button
                        onClick={duplicateSelectedSignature}
                        disabled={!selectedSignature}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Duplicate
                      </button>

                      <button
                        onClick={resetSelectedPlacement}
                        disabled={!selectedSignature}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Reset
                      </button>
                    </div>

                    <button
                      onClick={deleteSelectedSignature}
                      disabled={!selectedSignature}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                      Delete Selected
                    </button>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Page
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {file ? activePageNumber : "-"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-white p-4">
                      <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Signs
                      </div>
                      <div className="mt-1 text-3xl font-black text-slate-950">
                        {signatures.length || "-"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExport}
                    disabled={busy || !file || signatures.length === 0}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
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
                    status.toLowerCase().includes("unable") ||
                    status.toLowerCase().includes("import a signature") ||
                    status.toLowerCase().includes("add at least")
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
                    subscription users. Current imported signatures are used only
                    in this browser session.
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
