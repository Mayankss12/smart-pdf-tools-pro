"use client";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
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

    if (activeTool === "signature") {
      if (signatureSource === "typed") return Boolean(signerName.trim());
      if (signatureSource === "drawn") return Boolean(drawnSignature);
      if (signatureSource === "uploaded") return Boolean(signatureImage);
    }

    if (activeTool === "image") return Boolean(objectImage);

    return true;
  }, [
    activeTool,
    drawnSignature,
    file,
    objectImage,
    signatureImage,
    signatureSource,
    signerName,
  ]);

  function pushHistory(snapshot = objects) {
    setHistory((current) => [...current.slice(-19), snapshot]);
  }

  function updateObjects(
    updater: (current: FillObject[]) => FillObject[],
    nextStatus?: string
  ) {
    setObjects((current) => {
      setHistory((historyItems) => [...historyItems.slice(-19), current]);
      return updater(current);
    });

    if (nextStatus) {
      setStatus(nextStatus);
    }
  }

  function undoLastChange() {
    setHistory((current) => {
      const previous = current[current.length - 1];

      if (!previous) {
        setStatus("Nothing to undo.");
        return current;
      }

      setObjects(previous);
      setSelectedObjectId(null);
      setStatus("Last change undone.");

      return current.slice(0, -1);
    });
  }

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
      setPageCount(0);
      setPreviews([]);
      setObjects([]);
      setHistory([]);
      setSelectedObjectId(null);
      setActivePageNumber(1);

      const pdf = await loadPdfFromFile(selectedFile);
      const pageTotal = pdf.numPages;
      const pagesToPreview = Math.min(pageTotal, 30);
      const nextPreviews: PdfPagePreview[] = [];

      setPageCount(pageTotal);

      for (let pageNumber = 1; pageNumber <= pagesToPreview; pageNumber += 1) {
        const previewUrl = await renderPdfPageToPng(pdf, pageNumber, 0.62);

        nextPreviews.push({
          pageNumber,
          previewUrl,
        });
      }

      setPreviews(nextPreviews);
      setStatus(
        `PDF loaded with ${pageTotal} page${
          pageTotal > 1 ? "s" : ""
        }. Choose Text, Sign, Date, Check, Whiteout, or Image, then click on the page.`
      );
    } catch (error) {
      console.error(error);
      setFile(null);
      setPageCount(0);
      setPreviews([]);
      setObjects([]);
      setHistory([]);
      setSelectedObjectId(null);
      setStatus("Unable to read this PDF. Please try another file.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImageFile(
    selectedFile: File | undefined,
    target: "signature" | "object"
  ) {
    if (!selectedFile) return;

    if (!isImageFile(selectedFile)) {
      setStatus("Please upload a PNG, JPG, JPEG, or WebP image.");
      return;
    }

    setBusy(true);
    setStatus("Importing image...");

    try {
      const importedImage = await convertImageToPng(selectedFile);

      if (target === "signature") {
        setSignatureImage(importedImage);
        setSignatureSource("uploaded");
        setActiveTool("signature");
        setStatus("Signature image imported. Click on the PDF page to place it.");
      } else {
        setObjectImage(importedImage);
        setActiveTool("image");
        setStatus("Image imported. Click on the PDF page to place it.");
      }
    } catch (error) {
      console.error(error);
      setStatus("Unable to import this image. Try another PNG or JPG.");
    } finally {
      setBusy(false);
    }
  }

  function clearPdf() {
    setFile(null);
    setPageCount(0);
    setPreviews([]);
    setObjects([]);
    setHistory([]);
    setSelectedObjectId(null);
    setActivePageNumber(1);
    setStatus(DEFAULT_STATUS);
  }

  function clearObjects() {
    if (objects.length === 0) {
      setStatus("No fields to clear.");
      return;
    }

    updateObjects(() => [], "All added fields removed.");
    setSelectedObjectId(null);
  }

  function selectPage(pageNumber: number) {
    setActivePageNumber(pageNumber);
    setSelectedObjectId(null);
    setStatus(`Page ${pageNumber} selected.`);
  }

  function createObject(
    kind: ObjectKind,
    pageNumber: number,
    xPercent?: number,
    yPercent?: number
  ): FillObject | null {
    let text = "";
    let image: ImportedImage | undefined;
    let signatureSourceValue: SignatureSource | undefined;

    if (kind === "text") {
      text = textValue.trim() || "Text";
    }

    if (kind === "date") {
      text = getTodayText();
    }

    if (kind === "signature") {
      signatureSourceValue = signatureSource;

      if (signatureSource === "typed") {
        if (!signerName.trim()) {
          setStatus("Enter signature text/name first.");
          return null;
        }

        text = signerName.trim();
      }

      if (signatureSource === "drawn") {
        if (!drawnSignature) {
          setStatus("Draw your signature first.");
          return null;
        }

        image = drawnSignature;
      }

      if (signatureSource === "uploaded") {
        if (!signatureImage) {
          setStatus("Upload a signature image first.");
          return null;
        }

        image = signatureImage;
      }
    }

    if (kind === "image") {
      if (!objectImage) {
        setStatus("Import an image first.");
        return null;
      }

      image = objectImage;
    }

    const defaultBox = getDefaultBox(kind, image);
    const box = {
      ...defaultBox,
      xPercent:
        typeof xPercent === "number"
          ? clamp(xPercent - defaultBox.widthPercent / 2, 0, 100 - defaultBox.widthPercent)
          : defaultBox.xPercent,
      yPercent:
        typeof yPercent === "number"
          ? clamp(yPercent - defaultBox.heightPercent / 2, 0, 100 - defaultBox.heightPercent)
          : defaultBox.yPercent,
    };

    return {
      id: createId(),
      pageNumber,
      kind,
      box,
      text,
      style: kind === "signature" ? "italic" : textStyle,
      fontSize: kind === "signature" ? Math.max(16, fontSize) : fontSize,
      image,
      signatureSource: signatureSourceValue,
    };
  }

  function addObjectToPage(
    kind: ObjectKind,
    pageNumber = activePageNumber,
    xPercent?: number,
    yPercent?: number
  ) {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newObject = createObject(kind, pageNumber, xPercent, yPercent);

    if (!newObject) return;

    updateObjects(
      (current) => [...current, newObject],
      `${getObjectLabel(kind)} added to page ${pageNumber}. Drag or resize it.`
    );

    setSelectedObjectId(newObject.id);
    setActivePageNumber(pageNumber);
    setActiveTool("select");
  }

  function addActiveToolToDefaultSpot() {
    if (activeTool === "select") {
      setStatus("Choose Text, Sign, Date, Check, Whiteout, or Image first.");
      return;
    }

    addObjectToPage(activeTool, activePageNumber);
  }

  function addSignatureToAllPages() {
    if (!file || pageCount === 0) {
      setStatus("Upload a PDF first.");
      return;
    }

    const newObjects: FillObject[] = [];

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const newObject = createObject("signature", pageNumber);

      if (!newObject) return;

      newObjects.push(newObject);
    }

    updateObjects(
      (current) => [...current, ...newObjects],
      `Signature added to all ${pageCount} page${pageCount > 1 ? "s" : ""}.`
    );

    setSelectedObjectId(newObjects[0]?.id || null);
    setActivePageNumber(1);
    setActiveTool("select");
    setMoreOpen(false);
  }

  function handlePageMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (!activePageRef.current || !activePreview) return;

    const target = event.target;

    if (target instanceof HTMLElement && target.closest("[data-fill-object]")) {
      return;
    }

    if (activeTool === "select") {
      setSelectedObjectId(null);
      return;
    }

    const rect = activePageRef.current.getBoundingClientRect();
    const xPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((event.clientY - rect.top) / rect.height) * 100;

    addObjectToPage(
      activeTool,
      activePageNumber,
      clamp(xPercent, 0, 100),
      clamp(yPercent, 0, 100)
    );
  }

  function startMove(event: MouseEvent<HTMLDivElement>, object: FillObject) {
    event.preventDefault();
    event.stopPropagation();

    pushHistory();
    setSelectedObjectId(object.id);

    dragStateRef.current = {
      type: "move",
      objectId: object.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
    };

    setStatus("Dragging field...");
  }

  function startResize(
    event: MouseEvent<HTMLButtonElement>,
    object: FillObject,
    handle: "nw" | "ne" | "sw" | "se"
  ) {
    event.preventDefault();
    event.stopPropagation();

    pushHistory();
    setSelectedObjectId(object.id);

    dragStateRef.current = {
      type: "resize",
      objectId: object.id,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startBox: object.box,
    };

    setStatus("Resizing field...");
  }

  function updateSelectedObject(updater: (object: FillObject) => FillObject) {
    if (!selectedObjectId) return;

    updateObjects((current) =>
      current.map((object) =>
        object.id === selectedObjectId ? updater(object) : object
      )
    );
  }

  function duplicateSelectedObject() {
    if (!selectedObject) {
      setStatus("Select a field first.");
      return;
    }

    const duplicated: FillObject = {
      ...selectedObject,
      id: createId(),
      box: {
        ...selectedObject.box,
        xPercent: clamp(selectedObject.box.xPercent + 3, 0, 95),
        yPercent: clamp(selectedObject.box.yPercent + 3, 0, 95),
      },
    };

    updateObjects(
      (current) => [...current, duplicated],
      `${getObjectLabel(selectedObject.kind)} duplicated.`
    );

    setSelectedObjectId(duplicated.id);
  }

  function deleteSelectedObject() {
    if (!selectedObjectId) {
      setStatus("Select a field to delete.");
      return;
    }

    updateObjects(
      (current) => current.filter((object) => object.id !== selectedObjectId),
      "Selected field deleted."
    );

    setSelectedObjectId(null);
  }

  function resizeSelectedObject(direction: "smaller" | "bigger") {
    if (!selectedObject) {
      setStatus("Select a field first.");
      return;
    }

    const delta = direction === "bigger" ? 3 : -3;
    const minBox = getMinBox(selectedObject.kind);

    updateObjects(
      (current) =>
        current.map((object) => {
          if (object.id !== selectedObject.id) return object;

          return {
            ...object,
            box: {
              ...object.box,
              widthPercent: clamp(
                object.box.widthPercent + delta,
                minBox.width,
                86
              ),
              heightPercent: clamp(
                object.box.heightPercent + delta * 0.55,
                minBox.height,
                45
              ),
            },
          };
        }),
      `Selected field made ${direction}.`
    );
  }

  async function captureDrawnSignature() {
    const canvas = drawCanvasRef.current;

    if (!canvas) return;

    try {
      const importedImage = await canvasToImportedImage(canvas);
      setDrawnSignature(importedImage);
      setSignatureSource("drawn");
      setActiveTool("signature");
      setStatus("Drawn signature captured. Click the PDF page to place it.");
    } catch (error) {
      console.error(error);
      setStatus("Unable to capture drawn signature.");
    }
  }

  function getCanvasPoint(event: PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y:
        ((event.clientY - rect.top) / rect.height) *
        event.currentTarget.height,
    };
  }

  function startDrawing(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");

    if (!context) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);

    const point = getCanvasPoint(event);

    context.strokeStyle = "#312e81";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.beginPath();
    context.moveTo(point.x, point.y);
  }

  function drawSignature(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    const context = event.currentTarget.getContext("2d");

    if (!context) return;

    const point = getCanvasPoint(event);

    context.lineTo(point.x, point.y);
    context.stroke();
  }

  function stopDrawing(event: PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;

    drawingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
    void captureDrawnSignature();
  }

  function clearDrawnSignature() {
    const canvas = drawCanvasRef.current;
    const context = canvas?.getContext("2d");

    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    setDrawnSignature(null);
    setStatus("Drawn signature cleared.");
  }

  async function handleExport() {
    if (!file) {
      setStatus("Upload a PDF first.");
      return;
    }

    if (objects.length === 0) {
      setStatus("Add at least one field before export.");
      return;
    }

    setBusy(true);
    setStatus("Applying fields and exporting PDF...");

    try {
      const blob = await applyObjectsToPdf({
        file,
        objects,
      });

      downloadBlob(blob, "PDFMantra-fill-sign.pdf");
      setStatus(`PDF exported with ${objects.length} added field(s).`);
    } catch (error) {
      console.error(error);
      setStatus(error instanceof Error ? error.message : "PDF export failed.");
    } finally {
      setBusy(false);
    }
  }

  function renderObjectContent(object: FillObject) {
    if (object.kind === "check") {
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full">
          <path
            d="M10 25 L20 35 L39 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }

    if (object.kind === "cross") {
      return (
        <svg viewBox="0 0 48 48" className="h-full w-full">
          <path
            d="M13 13 L35 35 M35 13 L13 35"
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (object.kind === "dot") {
      return (
        <div className="flex h-full w-full items-center justify-center">
          <span className="block h-4/5 w-4/5 rounded-full bg-slate-950" />
        </div>
      );
    }

    if (object.kind === "whiteout") {
      return (
        <div className="h-full w-full rounded-md border border-slate-300 bg-white" />
      );
    }

    if (object.kind === "image" || (object.kind === "signature" && object.image)) {
      return object.image ? (
        <img
          src={object.image.previewUrl}
          alt={object.kind === "signature" ? "Signature" : "Added image"}
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="text-center text-[11px] font-bold text-slate-500">
          Image missing
        </div>
      );
    }

    return (
      <div
        className={`flex h-full w-full items-center justify-center truncate px-2 text-center text-slate-950 ${getTextPreviewClass(
          object.style
        )} ${object.kind === "signature" ? "text-indigo-700" : ""}`}
        style={{
          fontSize: Math.max(10, object.fontSize * 0.82),
        }}
      >
        {object.text || getObjectLabel(object.kind)}
      </div>
    );
  }

  function renderFillObject(object: FillObject) {
    const isSelected = selectedObjectId === object.id;

    return (
      <div
        key={object.id}
        data-fill-object
        className="absolute z-20"
        style={{
          left: `${object.box.xPercent}%`,
          top: `${object.box.yPercent}%`,
          width: `${object.box.widthPercent}%`,
          height: `${object.box.heightPercent}%`,
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
          setSelectedObjectId(object.id);
        }}
      >
        <div
          onMouseDown={(event) => startMove(event, object)}
          className={[
            "group relative h-full w-full cursor-move select-none rounded-lg bg-white/70 text-slate-950 shadow-[0_10px_24px_rgba(79,70,229,0.14)] backdrop-blur-[1px] transition",
            object.kind === "whiteout" ? "bg-white" : "",
            isSelected
              ? "border border-indigo-500 ring-4 ring-indigo-100"
              : "border border-indigo-300/55 hover:border-indigo-400",
          ].join(" ")}
          title="Drag to move"
        >
          {isSelected && (
            <div className="absolute left-2 top-1 z-30 flex h-5 items-center gap-1 rounded-full bg-indigo-600/95 px-2 text-[10px] font-bold text-white">
              <Grip size={11} />
              Drag
            </div>
          )}

          <div className="flex h-full w-full items-center justify-center overflow-hidden p-1">
            {renderObjectContent(object)}
          </div>

          <div className="absolute -right-2 -top-2 z-40 hidden gap-1 group-hover:flex">
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedObjectId(object.id);
                duplicateSelectedObject();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-indigo-100 bg-white text-indigo-700 shadow-sm"
              title="Duplicate"
            >
              <Copy size={12} />
            </button>
            <button
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelectedObjectId(object.id);
                deleteSelectedObject();
              }}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-red-100 bg-white text-red-600 shadow-sm"
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>

          {isSelected && (
            <>
              {(["nw", "ne", "sw", "se"] as const).map((handle) => {
                const positionClass =
                  handle === "nw"
                    ? "-left-2 -top-2"
                    : handle === "ne"
                      ? "-right-2 -top-2"
                      : handle === "sw"
                        ? "-bottom-2 -left-2"
                        : "-bottom-2 -right-2";

                return (
                  <button
                    key={handle}
                    type="button"
                    onMouseDown={(event) => startResize(event, object, handle)}
                    className={`absolute ${positionClass} h-4 w-4 rounded-full border-2 border-white bg-indigo-600 shadow-md`}
                    title="Resize"
                  />
                );
              })}
            </>
          )}
        </div>
      </div>
    );
  }

  function renderToolbarButton(item: (typeof TOOLBAR_ITEMS)[number]) {
    const Icon = item.icon;
    const isActive = activeTool === item.mode;

    return (
      <button
        key={item.mode}
        type="button"
        onClick={() => {
          setActiveTool(item.mode);
          setSelectedObjectId(null);

          if (item.mode === "image" && !objectImage) {
            setStatus("Import an image, then click the PDF page to place it.");
          } else if (item.mode === "signature") {
            setStatus("Choose typed, drawn, or uploaded signature, then click the PDF page.");
          } else if (item.mode === "select") {
            setStatus("Select mode active. Click any added field to move, resize, duplicate, or delete it.");
          } else {
            setStatus(`${item.label} tool active. Click the PDF page to place it.`);
          }
        }}
        className={[
          "inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
          isActive
            ? "border-indigo-500 bg-indigo-600 text-white shadow-[0_10px_24px_rgba(79,70,229,0.18)]"
            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700",
        ].join(" ")}
      >
        <Icon size={16} />
        <span className="hidden sm:inline">{item.label}</span>
      </button>
    );
  }

  const statusIsError =
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("valid") ||
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("first") ||
    status.toLowerCase().includes("before export");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
          <div className="rounded-[1.6rem] border border-[var(--border-light)] bg-white shadow-[0_22px_70px_rgba(101,80,232,0.08)]">
            <div className="border-b border-[var(--border-light)] px-4 py-4 sm:px-5 lg:px-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                    <FileSignature size={14} />
                    PDFMantra Fill & Sign
                  </div>

                  <h1 className="display-font mt-3 text-[1.85rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[2.35rem]">
                    Fill, type, sign, and mark PDF.
                  </h1>

                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    A lighter Sejda-style signing workspace for text, typed or drawn signatures, dates, checkmarks, whiteout blocks, and images.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(event) => handlePdfFile(event.target.files?.[0])}
                  />

                  <input
                    ref={signatureImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      handleImageFile(event.target.files?.[0], "signature")
                    }
                  />

                  <input
                    ref={objectImageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      handleImageFile(event.target.files?.[0], "object")
                    }
                  />

                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-white px-4 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"
                  >
                    <Upload size={16} />
                    Upload PDF
                  </button>

                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={busy || !file || objects.length === 0}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white shadow-[0_12px_24px_rgba(16,185,129,0.18)] transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Processing
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        Export PDF
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="border-b border-[var(--border-light)] bg-slate-50/70 px-4 py-3 sm:px-5 lg:px-6">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap gap-2">
                  {TOOLBAR_ITEMS.map(renderToolbarButton)}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={addActiveToolToDefaultSpot}
                    disabled={!canPlaceCurrentTool}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Plus size={16} />
                    Add to page
                  </button>

                  <button
                    type="button"
                    onClick={undoLastChange}
                    disabled={history.length === 0}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Undo2 size={16} />
                    Undo
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMoreOpen((current) => !current)}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <MoreHorizontal size={16} />
                      More
                      <ChevronDown size={14} />
                    </button>

                    {moreOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                        <button
                          type="button"
                          onClick={addSignatureToAllPages}
                          disabled={!file}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Copy size={15} />
                          Add signature to all pages
                        </button>

                        <button
                          type="button"
                          onClick={clearObjects}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          <RotateCcw size={15} />
                          Clear added fields
                        </button>

                        <button
                          type="button"
                          onClick={clearPdf}
                          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-700 hover:bg-red-50"
                        >
                          <Trash2 size={15} />
                          Remove PDF
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHelpOpen((current) => !current)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                      title="Help"
                    >
                      <HelpCircle size={17} />
                    </button>

                    {helpOpen && (
                      <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-indigo-100 bg-white p-4 text-sm font-medium leading-6 text-slate-600 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                        Choose a tool, click the PDF page to place it, then use Select mode to move or resize. Press Delete to remove selected field. Ctrl+Z works for undo.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {activeTool === "signature" && (
                <div className="mt-3 rounded-2xl border border-indigo-100 bg-white p-3">
                  <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr]">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Signature type
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {(["typed", "drawn", "uploaded"] as const).map((source) => (
                          <button
                            key={source}
                            type="button"
                            onClick={() => setSignatureSource(source)}
                            className={[
                              "rounded-xl border px-3 py-2 text-sm font-bold capitalize transition",
                              signatureSource === source
                                ? "border-indigo-500 bg-indigo-600 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-indigo-50",
                            ].join(" ")}
                          >
                            {source}
                          </button>
                        ))}
                      </div>
                    </div>

                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Typed signature
                      </span>
                      <input
                        value={signerName}
                        onChange={(event) => setSignerName(event.target.value)}
                        className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="Enter name"
                      />
                    </label>

                    <div>
                      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Draw / upload
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <canvas
                          ref={drawCanvasRef}
                          width={360}
                          height={110}
                          onPointerDown={startDrawing}
                          onPointerMove={drawSignature}
                          onPointerUp={stopDrawing}
                          onPointerCancel={stopDrawing}
                          className="h-[88px] flex-1 touch-none rounded-xl border border-dashed border-indigo-200 bg-white"
                        />
                        <div className="flex min-w-[140px] flex-row gap-2 sm:flex-col">
                          <button
                            type="button"
                            onClick={clearDrawnSignature}
                            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Clear draw
                          </button>
                          <button
                            type="button"
                            onClick={() => signatureImageInputRef.current?.click()}
                            className="flex-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                          >
                            Upload sign
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTool === "text" && (
                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_180px_180px]">
                  <label>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Text
                    </span>
                    <input
                      value={textValue}
                      onChange={(event) => setTextValue(event.target.value)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                      placeholder="Enter text"
                    />
                  </label>

                  <label>
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Style
                    </span>
                    <select
                      value={textStyle}
                      onChange={(event) => setTextStyle(event.target.value as TextStyle)}
                      className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                    >
                      {TEXT_STYLES.map((style) => (
                        <option key={style.value} value={style.value}>
                          {style.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="flex justify-between text-xs font-bold uppercase tracking-wide text-slate-500">
                      Size <span>{fontSize}px</span>
                    </span>
                    <input
                      type="range"
                      min={9}
                      max={42}
                      value={fontSize}
                      onChange={(event) => setFontSize(Number(event.target.value))}
                      className="mt-4 w-full"
                    />
                  </label>
                </div>
              )}

              {activeTool === "image" && (
                <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-semibold text-slate-600">
                    {objectImage
                      ? `Selected image: ${objectImage.fileName}`
                      : "Import an image, then click the PDF page to place it."}
                  </div>
                  <button
                    type="button"
                    onClick={() => objectImageInputRef.current?.click()}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                  >
                    <ImageIcon size={16} />
                    Import image
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-4 sm:px-5 lg:px-6">
              {previews.length > 0 && (
                <div className="mb-4 flex items-center gap-3 overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {previews.map((preview) => {
                    const count = objects.filter(
                      (object) => object.pageNumber === preview.pageNumber
                    ).length;

                    return (
                      <button
                        key={preview.pageNumber}
                        type="button"
                        onClick={() => selectPage(preview.pageNumber)}
                        className={[
                          "min-w-[94px] overflow-hidden rounded-xl border bg-white text-left shadow-sm transition",
                          activePageNumber === preview.pageNumber
                            ? "border-indigo-500 ring-4 ring-indigo-100"
                            : "border-slate-200 hover:border-indigo-200",
                        ].join(" ")}
                      >
                        <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-bold text-slate-700">
                          <span>Page {preview.pageNumber}</span>
                          {count > 0 && (
                            <span className="rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] text-indigo-700">
                              {count}
                            </span>
                          )}
                        </div>
                        <div className="bg-slate-100 p-1.5">
                          <img
                            src={preview.previewUrl}
                            alt={`Page ${preview.pageNumber}`}
                            className="mx-auto max-h-24 rounded border border-slate-200 bg-white"
                            draggable={false}
                          />
                        </div>
                      </button>
                    );
                  })}

                  {pageCount > previews.length && (
                    <div className="min-w-[150px] rounded-xl border border-dashed border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-500">
                      Showing first {previews.length} page previews. Export still applies fields added to all pages.
                    </div>
                  )}
                </div>
              )}

              <div
                onDrop={(event) => {
                  event.preventDefault();
                  handlePdfFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                className="flex min-h-[680px] items-start justify-center overflow-auto rounded-[1.35rem] border border-slate-200 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] p-4 sm:p-6"
              >
                {busy && previews.length === 0 ? (
                  <div className="mt-28 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-700 shadow-sm">
                    <Loader2 className="animate-spin text-indigo-600" size={18} />
                    Rendering PDF
                  </div>
                ) : !activePreview ? (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="mt-24 max-w-md rounded-[1.5rem] border-2 border-dashed border-indigo-200 bg-white p-8 text-center shadow-sm transition hover:border-indigo-400 hover:bg-indigo-50/40"
                  >
                    <PenLine className="mx-auto text-indigo-400" size={44} />
                    <div className="mt-4 text-xl font-bold text-slate-950">
                      Upload a PDF to start
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                      Your PDF will appear here as a large page preview. Then you can type, sign, mark, whiteout, or add images.
                    </p>
                  </button>
                ) : (
                  <div
                    ref={activePageRef}
                    className="relative inline-block select-none rounded bg-white shadow-[0_28px_80px_rgba(15,23,42,0.22)]"
                    onMouseDown={handlePageMouseDown}
                  >
                    <img
                      src={activePreview.previewUrl}
                      alt={`Active page ${activePageNumber}`}
                      className="block max-h-[980px] max-w-full rounded bg-white"
                      draggable={false}
                    />

                    {activePageObjects.map(renderFillObject)}
                  </div>
                )}
              </div>

              <div
                className={[
                  "mt-3 flex flex-col gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold sm:flex-row sm:items-center sm:justify-between",
                  statusIsError
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-amber-100 bg-amber-50 text-amber-900",
                ].join(" ")}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {status}
                </div>
                <div className="text-xs font-bold text-slate-500">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} • ${
                        objects.length
                      } field${objects.length !== 1 ? "s" : ""}`
                    : "No PDF loaded"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {selectedObject && (
          <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 rounded-2xl border border-indigo-100 bg-white/95 p-3 shadow-[0_24px_80px_rgba(15,23,42,0.20)] backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Selected
                </div>
                <div className="truncate text-sm font-bold text-slate-950">
                  {getObjectLabel(selectedObject.kind)} on page{" "}
                  {selectedObject.pageNumber}
                </div>
              </div>

              {(selectedObject.kind === "text" ||
                selectedObject.kind === "date" ||
                (selectedObject.kind === "signature" && !selectedObject.image)) && (
                <input
                  value={selectedObject.text}
                  onChange={(event) =>
                    updateSelectedObject((object) => ({
                      ...object,
                      text: event.target.value,
                    }))
                  }
                  className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm font-bold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 lg:max-w-md"
                />
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => resizeSelectedObject("smaller")}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Smaller
                </button>
                <button
                  type="button"
                  onClick={() => resizeSelectedObject("bigger")}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                >
                  Bigger
                </button>
                <button
                  type="button"
                  onClick={duplicateSelectedObject}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  <Copy size={15} />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={deleteSelectedObject}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-sm font-bold text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
