import type * as pdfjsLib from "pdfjs-dist";

export type LayerType =
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "cover"
  | "form-text"
  | "form-checkbox"
  | "form-date";

export type ActiveTool =
  | "edit"
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "signature-image"
  | "form-text"
  | "form-checkbox"
  | "form-date"
  | "select";

export type ExportMode = "full" | "current" | "range";

export type ResizeHandle =
  | "tl"
  | "tm"
  | "tr"
  | "mr"
  | "br"
  | "bm"
  | "bl"
  | "ml";

export type PdfLayer = {
  id: string;
  page: number;
  type: LayerType;

  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;

  text?: string;
  placeholder?: string;

  fontFamily?: string;
  fontSize?: number;
  fontColor?: string;
  isBold?: boolean;
  isItalic?: boolean;
  isUnderline?: boolean;
  textAlign?: "left" | "center" | "right";

  opacity?: number;
  color?: string;

  imageUrl?: string;
  imageBytes?: Uint8Array;
  imageKind?: "png" | "jpg";

  checked?: boolean;

  coverOriginal?: boolean;
  coverColor?: "white";

  sourceText?: string;
  sourceItemIds?: string[];
  isParagraphEdit?: boolean;
};

export type PageThumb = {
  pageNumber: number;
  url: string;
};

export type DragState = {
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

export type DrawState = {
  tool: Exclude<ActiveTool, "edit" | "select">;
  startXPercent: number;
  startYPercent: number;
  currentXPercent: number;
  currentYPercent: number;
};

export type DraftBox = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type TextOverlayItem = {
  id: string;
  page: number;
  text: string;

  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;

  fontSizePx: number;
  fontSizePdf: number;

  transform?: number[];
  fontName?: string;
};

export type TextOverlayWord = TextOverlayItem & {
  sourceItemId: string;
  wordIndex: number;
};

export type ParagraphBlock = {
  id: string;
  page: number;
  text: string;

  itemIds: string[];

  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;

  fontSizePx: number;
  fontSizePdf: number;
};

export type EditorStatus = {
  type: "idle" | "info" | "success" | "warning" | "error";
  message: string;
};

export type PdfDocumentRef = pdfjsLib.PDFDocumentProxy | null;
export type PdfPageRef = pdfjsLib.PDFPageProxy | null;

export type EditorToolConfig = {
  id: ActiveTool | "delete" | "clear-page" | "reset" | "export";
  label: string;
  description: string;
  shortcut?: string;
  group: "edit" | "insert" | "manage" | "export";
};
