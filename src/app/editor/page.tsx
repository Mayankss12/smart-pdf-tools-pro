"use client";

import { Header } from "@/components/Header";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { EditorInspectorPanel } from "@/components/editor/EditorInspectorPanel";
import { UploadLandingPanel } from "@/components/editor/UploadLandingPanel";
import {
  Download,
  Loader2,
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

const resizeHandles: {
  id: ResizeHandle;
  className: string;
  cursor: string;
}[] = [
  { id: "tl", className: "-left-3 -top-3", cursor: "nwse-resize" },
  {
    id: "tm",
    className: "left-1/2 -top-3 -translate-x-1/2",
    cursor: "ns-resize",
  },
  { id: "tr", className: "-right-3 -top-3", cursor: "nesw-resize" },
  {
    id: "mr",
    className: "-right-3 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
  { id: "br", className: "-bottom-3 -right-3", cursor: "nwse-resize" },
  {
    id: "bm",
    className: "-bottom-3 left-1/2 -translate-x-1/2",
    cursor: "ns-resize",
  },
  { id: "bl", className: "-bottom-3 -left-3", cursor: "nesw-resize" },
  {
    id: "ml",
    className: "-left-3 top-1/2 -translate-y-1/2",
    cursor: "ew-resize",
  },
];

const HIGHLIGHT_COLORS: {
  label: string;
  css: string;
  r: number;
  g: number;
  b: number;
}[] = [
  {
    label: "Yellow",
    css: "rgba(253, 224, 71, 0.55)",
    r: 0.99,
    g: 0.88,
    b: 0.28,
  },
  {
    label: "Green",
    css: "rgba(134, 239, 172, 0.55)",
    r: 0.53,
    g: 0.94,
    b: 0.68,
  },
  {
    label: "Blue",
    css: "rgba(147, 197, 253, 0.55)",
    r: 0.58,
    g: 0.77,
    b: 0.99,
  },
  {
    label: "Pink",
    css: "rgba(249, 168, 212, 0.55)",
    r: 0.98,
    g: 0.66,
    b: 0.83,
  },
  {
    label: "Orange",
    css: "rgba(253, 186, 116, 0.55)",
    r: 0.99,
    g: 0.73,
    b: 0.46,
  },
];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPdfFile(file: File, arrayBuffer: ArrayBuffer) {
  const lower = file.name.toLowerCase();
  const hasPdfExtension = lower.endsWith(".pdf");
  const hasPdfMime =
    file.type === "application/pdf" || file.type === "application/x-pdf";

  const bytes = new Uint8Array(arrayBuffer.slice(0, 5));
  const hasPdfSignature =
    bytes.length === 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d;

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

  if (!cleaned) {
    throw new Error("Enter a page range. Example: 1-3,5");
  }

  const pages: number[] = [];

  for (const part of cleaned
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)) {
    if (part.includes("-")) {
      const [a, b] = part.split("-").map((value) => Number(value.trim()));

      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        throw new Error(`Invalid range: ${part}`);
      }

      if (a <= 0 || b <= 0) {
        throw new Error("Page numbers start from 1.");
      }

      if (a > b) {
        throw new Error(`Invalid reversed range: ${part}`);
      }

      if (b > totalPages) {
        throw new Error(`Page ${b} is outside this PDF.`);
      }

      for (let page = a; page <= b; page += 1) {
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

type SelectedTextRect = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

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
  const [canvasSize, setCanvasSize] = useState({
    width: 360,
    height: 520,
  });
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
  const [ocrText, setOcrText] = useState("");
  const [ocrRewriteText, setOcrRewriteText] = useState("");
  const [selectedTextRects, setSelectedTextRects] = useState<
    SelectedTextRect[]
  >([]);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);
  const [activeHighlightColor, setActiveHighlightColor] = useState(0);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }, []);

  const extractTextOverlay = useCallback(
    async (
      page: pdfjsLib.PDFPageProxy,
      viewport: pdfjsLib.PageViewport,
      scale: number
    ) => {
      try {
        const textContent = await page.getTextContent();
        const transformUtil = (pdfjsLib as any).Util?.transform;

        const items = textContent.items
          .map((item, index) => {
            const textItem = item as any;
            const text = String(textItem.str || "");

            if (!text.trim() || !Array.isArray(textItem.transform)) {
              return null;
            }

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
              heightPercent: clamp(
                (height / viewport.height) * 100,
                0.2,
                100
              ),
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
      if (!pdfDocRef.current || !canvasRef.current) {
        return;
      }

      const page = await pdfDocRef.current.getPage(pageNumber);
      const unscaledViewport = page.getViewport({ scale: 1 });
      const viewportWidth =
        (pdfViewportRef.current?.clientWidth || window.innerWidth) - 24;

      const fitScale = clamp(
        Math.max(280, viewportWidth) / unscaledViewport.width,
        0.35,
        1.25
      );

      const finalScale = fitScale * zoomLevel;
      const viewport = page.getViewport({ scale: finalScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (!context) {
        return;
      }

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

      if (!drag) {
        return;
      }

      event.preventDefault();

      const dx =
        ((event.clientX - drag.startPointerX) / canvasSize.width) * 100;
      const dy =
        ((event.clientY - drag.startPointerY) / canvasSize.height) * 100;

      setLayers((previousLayers) =>
        previousLayers.map((layer) => {
          if (layer.id !== drag.id) {
            return layer;
          }

          if (drag.mode === "move") {
            return {
              ...layer,
              xPercent: clamp(
                drag.startXPercent + dx,
                0,
                100 - layer.widthPercent
              ),
              yPercent: clamp(
                drag.startYPercent + dy,
                0,
                100 - layer.heightPercent
              ),
            };
          }

          let x = drag.startXPercent;
          let y = drag.startYPercent;
          let width = drag.startWidthPercent;
          let height = drag.startHeightPercent;

          if (
            drag.handle === "mr" ||
            drag.handle === "tr" ||
            drag.handle === "br"
          ) {
            width = drag.startWidthPercent + dx;
          }

          if (
            drag.handle === "ml" ||
            drag.handle === "tl" ||
            drag.handle === "bl"
          ) {
            x = drag.startXPercent + dx;
            width = drag.startWidthPercent - dx;
          }

          if (
            drag.handle === "bm" ||
            drag.handle === "bl" ||
            drag.handle === "br"
          ) {
            height = drag.startHeightPercent + dy;
          }

          if (
            drag.handle === "tm" ||
            drag.handle === "tl" ||
            drag.handle === "tr"
          ) {
            y = drag.startYPercent + dy;
            height = drag.startHeightPercent - dy;
          }

          const minWidth =
            layer.type === "text" || layer.type === "signature" ? 9 : 2;
          const minHeight =
            layer.type === "text" || layer.type === "signature" ? 4 : 1;

          width = clamp(width, minWidth, 95);
          height = clamp(height, minHeight, 70);
          x = clamp(x, 0, 100 - width);
          y = clamp(y, 0, 100 - height);

          return {
            ...layer,
            xPercent: x,
            yPercent: y,
            widthPercent: width,
            heightPercent: height,
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

  useEffect(() => {
    if (activeTool !== "highlight") {
      return;
    }

    function handleGlobalMouseUp() {
      window.setTimeout(() => {
        createHighlightFromSelection();
      }, 0);
    }

    document.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      document.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [activeTool, currentPage, textOverlay, activeHighlightColor]);

  const currentPageLayers = useMemo(
    () => layers.filter((layer) => layer.page === currentPage),
    [currentPage, layers]
  );

  const selectedLayer = useMemo(
    () => layers.find((layer) => layer.id === selectedLayerId),
    [layers, selectedLayerId]
  );

  const showTextOverlay =
    activeTool === "select" ||
    activeTool === "highlight" ||
    activeTool === "edit";

  function updateLayer(id: string, updates: Partial<PdfLayer>) {
    setLayers((previousLayers) =>
      previousLayers.map((layer) =>
        layer.id === id ? { ...layer, ...updates } : layer
      )
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

    if (!context) {
      return "";
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

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setBusy(true);
    setStatus("Loading PDF preview...");

    try {
      const arrayBuffer = await file.arrayBuffer();

      if (!isPdfFile(file, arrayBuffer)) {
        setStatus("Please upload a valid PDF file.");
        return;
      }

      fileBytesRef.current = arrayBuffer.slice(0);

      const loadedPdf = await pdfjsLib
        .getDocument({
          data: arrayBuffer.slice(0),
        })
        .promise;

      pdfDocRef.current = loadedPdf;

      setFileName(file.name);
      setNumPages(loadedPdf.numPages);
      setCurrentPage(1);
      setLayers([]);
      setSelectedLayerId(null);
      setActiveTool("select");
      setDraftBox(null);
      setTextOverlay([]);

      const thumbnails: PageThumb[] = [];

      for (
        let pageNumber = 1;
        pageNumber <= Math.min(loadedPdf.numPages, 40);
        pageNumber += 1
      ) {
        thumbnails.push({
          pageNumber,
          url: await renderThumbnail(loadedPdf, pageNumber),
        });
      }

      setPageThumbs(thumbnails);
      await renderPage(1);
      setStatus("PDF loaded. Choose a tool to start editing.");
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
      setSelectedLayerId(null);
      setDraftBox(null);
      drawStateRef.current = null;
      setStatus("Select text directly on the PDF.");
      return;
    }

    if (tool === "object") {
      setActiveTool("object");
      setDraftBox(null);
      drawStateRef.current = null;
      setStatus("Select, move, resize, duplicate, or delete objects.");
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
    setStatus("Hover PDF text and click to convert it into editable text.");
  }

  function activateTextTool() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setActiveTool("text");
    setSelectedLayerId(null);
    setStatus("Drag on the PDF to create a text box.");
  }

  function activateHighlightTool() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setActiveTool("highlight");
    setSelectedLayerId(null);
    setDraftBox(null);

    setStatus(
      textOverlay.length === 0
        ? "No selectable text found on this page."
        : "Drag across PDF text to highlight it."
    );
  }

  async function addImageLayer(file?: File) {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!file) {
      return;
    }

    if (!isImageFile(file)) {
      setStatus("Please upload PNG, JPG, or WebP image.");
      return;
    }

    setBusy(true);
    setStatus("Adding image...");

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

      setLayers((previousLayers) => [...previousLayers, newLayer]);
      setSelectedLayerId(newLayer.id);
      setActiveTool("object");
      setStatus("Image added.");
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

    setLayers((previousLayers) => [...previousLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool("object");
    setStatus("Signature added.");
  }

  async function addImageSignatureLayer(file?: File) {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!file) {
      return;
    }

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

      setLayers((previousLayers) => [...previousLayers, newLayer]);
      setSelectedLayerId(newLayer.id);
      setActiveTool("object");
      setStatus("Signature image added.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to add signature image.");
    } finally {
      setBusy(false);
    }
  }

  function deleteLayer(layerId: string) {
    setLayers((previousLayers) =>
      previousLayers.filter((layer) => layer.id !== layerId)
    );

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

    if (!layer) {
      return;
    }

    const duplicateLayer: PdfLayer = {
      ...layer,
      id: crypto.randomUUID(),
      xPercent: clamp(layer.xPercent + 3, 0, 100 - layer.widthPercent),
      yPercent: clamp(layer.yPercent + 3, 0, 100 - layer.heightPercent),
    };

    setLayers((previousLayers) => [...previousLayers, duplicateLayer]);
    setSelectedLayerId(duplicateLayer.id);
    setActiveTool("object");
    setStatus("Layer duplicated.");
  }

  function resetEditor() {
    setLayers([]);
    setSelectedLayerId(null);
    setActiveTool("select");
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus("All edits cleared.");
  }

  function clearCurrentPageLayers() {
    setLayers((previousLayers) =>
      previousLayers.filter((layer) => layer.page !== currentPage)
    );
    setSelectedLayerId(null);
    setActiveTool("select");
    setDraftBox(null);
    drawStateRef.current = null;
    setStatus(`Page ${currentPage} edits cleared.`);
  }

  function startMove(
    event: React.PointerEvent<HTMLDivElement | HTMLButtonElement>,
    layer: PdfLayer
  ) {
    if (activeTool !== "object") {
      return;
    }

    const target = event.target as HTMLElement;

    if (
      target.closest("textarea") ||
      target.closest("button") ||
      target.closest("[data-no-drag='true']")
    ) {
      return;
    }

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

  function startResize(
    event: React.PointerEvent<HTMLButtonElement>,
    layer: PdfLayer,
    handle: ResizeHandle
  ) {
    if (activeTool !== "object") {
      return;
    }

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
    setZoomLevel((previousZoom) =>
      Math.min(1.8, Number((previousZoom + 0.1).toFixed(2)))
    );
  }

  function zoomOut() {
    setZoomLevel((previousZoom) =>
      Math.max(0.65, Number((previousZoom - 0.1).toFixed(2)))
    );
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
      xPercent: clamp(
        ((event.clientX - rect.left) / rect.width) * 100,
        0,
        100
      ),
      yPercent: clamp(
        ((event.clientY - rect.top) / rect.height) * 100,
        0,
        100
      ),
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

    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (activeTool !== "text") {
      if (activeTool === "object") {
        setSelectedLayerId(null);
      }

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

    if (!draw) {
      return;
    }

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

    if (!draw) {
      return;
    }

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
      setStatus("Drag a larger area to create the text box.");
      return;
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

    setLayers((previousLayers) => [...previousLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool("object");
    setStatus("Text box created.");
  }

  function cancelDrawingState() {
    drawStateRef.current = null;
    setDraftBox(null);

    document.body.style.userSelect = "";
    document.body.style.touchAction = "";
    document.body.style.overscrollBehavior = "";
    document.documentElement.style.touchAction = "";
    document.documentElement.style.overscrollBehavior = "";
  }

  function addReplacementTextLayer(item: TextOverlayItem) {
    if (activeTool !== "edit") {
      return;
    }

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      xPercent: item.leftPercent,
      yPercent: item.topPercent,
      widthPercent: Math.max(item.widthPercent + 1, 4),
      heightPercent: Math.max(item.heightPercent + 1, 2.5),
      text: item.text,
      fontSize: clamp(
        Math.round(item.fontSizePx / Math.max(renderScale, 0.1)),
        6,
        72
      ),
      isBold: false,
      isItalic: false,
      coverText: true,
    };

    setLayers((previousLayers) => [...previousLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setStatus("Text converted into editable visual layer.");
  }

  function createHighlightFromSelection() {
    if (activeTool !== "highlight") {
      return;
    }

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

      return rect.width > 2 && rect.height > 2 && isInsidePage;
    });

    if (selectedRects.length === 0) {
      selection.removeAllRanges();
      setStatus("No selectable text found in that area.");
      return;
    }

    const color = HIGHLIGHT_COLORS[activeHighlightColor];

    const newHighlights: PdfLayer[] = selectedRects.map((rect) => {
      const rawLeft = clamp(rect.left - pageRect.left, 0, pageRect.width);
      const rawTop = clamp(rect.top - pageRect.top, 0, pageRect.height);
      const rawWidth = clamp(rect.width, 2, pageRect.width - rawLeft);
      const rawHeight = clamp(rect.height, 2, pageRect.height - rawTop);
      const insetVertical = rawHeight * 0.1;
      const finalTop = rawTop + insetVertical;
      const finalHeight = rawHeight - insetVertical * 2;

      return {
        id: crypto.randomUUID(),
        page: currentPage,
        type: "highlight",
        xPercent: (rawLeft / pageRect.width) * 100,
        yPercent: (finalTop / pageRect.height) * 100,
        widthPercent: (rawWidth / pageRect.width) * 100,
        heightPercent: (finalHeight / pageRect.height) * 100,
        opacity: 0.5,
        highlightColorIndex: activeHighlightColor,
        highlightColorCss: color.css,
        highlightColorR: color.r,
        highlightColorG: color.g,
        highlightColorB: color.b,
      } as any;
    });

    setLayers((previousLayers) => [...previousLayers, ...newHighlights]);
    setSelectedLayerId(null);
    setStatus("Highlight added.");
    selection.removeAllRanges();
  }

  function getSelectedPdfTextForReplace() {
    if (!fileBytesRef.current || !canvasRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    const selection = window.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      setOcrText("");
      setSelectedTextRects([]);
      setStatus("Select PDF text first.");
      return;
    }

    const selectedText = selection.toString().replace(/\s+/g, " ").trim();

    if (!selectedText) {
      setOcrText("");
      setSelectedTextRects([]);
      setStatus("No selected text found.");
      return;
    }

    const pageRect = canvasRef.current.getBoundingClientRect();
    const rectangles: SelectedTextRect[] = [];

    for (let index = 0; index < selection.rangeCount; index += 1) {
      const range = selection.getRangeAt(index);

      Array.from(range.getClientRects()).forEach((rect) => {
        const isInsidePage =
          rect.right > pageRect.left &&
          rect.left < pageRect.right &&
          rect.bottom > pageRect.top &&
          rect.top < pageRect.bottom;

        if (!isInsidePage || rect.width <= 1 || rect.height <= 1) {
          return;
        }

        const left = clamp(rect.left - pageRect.left, 0, pageRect.width);
        const top = clamp(rect.top - pageRect.top, 0, pageRect.height);
        const width = clamp(rect.width, 1, pageRect.width - left);
        const height = clamp(rect.height, 1, pageRect.height - top);

        rectangles.push({
          xPercent: (left / pageRect.width) * 100,
          yPercent: (top / pageRect.height) * 100,
          widthPercent: (width / pageRect.width) * 100,
          heightPercent: (height / pageRect.height) * 100,
        });
      });
    }

    if (!rectangles.length) {
      setOcrText("");
      setSelectedTextRects([]);
      setStatus("Selected text was not inside the current page.");
      return;
    }

    setOcrText(selectedText);
    setOcrRewriteText(selectedText);
    setSelectedTextRects(rectangles);
    setActiveTool("object");
    setStatus("Selected text captured.");
  }

  function replaceSelectedTextVisually() {
    if (!fileBytesRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (!selectedTextRects.length) {
      setStatus("Select text first.");
      return;
    }

    if (!ocrRewriteText.trim()) {
      setStatus("Enter replacement text first.");
      return;
    }

    const left = Math.min(...selectedTextRects.map((rect) => rect.xPercent));
    const top = Math.min(...selectedTextRects.map((rect) => rect.yPercent));
    const right = Math.max(
      ...selectedTextRects.map((rect) => rect.xPercent + rect.widthPercent)
    );
    const bottom = Math.max(
      ...selectedTextRects.map((rect) => rect.yPercent + rect.heightPercent)
    );

    const averageHeight =
      selectedTextRects.reduce(
        (sum, rect) => sum + rect.heightPercent,
        0
      ) / selectedTextRects.length;

    const estimatedFontSize = clamp(
      Math.round(
        ((averageHeight / 100) * canvasSize.height * 0.78) /
          Math.max(renderScale, 0.1)
      ),
      7,
      48
    );

    const newLayer: PdfLayer = {
      id: crypto.randomUUID(),
      page: currentPage,
      type: "text",
      xPercent: clamp(left - 0.35, 0, 100),
      yPercent: clamp(top - 0.2, 0, 100),
      widthPercent: clamp(right - left + 0.7, 3, 100 - left),
      heightPercent: clamp(bottom - top + 0.4, 2.5, 100 - top),
      text: ocrRewriteText.trim(),
      fontSize: estimatedFontSize,
      isBold: false,
      isItalic: false,
      coverText: true,
    };

    setLayers((previousLayers) => [...previousLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setActiveTool("object");
    setStatus("Text replaced visually.");
  }

  async function extractCurrentPageText() {
    if (!pdfDocRef.current) {
      setStatus("Upload a PDF first.");
      return;
    }

    setOcrBusy(true);
    setStatus("Reading current page text...");

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
        setStatus("No selectable text found on this page.");
        return;
      }

      setOcrText(extractedText);
      setOcrRewriteText(extractedText);
      setStatus(`Text extracted from page ${currentPage}.`);
    } catch (error) {
      console.error(error);
      setStatus("Unable to extract text from this page.");
    } finally {
      setOcrBusy(false);
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
      const pdfDoc = await PDFDocument.load(fileBytesRef.current.slice(0));
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );
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
        if (!pagesToExport.includes(layer.page)) {
          continue;
        }

        const page = pages[layer.page - 1];

        if (!page) {
          continue;
        }

        const { width, height } = page.getSize();
        const pdfX = (layer.xPercent / 100) * width;
        const pdfY =
          height -
          (layer.yPercent / 100) * height -
          (layer.heightPercent / 100) * height;
        const pdfWidth = (layer.widthPercent / 100) * width;
        const pdfHeight = (layer.heightPercent / 100) * height;

        if (layer.type === "highlight") {
          const r = (layer as any).highlightColorR ?? 0.99;
          const g = (layer as any).highlightColorG ?? 0.88;
          const b = (layer as any).highlightColorB ?? 0.28;

          page.drawRectangle({
            x: pdfX,
            y: pdfY,
            width: pdfWidth,
            height: pdfHeight,
            color: rgb(r, g, b),
            opacity: layer.opacity ?? 0.5,
          });

          continue;
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

          continue;
        }

        if (layer.type === "text" || layer.type === "signature") {
          if (layer.coverText) {
            page.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfWidth,
              height: pdfHeight,
              color: rgb(1, 1, 1),
              opacity: 1,
            });
          }

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
            const lines = (layer.text || "").split("\n");
            const lineHeight = fontSize * 1.22;
            const paddingX = Math.max(2, pdfWidth * 0.035);
            const paddingY = Math.max(2, pdfHeight * 0.12);

            lines.forEach((line, index) => {
              const y =
                pdfY +
                pdfHeight -
                paddingY -
                fontSize -
                index * lineHeight;

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
      }

      let outputBytes = await pdfDoc.save();

      if (exportMode !== "full") {
        const selectedPdf = await PDFDocument.create();

        const copiedPages = await selectedPdf.copyPages(
          pdfDoc,
          pagesToExport.map((page) => page - 1)
        );

        copiedPages.forEach((page) => selectedPdf.addPage(page));
        outputBytes = await selectedPdf.save();
      }

      const blob = new Blob([outputBytes], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `PDFMantra-edited-${fileName || "document.pdf"}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
      setStatus("Edited PDF downloaded.");
    } catch (error) {
      console.error(error);
      setStatus("Export failed. Check the settings and try again.");
    } finally {
      setBusy(false);
    }
  }

  function renderResizeHandles(layer: PdfLayer) {
    if (activeTool !== "object" || selectedLayerId !== layer.id) {
      return null;
    }

    return resizeHandles.map((handle) => (
      <button
        key={handle.id}
        type="button"
        data-no-drag="true"
        onPointerDown={(event) => startResize(event, layer, handle.id)}
        className={`absolute z-30 h-5 w-5 rounded-full border-2 border-white bg-[#3157d5] shadow-md transition hover:scale-110 sm:h-4 sm:w-4 ${handle.className}`}
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
    const canEditObject = activeTool === "object";

    if (layer.type === "highlight") {
      const colorCss =
        (layer as any).highlightColorCss ?? HIGHLIGHT_COLORS[0].css;

      return (
        <div
          key={layer.id}
          data-editor-layer="true"
          onClick={(event) => {
            if (!canEditObject) {
              return;
            }

            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          onPointerDown={(event) => startMove(event, layer)}
          className={`absolute transition ${
            isSelected ? "ring-2 ring-amber-400" : ""
          }`}
          style={{
            ...getLayerStyle(layer),
            backgroundColor: colorCss,
            borderRadius: "2px",
            pointerEvents: canEditObject ? "auto" : "none",
            touchAction: "none",
            zIndex: 5,
            cursor: canEditObject ? "move" : "default",
          }}
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
            if (!canEditObject) {
              return;
            }

            event.stopPropagation();
            setSelectedLayerId(layer.id);
          }}
          onPointerDown={(event) => startMove(event, layer)}
          className={`absolute overflow-hidden rounded-lg border bg-white/80 transition ${
            isSelected
              ? "border-[#3157d5] ring-2 ring-indigo-100"
              : "border-transparent hover:border-indigo-200"
          }`}
          style={{
            ...getLayerStyle(layer),
            pointerEvents: canEditObject ? "auto" : "none",
            touchAction: "none",
            zIndex: 20,
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
          if (!canEditObject) {
            return;
          }

          event.stopPropagation();
          setSelectedLayerId(layer.id);
        }}
        onPointerDown={(event) => startMove(event, layer)}
        className={`absolute rounded-lg border text-slate-950 shadow-sm transition ${
          isSelected
            ? "border-[#3157d5] bg-white/95 ring-2 ring-indigo-100"
            : layer.coverText
              ? "border-transparent bg-white/95 hover:border-indigo-200"
              : "border-transparent bg-white/80 hover:border-indigo-200"
        }`}
        style={{
          ...getLayerStyle(layer),
          pointerEvents: canEditObject ? "auto" : "none",
          touchAction: "none",
          zIndex: 25,
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
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              if (!canEditObject) {
                return;
              }

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
  }

  function renderTextOverlay() {
    if (!showTextOverlay || !fileName) {
      return null;
    }

    return (
      <div
        className={`absolute inset-0 ${
          activeTool === "select" ? "z-10" : "z-40"
        }`}
        style={{
          pointerEvents:
            activeTool === "select" ||
            activeTool === "highlight" ||
            activeTool === "edit"
              ? "auto"
              : "none",
          userSelect:
            activeTool === "select" || activeTool === "highlight"
              ? "text"
              : "none",
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
                if (activeTool !== "edit") {
                  return;
                }

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
                cursor:
                  activeTool === "select" || activeTool === "highlight"
                    ? "text"
                    : "pointer",
                userSelect:
                  activeTool === "select" || activeTool === "highlight"
                    ? "text"
                    : "none",
                pointerEvents:
                  activeTool === "select" ||
                  activeTool === "highlight" ||
                  activeTool === "edit"
                    ? "auto"
                    : "none",
              }}
            >
              {item.text}
            </span>
          );
        })}
      </div>
    );
  }

  function getSelectedToolbarLabel() {
    if (!selectedLayer) {
      return "Selection";
    }

    if (selectedLayer.type === "text") {
      return selectedLayer.coverText ? "Editable PDF Text" : "Text Layer";
    }

    if (selectedLayer.type === "highlight") {
      return "Highlight";
    }

    if (selectedLayer.type === "image") {
      return "Image";
    }

    return "Signature";
  }

  if (!fileName) {
    return (
      <>
        <Header />

        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />

        <UploadLandingPanel
          busy={busy}
          status={status}
          onBrowseClick={() => fileInputRef.current?.click()}
          onFileDrop={handleFile}
        />
      </>
    );
  }

  return (
    <>
      <Header />

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

      <main className="min-h-screen bg-[#dfe7f1]">
        <section className="mx-auto max-w-[1820px] px-3 py-3 sm:px-4 sm:py-4">
          <div className="overflow-hidden rounded-[1.75rem] border border-[#c8d4e5] bg-[#f8fafc] shadow-[0_28px_90px_rgba(15,23,42,0.14)]">
            <div className="flex flex-col gap-3 border-b border-[#cfd9e7] bg-[#f4f7fb] px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-950">
                  {fileName}
                </div>
                <div className="mt-0.5 truncate text-xs font-medium text-slate-500">
                  {status}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#d4deeb] bg-white px-3 text-sm font-medium text-slate-700">
                  <span>Page</span>
                  <select
                    value={currentPage}
                    onChange={(event) =>
                      selectPage(Number(event.target.value))
                    }
                    className="bg-transparent text-sm font-semibold outline-none"
                  >
                    {Array.from({ length: numPages }).map((_, index) => (
                      <option key={index + 1} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={zoomOut}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4deeb] bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <ZoomOut size={16} />
                </button>

                <div className="inline-flex h-10 min-w-[72px] items-center justify-center rounded-xl border border-[#d4deeb] bg-white px-3 text-sm font-semibold text-slate-800">
                  {Math.round(zoomLevel * 100)}%
                </div>

                <button
                  type="button"
                  onClick={zoomIn}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4deeb] bg-white text-slate-700 transition hover:bg-slate-50"
                >
                  <ZoomIn size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d4deeb] bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-[#b8c8df] hover:bg-slate-50"
                >
                  Replace PDF
                </button>

                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#3157d5] px-4 text-sm font-semibold text-white transition hover:bg-[#2748b3] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>

            <EditorToolbar
              activeTool={activeTool}
              onSelectTool={selectEditorTool}
              onImageClick={() => imageInputRef.current?.click()}
              onSignatureClick={addTextSignatureLayer}
              onSignatureImageClick={() =>
                signatureImageInputRef.current?.click()
              }
              onClearPage={clearCurrentPageLayers}
              onReset={resetEditor}
            />

            <div className="grid min-h-[calc(100vh-184px)] grid-cols-1 lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[210px_minmax(0,1fr)_340px]">
              <aside className="border-b border-[#cfd9e7] bg-[#edf3fa] p-3 lg:max-h-[calc(100vh-184px)] lg:overflow-y-auto lg:border-b-0 lg:border-r">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">
                    Pages
                  </div>
                  <div className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-[#d4deeb]">
                    {numPages}
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 lg:block lg:overflow-visible lg:pb-0">
                  {Array.from({ length: numPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    const thumbnail = pageThumbs.find(
                      (item) => item.pageNumber === pageNumber
                    );

                    return (
                      <button
                        key={pageNumber}
                        type="button"
                        onClick={() => selectPage(pageNumber)}
                        className={`min-w-[92px] rounded-xl border p-2 text-left text-xs transition lg:mb-2 lg:w-full lg:min-w-0 ${
                          currentPage === pageNumber
                            ? "border-[#3157d5] bg-white font-semibold text-[#2143a7] shadow-sm"
                            : "border-[#d4deeb] bg-white/85 text-slate-700 hover:border-[#b9cae2] hover:bg-white"
                        }`}
                      >
                        {thumbnail?.url ? (
                          <img
                            src={thumbnail.url}
                            alt={`Page ${pageNumber}`}
                            className="mb-2 h-20 w-full rounded-md bg-slate-100 object-contain lg:h-24"
                          />
                        ) : null}

                        Page {pageNumber}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section
                ref={pdfViewportRef}
                className="flex min-w-0 items-start justify-start overflow-auto bg-[radial-gradient(circle_at_top,_#f4f8fd_0%,_#dfe8f2_54%,_#d5e0ec_100%)] p-4 sm:justify-center sm:p-7"
              >
                <div
                  className={`relative mx-auto rounded-xl bg-white shadow-[0_28px_90px_rgba(15,23,42,0.26)] ring-1 ring-slate-300/80 ${
                    activeTool === "text"
                      ? "cursor-crosshair"
                      : activeTool === "highlight" ||
                          activeTool === "select"
                        ? "cursor-text"
                        : "cursor-default"
                  }`}
                  style={{
                    width: canvasSize.width,
                    minHeight: canvasSize.height,
                    touchAction: activeTool === "text" ? "none" : "auto",
                  }}
                  onPointerDown={startPageDraw}
                  onPointerMove={updatePageDraw}
                  onPointerUp={endPageDraw}
                  onPointerCancel={() => cancelDrawingState()}
                  onClick={() => {
                    if (activeTool === "object") {
                      setSelectedLayerId(null);
                    }
                  }}
                >
                  {busy ? (
                    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
                      <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-lg">
                        <Loader2
                          className="animate-spin text-[#3157d5]"
                          size={18}
                        />
                        Processing
                      </div>
                    </div>
                  ) : null}

                  <canvas ref={canvasRef} className="block" />

                  {currentPageLayers.map((layer) => renderLayer(layer))}

                  {draftBox && activeTool === "text" ? (
                    <div
                      className="pointer-events-none absolute z-30 rounded-md border-2 border-dashed border-[#3157d5] bg-indigo-100/35"
                      style={{
                        left: `${draftBox.xPercent}%`,
                        top: `${draftBox.yPercent}%`,
                        width: `${draftBox.widthPercent}%`,
                        height: `${draftBox.heightPercent}%`,
                      }}
                    />
                  ) : null}

                  {renderTextOverlay()}
                </div>
              </section>

              <EditorInspectorPanel
                activeTool={activeTool}
                selectedLayer={selectedLayer}
                selectedLayerLabel={getSelectedToolbarLabel()}
                highlightColors={HIGHLIGHT_COLORS}
                activeHighlightColor={activeHighlightColor}
                totalPages={numPages}
                currentPage={currentPage}
                layerCount={layers.length}
                exportMode={exportMode}
                exportRange={exportRange}
                ocrText={ocrText}
                ocrRewriteText={ocrRewriteText}
                selectedTextRectsCount={selectedTextRects.length}
                ocrBusy={ocrBusy}
                busy={busy}
                onSetActiveHighlightColor={setActiveHighlightColor}
                onUpdateLayer={updateLayer}
                onDuplicateSelectedLayer={duplicateSelectedLayer}
                onDeleteSelectedLayer={deleteSelectedLayer}
                onGetSelectedPdfTextForReplace={getSelectedPdfTextForReplace}
                onReplaceSelectedTextVisually={replaceSelectedTextVisually}
                onExtractCurrentPageText={extractCurrentPageText}
                onOcrRewriteTextChange={setOcrRewriteText}
                onExportModeChange={setExportMode}
                onExportRangeChange={setExportRange}
                onExportPdf={exportPdf}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
