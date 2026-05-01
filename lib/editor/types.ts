export type ActiveTool =
  | "none"
  | "select"
  | "object"
  | "edit"
  | "text"
  | "highlight";

export type EditorTool = ActiveTool;

export type LayerType = "text" | "highlight" | "image" | "signature";

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
  fontSize?: number;
  isBold?: boolean;
  isItalic?: boolean;
  opacity?: number;
  imageUrl?: string;
  imageBytes?: Uint8Array;
  imageKind?: "png" | "jpg";
  coverText?: boolean;
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

export type DraftBox = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type DrawState = {
  startXPercent: number;
  startYPercent: number;
  currentXPercent: number;
  currentYPercent: number;
};

export type TextOverlayItem = {
  id: string;
  text: string;
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
  fontSizePx: number;
};
