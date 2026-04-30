"use client";

import { Header } from "@/components/Header";
import {
  Bold,
  Copy,
  Download,
  FileImage,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Layers,
  Loader2,
  Lock,
  Minus,
  MousePointer2,
  PenLine,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type LayerType = "text" | "highlight" | "image" | "signature";

type PdfLayer = {
  id: string;
  page: number;
  type: LayerType;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
  text?: string;
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  opacity?: number;
  imageUrl?: string;
  imageBytes?: Uint8Array;
  imageKind?: "png" | "jpg";
};

type PageThumb = {
  pageNumber: number;
  url: string;
};

type DragState = {
  id: string;
  mode: "move" | "resize";
  handle?: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startXPercent: number;
  startYPercent: number;
  startWidthPercent: number;
  startHeightPercent: number;
};

type ResizeHandle =
  | "top-left"
  | "top"
  | "top-right"
  | "right"
  | "bottom-right"
  | "bottom"
  | "bottom-left"
  | "left";

type ExportMode = "full" | "current" | "range";

const resizeHandles: { id: ResizeHandle; className: string; cursor: string }[] =
  [
    { id: "top-left", className: "-left-2 -top-2", cursor: "nwse-resize" },
    {
      id: "top",
      className: "left-1/2 -top-2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    { id: "top-right", className: "-right-2 -top-2", cursor: "nesw-resize" },
    {
      id: "right",
      className: "-right-2 top-1/2 -translate-y-1/2",
      cursor: "ew-resize",
    },
    {
      id: "bottom-right",
      className: "-bottom-2 -right-2",
      cursor: "nwse-resize",
    },
    {
      id: "bottom",
      className: "bottom-[-8px] left-1/2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      id: "bottom-left",
      className: "-bottom-2 -left-2",
      cursor: "nesw-resize",
    },
    {
      id: "left",
      className: "-left-2 top-1/2 -translate-y-1/2",
      cursor: "ew-resize",
    },
  ];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPdfFile(file: File, arrayBuffer: ArrayBuffer) {
  const fileNameLower = file.name.toLowerCase();
  const hasPdfExtension = fileNameLower.endsWith(".pdf");
  const hasPdfMime =
    file.type === "application/pdf" || file.type === "application/x-pdf";

  const headerBytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const hasPdfSignature =
    headerBytes.length === 5 &&
    headerBytes[0] === 0x25 &&
    headerBytes[1] === 0x50 &&
    headerBytes[2] === 0x44 &&
    headerBytes[3] === 0x46 &&
    headerBytes[4] === 0x2d;

  return hasPdfMime || hasPdfExtension || hasPdfSignature;
}

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

async function convertImageToPngBytes(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Unable to read image."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to process image.");
    }

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((outputBlob) => {
        if (!outputBlob) {
          reject(new Error("Unable to convert image."));
          return;
        }

        resolve(outputBlob);
      }, "image/png");
    });

    const arrayBuffer = await blob.arrayBuffer();

    return {
      imageBytes: new Uint8Array(arrayBuffer),
      imageKind: "png" as const,
      imageUrl: URL.createObjectURL(file),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function parsePageRange(input: string, totalPages: number) {
  const cleaned = input.trim();

  if (!cleaned) {
    throw new Error("Enter a page range. Example: 1-3,5");
  }

  const pages: number[] = [];
  const parts = cleaned
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startText, endText] = part.split("-").map((piece) => piece.trim());
      const start = Number(startText);
      const end = Number(endText);

      if (!Number.isInteger(start) || !Number.isInteger(end)) {
        throw new Error(`Invalid range: ${part}`);
      }

      if (start <= 0 || end <= 0) {
        throw new Error("Page numbers start from 1.");
      }

      if (start > end) {
        throw new Error(`Invalid reversed range: ${part}`);
      }

      if (end > totalPages) {
        throw new Error(`Page ${end} is outside this PDF.`);
      }

      for (let page = start; page <= end; page += 1) {
        pages.push(page);
      }
    } else {
      const page = Number(part);

      if (!Number.isInteger(page)) {
        throw new Error(`Invalid page number: ${part}`);
      }

      if (page <= 0) {
        throw new Error("Page numbers start from 1.");
      }

      if (page > totalPages) {
        throw new Error(`Page ${page} is outside this PDF.`);
      }

      pages.push(page);
    }
  }

  return Array.from(new Set(pages)).sort((a, b) => a - b);
}

export default function EditorPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const signatureImageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileBytesRef = useRef<ArrayBuffer | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Upload a PDF to start editing.");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 660, height: 860 });
  const [viewerScale, setViewerScale] = useState(1.25);
  const [pageThumbs, setPageThumbs] = useState<PageThumb[]>([]);
  const [layers, setLayers] = useState<PdfLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [exportMode, setExportMode] = useState<ExportMode>("full");
  const [exportRange, setExportRange] = useState("1-3");
  const [showFreeLimitNote, setShowFreeLimitNote] = useState(true);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale: viewerScale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      context.setTransform(outputScale, 0, 0, outputScale, 0, 0);

      setCanvasSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    },
    [viewerScale]
  );

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  useEffect(() => {
    function handleMouseMove(event: MouseEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;

      const deltaXPercent =
        ((event.clientX - drag.startMouseX) / canvasSize.width) * 100;
      const deltaYPercent =
        ((event.clientY - drag.startMouseY) / canvasSize.height) * 100;

      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== drag.id) return layer;

          if (drag.mode === "move") {
            return {
              ...layer,
              xPercent: clamp(
                drag.startXPercent + deltaXPercent,
                0,
                100 - layer.widthPercent
              ),
              yPercent: clamp(
                drag.startYPercent + deltaYPercent,
                0,
                100 - layer.heightPercent
              ),
            };
          }

          let nextX = drag.startXPercent;
          let nextY = drag.startYPercent;
          let nextWidth = drag.startWidthPercent;
          let nextHeight = drag.startHeightPercent;

          const handle = drag.handle;

          if (
            handle === "right" ||
            handle === "top-right" ||
            handle === "bottom-right"
          ) {
            nextWidth = drag.startWidthPercent + deltaXPercent;
          }

          if (
            handle === "left" ||
            handle === "top-left" ||
            handle === "bottom-left"
          ) {
            nextX = drag.startXPercent + deltaXPercent;
            nextWidth = drag.startWidthPercent - deltaXPercent;
          }

          if (
            handle === "bottom" ||
            handle === "bottom-left" ||
            handle === "bottom-right"
          ) {
            nextHeight = drag.startHeightPercent + deltaYPercent;
          }

          if (
            handle === "top" ||
            handle === "top-left" ||
            handle === "top-right"
          ) {
            nextY = drag.startYPercent + deltaYPercent;
            nextHeight = drag.startHeightPercent - deltaYPercent;
          }

          const minWidth =
            layer.type === "text" || layer.type === "signature" ? 8 : 4;
          const minHeight =
            layer.type === "text" || layer.type === "signature" ? 3 : 2;

          nextWidth = clamp(nextWidth, minWidth, 90);
          nextHeight = clamp(nextHeight, minHeight, 60);
          nextX = clamp(nextX, 0, 100 - nextWidth);
          nextY = clamp(nextY, 0, 100 - nextHeight);

          return {
            ...layer,
            xPercent: nextX,
            yPercent: nextY,
            widthPercent: nextWidth,
            heightPercent: nextHeight,
          };
        })
      );
    }

    function handleMouseUp() {
      dragStateRef.current = null;
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [canvasSize.height, canvasSize.width]);

  const currentPageLayers = useMemo(() => {
    return layers.filter((layer) => layer.page === currentPage);
  }, [currentPage, layers]);

  const selectedLayer = useMemo(() => {
    return layers.find((layer) => layer.id === selectedLayerId);
  }, [layers, selectedLayerId]);

  function updateLayer(id: string, updates: Partial<PdfLayer>) {
    setLayers((prev) =>
      prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer))
    );
  }

  async function renderThumbnail(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number
  ) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 0.18 });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) return "";

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

  async function handleFile(file?: File) {
    if (!file) return;

    setBusy(true);
    setStatus("Loading PDF preview...");

    try {
      const arrayBuffer = await file.arrayBuffer();

      if (!isPdfFile(file, arrayBuffer)) {
        setStatus("Please upload a valid PDF file.");
        return;
      }

      fileBytesRef.current = arrayBuffer.slice(0);

      const loadedPdf = await pdfjsLib.getDocument({
        data: arrayBuffer.slice(0),
      }).promise;

      pdfDocRef.current = loadedPdf;

      setFileName(file.name);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setLayers([]);
      setSelectedLayerId(null);

      const thumbs: PageThumb[] = [];
      const pagesToPreview = Math.min(loadedPdf.numPages, 60);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const url = await renderThumbnail(loadedPdf, pageNumber);
        thumbs.push({ pageNumber, url });
      }

      setPageThumbs(thumbs);

      await renderPage(1);

      setStatus("PDF loaded. Add text, highlights, images, or signatures.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function addTextLayer() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      xPercent: 12,
      yPercent: 16,
      widthPercent: 32,
      heightPercent: 6,
      text: "Edit text",
      fontSize: 16,
      isBold: false,
      isItalic: false,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text layer added. Type directly, drag, or resize.");
  }

  function addHighlightLayer() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "highlight",
      xPercent: 12,
      yPercent: 26,
      widthPercent: 36,
      heightPercent: 4,
      opacity: 0.42,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Highlight layer added. Drag or resize it.");
  }

  async function addImageLayer(file?: File) {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!file) return;

    if (!isImageFile(file)) {
      setStatus("Please upload PNG, JPG, or WebP image.");
      return;
    }

    setBusy(true);
    setStatus("Adding image layer...");

    try {
      const image = await convertImageToPngBytes(file);
      const ratio = image.height / Math.max(image.width, 1);
      const widthPercent = 28;
      const heightPercent = clamp(widthPercent * ratio, 8, 32);

      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "image",
        xPercent: 16,
        yPercent: 20,
        widthPercent,
        heightPercent,
        imageUrl: image.imageUrl,
        imageBytes: image.imageBytes,
        imageKind: image.imageKind,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      setStatus("Image layer added. Drag or resize it.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to add image.");
    } finally {
      setBusy(false);
    }
  }

  function addTextSignatureLayer() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "signature",
      xPercent: 58,
      yPercent: 78,
      widthPercent: 28,
      heightPercent: 7,
      text: "Your Signature",
      fontSize: 18,
      isItalic: true,
      isBold: false,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text signature added. Drag or resize it.");
  }

  async function addImageSignatureLayer(file?: File) {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!file) return;

    if (!isImageFile(file)) {
      setStatus("Please upload PNG, JPG, or WebP signature image.");
      return;
    }

    setBusy(true);
    setStatus("Adding signature image...");

    try {
      const image = await convertImageToPngBytes(file);
      const ratio = image.height / Math.max(image.width, 1);
      const widthPercent = 26;
      const heightPercent = clamp(widthPercent * ratio, 5, 18);

      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "signature",
        xPercent: 58,
        yPercent: 78,
        widthPercent,
        heightPercent,
        imageUrl: image.imageUrl,
        imageBytes: image.imageBytes,
        imageKind: image.imageKind,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      setStatus("Signature image added. Drag or resize it.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to add signature image.");
    } finally {
      setBusy(false);
    }
  }

  function deleteLayer(layerId: string) {
    setLayers((prev) => prev.filter((layer) => layer.id !== layerId));

    if (selectedLayerId === layerId) {
      setSelectedLayerId(null);
    }

    setStatus("Layer deleted.");
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    deleteLayer(selectedLayerId);
  }

  function duplicateSelectedLayer() {
    if (!selectedLayerId) {
      setStatus("Select a layer first.");
      return;
    }

    const layer = layers.find((item) => item.id === selectedLayerId);
    if (!layer) return;

    const duplicateLayer: PdfLayer = {
      ...layer,
      id: crypto.randomUUID(),
      xPercent: clamp(layer.xPercent + 3, 0, 100 - layer.widthPercent),
      yPercent: clamp(layer.yPercent + 3, 0, 100 - layer.heightPercent),
    };

    setLayers((prev) => [...prev, duplicateLayer]);
    setSelectedLayerId(duplicateLayer.id);
    setStatus("Layer duplicated.");
  }

  function resetEditor() {
    setLayers([]);
    setSelectedLayerId(null);
    setStatus("All edit layers cleared.");
  }

  function clearCurrentPageLayers() {
    setLayers((prev) => prev.filter((layer) => layer.page !== currentPage));
    setSelectedLayerId(null);
    setStatus(`All layers on page ${currentPage} cleared.`);
  }

  function startMove(
    event: React.MouseEvent<HTMLDivElement | HTMLButtonElement>,
    layer: PdfLayer
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedLayerId(layer.id);

    dragStateRef.current = {
      id: layer.id,
      mode: "move",
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startXPercent: layer.xPercent,
      startYPercent: layer.yPercent,
      startWidthPercent: layer.widthPercent,
      startHeightPercent: layer.heightPercent,
    };
  }

  function startResize(
    event: React.MouseEvent<HTMLButtonElement>,
    layer: PdfLayer,
    handle: ResizeHandle
  ) {
    event.preventDefault();
    event.stopPropagation();

    setSelectedLayerId(layer.id);

    dragStateRef.current = {
      id: layer.id,
      mode: "resize",
      handle,
      startMouseX: event.clientX,
      startMouseY: event.clientY,
      startXPercent: layer.xPercent,
      startYPercent: layer.yPercent,
      startWidthPercent: layer.widthPercent,
      startHeightPercent: layer.heightPercent,
    };
  }

  function zoomIn() {
    setViewerScale((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))));
    setStatus("Zoom increased.");
  }

  function zoomOut() {
    setViewerScale((prev) => Math.max(0.7, Number((prev - 0.1).toFixed(2))));
    setStatus("Zoom decreased.");
  }

  function getExportPages() {
    if (exportMode === "current") return [currentPage];
    if (exportMode === "range") return parsePageRange(exportRange, numPages);
    return Array.from({ length: numPages }, (_, index) => index + 1);
  }

  async function drawLayerOnPage({
    pdfDoc,
    page,
    layer,
  }: {
    pdfDoc: PDFDocument;
    page: ReturnType<PDFDocument["getPages"]>[number];
    layer: PdfLayer;
  }) {
    const { width: pageWidth, height: pageHeight } = page.getSize();

    const boxX = (layer.xPercent / 100) * pageWidth;
    const boxYFromTop = (layer.yPercent / 100) * pageHeight;
    const boxWidth = (layer.widthPercent / 100) * pageWidth;
    const boxHeight = (layer.heightPercent / 100) * pageHeight;

    const pdfX = clamp(boxX, 0, pageWidth - boxWidth);
    const pdfY = clamp(pageHeight - boxYFromTop - boxHeight, 0, pageHeight);

    if (layer.type === "highlight") {
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 0.86, 0.16),
        opacity: layer.opacity ?? 0.42,
      });
      return;
    }

    if (
      (layer.type === "image" || layer.type === "signature") &&
      layer.imageBytes
    ) {
      const image =
        layer.imageKind === "jpg"
          ? await pdfDoc.embedJpg(layer.imageBytes)
          : await pdfDoc.embedPng(layer.imageBytes);

      page.drawImage(image, {
        x: pdfX,
        y: pdfY,
        width: boxWidth,
        height: boxHeight,
        opacity: 0.98,
      });
      return;
    }

    if (layer.type === "text" || layer.type === "signature") {
      const fontSize = clamp(layer.fontSize || 16, 8, 96);
      const font = await pdfDoc.embedFont(
        layer.isBold
          ? StandardFonts.HelveticaBold
          : layer.isItalic
            ? StandardFonts.HelveticaOblique
            : StandardFonts.Helvetica
      );

      page.drawText(layer.text || "", {
        x: pdfX + 2,
        y: pdfY + boxHeight - fontSize - 2,
        size: fontSize,
        lineHeight: fontSize * 1.15,
        maxWidth: Math.max(boxWidth - 4, 1),
        font,
        color: rgb(0.05, 0.07, 0.16),
      });
    }
  }

  async function exportPdf() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Exporting edited PDF...");

    try {
      const exportPages = getExportPages();
      const sourcePdf = await PDFDocument.load(fileBytesRef.current.slice(0));
      const outputPdf = await PDFDocument.create();

      const sourcePages = await outputPdf.copyPages(
        sourcePdf,
        exportPages.map((pageNumber) => pageNumber - 1)
      );

      sourcePages.forEach((page) => outputPdf.addPage(page));

      const outputPages = outputPdf.getPages();

      for (let index = 0; index < exportPages.length; index += 1) {
        const sourcePageNumber = exportPages[index];
        const outputPage = outputPages[index];

        const pageLayers = layers.filter(
          (layer) => layer.page === sourcePageNumber
        );

        for (const layer of pageLayers) {
          await drawLayerOnPage({
            pdfDoc: outputPdf,
            page: outputPage,
            layer,
          });
        }
      }

      if (showFreeLimitNote) {
        const firstPage = outputPages[0];
        if (firstPage) {
          const { width } = firstPage.getSize();
          firstPage.drawText("Edited with PDFMantra", {
            x: width - 150,
            y: 18,
            size: 8,
            color: rgb(0.38, 0.31, 0.86),
            opacity: 0.55,
          });
        }
      }

      const pdfBytes = await outputPdf.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `PDFMantra-edited-${fileName || "document.pdf"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);

      setStatus("Edited PDF downloaded successfully.");
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  }

  function renderResizeHandles(layer: PdfLayer) {
    if (selectedLayerId !== layer.id) return null;

    return resizeHandles.map((handle) => (
      <button
        key={handle.id}
        onMouseDown={(event) => startResize(event, layer, handle.id)}
        className={`absolute z-30 h-3.5 w-3.5 rounded-full border-2 border-white bg-indigo-500 shadow-sm transition hover:scale-110 ${handle.className}`}
        style={{ cursor: handle.cursor }}
        title={`Resize ${handle.id}`}
      />
    ));
  }

  function renderLayer(layer: PdfLayer) {
    const isSelected = selectedLayerId === layer.id;

    const style = {
      left: `${layer.xPercent}%`,
      top: `${layer.yPercent}%`,
      width: `${layer.widthPercent}%`,
      height: `${layer.heightPercent}%`,
    };

    if (layer.type === "highlight") {
      return (
        <div
          key={layer.id}
          onMouseDown={(event) => startMove(event, layer)}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          className={`absolute cursor-move rounded-md border transition ${
            isSelected
              ? "border-amber-500 ring-2 ring-amber-100"
              : "border-transparent hover:border-amber-300"
          }`}
          style={{
            ...style,
            backgroundColor: `rgba(251, 191, 36, ${layer.opacity || 0.42})`,
          }}
          title="Drag highlight layer"
        >
          {renderResizeHandles(layer)}
        </div>
      );
    }

    if (layer.type === "image") {
      return (
        <div
          key={layer.id}
          onMouseDown={(event) => startMove(event, layer)}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          className={`absolute cursor-move overflow-hidden rounded-lg border bg-white/80 shadow-sm transition ${
            isSelected
              ? "border-indigo-500 ring-2 ring-indigo-100"
              : "border-transparent hover:border-indigo-200"
          }`}
          style={style}
        >
          {layer.imageUrl ? (
            <img
              src={layer.imageUrl}
              alt="Layer"
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-bold text-slate-400">
              Image
            </div>
          )}
          {renderResizeHandles(layer)}
        </div>
      );
    }

    if (layer.type === "signature" && layer.imageUrl) {
      return (
        <div
          key={layer.id}
          onMouseDown={(event) => startMove(event, layer)}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          className={`absolute cursor-move overflow-hidden rounded-lg border bg-white/70 p-1 shadow-sm transition ${
            isSelected
              ? "border-indigo-500 ring-2 ring-indigo-100"
              : "border-transparent hover:border-indigo-200"
          }`}
          style={style}
        >
          <img
            src={layer.imageUrl}
            alt="Signature"
            className="h-full w-full object-contain"
            draggable={false}
          />
          {renderResizeHandles(layer)}
        </div>
      );
    }

    return (
      <div
        key={layer.id}
        onClick={(event) => {
          event.stopPropagation();
          setSelectedLayerId(layer.id);
        }}
        className={`absolute rounded-lg border bg-white/95 text-slate-950 shadow-sm transition ${
          isSelected
            ? "border-indigo-400 ring-2 ring-indigo-100"
            : "border-transparent hover:border-indigo-200"
        }`}
        style={style}
      >
        <textarea
          value={layer.text || ""}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          onChange={(event) =>
            updateLayer(layer.id, {
              text: event.target.value,
            })
          }
          className="h-full w-full resize-none rounded-md bg-transparent px-2 py-1 font-semibold outline-none"
          style={{
            fontSize: layer.fontSize || 16,
            lineHeight: 1.2,
            fontWeight: layer.isBold ? 800 : 600,
            fontStyle: layer.isItalic ? "italic" : "normal",
            letterSpacing: "-0.01em",
          }}
        />

        {isSelected && (
          <div
            onMouseDown={(event) => startMove(event, layer)}
            className="absolute left-2 right-2 top-1 h-1.5 cursor-move rounded-full bg-indigo-500/25 transition hover:bg-indigo-500/40"
            title="Drag layer"
          />
        )}

        {renderResizeHandles(layer)}
      </div>
    );
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-amber-50">
        <section className="mx-auto max-w-[1600px] px-5 py-7">
          <div className="overflow-hidden rounded-[2rem] border border-indigo-100 bg-white/90 shadow-xl shadow-indigo-100/60 backdrop-blur">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-6 text-white">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                  <Sparkles size={14} />
                  PDFMantra Smart Workspace
                </div>

                <h1 className="text-3xl font-black tracking-[-0.03em] md:text-5xl">
                  PDF Editor
                </h1>

                <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-indigo-50 md:text-base">
                  Add text, highlights, images, and signatures on top of your
                  PDF. Premium OCR text rewrite will be added in the backend
                  phase.
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) => addImageLayer(event.target.files?.[0])}
                />

                <input
                  ref={signatureImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    addImageSignatureLayer(event.target.files?.[0])
                  }
                />
              </div>
            </div>

            <div
              className="m-5 cursor-pointer rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-amber-50 p-5 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40"
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
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-200">
                <FileText size={22} />
              </div>

              <div className="font-black text-slate-950">
                {fileName || "Drop your PDF here"}
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-500">
                {fileName
                  ? `${numPages} page${numPages > 1 ? "s" : ""} loaded`
                  : "Click here or drag one PDF to begin."}
              </div>

              <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-100">
                <Upload size={18} />
                Choose PDF
              </div>
            </div>

            <div className="mx-5 mb-5 overflow-hidden rounded-[1.7rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
                <button
                  onClick={addTextLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2.5 text-sm font-black text-indigo-700 transition hover:bg-indigo-100"
                >
                  <Type size={16} />
                  Text
                </button>

                <button
                  onClick={addHighlightLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-black text-amber-700 transition hover:bg-amber-100"
                >
                  <Highlighter size={16} />
                  Highlight
                </button>

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                >
                  <FileImage size={16} />
                  Image
                </button>

                <button
                  onClick={addTextSignatureLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                >
                  <PenLine size={16} />
                  Text Sign
                </button>

                <button
                  onClick={() => signatureImageInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-2.5 text-sm font-black text-violet-700 transition hover:bg-violet-50"
                >
                  <ImageIcon size={16} />
                  Image Sign
                </button>

                <button
                  onClick={duplicateSelectedLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <Copy size={16} />
                  Duplicate
                </button>

                <button
                  onClick={deleteSelectedLayer}
                  className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>

                <button
                  onClick={resetEditor}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <RotateCcw size={16} />
                  Clear All
                </button>

                <button
                  onClick={exportPdf}
                  className="inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download size={16} />
                  Export
                </button>

                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={zoomOut}
                    className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
                    title="Zoom out"
                  >
                    <ZoomOut size={17} />
                  </button>

                  <div className="rounded-2xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                    {Math.round(viewerScale * 100)}%
                  </div>

                  <button
                    onClick={zoomIn}
                    className="rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-700 transition hover:bg-slate-50"
                    title="Zoom in"
                  >
                    <ZoomIn size={17} />
                  </button>
                </div>
              </div>

              <div className="grid min-h-[720px] lg:grid-cols-[190px_1fr_360px]">
                <aside className="border-r border-slate-200 bg-slate-50/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                    <FileText size={16} />
                    Pages
                  </div>

                  {numPages === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No PDF uploaded.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Array.from({ length: numPages }).map((_, index) => {
                        const pageNumber = index + 1;
                        const thumb = pageThumbs.find(
                          (item) => item.pageNumber === pageNumber
                        );
                        const count = layers.filter(
                          (layer) => layer.page === pageNumber
                        ).length;

                        return (
                          <button
                            key={pageNumber}
                            onClick={() => {
                              setCurrentPage(pageNumber);
                              setSelectedLayerId(null);
                            }}
                            className={`block w-full overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition ${
                              currentPage === pageNumber
                                ? "border-indigo-600 ring-4 ring-indigo-100"
                                : "border-slate-200 hover:border-indigo-200"
                            }`}
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 text-xs font-black text-slate-700">
                              <span>Page {pageNumber}</span>
                              {count > 0 && (
                                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-700">
                                  {count}
                                </span>
                              )}
                            </div>

                            <div className="bg-slate-100 p-2">
                              {thumb?.url ? (
                                <img
                                  src={thumb.url}
                                  alt={`Page ${pageNumber}`}
                                  className="mx-auto max-h-36 rounded border border-slate-200 bg-white"
                                />
                              ) : (
                                <div className="flex h-24 items-center justify-center text-xs font-bold text-slate-400">
                                  Preview
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </aside>

                <section className="flex items-start justify-center overflow-auto bg-[radial-gradient(circle_at_top,_#ddd6fe,_#f8fafc_42%,_#e2e8f0)] p-6">
                  <div
                    className="relative rounded-xl bg-white shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200"
                    style={{
                      width: canvasSize.width,
                      minHeight: canvasSize.height,
                    }}
                    onClick={() => setSelectedLayerId(null)}
                  >
                    {busy && (
                      <div className="absolute inset-0 z-40 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm">
                        <div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 font-bold shadow-xl">
                          <Loader2
                            className="animate-spin text-indigo-600"
                            size={20}
                          />
                          Processing
                        </div>
                      </div>
                    )}

                    {!fileName && (
                      <div className="flex min-h-[540px] items-center justify-center p-10 text-center">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
                            <Upload size={26} />
                          </div>
                          <div className="font-black text-slate-900">
                            Upload a PDF to preview it here
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            Your PDF pages will appear in this workspace.
                          </p>
                        </div>
                      </div>
                    )}

                    <canvas
                      ref={canvasRef}
                      className={fileName ? "block" : "hidden"}
                    />

                    {currentPageLayers.map(renderLayer)}
                  </div>
                </section>

                <aside className="border-l border-slate-200 bg-white p-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-lg font-black text-slate-950">
                      <Layers size={18} />
                      Properties
                    </div>

                    {!selectedLayer ? (
                      <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-500">
                        Select a layer on the PDF to edit properties.
                      </div>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div className="rounded-2xl bg-white p-4">
                          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
                            Selected
                          </div>
                          <div className="mt-1 text-xl font-black capitalize text-slate-950">
                            {selectedLayer.type}
                          </div>
                          <div className="mt-1 text-xs font-bold text-slate-500">
                            Page {selectedLayer.page}
                          </div>
                        </div>

                        {(selectedLayer.type === "text" ||
                          (selectedLayer.type === "signature" &&
                            !selectedLayer.imageUrl)) && (
                          <>
                            <label className="block">
                              <span className="text-sm font-black text-slate-800">
                                Text
                              </span>
                              <textarea
                                value={selectedLayer.text || ""}
                                onChange={(event) =>
                                  updateLayer(selectedLayer.id, {
                                    text: event.target.value,
                                  })
                                }
                                className="mt-2 h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                              />
                            </label>

                            <label className="block">
                              <span className="flex justify-between text-sm font-black text-slate-800">
                                Font size
                                <span>{selectedLayer.fontSize || 16}px</span>
                              </span>
                              <input
                                type="range"
                                min={8}
                                max={72}
                                value={selectedLayer.fontSize || 16}
                                onChange={(event) =>
                                  updateLayer(selectedLayer.id, {
                                    fontSize: Number(event.target.value),
                                  })
                                }
                                className="mt-3 w-full"
                              />
                            </label>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    isBold: !selectedLayer.isBold,
                                  })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${
                                  selectedLayer.isBold
                                    ? "border-indigo-200 bg-indigo-700 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <Bold size={16} />
                                Bold
                              </button>

                              <button
                                onClick={() =>
                                  updateLayer(selectedLayer.id, {
                                    isItalic: !selectedLayer.isItalic,
                                  })
                                }
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${
                                  selectedLayer.isItalic
                                    ? "border-indigo-200 bg-indigo-700 text-white"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <Italic size={16} />
                                Italic
                              </button>
                            </div>
                          </>
                        )}

                        {selectedLayer.type === "highlight" && (
                          <label className="block">
                            <span className="flex justify-between text-sm font-black text-slate-800">
                              Opacity
                              <span>
                                {Math.round((selectedLayer.opacity ?? 0.42) * 100)}
                                %
                              </span>
                            </span>
                            <input
                              type="range"
                              min={0.15}
                              max={0.85}
                              step={0.01}
                              value={selectedLayer.opacity ?? 0.42}
                              onChange={(event) =>
                                updateLayer(selectedLayer.id, {
                                  opacity: Number(event.target.value),
                                })
                              }
                              className="mt-3 w-full"
                            />
                          </label>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={duplicateSelectedLayer}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                          >
                            <Copy size={16} />
                            Duplicate
                          </button>

                          <button
                            onClick={deleteSelectedLayer}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition hover:bg-red-100"
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="text-lg font-black text-slate-950">
                      Export Options
                    </div>

                    <div className="mt-4 space-y-2">
                      {[
                        { value: "full", label: "Full PDF" },
                        { value: "current", label: "Current page only" },
                        { value: "range", label: "Page range" },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-bold text-slate-700"
                        >
                          <input
                            type="radio"
                            name="exportMode"
                            checked={exportMode === option.value}
                            onChange={() =>
                              setExportMode(option.value as ExportMode)
                            }
                          />
                          {option.label}
                        </label>
                      ))}
                    </div>

                    {exportMode === "range" && (
                      <input
                        value={exportRange}
                        onChange={(event) => setExportRange(event.target.value)}
                        placeholder="Example: 1-3,5"
                        className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      />
                    )}

                    <label className="mt-4 flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                      <input
                        type="checkbox"
                        checked={showFreeLimitNote}
                        onChange={(event) =>
                          setShowFreeLimitNote(event.target.checked)
                        }
                        className="mt-1"
                      />
                      Free export note / watermark placeholder. Later this will
                      be controlled by login and subscription.
                    </label>

                    <button
                      onClick={exportPdf}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700"
                    >
                      <Download size={18} />
                      Export PDF
                    </button>
                  </div>

                  <div className="mt-4 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 text-sm font-semibold leading-6 text-indigo-800">
                    <div className="mb-2 flex items-center gap-2 font-black">
                      <Lock size={16} />
                      Premium OCR
                    </div>
                    OCR text rewrite will be available for premium users. This
                    will require backend/OCR processing later.
                  </div>
                </aside>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500 md:flex-row md:items-center md:justify-between">
                <div>
                  Status:{" "}
                  <span className="font-black text-indigo-700">{status}</span>
                </div>

                <div>
                  Selected layer:{" "}
                  <span className="font-black text-indigo-700">
                    {selectedLayer
                      ? `${selectedLayer.type} on page ${selectedLayer.page}`
                      : "None"}
                  </span>{" "}
                  • Total layers:{" "}
                  <span className="font-black text-slate-900">
                    {layers.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
            <span className="font-black">PDFMantra note:</span> This editor
            currently adds editable layers on top of the PDF. True existing text
            replacement, OCR rewrite, PDF to Word, password tools, and advanced
            compression should be added later with backend processing.
          </div>
        </section>
      </main>
    </>
  );
}
