"use client";

import { Header } from "@/components/Header";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import {
  Bold,
  Copy,
  Download,
  FileText,
  Italic,
  Loader2,
  Lock,
  Minus,
  MousePointer2,
  Plus,
  Sparkles,
  Upload,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ActiveTool,
  DragState,
  DraftBox,
  DrawState,
  ExportMode,
  PageThumb,
  PdfLayer,
  ResizeHandle,
  TextOverlayItem,
} from "@/lib/editor/types";

const resizeHandles: { id: ResizeHandle; className: string; cursor: string }[] = [
  { id: "tl", className: "-left-3 -top-3", cursor: "nwse-resize" },
  { id: "tm", className: "left-1/2 -top-3 -translate-x-1/2", cursor: "ns-resize" },
  { id: "tr", className: "-right-3 -top-3", cursor: "nesw-resize" },
  { id: "mr", className: "-right-3 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
  { id: "br", className: "-bottom-3 -right-3", cursor: "nwse-resize" },
  { id: "bm", className: "-bottom-3 left-1/2 -translate-x-1/2", cursor: "ns-resize" },
  { id: "bl", className: "-bottom-3 -left-3", cursor: "nesw-resize" },
  { id: "ml", className: "-left-3 top-1/2 -translate-y-1/2", cursor: "ew-resize" },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPdfFile(file: File, arrayBuffer: ArrayBuffer) {
  const lower = file.name.toLowerCase();
  const hasPdfExtension = lower.endsWith(".pdf");
  const hasPdfMime = file.type === "application/pdf" || file.type === "application/x-pdf";
  const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const hasPdfSignature = bytes.length === 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
  return hasPdfMime || hasPdfExtension || hasPdfSignature;
}

function isImageFile(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || name.endsWith(".png") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".webp");
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
    if (!context) throw new Error("Unable to process image.");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((outputBlob) => (outputBlob ? resolve(outputBlob) : reject(new Error("Unable to convert image."))), "image/png");
    });
    return {
      imageBytes: new Uint8Array(await blob.arrayBuffer()),
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
  if (!cleaned) throw new Error("Enter a page range. Example: 1-3,5");
  const pages: number[] = [];
  for (const part of cleaned.split(",").map((v) => v.trim()).filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((v) => Number(v.trim()));
      if (!Number.isInteger(a) || !Number.isInteger(b)) throw new Error(`Invalid range: ${part}`);
      if (a <= 0 || b <= 0) throw new Error("Page numbers start from 1.");
      if (a > b) throw new Error(`Invalid reversed range: ${part}`);
      if (b > totalPages) throw new Error(`Page ${b} is outside this PDF.`);
      for (let page = a; page <= b; page += 1) pages.push(page);
    } else {
      const page = Number(part);
      if (!Number.isInteger(page)) throw new Error(`Invalid page number: ${part}`);
      if (page <= 0) throw new Error("Page numbers start from 1.");
      if (page > totalPages) throw new Error(`Page ${page} is outside this PDF.`);
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
  const highlightDragRef = useRef<DrawState | null>(null);

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
  const [textOverlay, setTextOverlay] = useState<TextOverlayItem[]>([]);
  const [exportMode, setExportMode] = useState<ExportMode>("full");
  const [exportRange, setExportRange] = useState("1-3");
  const [showFreeLimitNote, setShowFreeLimitNote] = useState(true);
  const [ocrText, setOcrText] = useState("");
  const [ocrRewriteText, setOcrRewriteText] = useState("");
  const [ocrBusy, setOcrBusy] = useState(false);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const extractTextOverlay = useCallback(
    async (page: pdfjsLib.PDFPageProxy, viewport: pdfjsLib.PageViewport, scale: number) => {
      try {
        const textContent = await page.getTextContent();
        const transformUtil = (pdfjsLib as any).Util?.transform;
        const items = textContent.items
          .map((item, index) => {
            const textItem = item as any;
            const text = String(textItem.str || "");
            if (!text.trim() || !Array.isArray(textItem.transform)) return null;
            let left = 0;
            let top = 0;
            let width = Math.max(1, Number(textItem.width || 0) * scale);
            let height = Math.max(4, Number(textItem.height || 0) * scale);
            let fontSize = Math.max(6, height);
            if (typeof transformUtil === "function") {
              const tx = transformUtil(viewport.transform, textItem.transform);
              left = tx[4];
              fontSize = Math.max(6, Math.hypot(tx[2], tx[3]));
              height = Math.max(6, fontSize * 1.15);
              top = tx[5] - height;
              width = Math.max(1, Number(textItem.width || 0) * scale);
            }
            return {
              id: `${currentPage}-${index}-${text.slice(0, 12)}`,
              text,
              leftPercent: clamp((left / viewport.width) * 100, 0, 100),
              topPercent: clamp((top / viewport.height) * 100, 0, 100),
              widthPercent: clamp((width / viewport.width) * 100, 0.2, 100),
              heightPercent: clamp((height / viewport.height) * 100, 0.2, 100),
              fontSizePx: fontSize,
            };
          })
          .filter(Boolean) as TextOverlayItem[];
        setTextOverlay(items);
      } catch (error) {
        console.error(error);
        setTextOverlay([]);
      }
    },
    [currentPage]
  );

  const renderPage = useCallback(
    async (pageNumber: number) => {
      if (!pdfDocRef.current || !canvasRef.current) return;
      const page = await pdfDocRef.current.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const viewportWidth = (pdfViewportRef.current?.clientWidth || window.innerWidth) - 24;
      const fitScale = clamp(Math.max(280, viewportWidth) / unscaledViewport.width, 0.35, 1.25);
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
      setCanvasSize({ width: viewport.width, height: viewport.height });
      setRenderScale(finalScale);
      await page.render({ canvasContext: context, viewport }).promise;
      await extractTextOverlay(page, viewport, finalScale);
    },
    [extractTextOverlay, zoomLevel]
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
      const dx = ((event.clientX - drag.startPointerX) / canvasSize.width) * 100;
      const dy = ((event.clientY - drag.startPointerY) / canvasSize.height) * 100;
      setLayers((prev) =>
        prev.map((layer) => {
          if (layer.id !== drag.id) return layer;
          if (drag.mode === "move") {
            return {
              ...layer,
              xPercent: clamp(drag.startXPercent + dx, 0, 100 - layer.widthPercent),
              yPercent: clamp(drag.startYPercent + dy, 0, 100 - layer.heightPercent),
            };
          }
          let x = drag.startXPercent;
          let y = drag.startYPercent;
          let w = drag.startWidthPercent;
          let h = drag.startHeightPercent;
          if (drag.handle === "mr" || drag.handle === "tr" || drag.handle === "br") w = drag.startWidthPercent + dx;
          if (drag.handle === "ml" || drag.handle === "tl" || drag.handle === "bl") {
            x = drag.startXPercent + dx;
            w = drag.startWidthPercent - dx;
          }
          if (drag.handle === "bm" || drag.handle === "bl" || drag.handle === "br") h = drag.startHeightPercent + dy;
          if (drag.handle === "tm" || drag.handle === "tl" || drag.handle === "tr") {
            y = drag.startYPercent + dy;
            h = drag.startHeightPercent - dy;
          }
          const minW = layer.type === "text" || layer.type === "signature" ? 9 : 2;
          const minH = layer.type === "text" || layer.type === "signature" ? 4 : 1;
          w = clamp(w, minW, 95);
          h = clamp(h, minH, 70);
          x = clamp(x, 0, 100 - w);
          y = clamp(y, 0, 100 - h);
          return { ...layer, xPercent: x, yPercent: y, widthPercent: w, heightPercent: h };
        })
      );
    }
    function endPointerInteraction() {
      dragStateRef.current = null;
      cancelDrawingState();
    }
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", endPointerInteraction);
    window.addEventListener("pointercancel", endPointerInteraction);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", endPointerInteraction);
      window.removeEventListener("pointercancel", endPointerInteraction);
    };
  }, [canvasSize.height, canvasSize.width]);

  useEffect(() => {
    if (activeTool !== "highlight") return;

    function handleGlobalMouseUp() {
      window.setTimeout(() => {
        createHighlightFromSelection();
      }, 0);
    }

    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [activeTool, currentPage, textOverlay]);
  
  
  const currentPageLayers = useMemo(() => layers.filter((layer) => layer.page === currentPage), [currentPage, layers]);
  const selectedLayer = useMemo(() => layers.find((layer) => layer.id === selectedLayerId), [layers, selectedLayerId]);
  const showTextOverlay = activeTool === "highlight" || activeTool === "edit";

  function updateLayer(id: string, updates: Partial<PdfLayer>) {
    setLayers((prev) => prev.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)));
  }

  async function renderThumbnail(pdf: pdfjsLib.PDFDocumentProxy, pageNumber: number) {
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
    await page.render({ canvasContext: context, viewport }).promise;
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
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
      pdfDocRef.current = loadedPdf;
      setFileName(file.name);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setLayers([]);
      setSelectedLayerId(null);
      setActiveTool("select");
      setDraftBox(null);
      setTextOverlay([]);
      const thumbs: PageThumb[] = [];
      for (let pageNumber = 1; pageNumber <= Math.min(loadedPdf.numPages, 40); pageNumber += 1) {
        thumbs.push({ pageNumber, url: await renderThumbnail(loadedPdf, pageNumber) });
      }
      setPageThumbs(thumbs);
      await renderPage(1);
      setStatus("PDF loaded. Use Edit, Text, Highlight, Image, or Sign.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to load PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  function selectEditorTool(tool: ActiveTool) {
    if (tool === "select") {
      setActiveTool("select");
      setDraftBox(null);
      drawStateRef.current = null;
      highlightDragRef.current = null;
      setStatus("Select mode active. Move, resize, duplicate, or delete layers.");
      return;
    }

    if (tool === "edit") {
      activateEditTool();
      return;
    }

    if (tool === "text") {
      activateTextTool();
      return;
    }

    if (tool === "highlight") {
      activateHighlightTool();
    }
  }

  function activateEditTool() {
        setActiveTool("edit");
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus("Edit mode active. Select an object or click selectable PDF text to edit it.");
  }

  function activateTextTool() {
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    setActiveTool("text");
    setSelectedLayerId(null);
    setStatus("Text tool active. Drag on the PDF page to draw a text box.");
  }

  function activateHighlightTool() {
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    setActiveTool("highlight");
    setSelectedLayerId(null);
    setDraftBox(null);
    setStatus(textOverlay.length === 0 ? "Highlight mode active, but no selectable text found. OCR highlight will require premium/backend OCR later." : "Highlight mode active. Drag across PDF text to highlight it.");
  }

  async function addImageLayer(file?: File) {
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    if (!file) return;
    if (!isImageFile(file)) return setStatus("Please upload PNG, JPG, or WebP image.");
    setBusy(true);
    setStatus("Adding image layer...");
    try {
      const image = await convertImageToPngBytes(file);
      const ratio = image.height / Math.max(image.width, 1);
      const widthPercent = 35;
      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "image",
        xPercent: 12,
        yPercent: 20,
        widthPercent,
        heightPercent: clamp(widthPercent * ratio, 8, 32),
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
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
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
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    if (!file) return;
    if (!isImageFile(file)) return setStatus("Please upload PNG, JPG, or WebP signature image.");
    setBusy(true);
    setStatus("Adding signature image...");
    try {
      const image = await convertImageToPngBytes(file);
      const ratio = image.height / Math.max(image.width, 1);
      const widthPercent = 32;
      const newLayer: PdfLayer = {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "signature",
        xPercent: 54,
        yPercent: 76,
        widthPercent,
        heightPercent: clamp(widthPercent * ratio, 5, 18),
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
    if (selectedLayerId === layerId) setSelectedLayerId(null);
    setStatus("Layer deleted.");
  }

  function deleteSelectedLayer() {
    if (!selectedLayerId) return setStatus("Select a layer first.");
    deleteLayer(selectedLayerId);
  }

  function duplicateSelectedLayer() {
    if (!selectedLayerId) return setStatus("Select a layer first.");
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

  function startMove(event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>, layer: PdfLayer) {
    const target = event.target as HTMLElement;
    if (target.closest("textarea") || target.closest("button") || target.closest("[data-no-drag='true']")) return;
    event.preventDefault();
    event.stopPropagation();
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

  function startResize(event: React.PointerEvent<HTMLButtonElement>, layer: PdfLayer, handle: ResizeHandle) {
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
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus(`Page ${pageNumber} selected.`);
  }

  function getLayerStyle(layer: PdfLayer) {
    return {
      left: `${layer.xPercent}%`,
      top: `${layer.yPercent}%`,
      width: `${layer.widthPercent}%`,
      height: `${layer.heightPercent}%`,
    };
  }

  function getPointerPercent(event: React.PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      xPercent: clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      yPercent: clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    };
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
    if (activeTool === "highlight") {
      return;
    }

    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
  
    if (activeTool !== "text") {
      if (activeTool === "edit") setSelectedLayerId(null);
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

    if (activeTool === "highlight") {
      event.preventDefault();
      event.stopPropagation();
      const { xPercent, yPercent } = getPointerPercent(event);
      highlightDragRef.current = {
        startXPercent: xPercent,
        startYPercent: yPercent,
        currentXPercent: xPercent,
        currentYPercent: yPercent,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      document.body.style.userSelect = "none";
      document.body.style.touchAction = "none";
      document.body.style.overscrollBehavior = "none";
      document.documentElement.style.touchAction = "none";
      document.documentElement.style.overscrollBehavior = "none";
      return;
    }

    if (activeTool !== "text") {
      if (activeTool === "edit") setSelectedLayerId(null);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const { xPercent, yPercent } = getPointerPercent(event);
    const nextDrawState: DrawState = {
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
    const highlightDrag = highlightDragRef.current;
    if (highlightDrag) {
      event.preventDefault();
      event.stopPropagation();
      const { xPercent, yPercent } = getPointerPercent(event);
      highlightDragRef.current = {
        ...highlightDrag,
        currentXPercent: xPercent,
        currentYPercent: yPercent,
      };
      return;
    }

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
    const highlightDrag = highlightDragRef.current;
    if (highlightDrag) {
      event.preventDefault();
      event.stopPropagation();
      const finalBox = normalizeDraftBox(highlightDrag);
      highlightDragRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.touchAction = "";
      document.body.style.overscrollBehavior = "";
      document.documentElement.style.touchAction = "";
      document.documentElement.style.overscrollBehavior = "";

      if (finalBox.widthPercent < 0.15 || finalBox.heightPercent < 0.15) {
        setStatus("Drag across PDF text to highlight it.");
        return;
      }

      const hits = textOverlay.filter((item) =>
        rectanglesIntersect(
          {
            x: finalBox.xPercent,
            y: finalBox.yPercent,
            width: finalBox.widthPercent,
            height: finalBox.heightPercent,
          },
          {
            x: item.leftPercent,
            y: item.topPercent,
            width: item.widthPercent,
            height: item.heightPercent,
          }
        )
      );

      if (!hits.length) {
        setStatus("No selectable text found in this area. OCR highlight will require premium/backend OCR later.");
        return;
      }

      const newLayers: PdfLayer[] = hits.map((item) => ({
        id: crypto.randomUUID(),
        page: currentPage,
        type: "highlight",
        xPercent: item.leftPercent,
        yPercent: item.topPercent,
        widthPercent: item.widthPercent,
        heightPercent: item.heightPercent,
        opacity: 0.42,
      }));

      setLayers((prev) => [...prev, ...newLayers]);
      setSelectedLayerId(newLayers[newLayers.length - 1]?.id || null);
      setStatus(`Highlighted ${newLayers.length} text item${newLayers.length > 1 ? "s" : ""}.`);
      return;
    }

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
    if (finalBox.widthPercent < 5 || finalBox.heightPercent < 3) {
      return setStatus("Drag a larger area to create the text box.");
    }
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
  }

  function cancelDrawingState() {
    drawStateRef.current = null;
    highlightDragRef.current = null;
    setDraftBox(null);
    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.body.style.overscrollBehavior = "";
    document.documentElement.style.touchAction = "";
    document.documentElement.style.overscrollBehavior = "";
  }

  function addReplacementTextLayer(item: TextOverlayItem) {
    if (activeTool !== "edit") return;
    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      xPercent: item.leftPercent,
      yPercent: item.topPercent,
      widthPercent: Math.max(item.widthPercent + 1, 4),
      heightPercent: Math.max(item.heightPercent + 1, 2.5),
      text: item.text,
      fontSize: clamp(Math.round(item.fontSizePx / Math.max(renderScale, 0.1)), 6, 72),
      isBold: false,
      isItalic: false,
      coverText: true,
    };
    setLayers((prev) => [...prev, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("PDF text converted to editable visual layer. Edit it, then export.");
  }

  function rectanglesIntersect(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function getSelectedToolbarLabel() {
    if (!selectedLayer) return "No layer selected";
    if (selectedLayer.type === "text") return selectedLayer.coverText ? "Editable PDF text" : "Text selected";
    if (selectedLayer.type === "highlight") return "Highlight selected";
    if (selectedLayer.type === "image") return "Image selected";
    return "Signature selected";
  }

  async function extractCurrentPageText() {
    if (!pdfDocRef.current) return setStatus("Upload a PDF first.");
    setOcrBusy(true);
    setStatus("Reading selectable text from current page...");
    try {
      const page = await pdfDocRef.current.getPage(currentPage);
      const textContent = await page.getTextContent();
      const extractedText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!extractedText) {
        setOcrText("");
        setOcrRewriteText("");
        setStatus("No selectable text found. This may be a scanned PDF. Full OCR will be premium/backend later.");
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
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    if (!ocrRewriteText.trim()) return setStatus("Extract or enter rewritten text first.");
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
        setActiveTool("select");
    setStatus("Rewritten text added as editable layer.");
  }

  async function exportPdf() {
    if (!fileBytesRef.current) return setStatus("Upload a PDF first.");
    setBusy(true);
    setStatus("Exporting edited PDF...");
    try {
      const pdfDoc = await PDFDocument.load(fileBytesRef.current.slice(0));
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
      const helveticaBoldItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      const pages = pdfDoc.getPages();
      let pagesToExport = pages.map((_, index) => index + 1);
      if (exportMode === "current") pagesToExport = [currentPage];
      if (exportMode === "range") pagesToExport = parsePageRange(exportRange, pages.length);

      for (const layer of layers) {
        if (!pagesToExport.includes(layer.page)) continue;
        const page = pages[layer.page - 1];
        if (!page) continue;
        const { width, height } = page.getSize();
        const pdfX = (layer.xPercent / 100) * width;
        const pdfY = height - (layer.yPercent / 100) * height - (layer.heightPercent / 100) * height;
        const pdfWidth = (layer.widthPercent / 100) * width;
        const pdfHeight = (layer.heightPercent / 100) * height;

        if (layer.type === "highlight") {
          page.drawRectangle({ x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight, color: rgb(1, 0.86, 0.16), opacity: layer.opacity || 0.42 });
          continue;
        }

        if (layer.type === "image" && layer.imageBytes && layer.imageKind) {
          const embeddedImage = layer.imageKind === "jpg" ? await pdfDoc.embedJpg(layer.imageBytes) : await pdfDoc.embedPng(layer.imageBytes);
          page.drawImage(embeddedImage, { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight });
          continue;
        }

        if (layer.type === "text" || layer.type === "signature") {
          if (layer.coverText) page.drawRectangle({ x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight, color: rgb(1, 1, 1), opacity: 1 });
          if (layer.imageBytes && layer.imageKind) {
            const embeddedImage = layer.imageKind === "jpg" ? await pdfDoc.embedJpg(layer.imageBytes) : await pdfDoc.embedPng(layer.imageBytes);
            page.drawImage(embeddedImage, { x: pdfX, y: pdfY, width: pdfWidth, height: pdfHeight });
          } else {
            const font = layer.isBold && layer.isItalic ? helveticaBoldItalic : layer.isBold ? helveticaBold : layer.isItalic ? helveticaItalic : helvetica;
            const fontSize = Math.max(6, layer.fontSize || 15);
            const lines = (layer.text || "").split("\n");
            const lineHeight = fontSize * 1.22;
            const paddingX = Math.max(2, pdfWidth * 0.035);
            const paddingY = Math.max(2, pdfHeight * 0.12);
            lines.forEach((line, index) => {
              const y = pdfY + pdfHeight - paddingY - fontSize - index * lineHeight;
              if (y > pdfY) {
                page.drawText(line, { x: pdfX + paddingX, y, size: fontSize, font, color: rgb(0.05, 0.07, 0.16), maxWidth: Math.max(10, pdfWidth - paddingX * 2) });
              }
            });
          }
        }
      }

      let outputBytes = await pdfDoc.save();
      if (exportMode !== "full") {
        const selectedPdf = await PDFDocument.create();
        const copiedPages = await selectedPdf.copyPages(pdfDoc, pagesToExport.map((pageNumber) => pageNumber - 1));
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
        className={`absolute z-30 h-5 w-5 rounded-full border-2 border-white bg-indigo-500 shadow-md transition hover:scale-110 sm:h-4 sm:w-4 ${handle.className}`}
        style={{ cursor: handle.cursor, touchAction: "none" }}
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
          className={`absolute rounded-[2px] transition ${
            isSelected ? "ring-2 ring-amber-300" : ""
          }`}
          style={{
            ...getLayerStyle(layer),
            backgroundColor: `rgba(251, 191, 36, ${layer.opacity || 0.38})`,
            mixBlendMode: "multiply",
            touchAction: "none",
            zIndex: 5,
          }}
          title="Highlight"
        >
          {isSelected ? renderResizeHandles(layer) : null}
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
          className={`absolute overflow-hidden rounded-lg border bg-white/80 transition ${isSelected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-transparent hover:border-indigo-200"}`}
          style={{ ...getLayerStyle(layer), touchAction: "none", zIndex: 20 }}
        >
          {layer.imageUrl ? <img src={layer.imageUrl} alt="PDF layer" className="h-full w-full object-contain" draggable={false} /> : null}
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
        className={`absolute rounded-lg border text-slate-950 shadow-sm transition ${
          isSelected ? "border-indigo-400 bg-white/95 ring-2 ring-indigo-100" : layer.coverText ? "border-transparent bg-white/95 hover:border-indigo-200" : "border-transparent bg-white/80 hover:border-indigo-200"
        }`}
        style={{ ...getLayerStyle(layer), touchAction: "none", zIndex: 25 }}
      >
        {layer.imageUrl ? (
          <img src={layer.imageUrl} alt={isSignature ? "Signature layer" : "PDF layer"} className="h-full w-full object-contain" draggable={false} />
        ) : (
          <textarea
            value={layer.text || ""}
            data-no-drag="true"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              setSelectedLayerId(layer.id);
            }}
            onChange={(event) => updateLayer(layer.id, { text: event.target.value })}
            className={`h-full w-full resize-none rounded-md bg-transparent px-2 py-1 outline-none ${isSignature ? "font-serif" : "font-sans"}`}
            style={{ fontSize: layer.fontSize || 15, lineHeight: 1.2, fontWeight: layer.isBold ? 800 : 600, fontStyle: layer.isItalic ? "italic" : "normal", letterSpacing: "-0.01em" }}
          />
        )}
        {renderResizeHandles(layer)}
      </div>
    );
  }

   function createHighlightFromSelection() {
    if (activeTool !== "highlight") return;

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return;
    }

    const canvasElement = canvasRef.current;

    if (!canvasElement) {
      selection.removeAllRanges();
      return;
    }

    const pageRect = canvasElement.getBoundingClientRect();
    const range = selection.getRangeAt(0);

    const selectedRects = Array.from(range.getClientRects()).filter((rect) => {
      const isInsidePage =
        rect.right > pageRect.left &&
        rect.left < pageRect.right &&
        rect.bottom > pageRect.top &&
        rect.top < pageRect.bottom;

      return rect.width > 1 && rect.height > 1 && isInsidePage;
    });

    if (selectedRects.length === 0) {
      selection.removeAllRanges();
      setStatus(
        "No selectable text found in this area. OCR highlight will require premium/backend OCR later."
      );
      return;
    }

    const newHighlights: PdfLayer[] = selectedRects.map((rect) => {
      const left = clamp(rect.left - pageRect.left, 0, pageRect.width);
      const top = clamp(rect.top - pageRect.top, 0, pageRect.height);
      const width = clamp(rect.width, 1, pageRect.width - left);
      const height = clamp(rect.height, 1, pageRect.height - top);

      return {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "highlight",
        xPercent: (left / pageRect.width) * 100,
        yPercent: ((top + height * 0.12) / pageRect.height) * 100,
        widthPercent: (width / pageRect.width) * 100,
        heightPercent: ((height * 0.76) / pageRect.height) * 100,
        opacity: 0.38,
      };
    });

    setLayers((prev) => [...prev, ...newHighlights]);
    setSelectedLayerId(null);
    setStatus(
      `Highlighted selected text (${newHighlights.length} ${
        newHighlights.length === 1 ? "area" : "areas"
      }).`
    );

    selection.removeAllRanges();
  }

  function renderTextOverlay() {
    if (!showTextOverlay || !fileName) return null;

    return (
      <div
        className="absolute inset-0 z-40"
        style={{
          pointerEvents:
            activeTool === "highlight" || activeTool === "edit" ? "auto" : "none",
          userSelect: activeTool === "highlight" ? "text" : "none",
        }}
      >
        {textOverlay.map((item) => {
          const isHovered = hoveredTextId === item.id;

          return (
            <span
              key={item.id}
              onMouseEnter={() => setHoveredTextId(item.id)}
              onMouseLeave={() => setHoveredTextId(null)}
              onClick={(event) => {
                if (activeTool !== "edit") return;

                event.preventDefault();
                event.stopPropagation();
                addReplacementTextLayer(item);
              }}
              className={`absolute whitespace-pre rounded-[2px] ${
                activeTool === "edit" && isHovered
                  ? "bg-indigo-300/25 outline outline-1 outline-indigo-300/60"
                  : ""
              }`}
              style={{
                left: `${item.leftPercent}%`,
                top: `${item.topPercent}%`,
                width: `${item.widthPercent}%`,
                height: `${item.heightPercent}%`,
                fontSize: item.fontSizePx,
                lineHeight: 1,
                color: "transparent",
                WebkitTextFillColor: "transparent",
                caretColor: "transparent",
                cursor: activeTool === "highlight" ? "text" : "pointer",
                userSelect: activeTool === "highlight" ? "text" : "none",
                pointerEvents:
                  activeTool === "highlight" || activeTool === "edit" ? "auto" : "none",
              }}
              title={activeTool === "edit" ? `Edit: ${item.text}` : item.text}
            >
              {item.text}
            </span>
          );
        })}
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
                    <Sparkles size={14} /> PDFMantra Editor Workspace
                  </div>
                  <h1 className="text-2xl font-black tracking-[-0.03em] sm:text-4xl lg:text-5xl">PDF Editor</h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-indigo-50">{status}</p>
                </div>
                <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/20">Text selection highlight + visual editing</div>
                <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={(event) => handleFile(event.target.files?.[0])} />
                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => addImageLayer(event.target.files?.[0])} />
                <input ref={signatureImageInputRef} type="file" accept="image/*" className="hidden" onChange={(event) => addImageSignatureLayer(event.target.files?.[0])} />
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
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-700 text-white shadow-md shadow-indigo-200"><FileText size={22} /></div>
              <div className="break-words font-black text-slate-950">{fileName || "Drop your PDF here"}</div>
              <div className="mt-1 text-sm font-semibold text-slate-500">Use Highlight to drag across exact PDF text. Use Edit to convert PDF text into editable visual text.</div>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-amber-400 px-5 py-3 text-sm font-black text-slate-950 shadow-lg shadow-amber-100 transition hover:bg-amber-300">
                <Upload size={18} /> Upload PDF
              </button>
            </div>

            {numPages > 0 && (
              <div className="mx-3 mb-3 rounded-3xl border border-indigo-100 bg-white p-3 sm:mx-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-sm font-black text-slate-700">
                    Page
                    <select value={currentPage} onChange={(event) => selectPage(Number(event.target.value))} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none">
                      {Array.from({ length: numPages }).map((_, index) => <option key={index + 1} value={index + 1}>Page {index + 1}</option>)}
                    </select>
                  </label>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={zoomOut} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"><ZoomOut size={18} /></button>
                    <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">{Math.round(zoomLevel * 100)}%</div>
                    <button type="button" onClick={zoomIn} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700"><ZoomIn size={18} /></button>
                  </div>
                </div>
              </div>
            )}

            <div className="mx-3 mb-3 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm sm:mx-5 sm:mb-5 sm:rounded-[1.7rem]">
              <div className="border-b border-slate-200 bg-white p-3">
                <EditorToolbar
                  activeTool={activeTool}
                  hasSelectedLayer={Boolean(selectedLayer)}
                  onSelectTool={selectEditorTool}
                  onImageClick={() => imageInputRef.current?.click()}
                  onSignatureClick={addTextSignatureLayer}
                  onSignatureImageClick={() => signatureImageInputRef.current?.click()}
                  onDelete={deleteSelectedLayer}
                  onDuplicate={duplicateSelectedLayer}
                  onClearPage={clearCurrentPageLayers}
                  onReset={resetEditor}
                  onExport={exportPdf}
                />

                {selectedLayer && (
                  <div className="mt-3 flex min-h-11 flex-wrap items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-3 py-2 shadow-sm">
                    <div className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-black text-indigo-700">
                      {getSelectedToolbarLabel()}
                    </div>

                    {(selectedLayer.type === "text" || selectedLayer.type === "signature") && !selectedLayer.imageUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => updateLayer(selectedLayer.id, { isBold: !selectedLayer.isBold })}
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
                          onClick={() => updateLayer(selectedLayer.id, { isItalic: !selectedLayer.isItalic })}
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
                              fontSize: Math.max(8, (selectedLayer.fontSize || 15) - 1),
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
                              fontSize: Math.min(72, (selectedLayer.fontSize || 15) + 1),
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
                  <div className="mb-3 flex items-center gap-2 text-sm font-black text-slate-950"><FileText size={16} /> Pages</div>
                  {numPages > 0 && (
                    <label className="mb-3 block lg:hidden">
                      <span className="mb-1 block text-xs font-black text-slate-600">Jump to page</span>
                      <select value={currentPage} onChange={(event) => selectPage(Number(event.target.value))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        {Array.from({ length: numPages }).map((_, index) => <option key={index + 1} value={index + 1}>Page {index + 1}</option>)}
                      </select>
                    </label>
                  )}
                  {numPages === 0 ? (
                    <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">No PDF uploaded.</p>
                  ) : (
                    <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:overflow-visible lg:pb-0">
                      {Array.from({ length: numPages }).map((_, index) => {
                        const pageNumber = index + 1;
                        const thumb = pageThumbs.find((item) => item.pageNumber === pageNumber);
                        return (
                          <button key={pageNumber} type="button" onClick={() => selectPage(pageNumber)} className={`min-w-[86px] rounded-2xl border p-2 text-left text-xs transition lg:mb-2 lg:w-full lg:min-w-0 lg:p-3 lg:text-sm ${currentPage === pageNumber ? "border-indigo-600 bg-indigo-50 font-black text-indigo-700 shadow-sm" : "border-slate-200 bg-white font-semibold text-slate-700 hover:border-indigo-200 hover:bg-indigo-50"}`}>
                            {thumb?.url ? <img src={thumb.url} alt={`Page ${pageNumber}`} className="mb-2 h-20 w-full rounded-lg object-contain bg-slate-100 lg:h-24" /> : null}
                            Page {pageNumber}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-xs font-semibold leading-5 text-indigo-700">
                    <div className="mb-1 flex items-center gap-1 font-black"><MousePointer2 size={14} /> Tip</div>
                    Highlight selects real PDF text. Edit lets you hover text zones and click to convert into editable text.
                  </div>
                </aside>

                <section ref={pdfViewportRef} className="flex w-full items-start justify-start overflow-auto bg-[radial-gradient(circle_at_top,_#ddd6fe,_#f8fafc_42%,_#e2e8f0)] p-3 sm:justify-center sm:p-6">
                  <div
                    className={`relative mx-auto rounded-xl bg-white shadow-2xl shadow-slate-500/20 ring-1 ring-slate-200 ${activeTool === "text" ? "cursor-crosshair" : activeTool === "highlight" ? "cursor-text" : "cursor-default"}`}
                    style={{ width: canvasSize.width, minHeight: canvasSize.height, touchAction: activeTool === "text" || activeTool === "highlight" ? "none" : "auto" }}
                    onPointerDown={startPageDraw}
                    onPointerMove={updatePageDraw}
                    onPointerUp={endPageDraw}
                    onPointerCancel={() => cancelDrawingState()}
                    onClick={() => {
                      if (activeTool === "edit") setSelectedLayerId(null);
                    }}
                  >
                    {busy && <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/75 backdrop-blur-sm"><div className="flex items-center gap-2 rounded-2xl bg-white px-5 py-4 font-bold shadow-xl"><Loader2 className="animate-spin text-indigo-600" size={20} /> Processing</div></div>}
                    {!fileName && <div className="flex min-h-[440px] items-center justify-center p-6 text-center sm:min-h-[540px] sm:p-10"><div><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600"><Upload size={26} /></div><div className="font-black text-slate-900">Upload a PDF to preview it here</div><p className="mt-2 text-sm text-slate-500">The page will auto-fit your screen.</p></div></div>}
                    <canvas ref={canvasRef} className={fileName ? "block" : "hidden"} />
                    {currentPageLayers.map((layer) => renderLayer(layer))}
                    {draftBox && activeTool === "text" && <div className="pointer-events-none absolute z-30 rounded-md border-2 border-dashed border-indigo-500 bg-indigo-100/35" style={{ left: `${draftBox.xPercent}%`, top: `${draftBox.yPercent}%`, width: `${draftBox.widthPercent}%`, height: `${draftBox.heightPercent}%` }} />}
                    {renderTextOverlay()}
                  </div>
                </section>
              </div>
            </div>

            <div className="mx-3 mb-3 rounded-3xl border border-indigo-100 bg-indigo-50 p-4 sm:mx-5">
              <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_1.4fr_auto] lg:items-end">
                <div>
                  <div className="flex items-center gap-2 text-lg font-black text-indigo-950"><Wand2 size={18} /> OCR / Rewrite</div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-indigo-800">Extract selectable text from the current page, rewrite it, then add it back as an editable text layer.</p>
                  <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-900"><div className="mb-1 flex items-center gap-2 font-black"><Lock size={14} /> Premium OCR later</div>Scanned PDF OCR, automatic text replacement, and no-watermark full export will be premium/backend features later.</div>
                </div>
                <label className="block"><span className="text-sm font-black text-indigo-950">Extracted / rewritten text</span><textarea value={ocrRewriteText} onChange={(event) => setOcrRewriteText(event.target.value)} placeholder="Extracted text will appear here..." className="mt-2 h-32 w-full resize-none rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" /></label>
                <div className="flex flex-col gap-2">
                  <button type="button" onClick={extractCurrentPageText} disabled={ocrBusy || !fileName} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:bg-slate-300">{ocrBusy ? <><Loader2 className="animate-spin" size={16} /> Reading</> : <><Wand2 size={16} /> Extract Text</>}</button>
                  <button type="button" onClick={addRewriteAsTextLayer} disabled={!ocrRewriteText.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-indigo-100 bg-white px-5 py-3 text-sm font-black text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} /> Add as Layer</button>
                  {ocrText && <div className="rounded-2xl bg-white/75 px-3 py-2 text-xs font-bold text-slate-600">{ocrText.length} characters extracted from page {currentPage}.</div>}
                </div>
              </div>
            </div>

            <div className="mx-3 mb-3 rounded-3xl border border-slate-200 bg-white p-4 sm:mx-5 sm:mb-5">
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                <label className="text-sm font-black text-slate-700">Export mode<select value={exportMode} onChange={(event) => setExportMode(event.target.value as ExportMode)} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"><option value="full">Full edited PDF</option><option value="current">Current page only</option><option value="range">Page range</option></select></label>
                <label className="text-sm font-black text-slate-700">Page range<input value={exportRange} onChange={(event) => setExportRange(event.target.value)} disabled={exportMode !== "range"} placeholder="1-3,5" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none disabled:bg-slate-100 disabled:text-slate-400" /></label>
                <button type="button" onClick={exportPdf} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-800"><Download size={18} /> Download Edited PDF</button>
              </div>
            </div>

            {showFreeLimitNote && <div className="mx-3 mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900 sm:mx-5"><div className="flex items-start justify-between gap-3"><div><span className="font-black">PDFMantra note:</span> This editor uses browser-based visual editing. Exact same-font PDF text rewriting, scanned OCR, password tools, and high-quality compression will need backend processing later.</div><button type="button" onClick={() => setShowFreeLimitNote(false)} className="rounded-xl bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">Hide</button></div></div>}
          </div>
        </section>
      </main>
    </>
  );
}
