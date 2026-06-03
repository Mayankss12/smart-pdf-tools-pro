"use client";

import { Header } from "@/components/Header";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Copy,
  Download,
  FileSignature,
  Grip,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  MousePointer,
  PenLine,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import {
  MouseEvent,
  PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PdfPagePreview = {
  pageNumber: number;
  previewUrl: string;
};

type ToolMode =
  | "select"
  | "text"
  | "signature"
  | "date"
  | "check"
  | "cross"
  | "dot"
  | "whiteout"
  | "image";

type ObjectKind = Exclude<ToolMode, "select">;

type SignatureSource = "typed" | "drawn" | "uploaded";

type TextStyle = "clean" | "bold" | "italic";

type ObjectBox = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type ImportedImage = {
  id: string;
  fileName: string;
  previewUrl: string;
  pngBytes: Uint8Array;
  width: number;
  height: number;
};

type FillObject = {
  id: string;
  pageNumber: number;
  kind: ObjectKind;
  box: ObjectBox;
  text: string;
  style: TextStyle;
  fontSize: number;
  image?: ImportedImage;
  signatureSource?: SignatureSource;
};

type DragState =
  | {
      type: "move";
      objectId: string;
      startClientX: number;
      startClientY: number;
      startBox: ObjectBox;
    }
  | {
      type: "resize";
      objectId: string;
      handle: "nw" | "ne" | "sw" | "se";
      startClientX: number;
      startClientY: number;
      startBox: ObjectBox;
    }
  | null;

const TEXT_STYLES: Array<{
  value: TextStyle;
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

const TOOLBAR_ITEMS: Array<{
  mode: ToolMode;
  label: string;
  icon: typeof MousePointer;
}> = [
  { mode: "select", label: "Select", icon: MousePointer },
  { mode: "text", label: "Text", icon: Type },
  { mode: "signature", label: "Sign", icon: FileSignature },
  { mode: "date", label: "Date", icon: CalendarDays },
  { mode: "check", label: "Check", icon: Check },
  { mode: "cross", label: "Cross", icon: X },
  { mode: "dot", label: "Dot", icon: Circle },
  { mode: "whiteout", label: "Whiteout", icon: Square },
  { mode: "image", label: "Image", icon: ImageIcon },
];

const DEFAULT_STATUS =
  "Upload a PDF, choose a tool, click on the page, then drag or resize your added fields.";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isPdfFile(file: File) {
  return (
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf")
  );
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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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

function getTextPreviewClass(style: TextStyle) {
  return (
    TEXT_STYLES.find((option) => option.value === style)?.previewClass ||
    TEXT_STYLES[0].previewClass
  );
}

function getPdfFont(style: TextStyle) {
  return (
    TEXT_STYLES.find((option) => option.value === style)?.font ||
    TEXT_STYLES[0].font
  );
}

function getTodayText() {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

function getDefaultBox(kind: ObjectKind, image?: ImportedImage): ObjectBox {
  if (kind === "check" || kind === "cross" || kind === "dot") {
    return {
      xPercent: 48,
      yPercent: 48,
      widthPercent: 6,
      heightPercent: 5,
    };
  }

  if (kind === "whiteout") {
    return {
      xPercent: 35,
      yPercent: 45,
      widthPercent: 30,
      heightPercent: 8,
    };
  }

  if (kind === "image" || (kind === "signature" && image)) {
    const widthPercent = kind === "signature" ? 26 : 28;
    const ratio = image ? image.height / Math.max(image.width, 1) : 0.42;

    return {
      xPercent: 58,
      yPercent: 76,
      widthPercent,
      heightPercent: clamp(widthPercent * ratio, 5, 18),
    };
  }

  if (kind === "date") {
    return {
      xPercent: 58,
      yPercent: 76,
      widthPercent: 22,
      heightPercent: 6,
    };
  }

  return {
    xPercent: 56,
    yPercent: 74,
    widthPercent: kind === "signature" ? 30 : 28,
    heightPercent: kind === "signature" ? 8 : 7,
  };
}

function getMinBox(kind: ObjectKind) {
  if (kind === "check" || kind === "cross" || kind === "dot") {
    return {
      width: 3.5,
      height: 3.5,
    };
  }

  if (kind === "whiteout") {
    return {
      width: 8,
      height: 3,
    };
  }

  if (kind === "image" || kind === "signature") {
    return {
      width: 8,
      height: 4,
    };
  }

  return {
    width: 10,
    height: 4,
  };
}

function getObjectLabel(kind: ObjectKind) {
  const labels: Record<ObjectKind, string> = {
    text: "Text",
    signature: "Signature",
    date: "Date",
    check: "Checkmark",
    cross: "Cross",
    dot: "Dot",
    whiteout: "Whiteout",
    image: "Image",
  };

  return labels[kind];
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

async function convertImageToPng(file: File): Promise<ImportedImage> {
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
      id: createId(),
      fileName: file.name,
      previewUrl: URL.createObjectURL(blob),
      pngBytes: new Uint8Array(arrayBuffer),
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function canvasToImportedImage(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((outputBlob) => {
      if (!outputBlob) {
        reject(new Error("Unable to capture drawn signature."));
        return;
      }

      resolve(outputBlob);
    }, "image/png");
  });

  const arrayBuffer = await blob.arrayBuffer();

  return {
    id: createId(),
    fileName: "drawn-signature.png",
    previewUrl: URL.createObjectURL(blob),
    pngBytes: new Uint8Array(arrayBuffer),
    width: canvas.width,
    height: canvas.height,
  };
}

async function applyObjectsToPdf({
  file,
  objects,
}: {
  file: File;
  objects: FillObject[];
}) {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer);
  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    throw new Error("This PDF has no pages.");
  }

  const fontCache = new Map<
    string,
    Awaited<ReturnType<typeof pdfDoc.embedFont>>
  >();
  const imageCache = new Map<
    string,
    Awaited<ReturnType<typeof pdfDoc.embedPng>>
  >();

  async function getFont(style: TextStyle) {
    const key = style;

    let font = fontCache.get(key);

    if (!font) {
      font = await pdfDoc.embedFont(getPdfFont(style));
      fontCache.set(key, font);
    }

    return font;
  }

  async function getImage(image: ImportedImage) {
    let embeddedImage = imageCache.get(image.id);

    if (!embeddedImage) {
      embeddedImage = await pdfDoc.embedPng(image.pngBytes);
      imageCache.set(image.id, embeddedImage);
    }

    return embeddedImage;
  }

  for (const object of objects) {
    const pageIndex = clamp(object.pageNumber - 1, 0, pages.length - 1);
    const targetPage = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    const boxWidth = (object.box.widthPercent / 100) * pageWidth;
    const boxHeight = (object.box.heightPercent / 100) * pageHeight;
    const boxX = (object.box.xPercent / 100) * pageWidth;
    const boxYFromTop = (object.box.yPercent / 100) * pageHeight;

    const pdfX = clamp(boxX, 0, Math.max(0, pageWidth - boxWidth));
    const pdfY = clamp(
      pageHeight - boxYFromTop - boxHeight,
      0,
      Math.max(0, pageHeight - boxHeight)
    );

    if (object.kind === "whiteout") {
      targetPage.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: boxWidth,
        height: boxHeight,
        color: rgb(1, 1, 1),
        opacity: 1,
      });

      continue;
    }

    if (
      object.kind === "image" ||
      (object.kind === "signature" && object.image)
    ) {
      if (!object.image) continue;

      const embeddedImage = await getImage(object.image);

      targetPage.drawImage(embeddedImage, {
        x: pdfX,
        y: pdfY,
        width: boxWidth,
        height: boxHeight,
        opacity: 0.98,
      });

      continue;
    }

    if (object.kind === "check") {
      const startX = pdfX + boxWidth * 0.18;
      const midX = pdfX + boxWidth * 0.42;
      const endX = pdfX + boxWidth * 0.84;
      const startY = pdfY + boxHeight * 0.48;
      const midY = pdfY + boxHeight * 0.22;
      const endY = pdfY + boxHeight * 0.78;

      targetPage.drawLine({
        start: { x: startX, y: startY },
        end: { x: midX, y: midY },
        thickness: 2,
        color: rgb(0.08, 0.12, 0.26),
      });
      targetPage.drawLine({
        start: { x: midX, y: midY },
        end: { x: endX, y: endY },
        thickness: 2,
        color: rgb(0.08, 0.12, 0.26),
      });

      continue;
    }

    if (object.kind === "cross") {
      targetPage.drawLine({
        start: { x: pdfX + boxWidth * 0.18, y: pdfY + boxHeight * 0.18 },
        end: { x: pdfX + boxWidth * 0.82, y: pdfY + boxHeight * 0.82 },
        thickness: 2,
        color: rgb(0.08, 0.12, 0.26),
      });
      targetPage.drawLine({
        start: { x: pdfX + boxWidth * 0.82, y: pdfY + boxHeight * 0.18 },
        end: { x: pdfX + boxWidth * 0.18, y: pdfY + boxHeight * 0.82 },
        thickness: 2,
        color: rgb(0.08, 0.12, 0.26),
      });

      continue;
    }

    if (object.kind === "dot") {
      targetPage.drawEllipse({
        x: pdfX + boxWidth / 2,
        y: pdfY + boxHeight / 2,
        xScale: Math.max(2, boxWidth * 0.34),
        yScale: Math.max(2, boxHeight * 0.34),
        color: rgb(0.08, 0.12, 0.26),
      });

      continue;
    }

    if (!object.text.trim()) continue;

    const font = await getFont(object.style);
    const safeFontSize = clamp(object.fontSize, 8, 48);
    const textWidth = font.widthOfTextAtSize(object.text, safeFontSize);
    const textX = clamp(pdfX + 5, 0, Math.max(0, pageWidth - textWidth - 4));
    const textY = clamp(
      pdfY + boxHeight / 2 - safeFontSize / 2,
      0,
      Math.max(0, pageHeight - safeFontSize)
    );

    targetPage.drawText(object.text, {
      x: textX,
      y: textY,
      size: safeFontSize,
      font,
      color:
        object.kind === "signature"
          ? rgb(0.18, 0.14, 0.52)
          : rgb(0.08, 0.12, 0.26),
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
  const signatureImageInputRef = useRef<HTMLInputElement | null>(null);
  const objectImageInputRef = useRef<HTMLInputElement | null>(null);
  const activePageRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [previews, setPreviews] = useState<PdfPagePreview[]>([]);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [activeTool, setActiveTool] = useState<ToolMode>("select");

  const [objects, setObjects] = useState<FillObject[]>([]);
  const [history, setHistory] = useState<FillObject[][]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const [signerName, setSignerName] = useState("Mayank Singh");
  const [textValue, setTextValue] = useState("Text");
  const [textStyle, setTextStyle] = useState<TextStyle>("clean");
  const [fontSize, setFontSize] = useState(16);

  const [signatureSource, setSignatureSource] =
    useState<SignatureSource>("typed");
  const [signatureImage, setSignatureImage] = useState<ImportedImage | null>(
    null
  );
  const [drawnSignature, setDrawnSignature] = useState<ImportedImage | null>(
    null
  );
  const [objectImage, setObjectImage] = useState<ImportedImage | null>(null);

  const [status, setStatus] = useState(DEFAULT_STATUS);
  const [busy, setBusy] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

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

      setObjects((current) =>
        current.map((object) => {
          if (object.id !== dragState.objectId) return object;

          if (dragState.type === "move") {
            return {
              ...object,
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
          const minBox = getMinBox(object.kind);
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

          nextWidth = clamp(nextWidth, minBox.width, 86);
          nextHeight = clamp(nextHeight, minBox.height, 45);
          nextX = clamp(nextX, 0, 100 - nextWidth);
          nextY = clamp(nextY, 0, 100 - nextHeight);

          return {
            ...object,
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
        setStatus("Placement updated.");
      }
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undoLastChange();
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedObjectId) {
          event.preventDefault();
          deleteSelectedObject();
        }
      }

      if (event.key === "Escape") {
        setSelectedObjectId(null);
        setActiveTool("select");
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const activePreview = useMemo(() => {
    return previews.find((preview) => preview.pageNumber === activePageNumber);
  }, [activePageNumber, previews]);

  const activePageObjects = useMemo(() => {
    return objects.filter((object) => object.pageNumber === activePageNumber);
  }, [activePageNumber, objects]);

  const selectedObject = useMemo(() => {
    return objects.find((object) => object.id === selectedObjectId) || null;
  }, [objects, selectedObjectId]);

  const canPlaceCurrentTool = useMemo(() => {
    if (!file || activeTool === "select") return false;

    if (active