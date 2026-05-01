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
  startPointerX: number;
  startPointerY: number;
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
type ActiveTool = "select" | "text" | "highlight";

type DraftBox = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type DrawState = {
  tool: Exclude<ActiveTool, "select">;
  startXPercent: number;
  startYPercent: number;
  currentXPercent: number;
  currentYPercent: number;
};

const resizeHandles: { id: ResizeHandle; className: string; cursor: string }[] =
  [
    { id: "top-left", className: "-left-3 -top-3", cursor: "nwse-resize" },
    {
      id: "top",
      className: "left-1/2 -top-3 -translate-x-1/2",
      cursor: "ns-resize",
    },
    { id: "top-right", className: "-right-3 -top-3", cursor: "nesw-resize" },
    {
      id: "right",
      className: "-right-3 top-1/2 -translate-y-1/2",
      cursor: "ew-resize",
    },
    {
      id: "bottom-right",
      className: "-bottom-3 -right-3",
      cursor: "nwse-resize",
    },
    {
      id: "bottom",
      className: "-bottom-3 left-1/2 -translate-x-1/2",
      cursor: "ns-resize",
    },
    {
      id: "bottom-left",
      className: "-bottom-3 -left-3",
      cursor: "nesw-resize",
    },
    {
      id: "left",
      className: "-left-3 top-1/2 -translate-y-1/2",
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
  const pdfViewportRef = useRef<HTMLDivElement | null>(null);
  const fileBytesRef = useRef<ArrayBuffer | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const drawStateRef = useRef<DrawState | null>(null);

  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("Upload a PDF to start editing.");
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 360, height: 520 });
  const [renderScale, setRenderScale] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(1);

  const [pageThumbs, setPageThumbs] = useState<PageThumb[]>([]);
  const [layers, setLayers] = useState<PdfLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);

  const [exportMode, setExportMode] = useState<ExportMode>("full");
  const [exportRange, setExportRange] = useState("1-3");
  const [showFreeLimitNote, setShowFreeLimitNote] = useState(true);

  const [ocrText, setOcrText] = useState("");
  const [ocrRewriteText, setOcrRewriteText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;

      const page = await pdfDocRef.current.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1 });

      const viewportWidth =
        (pdfViewportRef.current?.clientWidth || window.innerWidth) - 24;

      const safeWidth = Math.max(280, viewportWidth);

      const fitScale = clamp(
        safeWidth / unscaledViewport.width,
        0.35,
        1.25
      );

      const finalScale = fitScale * zoomLevel;
      const viewport = page.getViewport({ scale: finalScale });

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

      setRenderScale(finalScale);

      await page.render({
        canvasContext: context,
        viewport,
      }).promise;
    },
    [zoomLevel]
  );

  useEffect(() => {
    renderPage(currentPage);
  }, [currentPage, renderPage]);

  useEffect(() => {
    function handleResize() {
      renderPage(currentPage);
    }

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [currentPage, renderPage]);
useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      const drag = dragStateRef.current;
      if (!drag) return;

      event.preventDefault();

      const deltaXPercent =
        ((event.clientX - drag.startPointerX) / canvasSize.width) * 100;
      const deltaYPercent =
        ((event.clientY - drag.startPointerY) / canvasSize.height) * 100;

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
            layer.type === "text" || layer.type === "signature" ? 9 : 5;
          const minHeight =
            layer.type === "text" || layer.type === "signature" ? 4 : 2.5;

          nextWidth = clamp(nextWidth, minWidth, 95);
          nextHeight = clamp(nextHeight, minHeight, 70);
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

    function endPointerInteraction() {
      dragStateRef.current = null;
      cancelDrawingState();
    }

    window.addEventListener("pointermove", handlePointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", endPointerInteraction);
    window.addEventListener("pointercancel", endPointerInteraction);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endPointerInteraction);
      window.removeEventListener("pointercancel", endPointerInteraction);
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
      const pagesToPreview = Math.min(loadedPdf.numPages, 40);

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

  function activateTextTool() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setActiveTool("text");
    setSelectedLayerId(null);
    setStatus("Text tool active. Drag on the PDF page to draw a text box.");
  }

  function activateHighlightTool() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setActiveTool("highlight");
    setSelectedLayerId(null);
    setStatus("Highlight tool active. Drag on the PDF page to highlight an area.");
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
      const widthPercent = 35;
      const heightPercent = clamp(widthPercent * ratio, 8, 32);

      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "image",
        xPercent: 12,
        yPercent: 20,
        widthPercent,
        heightPercent,
        imageUrl: image.imageUrl,
        imageBytes: image.imageBytes,
        imageKind: image.imageKind,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      setActiveTool("select");
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
      xPercent: 54,
      yPercent: 76,
      widthPercent: 34,
      heightPercent: 7,
      text: "Your Signature",
      fontSize: 18,
      isItalic: true,
      isBold: false,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool("select");
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
      const widthPercent = 32;
      const heightPercent = clamp(widthPercent * ratio, 5, 18);

      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "signature",
        xPercent: 54,
        yPercent: 76,
        widthPercent,
        heightPercent,
        imageUrl: image.imageUrl,
        imageBytes: image.imageBytes,
        imageKind: image.imageKind,
      };

      setLayers((prev) => [...prev, newLayer]);
      setSelectedLayerId(newLayer.id);
      setActiveTool("select");
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
    setActiveTool("select");
    setStatus("Layer duplicated.");
  }

  function resetEditor() {
    setLayers([]);
    setSelectedLayerId(null);
    setActiveTool("select");
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus("All edit layers cleared.");
  }

  function clearCurrentPageLayers() {
    setLayers((prev) => prev.filter((layer) => layer.page !== currentPage));
    setSelectedLayerId(null);
    setActiveTool("select");
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus(`All layers on page ${currentPage} cleared.`);
  }

  function startMove(
    event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>,
    layer: PdfLayer
  ) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLElement;
    if (
      target.closest("textarea") ||
      target.closest("button") ||
      target.closest("[data-no-drag='true']")
    ) {
      return;
    }
    
    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      id: layer.id,
      mode: "move",
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startXPercent: layer.xPercent,
      startYPercent: layer.yPercent,
      startWidthPercent: layer.widthPercent,
      startHeightPercent: layer.heightPercent,
    };

    setSelectedLayerId(layer.id);

    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.touchAction = "none";
    document.documentElement.style.overscrollBehavior = "none";
  }

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    layer: PdfLayer,
    handle: ResizeHandle
  ) {
    event.preventDefault();
    event.stopPropagation();

    event.currentTarget.setPointerCapture(event.pointerId);

    dragStateRef.current = {
      id: layer.id,
      mode: "resize",
      handle,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startXPercent: layer.xPercent,
      startYPercent: layer.yPercent,
      startWidthPercent: layer.widthPercent,
      startHeightPercent: layer.heightPercent,
    };

    setSelectedLayerId(layer.id);

    document.body.style.touchAction = "none";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.touchAction = "none";
    document.documentElement.style.overscrollBehavior = "none";
  }

  function zoomIn() {
    setZoomLevel((prev) => Math.min(1.8, Number((prev + 0.1).toFixed(2))));
    setStatus("Zoom increased.");
  }

  function zoomOut() {
    setZoomLevel((prev) => Math.max(0.65, Number((prev - 0.1).toFixed(2))));
    setStatus("Zoom decreased.");
  }

  function selectPage(pageNumber: number) {
    setCurrentPage(pageNumber);
    setSelectedLayerId(null);
    setStatus(`Page ${pageNumber} selected.`);
  }

  function getLayerStyle(layer: PdfLayer): React.CSSProperties {
    return {
      left: `${layer.xPercent}%`,
      top: `${layer.yPercent}%`,
      width: `${layer.widthPercent}%`,
      height: `${layer.heightPercent}%`,
    };
  }

function getPointerPercent(event: React.PointerEvent<HTMLDivElement>) {
  const rect = event.currentTarget.getBoundingClientRect();

  const xPercent = clamp(
    ((event.clientX - rect.left) / rect.width) * 100,
    0,
    100
  );

  const yPercent = clamp(
    ((event.clientY - rect.top) / rect.height) * 100,
    0,
    100
  );

  return { xPercent, yPercent };
}

function normalizeDraftBox(draw: DrawState): DraftBox {
  const left = Math.min(draw.startXPercent, draw.currentXPercent);
  const top = Math.min(draw.startYPercent, draw.currentYPercent);
  const width = Math.abs(draw.currentXPercent - draw.startXPercent);
  const height = Math.abs(draw.currentYPercent - draw.startYPercent);

  return {
    xPercent: clamp(left, 0, 100),
    yPercent: clamp(top, 0, 100),
    widthPercent: clamp(width, 0, 100 - left),
    heightPercent: clamp(height, 0, 100 - top),
  };
}

function startPageDraw(event: React.PointerEvent<HTMLDivElement>) {
  if (activeTool === "select") {
    setSelectedLayerId(null);
    return;
  }

  if (!fileBytesRef.current) {
    setStatus("Upload a PDF first.");
    return;
  }

  const target = event.target as HTMLElement;

  if (
    target.closest("[data-editor-layer='true']") ||
    target.closest("textarea") ||
    target.closest("button")
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const { xPercent, yPercent } = getPointerPercent(event);

  const nextDrawState: DrawState = {
    tool: activeTool,
    startXPercent: xPercent,
    startYPercent: yPercent,
    currentXPercent: xPercent,
    currentYPercent: yPercent,
  };

  drawStateRef.current = nextDrawState;
  setDraftBox(normalizeDraftBox(nextDrawState));

  event.currentTarget.setPointerCapture(event.pointerId);

  document.body.style.touchAction = "none";
  document.body.style.overscrollBehavior = "none";
  document.documentElement.style.touchAction = "none";
  document.documentElement.style.overscrollBehavior = "none";
}

function updatePageDraw(event: React.PointerEvent<HTMLDivElement>) {
  const draw = drawStateRef.current;

  if (!draw) return;

  event.preventDefault();
  event.stopPropagation();

  const { xPercent, yPercent } = getPointerPercent(event);

  const nextDrawState: DrawState = {
    ...draw,
    currentXPercent: xPercent,
    currentYPercent: yPercent,
  };

  drawStateRef.current = nextDrawState;
  setDraftBox(normalizeDraftBox(nextDrawState));
}

function endPageDraw(event: React.PointerEvent<HTMLDivElement>) {
  const draw = drawStateRef.current;

  if (!draw) return;

  event.preventDefault();
  event.stopPropagation();

  const finalBox = normalizeDraftBox(draw);

  drawStateRef.current = null;
  setDraftBox(null);

  document.body.style.touchAction = "";
  document.body.style.overscrollBehavior = "";
  document.documentElement.style.touchAction = "";
  document.documentElement.style.overscrollBehavior = "";

  const minimumWidth = draw.tool === "text" ? 5 : 3;
  const minimumHeight = draw.tool === "text" ? 3 : 1.5;

  if (
    finalBox.widthPercent < minimumWidth ||
    finalBox.heightPercent < minimumHeight
  ) {
    setStatus("Drag a larger area to create the box.");
    return;
  }

  if (draw.tool === "text") {
    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      xPercent: finalBox.xPercent,
      yPercent: finalBox.yPercent,
      widthPercent: finalBox.widthPercent,
      heightPercent: finalBox.heightPercent,
      text: "Edit text",
      fontSize: 15,
      isBold: false,
      isItalic: false,
    };

    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool("select");
    setStatus("Text box created. Type directly or resize with dots.");
    return;
  }

  const newLayer: PdfLayer = {
    id: crypto.randomUUID(),
    page: currentPage,
    type: "highlight",
    xPercent: finalBox.xPercent,
    yPercent: finalBox.yPercent,
    widthPercent: finalBox.widthPercent,
    heightPercent: finalBox.heightPercent,
    opacity: 0.42,
  };

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
  setActiveTool("select");
  setStatus("Highlight created. Drag or resize it.");
}

function cancelDrawingState() {
  drawStateRef.current = null;
  setDraftBox(null);

  document.body.style.touchAction = "";
  document.body.style.overscrollBehavior = "";
  document.documentElement.style.touchAction = "";
  document.documentElement.style.overscrollBehavior = "";
}

  function getSelectedToolbarLabel() {
    if (!selectedLayer) return "No layer selected";

    if (selectedLayer.type === "text") return "Text selected";
    if (selectedLayer.type === "highlight") return "Highlight selected";
    if (selectedLayer.type === "image") return "Image selected";
    return "Signature selected";
  }

  async function extractCurrentPageText() {
  if (!pdfDocRef.current) {
    setStatus("Upload a PDF first.");
    return;
  }

  setOcrBusy(true);
  setStatus("Reading selectable text from current page...");

  try {
    const page = await pdfDocRef.current.getPage(currentPage);
    const textContent = await page.getTextContent();

    const textItems = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }

        return "";
      })
      .filter(Boolean);

    const extractedText = textItems.join(" ").replace(/\s+/g, " ").trim();

    if (!extractedText) {
      setOcrText("");
      setOcrRewriteText("");
      setStatus(
        "No selectable text found. This may be a scanned PDF. Full OCR will be premium/backend later."
      );
      return;
    }

    setOcrText(extractedText);
    setOcrRewriteText(extractedText);
    setStatus(`Text extracted from page ${currentPage}. You can rewrite it now.`);
  } catch (error) {
    console.error(error);
    setStatus("Unable to extract text from this page.");
  } finally {
    setOcrBusy(false);
  }
}

function addRewriteAsTextLayer() {
  if (!fileBytesRef.current) {
    setStatus("Upload a PDF first.");
    return;
  }

  if (!ocrRewriteText.trim()) {
    setStatus("Extract or enter rewritten text first.");
    return;
  }

  const newLayer: PdfLayer = {
    id: crypto.randomUUID(),
    page: currentPage,
    type: "text",
    xPercent: 8,
    yPercent: 10,
    widthPercent: 78,
    heightPercent: 22,
    text: ocrRewriteText.trim(),
    fontSize: 13,
    isBold: false,
    isItalic: false,
  };

  setLayers((prev) => [...prev, newLayer]);
  setSelectedLayerId(newLayer.id);
  setStatus("Rewritten text added as editable layer.");
}

  async function exportPdf() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setBusy(true);
    setStatus("Exporting edited PDF...");

    try {
      const pdfDoc = await PDFDocument.load(fileBytesRef.current.slice(0));
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalic = await pdfDoc.embedFont(
        StandardFonts.HelveticaOblique
      );
      const helveticaBoldItalic = await pdfDoc.embedFont(
        StandardFonts.HelveticaBoldOblique
      );

      const pages = pdfDoc.getPages();

      let pagesToExport = pages.map((_, index) => index + 1);

      if (exportMode === "current") {
        pagesToExport = [currentPage];
      }

      if (exportMode === "range") {
        pagesToExport = parsePageRange(exportRange, pages.length);
      }

      for (const layer of layers) {
        if (!pagesToExport.includes(layer.page)) continue;

        const page = pages[layer.page - 1];
        if (!page) continue;

        const { width, height } = page.getSize();

        const pdfX = (layer.xPercent / 100) * width;
        const pdfY =
          height -
          (layer.yPercent / 100) * height -
          (layer.heightPercent / 100) * height;

        const pdfWidth = (layer.widthPercent / 100) * width;
        const pdfHeight = (layer.heightPercent / 100) * height;

        if (layer.type === "highlight") {
          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(1, 0.86, 0.16),
            opacity: layer.opacity || 0.42,
          });
        }

        if (layer.type === "text" || layer.type === "signature") {
          if (layer.imageBytes && layer.imageKind) {
            const embeddedImage =
              layer.imageKind === "jpg"
                ? await pdfDoc.embedJpg(layer.imageBytes)
                : await pdfDoc.embedPng(layer.imageBytes);

            page.drawImage(embeddedImage, {
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
            });
          } else {
            const font =
              layer.isBold && layer.isItalic
                ? helveticaBoldItalic
                : layer.isBold
                  ? helveticaBold
                  : layer.isItalic
                    ? helveticaItalic
                    : helvetica;

            const fontSize = Math.max(6, layer.fontSize || 15);
            const text = layer.text || "";
            const lines = text.split("\n");
            const lineHeight = fontSize * 1.22;
            const paddingX = Math.max(2, pdfWidth * 0.035);
            const paddingY = Math.max(2, pdfHeight * 0.12);

            lines.forEach((line, index) => {
              const y = pdfY + pdfHeight - paddingY - fontSize - index * lineHeight;

              if (y > pdfY) {
                page.drawText(line, {
                  x: pdfX + paddingX,
                  y,
                  size: fontSize,
                  font,
                  color: rgb(0.05, 0.07, 0.16),
                  maxWidth: Math.max(10, pdfWidth - paddingX * 2),
                });
              }
            });
          }
        }

        if (layer.type === "image" && layer.imageBytes && layer.imageKind) {
          const embeddedImage =
            layer.imageKind === "jpg"
              ? await pdfDoc.embedJpg(layer.imageBytes)
              : await pdfDoc.embedPng(layer.imageBytes);

          page.drawImage(embeddedImage, {
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
          });
        }
      }

      let outputBytes = await pdfDoc.save();

      if (exportMode !== "full") {
        const selectedPdf = await PDFDocument.create();
        const copiedPages = await selectedPdf.copyPages(
          pdfDoc,
          pagesToExport.map((pageNumber) => pageNumber - 1)
        );

        copiedPages.forEach((page) => selectedPdf.addPage(page));
        outputBytes = await selectedPdf.save();
      }

      const blob = new Blob([outputBytes], { type: "application/pdf" });
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
      setStatus("Export failed. Please check page range and try again.");
    } finally {
      setBusy(false);
    }
  }

  function renderResizeHandles(layer: PdfLayer) {
    if (selectedLayerId !== layer.id) return null;

    return resizeHandles.map((handle) => (
      <button
        key={handle.id}
        type="button"
        data-no-drag="true"
        onPointerDown={(event) => startResize(event, layer, handle.id)}
        className={`absolute z-20 h-5 w-5 rounded-full border-2 border-white bg-indigo-500 shadow-md transition hover:scale-110 sm:h-4 sm:w-4 ${handle.className}`}
        style={{
          cursor: handle.cursor,
          touchAction: "none",
        }}
        title={`Resize ${handle.id}`}
      />
    ));
  }

  function renderLayer(layer: PdfLayer) {
    const isSelected = selectedLayerId === layer.id;

       if (layer.type === "highlight") {
      return (
        <div
          key={layer.id}
          data-editor-layer="true"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          onPointerDown={(event) => startMove(event, layer)}
          className={`absolute rounded-md border transition ${
            isSelected
              ? "border-amber-500 ring-2 ring-amber-100"
              : "border-transparent hover:border-amber-300"
          }`}
          style={{
            ...getLayerStyle(layer),
            backgroundColor: `rgba(251, 191, 36, ${layer.opacity || 0.42})`,
            touchAction: "none",
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
          data-editor-layer="true"
          onClick={(event) => {
            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          onPointerDown={(event) => startMove(event, layer)}
          className={`absolute overflow-hidden rounded-lg border bg-white/80 transition ${
            isSelected
              ? "border-indigo-400 ring-2 ring-indigo-100"
              : "border-transparent hover:border-indigo-200"
          }`}
          style={{
            ...getLayerStyle(layer),
            touchAction: "none",
          }}
        >
          {layer.imageUrl ? (
            <img
              src={layer.imageUrl}
              alt="PDF layer"
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : null}

          {renderResizeHandles(layer)}
        </div>
      );
    }

    const isSignature = layer.type === "signature";

    return (
      <div
        key={layer.id}
        data-editor-layer="true"
        onClick={(event) => {
          event.stopPropagation();
          setSelectedLayerId(layer.id);
        }}
        onPointerDown={(event) => startMove(event, layer)}
        className={`absolute rounded-lg border bg-white/95 text-slate-950 shadow-sm transition ${
          isSelected
            ? "border-indigo-400 ring-2 ring-indigo-100"
            : "border-transparent hover:border-indigo-200"
        }`}
        style={{
          ...getLayerStyle(layer),
          touchAction: "none",
        }}
      >
        {layer.imageUrl ? (
          <img
            src={layer.imageUrl}
            alt={isSignature ? "Signature layer" : "PDF layer"}
            className="h-full w-full object-contain"
            draggable={false}
          />
        ) : (
          <textarea
            value={layer.text || ""}
            data-no-drag="true"
            onPointerDown={(event) => {
              event.stopPropagation();
            }}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedLayerId(layer.id);
            }}
            onChange={(event) =>
              updateLayer(layer.id, {
                text: event.target.value,
              })
            }
            className={`h-full w-full resize-none rounded-md bg-transparent px-2 py-1 outline-none ${
              isSignature ? "font-serif" : "font-sans"
            }`}
            style={{
              fontSize: layer.fontSize || 15,
              lineHeight: 1.2,
              fontWeight: layer.isBold ? 800 : 600,
              fontStyle: layer.isItalic ? "italic" : "normal",
              letterSpacing: "-0.01em",
            }}
          />
        )}

        {renderResizeHandles(layer)}
      </div>
    );

        {isSelected && (
          <div
            onPointerDown={(event) => startMove(event, layer)}
            className="absolute left-2 right-2 top-1 h-3 cursor-move rounded-full bg-indigo-500/25 transition hover:bg-indigo-500/40 sm:h-2"
            style={{ touchAction: "none" }}
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
        <section className="mx-auto max-w-7xl px-3 py-4 sm:px-5 sm:py-7">
          <div className="overflow-hidden rounded-[1.5rem] border border-indigo-100 bg-white/90 shadow-xl shadow-indigo-100/60 backdrop-blur sm:rounded-[2rem]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-indigo-700 via-violet-700 to-fuchsia-700 p-4 text-white sm:p-6">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/20">
                    <Sparkles size={14} />
                    PDFMantra Mobile Workspace
                  </div>

                  <h1 className="text-2xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">
                    PDF Editor
                  </h1>

                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50">
                    {status}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20">
                  Touch-friendly PDF editing
                </div>

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
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => addImageLayer(event.target.files?.[0])}
                />

                <input
                  ref={signatureImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) =>
                    addImageSignatureLayer(event.target.files?.[0])
                  }
                />
              </div>
            </div>

            <div
              className="m-3 rounded-3xl border-2 border-dashed border-indigo-200 bg-gradient-to-r from-indigo-50 via-white to-amber-50 p-4 text-center sm:m-5 sm:p-5"
              onDrop={(event) => {
                event.preventDefault();
                handleFile(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
            >
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-200">
                <FileText size={22} />
              </div>

              <div className="break-words font-black text-slate-950">
                {fileName || "Drop your PDF here"}
              </div>

              <div className="mt-1 text-sm font-semibold text-slate-500">
                Mobile-friendly fit-width preview with touch drag/resize.
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:bg-amber-300"
              >
                <Upload size={18} />
                Upload PDF
              </button>
            </div>

            {numPages > 0 && (
              <div className="mx-3 mb-3 rounded-3xl border border-indigo-100 bg-white p-3 sm:mx-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-black text-slate-700">
                    Page
                    <select
                      value={currentPage}
                      onChange={(event) => selectPage(Number(event.target.value))}
                      className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                    >
                      {Array.from({ length: numPages }).map((_, index) => (
                        <option key={index + 1} value={index + 1}>
                          Page {index + 1}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={zoomOut}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                    >
                      <ZoomOut size={18} />
                    </button>

                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                      {Math.round(zoomLevel * 100)}%
                    </div>

                    <button
                      type="button"
                      onClick={zoomIn}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"
                    >
                      <ZoomIn size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )}
<div className="mx-3 mb-3 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:mx-5 sm:mb-5 sm:rounded-[1.7rem]">
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white p-3">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTool("select");
                    setDraftBox(null);
                    drawStateRef.current = null;
                    setStatus("Select tool active. Click a layer to edit or move it.");
                  }}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
                    activeTool === "select"
                      ? "border-slate-300 bg-slate-900 text-white shadow-md shadow-slate-200"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <MousePointer2 size={16} />
                  Select
                </button>
                <button
                  type="button"
                  onClick={activateTextTool}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
                    activeTool === "text"
                      ? "border-indigo-300 bg-indigo-700 text-white shadow-md shadow-indigo-100"
                      : "border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                 }`}
                >
                  <Type size={16} />
                  Text
                </button>

                <button
                  type="button"
                  onClick={activateHighlightTool}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black transition ${
                    activeTool === "highlight"
                      ? "border-amber-300 bg-amber-500 text-slate-950 shadow-md shadow-amber-100"
                      : "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  }`}                
                >
                  <Highlighter size={16} />
                  Highlight
                </button>

                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2.5 text-sm font-black text-sky-700 transition hover:bg-sky-100"
                >
                  <ImageIcon size={16} />
                  Image
                </button>

                <button
                  type="button"
                  onClick={addTextSignatureLayer}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-2.5 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                >
                  <PenLine size={16} />
                  Sign
                </button>

                <button
                  type="button"
                  onClick={() => signatureImageInputRef.current?.click()}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-fuchsia-100 bg-fuchsia-50 px-4 py-2.5 text-sm font-black text-fuchsia-700 transition hover:bg-fuchsia-100"
                >
                  <FileImage size={16} />
                  Sign Image
                </button>

                <button
                  type="button"
                  onClick={deleteSelectedLayer}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-2.5 text-sm font-black text-red-700 transition hover:bg-red-100"
                >
                  <Trash2 size={16} />
                  Delete
                </button>

                <button
                  type="button"
                  onClick={clearCurrentPageLayers}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <Layers size={16} />
                  Clear Page
                </button>

                <button
                  type="button"
                  onClick={resetEditor}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                >
                  <RotateCcw size={16} />
                  Reset
                </button>

                <button
                  type="button"
                  onClick={exportPdf}
                  className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-sm font-black text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Download size={16} />
                  Export
                </button>

                {selectedLayer && (
                  <div className="flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 py-2 shadow-sm">
                    <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
                      {getSelectedToolbarLabel()}
                    </div>

                    {(selectedLayer.type === "text" ||
                      selectedLayer.type === "signature") &&
                      !selectedLayer.imageUrl && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              updateLayer(selectedLayer.id, {
                                isBold: !selectedLayer.isBold,
                              })
                            }
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                              selectedLayer.isBold
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Bold"
                          >
                            <Bold size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateLayer(selectedLayer.id, {
                                isItalic: !selectedLayer.isItalic,
                              })
                            }
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition ${
                              selectedLayer.isItalic
                                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                            }`}
                            title="Italic"
                          >
                            <Italic size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateLayer(selectedLayer.id, {
                                fontSize: Math.max(
                                  8,
                                  (selectedLayer.fontSize || 15) - 1
                                ),
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                            title="Decrease font size"
                          >
                            <Minus size={15} />
                          </button>

                          <div className="min-w-10 text-center text-sm font-black text-slate-800">
                            {selectedLayer.fontSize || 15}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              updateLayer(selectedLayer.id, {
                                fontSize: Math.min(
                                  72,
                                  (selectedLayer.fontSize || 15) + 1
                                ),
                              })
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                            title="Increase font size"
                          >
                            <Plus size={15} />
                          </button>
                        </>
                      )}

                    {selectedLayer.type === "highlight" && (
                      <select
                        value={selectedLayer.opacity || 0.42}
                        onChange={(event) =>
                          updateLayer(selectedLayer.id, {
                            opacity: Number(event.target.value),
                          })
                        }
                        className="min-h-9 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-700 outline-none"
                        title="Opacity"
                      >
                        <option value={0.2}>20%</option>
                        <option value={0.3}>30%</option>
                        <option value={0.42}>42%</option>
                        <option value={0.5}>50%</option>
                        <option value={0.65}>65%</option>
                      </select>
                    )}

                    <button
                      type="button"
                      onClick={duplicateSelectedLayer}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50"
                      title="Duplicate"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid min-h-[560px] grid-cols-1 lg:grid-cols-[180px_1fr]">
                <aside className="border-b border-slate-200 bg-slate-50/80 p-3 lg:border-b-0 lg:border-r lg:p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950">
                    <FileText size={16} />
                    Pages
                  </div>

                  {numPages === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                      No PDF uploaded.
                    </p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:overflow-visible lg:pb-0">
                      {Array.from({ length: numPages }).map((_, index) => {
                        const pageNumber = index + 1;
                        const thumb = pageThumbs.find(
                          (item) => item.pageNumber === pageNumber
                        );

                        return (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => selectPage(pageNumber)}
                            className={`min-w-[86px] rounded-2xl border p-2 text-left text-xs transition lg:mb-2 lg:w-full lg:min-w-0 lg:p-3 lg:text-sm ${
                              currentPage === pageNumber
                                ? "border-indigo-600 bg-indigo-50 font-black text-indigo-700 shadow-sm"
                                : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"
                            }`}
                          >
                            {thumb?.url ? (
                              <img
                                src={thumb.url}
                                alt={`Page ${pageNumber}`}
                                className="mb-2 h-20 w-full rounded-lg object-contain bg-slate-100 lg:h-24"
                              />
                            ) : null}
                            Page {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold leading-5 text-indigo-700">
                    <div className="mb-1 flex items-center gap-1 font-black">
                      <MousePointer2 size={14} />
                      Mobile tip
                    </div>
                    Drag a selected box from its border or empty area to move. Use dots
                    to resize.
                  </div>
                </aside>

                <section
                  ref={pdfViewportRef}
                  className="flex w-full items-start justify-start overflow-auto bg-[radial-gradient(circle_at_top,_#ddd6fe,_#f8fafc_42%,_#e2e8f0)] p-3 sm:justify-center sm:p-6"
                >
                  <div
                    className={`relative mx-auto rounded-xl bg-white shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200 ${
                      activeTool === "text" || activeTool === "highlight"
                        ? "cursor-crosshair"
                        : "cursor-default"
                    }`}
                    style={{
                      width: canvasSize.width,
                      minHeight: canvasSize.height,
                      touchAction: activeTool === "select" ? "auto" : "none",
                    }}
                    onPointerDown={startPageDraw}
                    onPointerMove={updatePageDraw}
                    onPointerUp={endPageDraw}
                    onPointerCancel={() => cancelDrawingState()}
                    onClick={() => {
                      if (activeTool === "select") {
                        setSelectedLayerId(null);
                      }
                    }}
                  >
                    {busy && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm">
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
                      <div className="flex min-h-[440px] items-center justify-center p-6 text-center sm:min-h-[540px] sm:p-10">
                        <div>
                          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
                            <Upload size={26} />
                          </div>
                          <div className="font-black text-slate-900">
                            Upload a PDF to preview it here
                          </div>
                          <p className="mt-2 text-sm text-slate-500">
                            The page will auto-fit your mobile screen.
                          </p>
                        </div>
                      </div>
                    )}

                    <canvas
                      ref={canvasRef}
                      className={fileName ? "block" : "hidden"}
                    />

                    {draftBox && (
                      <div
                        className={`pointer-events-none absolute z-20 rounded-md border-2 border-dashed ${
                          activeTool === "highlight"
                            ? "border-amber-500 bg-amber-300/35"
                            : "border-indigo-500 bg-indigo-100/35"
                        }`}
                        style={{
                          left: `${draftBox.xPercent}%`,
                          top: `${draftBox.yPercent}%`,
                          width: `${draftBox.widthPercent}%`,
                          height: `${draftBox.heightPercent}%`,
                        }}
                      />
                    )}

                    {currentPageLayers.map((layer) => renderLayer(layer))}
                  </div>
                </section>
              </div>
            </div>

            <div className="mx-3 mb-3 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 sm:mx-5">
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-indigo-950">
                    <Wand2 size={18} />
                    OCR / Rewrite
                  </div>

                  <p className="mt-2 text-sm font-semibold leading-6 text-indigo-800">
                    Extract selectable text from the current page, rewrite it,
                    then add it back as an editable text layer.
                  </p>

                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-black">
                      <Lock size={14} />
                      Premium OCR later
                    </div>
                    Scanned PDF OCR, automatic text replacement, and no-watermark
                    full export will be premium/backend features later.
                  </div>
                </div>

                <label className="block">
                  <span className="text-sm font-black text-indigo-950">
                    Extracted / rewritten text
                  </span>

                  <textarea
                    value={ocrRewriteText}
                    onChange={(event) => setOcrRewriteText(event.target.value)}
                    placeholder="Extracted text will appear here..."
                    className="mt-2 h-32 w-full resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>

                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={extractCurrentPageText}
                    disabled={ocrBusy || !fileName}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {ocrBusy ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Reading
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} />
                        Extract Text
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={addRewriteAsTextLayer}
                    disabled={!ocrRewriteText.trim()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-5 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Add as Layer
                  </button>

                  {ocrText && (
                    <div className="rounded-2xl bg-white/75 px-3 py-2 text-xs font-bold text-slate-600">
                      {ocrText.length} characters extracted from page{" "}
                      {currentPage}.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mx-3 mb-3 rounded-3xl border border-slate-200 bg-white p-4 sm:mx-5 sm:mb-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="text-sm font-black text-slate-700">
                  Export mode
                  <select
                    value={exportMode}
                    onChange={(event) =>
                      setExportMode(event.target.value as ExportMode)
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="full">Full edited PDF</option>
                    <option value="current">Current page only</option>
                    <option value="range">Page range</option>
                  </select>
                </label>

                <label className="text-sm font-black text-slate-700">
                  Page range
                  <input
                    value={exportRange}
                    onChange={(event) => setExportRange(event.target.value)}
                    disabled={exportMode !== "range"}
                    placeholder="1-3,5"
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </label>

                <button
                  type="button"
                  onClick={exportPdf}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-800"
                >
                  <Download size={18} />
                  Download Edited PDF
                </button>
              </div>
            </div>

            {showFreeLimitNote && (
              <div className="mx-3 mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 sm:mx-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-black">PDFMantra note:</span> This
                    editor uses free browser-based editing. Advanced OCR, true
                    existing text replacement, PDF to Word, password tools, and
                    high-quality compression will need backend processing later.
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowFreeLimitNote(false)}
                    className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-900"
                  >
                    Hide
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
