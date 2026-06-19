"use client";

import {
  AlertCircle,
  Copy,
  CopyPlus,
  EyeOff,
  Loader2,
  Upload,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { detectPageImages, type DetectedImage } from "@/lib/editor/pdf-image-detect";

import type { EditorController } from "../hooks/useEditor";
import { HighlightTool } from "./tools/HighlightTool";
import { ImageTool } from "./tools/ImageTool";
import { ShapeTool } from "./tools/ShapeTool";
import { SignatureTool } from "./tools/SignatureTool";
import { TextTool } from "./tools/TextTool";
import { WhiteoutTool } from "./tools/WhiteoutTool";

type EditorCanvasProps = {
  readonly editor: EditorController;
  readonly onOpenFile: () => void;
  readonly onFileDrop: (file: File) => void | Promise<void>;
};

type PageSize = {
  readonly width: number;
  readonly height: number;
};

type DraftTool = "text" | "highlight" | "whiteout" | "shape";

type DraftBox = {
  readonly type: DraftTool;
  readonly startX: number;
  readonly startY: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type Box = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

type Point = {
  readonly x: number;
  readonly y: number;
};

type ImageSize = {
  readonly width: number;
  readonly height: number;
};

const DEFAULT_TEXT_BOX = { width: 220, height: 44 };
const MIN_TEXT_BOX = { width: 72, height: 30 };
const MIN_IMAGE_BOX = { width: 48, height: 32 };
const MIN_SIGNATURE_BOX = { width: 72, height: 24 };
const MIN_SHAPE_BOX = { width: 24, height: 24 };
const DEFAULT_SHAPE_BOX = { width: 160, height: 96 };

const OPEN_IMAGE_PICKER_EVENT = "pdfmantra:editor-open-image-picker";
const OPEN_SIGNATURE_PICKER_EVENT = "pdfmantra:editor-open-signature-picker";

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isSupportedImageFile(file: File) {
  const lowerName = file.name.toLowerCase();

  return (
    file.type === "image/png" ||
    file.type === "image/jpeg" ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg")
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBox(startX: number, startY: number, currentX: number, currentY: number) {
  return {
    x: Math.min(startX, currentX),
    y: Math.min(startY, currentY),
    width: Math.abs(currentX - startX),
    height: Math.abs(currentY - startY),
  };
}

function getUnscaledPageSize(pageSize: PageSize, pageScale: number) {
  const safeScale = Math.max(0.01, pageScale);

  return {
    width: pageSize.width / safeScale,
    height: pageSize.height / safeScale,
  };
}

function clampBoxToPage(
  box: Box,
  pageSize: PageSize,
  pageScale: number,
  minWidth: number,
  minHeight: number,
) {
  const page = getUnscaledPageSize(pageSize, pageScale);

  const safePageWidth = Math.max(minWidth, page.width || minWidth);
  const safePageHeight = Math.max(minHeight, page.height || minHeight);

  const safeWidth = clamp(box.width, minWidth, safePageWidth);
  const safeHeight = clamp(box.height, minHeight, safePageHeight);

  const safeX = clamp(box.x, 0, Math.max(0, safePageWidth - safeWidth));
  const safeY = clamp(box.y, 0, Math.max(0, safePageHeight - safeHeight));

  return {
    x: safeX,
    y: safeY,
    width: Math.min(safeWidth, safePageWidth - safeX),
    height: Math.min(safeHeight, safePageHeight - safeY),
  };
}

function clampPointToPage(point: Point, pageSize: PageSize, pageScale: number) {
  const page = getUnscaledPageSize(pageSize, pageScale);

  return {
    x: clamp(point.x, 0, Math.max(0, page.width)),
    y: clamp(point.y, 0, Math.max(0, page.height)),
  };
}

function getPointerPoint(
  event: ReactPointerEvent<HTMLDivElement>,
  layer: HTMLDivElement,
  pageScale: number,
  pageSize: PageSize,
) {
  const rect = layer.getBoundingClientRect();
  const safeScale = Math.max(0.01, pageScale);

  return clampPointToPage(
    {
      x: (event.clientX - rect.left) / safeScale,
      y: (event.clientY - rect.top) / safeScale,
    },
    pageSize,
    pageScale,
  );
}

function getRelativeLinePoint(point: Point, box: Box) {
  return {
    x: clamp(point.x - box.x, 0, Math.max(0, box.width)),
    y: clamp(point.y - box.y, 0, Math.max(0, box.height)),
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Unable to read this image file."));
    };

    reader.onerror = () => reject(new Error("Unable to read this image file."));
    reader.readAsDataURL(file);
  });
}

function getImageSize(dataUrl: string) {
  return new Promise<ImageSize>((resolve, reject) => {
    const image = new window.Image();

    image.onload = () => {
      resolve({
        width: Math.max(1, image.naturalWidth || image.width || 1),
        height: Math.max(1, image.naturalHeight || image.height || 1),
      });
    };

    image.onerror = () => reject(new Error("Unable to load this image."));
    image.src = dataUrl;
  });
}

function PdfPageRenderer({ editor }: { readonly editor: EditorController }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pageLayerRef = useRef<HTMLDivElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImagePointRef = useRef<Point | null>(null);
  const pendingSignaturePointRef = useRef<Point | null>(null);

  const [isRendering, setIsRendering] = useState(true);
  const [error, setError] = useState("");
  const [pageSize, setPageSize] = useState<PageSize>({ width: 0, height: 0 });
  const [draftBox, setDraftBox] = useState<DraftBox | null>(null);
  const [detectedImages, setDetectedImages] = useState<DetectedImage[]>([]);
  const [objectPopover, setObjectPopover] = useState<DetectedImage | null>(null);

  useEffect(() => {
    let cancelled = false;
    let renderTask: any = null;

    async function renderPage() {
      const canvas = canvasRef.current;

      if (!canvas || !editor.pdfDocument) return;

      try {
        setIsRendering(true);
        setError("");

        const page = await editor.pdfDocument.getPage(editor.activePageNumber);
        const viewport = page.getViewport({ scale: editor.zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const context = canvas.getContext("2d", { alpha: false });

        if (!context || cancelled) return;

        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        setPageSize({ width: viewport.width, height: viewport.height });

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, viewport.width, viewport.height);

        renderTask = page.render({ canvasContext: context, viewport });

        await renderTask.promise;

        if (!cancelled) {
          setIsRendering(false);
        }
      } catch {
        if (!cancelled) {
          setIsRendering(false);
          setError("Unable to render this PDF page.");
        }
      }
    }

    renderPage();

    return () => {
      cancelled = true;

      try {
        renderTask?.cancel();
      } catch {
        // Ignore cancelled render task.
      }
    };
  }, [editor.pdfDocument, editor.activePageNumber, editor.zoom]);

  // Detect raster images on the page when the Object tool is active.
  useEffect(() => {
    let cancelled = false;

    if (editor.activeTool !== "object" || !editor.pdfDocument) {
      setDetectedImages([]);
      setObjectPopover(null);
      return;
    }

    (async () => {
      try {
        const page = await editor.pdfDocument.getPage(editor.activePageNumber);
        const found = await detectPageImages(page);

        if (!cancelled) {
          setDetectedImages(found);
        }
      } catch {
        if (!cancelled) {
          setDetectedImages([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [editor.activeTool, editor.activePageNumber, editor.pdfDocument]);

  function getDefaultImagePoint() {
    const page = getUnscaledPageSize(pageSize, editor.zoom);

    return {
      x: clamp(page.width * 0.5 - 120, 16, Math.max(16, page.width - MIN_IMAGE_BOX.width)),
      y: clamp(page.height * 0.32 - 60, 16, Math.max(16, page.height - MIN_IMAGE_BOX.height)),
    };
  }

  function getDefaultSignaturePoint() {
    const page = getUnscaledPageSize(pageSize, editor.zoom);

    return {
      x: clamp(page.width * 0.5 - 110, 16, Math.max(16, page.width - MIN_SIGNATURE_BOX.width)),
      y: clamp(page.height * 0.72, 16, Math.max(16, page.height - MIN_SIGNATURE_BOX.height)),
    };
  }

  function openImagePickerAtDefaultPoint() {
    if (!editor.pdfDocument) return;

    pendingImagePointRef.current = getDefaultImagePoint();
    editor.setActiveTool("select");
    imageInputRef.current?.click();
  }

  function openSignaturePickerAtDefaultPoint() {
    if (!editor.pdfDocument) return;

    pendingSignaturePointRef.current = getDefaultSignaturePoint();
    editor.setActiveTool("select");
    signatureInputRef.current?.click();
  }

  useEffect(() => {
    const handleOpenImagePicker = () => openImagePickerAtDefaultPoint();
    const handleOpenSignaturePicker = () => openSignaturePickerAtDefaultPoint();

    window.addEventListener(OPEN_IMAGE_PICKER_EVENT, handleOpenImagePicker);
    window.addEventListener(OPEN_SIGNATURE_PICKER_EVENT, handleOpenSignaturePicker);

    return () => {
      window.removeEventListener(OPEN_IMAGE_PICKER_EVENT, handleOpenImagePicker);
      window.removeEventListener(OPEN_SIGNATURE_PICKER_EVENT, handleOpenSignaturePicker);
    };
  });

  function addTextObject(box: Box) {
    const safeBox = clampBoxToPage(box, pageSize, editor.zoom, MIN_TEXT_BOX.width, MIN_TEXT_BOX.height);

    editor.addObject({
      type: "text",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: {
        text: "Type text",
        fontSize: 16,
        fontWeight: "normal",
        fontStyle: "normal",
        textDecoration: "none",
        color: "#111827",
      },
    });
  }

  function addHighlightObject(box: Box) {
    const safeBox = clampBoxToPage(
      { ...box, width: Math.max(40, box.width), height: Math.max(18, box.height) },
      pageSize,
      editor.zoom,
      40,
      18,
    );

    editor.addObject({
      type: "highlight",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: { backgroundColor: "#fde047", opacity: 0.45 },
    });
  }

  function addWhiteoutObject(box: Box) {
    const safeBox = clampBoxToPage(
      { ...box, width: Math.max(50, box.width), height: Math.max(22, box.height) },
      pageSize,
      editor.zoom,
      50,
      22,
    );

    editor.addObject({
      type: "whiteout",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: { backgroundColor: "#ffffff", opacity: 1 },
    });
  }

  function addShapeObject(draft: DraftBox, box: Box) {
    const tooSmall = box.width < 8 || box.height < 8;
    const baseBox = tooSmall
      ? {
          x: draft.startX,
          y: draft.startY,
          width: DEFAULT_SHAPE_BOX.width,
          height: DEFAULT_SHAPE_BOX.height,
        }
      : {
          ...box,
          width: Math.max(MIN_SHAPE_BOX.width, box.width),
          height: Math.max(MIN_SHAPE_BOX.height, box.height),
        };

    const safeBox = clampBoxToPage(
      baseBox,
      pageSize,
      editor.zoom,
      MIN_SHAPE_BOX.width,
      MIN_SHAPE_BOX.height,
    );

    editor.addObject({
      type: "shape",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: {
        shapeType: "rectangle",
        strokeColor: "#111827",
        strokeWidth: 2,
        fillColor: "none",
        opacity: 1,
        lineStart: tooSmall ? { x: 0, y: 0 } : getRelativeLinePoint({ x: draft.startX, y: draft.startY }, safeBox),
        lineEnd: tooSmall
          ? { x: safeBox.width, y: safeBox.height }
          : getRelativeLinePoint(
              { x: draft.startX + (draft.startX <= draft.x ? box.width : -box.width), y: draft.startY + (draft.startY <= draft.y ? box.height : -box.height) },
              safeBox,
            ),
      },
    });
  }

  function getImageBox(point: Point, imageSize: ImageSize) {
    const page = getUnscaledPageSize(pageSize, editor.zoom);
    const aspectRatio = imageSize.width / Math.max(1, imageSize.height);
    const maxWidth = Math.max(MIN_IMAGE_BOX.width, Math.min(240, page.width * 0.46));
    const maxHeight = Math.max(MIN_IMAGE_BOX.height, page.height * 0.46);

    let width = maxWidth;
    let height = width / Math.max(0.01, aspectRatio);

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return clampBoxToPage(
      { x: point.x, y: point.y, width, height },
      pageSize,
      editor.zoom,
      MIN_IMAGE_BOX.width,
      MIN_IMAGE_BOX.height,
    );
  }

  function getSignatureBox(point: Point, imageSize: ImageSize) {
    const page = getUnscaledPageSize(pageSize, editor.zoom);
    const aspectRatio = imageSize.width / Math.max(1, imageSize.height);
    const maxWidth = Math.max(MIN_SIGNATURE_BOX.width, Math.min(220, page.width * 0.44));
    const maxHeight = Math.max(MIN_SIGNATURE_BOX.height, Math.min(86, page.height * 0.16));

    let width = maxWidth;
    let height = width / Math.max(0.01, aspectRatio);

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    return clampBoxToPage(
      { x: point.x, y: point.y, width, height },
      pageSize,
      editor.zoom,
      MIN_SIGNATURE_BOX.width,
      MIN_SIGNATURE_BOX.height,
    );
  }

  function cropPdfAreaAsImage(box: Box) {
    const canvas = canvasRef.current;

    if (!canvas || !pageSize.width || !pageSize.height) {
      return null;
    }

    const scaleX = canvas.width / pageSize.width;
    const scaleY = canvas.height / pageSize.height;
    const sourceX = Math.round(box.x * editor.zoom * scaleX);
    const sourceY = Math.round(box.y * editor.zoom * scaleY);
    const sourceWidth = Math.max(1, Math.round(box.width * editor.zoom * scaleX));
    const sourceHeight = Math.max(1, Math.round(box.height * editor.zoom * scaleY));

    if (sourceWidth < 2 || sourceHeight < 2) {
      return null;
    }

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = sourceWidth;
    cropCanvas.height = sourceHeight;

    const context = cropCanvas.getContext("2d");

    if (!context) {
      return null;
    }

    context.drawImage(
      canvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );

    return cropCanvas.toDataURL("image/png");
  }

  async function copyDetectedImage(rect: DetectedImage) {
    const dataUrl = cropPdfAreaAsImage(rect);

    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "pdf-image.png";
    document.body.appendChild(link);
    link.click();
    link.remove();

    try {
      const blob = await (await fetch(dataUrl)).blob();
      if (navigator.clipboard && "write" in navigator.clipboard) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }
    } catch {
      // Clipboard not available; download already succeeded.
    }

    setObjectPopover(null);
  }

  function duplicateDetectedImage(rect: DetectedImage) {
    const dataUrl = cropPdfAreaAsImage(rect);

    if (!dataUrl) return;

    const destinationBox = clampBoxToPage(
      { x: rect.x + 24, y: rect.y + 24, width: rect.width, height: rect.height },
      pageSize,
      editor.zoom,
      MIN_IMAGE_BOX.width,
      MIN_IMAGE_BOX.height,
    );

    editor.addObject({
      type: "image",
      pageNumber: editor.activePageNumber,
      box: destinationBox,
      data: { imageDataUrl: dataUrl },
    });

    setObjectPopover(null);
    editor.setActiveTool("select");
  }

  function coverDetectedImage(rect: DetectedImage) {
    const box = clampBoxToPage(rect, pageSize, editor.zoom, 8, 8);

    editor.addObject({
      type: "whiteout",
      pageNumber: editor.activePageNumber,
      box,
      data: { backgroundColor: "#ffffff", opacity: 1 },
    });

    setObjectPopover(null);
    editor.setActiveTool("select");
  }

  async function addImageObject(point: Point, file: File) {
    if (!isSupportedImageFile(file)) return;

    const imageDataUrl = await readFileAsDataUrl(file);
    const imageSize = await getImageSize(imageDataUrl);
    const safeBox = getImageBox(point, imageSize);

    editor.addObject({
      type: "image",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: { imageDataUrl },
    });
  }

  async function addSignatureObject(point: Point, file: File) {
    if (!isSupportedImageFile(file)) return;

    const imageDataUrl = await readFileAsDataUrl(file);
    const imageSize = await getImageSize(imageDataUrl);
    const safeBox = getSignatureBox(point, imageSize);

    editor.addObject({
      type: "signature",
      pageNumber: editor.activePageNumber,
      box: safeBox,
      data: { imageDataUrl },
    });
  }

  function getFallbackTextBox(startX: number, startY: number) {
    return clampBoxToPage(
      { x: startX, y: startY, width: DEFAULT_TEXT_BOX.width, height: DEFAULT_TEXT_BOX.height },
      pageSize,
      editor.zoom,
      MIN_TEXT_BOX.width,
      MIN_TEXT_BOX.height,
    );
  }

  function handleImageFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const point = pendingImagePointRef.current ?? getDefaultImagePoint();

    pendingImagePointRef.current = null;
    event.currentTarget.value = "";

    if (!file || !point) return;

    void addImageObject(point, file);
  }

  function handleSignatureFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const point = pendingSignaturePointRef.current ?? getDefaultSignaturePoint();

    pendingSignaturePointRef.current = null;
    event.currentTarget.value = "";

    if (!file || !point) return;

    void addSignatureObject(point, file);
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const layer = pageLayerRef.current;
    if (!layer || !editor.pdfDocument) return;

    if (editor.activeTool === "select") {
      editor.selectObject(null);
      return;
    }

    if (editor.activeTool === "object") {
      setObjectPopover(null);
      return;
    }

    const point = getPointerPoint(event, layer, editor.zoom, pageSize);

    if (
      editor.activeTool === "text" ||
      editor.activeTool === "highlight" ||
      editor.activeTool === "whiteout" ||
      editor.activeTool === "shape"
    ) {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      setDraftBox({
        type: editor.activeTool,
        startX: point.x,
        startY: point.y,
        x: point.x,
        y: point.y,
        width: 0,
        height: 0,
      });
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const layer = pageLayerRef.current;
    if (!layer || !draftBox) return;

    const point = getPointerPoint(event, layer, editor.zoom, pageSize);
    const normalized = normalizeBox(draftBox.startX, draftBox.startY, point.x, point.y);

    setDraftBox({ ...draftBox, ...normalized });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draftBox) return;

    const finalBox = {
      x: draftBox.x,
      y: draftBox.y,
      width: draftBox.width,
      height: draftBox.height,
    };

    setDraftBox(null);

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore pointer release issue.
    }

    const tooSmall = finalBox.width < 8 || finalBox.height < 8;

    if (draftBox.type === "text") {
      addTextObject(
        tooSmall
          ? getFallbackTextBox(draftBox.startX, draftBox.startY)
          : {
              ...finalBox,
              width: Math.max(MIN_TEXT_BOX.width, finalBox.width),
              height: Math.max(MIN_TEXT_BOX.height, finalBox.height),
            },
      );
    }

    if (draftBox.type === "highlight") {
      addHighlightObject(
        tooSmall ? { x: draftBox.startX, y: draftBox.startY, width: 180, height: 28 } : finalBox,
      );
    }

    if (draftBox.type === "whiteout") {
      addWhiteoutObject(
        tooSmall ? { x: draftBox.startX, y: draftBox.startY, width: 180, height: 34 } : finalBox,
      );
    }

    if (draftBox.type === "shape") {
      addShapeObject(draftBox, finalBox);
    }
  }

  const isDrawTool =
    editor.activeTool === "text" ||
    editor.activeTool === "highlight" ||
    editor.activeTool === "whiteout" ||
    editor.activeTool === "shape";

  return (
    <div className="mx-auto">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleImageFileChange}
      />

      <input
        ref={signatureInputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleSignatureFileChange}
      />

      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
          Page {editor.activePageNumber}
        </span>

        <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-black text-violet-700">
          {editor.activeTool === "select"
            ? "Select"
            : editor.activeTool === "text"
              ? "Drag to create text box"
              : editor.activeTool === "object"
                ? "Click an image to copy, duplicate, or cover"
                : editor.activeTool === "highlight"
                  ? "Drag to highlight"
                  : editor.activeTool === "whiteout"
                    ? "Drag to whiteout"
                    : editor.activeTool === "shape"
                      ? "Drag to draw a shape"
                      : editor.activeTool.toUpperCase()}
        </span>
      </div>

      {editor.selectedObject ? (
        <div className="mb-3 flex min-h-[48px] items-center justify-center">
          <div
            id="editor-object-toolbar-host"
            className="flex max-w-full items-center justify-center overflow-x-auto px-1"
          />
        </div>
      ) : null}

      <div
        ref={pageLayerRef}
        className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.16)]"
        style={{
          width: pageSize.width || undefined,
          minHeight: pageSize.height || 680,
          cursor: isDrawTool ? "crosshair" : "default",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {isRendering ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80">
            <Loader2 className="animate-spin text-violet-600" size={30} />
            <div className="mt-3 text-sm font-black text-slate-600">Rendering PDF...</div>
          </div>
        ) : null}

        {error ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white text-center">
            <AlertCircle size={30} className="text-red-500" />
            <div className="mt-3 text-sm font-black text-red-700">{error}</div>
          </div>
        ) : null}

        <canvas ref={canvasRef} className="block bg-white" />

        {editor.activePageObjects.map((object) => {
          if (object.type === "text") {
            return (
              <TextTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateData={editor.updateObjectData}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "image") {
            return (
              <ImageTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "signature") {
            return (
              <SignatureTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "highlight") {
            return (
              <HighlightTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateData={editor.updateObjectData}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "whiteout") {
            return (
              <WhiteoutTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          if (object.type === "shape") {
            return (
              <ShapeTool
                key={object.id}
                object={object}
                selected={editor.selectedObjectId === object.id}
                pageScale={editor.zoom}
                onSelect={editor.selectObject}
                onUpdateData={editor.updateObjectData}
                onUpdateBox={editor.updateObjectBox}
                onDelete={editor.deleteObject}
              />
            );
          }

          return null;
        })}

        {/* Object tool — detected image overlays */}
        {editor.activeTool === "object"
          ? detectedImages.map((rect, index) => {
              const active =
                objectPopover &&
                objectPopover.x === rect.x &&
                objectPopover.y === rect.y &&
                objectPopover.width === rect.width;

              return (
                <button
                  key={`detected-${index}`}
                  type="button"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    setObjectPopover(rect);
                  }}
                  className={[
                    "absolute z-40 rounded-sm border-2 transition duration-150",
                    active
                      ? "border-violet-600 bg-violet-500/10"
                      : "border-violet-400/70 bg-violet-400/5 hover:border-violet-600 hover:bg-violet-500/10",
                  ].join(" ")}
                  style={{
                    left: rect.x * editor.zoom,
                    top: rect.y * editor.zoom,
                    width: rect.width * editor.zoom,
                    height: rect.height * editor.zoom,
                  }}
                  aria-label="Select PDF image"
                  title="Click for image actions"
                />
              );
            })
          : null}

        {/* Object tool — action popover */}
        {editor.activeTool === "object" && objectPopover ? (
          <div
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute z-50 flex items-center gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.18)]"
            style={{
              left: clamp(objectPopover.x * editor.zoom, 0, Math.max(0, pageSize.width - 150)),
              top: Math.max(0, objectPopover.y * editor.zoom - 48),
            }}
          >
            <button
              type="button"
              onClick={() => void copyDetectedImage(objectPopover)}
              className="flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-black text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
              title="Copy / download this image"
            >
              <Copy size={14} />
              Copy
            </button>

            <span className="h-5 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => duplicateDetectedImage(objectPopover)}
              className="flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-black text-slate-700 transition hover:bg-violet-50 hover:text-violet-700"
              title="Duplicate as a movable object"
            >
              <CopyPlus size={14} />
              Duplicate
            </button>

            <span className="h-5 w-px bg-slate-200" />

            <button
              type="button"
              onClick={() => coverDetectedImage(objectPopover)}
              className="flex h-8 items-center gap-1.5 rounded-xl px-2.5 text-xs font-black text-slate-700 transition hover:bg-red-50 hover:text-red-600"
              title="Cover (hide) this image with white"
            >
              <EyeOff size={14} />
              Cover
            </button>
          </div>
        ) : null}

        {editor.activeTool === "object" && !isRendering && detectedImages.length === 0 ? (
          <div className="pointer-events-none absolute inset-x-0 top-4 z-30 flex justify-center">
            <span className="rounded-full bg-slate-900/80 px-4 py-1.5 text-xs font-black text-white">
              No raster images detected on this page
            </span>
          </div>
        ) : null}

        {draftBox ? (
          <div
            className={[
              "pointer-events-none absolute z-40 rounded-lg border-2 border-dashed",
              draftBox.type === "highlight"
                ? "border-yellow-500 bg-yellow-300/40"
                : draftBox.type === "text"
                  ? "border-violet-500 bg-violet-100/20"
                  : draftBox.type === "shape"
                    ? "border-violet-600 bg-violet-500/10"
                    : "border-violet-500 bg-white/90",
            ].join(" ")}
            style={{
              left: draftBox.x * editor.zoom,
              top: draftBox.y * editor.zoom,
              width: draftBox.width * editor.zoom,
              height: draftBox.height * editor.zoom,
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export function EditorCanvas({ editor, onOpenFile, onFileDrop }: EditorCanvasProps) {
  const [dragActive, setDragActive] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);

    const file = event.dataTransfer.files?.[0];

    if (file && isPdfFile(file)) {
      void onFileDrop(file);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
  }

  if (!editor.file || !editor.pdfDocument) {
    return (
      <main
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className="min-w-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#eef2f7_100%)]"
      >
        <div className="flex min-h-full items-center justify-center p-6">
          <button
            type="button"
            onClick={onOpenFile}
            className={[
              "group flex min-h-[540px] w-full max-w-4xl flex-col items-center justify-center rounded-[2rem] border-2 border-dashed px-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.10)] transition",
              dragActive
                ? "border-violet-500 bg-violet-50"
                : "border-violet-200 bg-white/90 hover:border-violet-300 hover:bg-violet-50/70",
            ].join(" ")}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.7rem] bg-violet-600 text-white shadow-[0_20px_48px_rgba(124,58,237,0.30)] transition group-hover:scale-105">
              <Upload size={34} />
            </div>

            <h1 className="mt-7 text-3xl font-black tracking-[-0.05em] text-slate-950">
              Drag &amp; drop PDF here
            </h1>

            <p className="mt-3 max-w-xl text-sm font-bold leading-7 text-slate-500">
              or click to upload PDF and start editing.
            </p>

            <div className="mt-6 rounded-full bg-violet-600 px-5 py-2 text-xs font-black text-white shadow-[0_12px_26px_rgba(124,58,237,0.24)] transition group-hover:bg-violet-700">
              Upload PDF
            </div>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className="min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#eef2f7_100%)]"
    >
      <div className="flex min-h-full justify-center px-8 py-10">
        <PdfPageRenderer editor={editor} />
      </div>
    </main>
  );
}
