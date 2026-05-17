/**
 * PDFMantra Editor Types
 * ---------------------------------------------------------------------------
 * This file intentionally supports two editor contracts during the migration:
 *
 * 1. The current live editor contract, which still uses percent-based geometry
 *    and powers the existing editor page, toolbar, inspector, export, image,
 *    highlight, and signature flows.
 *
 * 2. The next editor geometry contract, which stores coordinates in absolute
 *    PDF Points (pt). This pt-based contract becomes the source of truth as the
 *    canvas, drag/resize, and export pipeline are migrated file-by-file.
 *
 * Keeping both contracts here allows us to introduce the correct architecture
 * without breaking the working editor before the renderer migration lands.
 */

/* -------------------------------------------------------------------------- */
/* Current live editor compatibility                                           */
/* -------------------------------------------------------------------------- */

export type ActiveTool =
  | "none"
  | "select"
  | "object"
  | "edit"
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "signature-image"
  | "form-text"
  | "form-checkbox"
  | "form-date";

export type EditorTool = ActiveTool;

export type LayerType = "text" | "highlight" | "image" | "signature";

export type ExportMode = "full" | "current" | "range";

/**
 * Legacy resize-handle IDs currently consumed by the live editor UI.
 * They are intentionally kept until Step 2/3 moves the page renderer and drag
 * math onto the pt-based coordinate model.
 */
export type ResizeHandle =
  | "tl"
  | "tm"
  | "tr"
  | "mr"
  | "br"
  | "bm"
  | "bl"
  | "ml";

/**
 * Legacy live-editor layer contract.
 * Kept intact because the current editor page still renders and exports from it.
 */
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

  /**
   * Highlight metadata.
   * These are used by the editor preview, inspector controls,
   * and final PDF export.
   */
  highlightColorIndex?: number;
  highlightColorCss?: string;
  highlightColorR?: number;
  highlightColorG?: number;
  highlightColorB?: number;
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

/* -------------------------------------------------------------------------- */
/* Next geometry system: absolute PDF point coordinates                         */
/* -------------------------------------------------------------------------- */

/**
 * Absolute PDF point values.
 * 1 pt = 1 / 72 inch.
 */
export type PdfPointUnit = number;

export type PdfPoint = {
  x: PdfPointUnit;
  y: PdfPointUnit;
};

export type PdfDimensions = {
  width: PdfPointUnit;
  height: PdfPointUnit;
};

export type PdfRect = PdfPoint & PdfDimensions;

export type PdfPageIndex = number;

export type PdfRotation = 0 | 90 | 180 | 270;

/**
 * Future resize-handle IDs for the pt-based editor geometry model.
 * These are not yet consumed by the live page, but they define the target
 * contract for the migration pass.
 */
export type PdfPointResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";

export type PdfPointLayerType = "text" | "highlight" | "image" | "signature";

export type PdfPointBaseLayer = {
  id: string;
  type: PdfPointLayerType;
  pageIndex: PdfPageIndex;
  x: PdfPointUnit;
  y: PdfPointUnit;
  width: PdfPointUnit;
  height: PdfPointUnit;
};

export type PdfPointTextLayer = PdfPointBaseLayer & {
  type: "text" | "signature";
  content: string;
  fontSize: PdfPointUnit;
  fontFamily: "Helvetica";
  isBold: boolean;
  isItalic: boolean;
  color: string;
};

export type PdfPointHighlightLayer = PdfPointBaseLayer & {
  type: "highlight";
  opacity: number;
  color: string;
};

export type PdfPointImageLayer = PdfPointBaseLayer & {
  type: "image";
  imageUrl?: string;
  imageBytes?: Uint8Array;
  imageKind?: "png" | "jpg";
};

export type PdfPointLayer =
  | PdfPointTextLayer
  | PdfPointHighlightLayer
  | PdfPointImageLayer;

export type PdfPointPageThumb = {
  pageIndex: PdfPageIndex;
  thumbnailUrl: string;
  width: PdfPointUnit;
  height: PdfPointUnit;
  rotation: PdfRotation;
  status: "loading" | "ready" | "error";
};

/**
 * Explicit pt-migration drag state.
 * Pointer values stay in browser client pixels; layer geometry stays in PDF pt.
 * Movement formula: deltaPt = deltaPx / zoomScale.
 */
export type PdfPointDragState = {
  isDragging: boolean;
  layerId: string | null;
  activeHandle: PdfPointResizeHandle | "move" | null;
  pointerStartClientX: number;
  pointerStartClientY: number;
  initialLayerX: PdfPointUnit;
  initialLayerY: PdfPointUnit;
  initialLayerWidth?: PdfPointUnit;
  initialLayerHeight?: PdfPointUnit;
};

export type PdfPointEditorState = {
  activeTool: ActiveTool;
  selectedLayerId: string | null;
  zoomScale: number;
  currentPageIndex: PdfPageIndex;
  layers: PdfPointLayer[];
  dragState: PdfPointDragState;
};

/* -------------------------------------------------------------------------- */
/* Existing fresh-editor command ribbon model                                  */
/* -------------------------------------------------------------------------- */

export type EditorRibbonToolId =
  | "select"
  | "object"
  | "edit"
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "whiteout"
  | "annotate"
  | "shapes";

export type EditorRibbonActionId =
  | "undo"
  | "redo"
  | "export";

export type EditorCommandId =
  | EditorRibbonToolId
  | EditorRibbonActionId;

export type EditorCommandKind =
  | "tool"
  | "action"
  | "menu";

export type EditorCommandGroupId =
  | "selection"
  | "insert"
  | "annotate"
  | "sign"
  | "history"
  | "export";

export type EditorCommandStatus =
  | "ready"
  | "beta"
  | "coming-soon";

export type EditorCommandAvailability =
  | "always"
  | "document-loaded"
  | "layer-selected"
  | "future-ready";

export type EditorShortcutModifier =
  | "meta"
  | "ctrl"
  | "shift"
  | "alt"
  | "meta-shift"
  | "ctrl-shift";

export type EditorShortcut = {
  key: string;
  label: string;
  modifier?: EditorShortcutModifier;
  preventDefault?: boolean;
};

export type EditorCommandPresentation = {
  desktop: "ribbon" | "overflow";
  mobile: "dock" | "sheet" | "hidden";
  priority: number;
};

export type EditorCommandDefinition = {
  id: EditorCommandId;
  label: string;
  shortLabel?: string;
  description: string;
  tooltip: string;
  kind: EditorCommandKind;
  group: EditorCommandGroupId;
  status: EditorCommandStatus;
  availability: EditorCommandAvailability;
  shortcut?: EditorShortcut;
  presentation: EditorCommandPresentation;
};

/* -------------------------------------------------------------------------- */
/* Existing fresh-editor future layer model                                    */
/* -------------------------------------------------------------------------- */

export type EditorLayerKind =
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "whiteout"
  | "shape";

/**
 * This future ribbon/shell model remains intact for the broader editor roadmap.
 * The concrete renderer migration will use the more explicit PdfPoint* types
 * above so the pt-based editor geometry stays unmistakable.
 */
export type NormalizedUnit = number;

export type NormalizedPoint = {
  x: NormalizedUnit;
  y: NormalizedUnit;
};

export type NormalizedSize = {
  width: NormalizedUnit;
  height: NormalizedUnit;
};

export type NormalizedRect = NormalizedPoint & NormalizedSize;

export type NormalizedRotation = number;

export type EditorPageNumber = number;

export type EditorLayerBase = {
  id: string;
  pageNumber: EditorPageNumber;
  kind: EditorLayerKind;
  rect: NormalizedRect;
  rotation?: NormalizedRotation;
  opacity?: number;
  locked?: boolean;
  hidden?: boolean;
  createdAt?: number;
  updatedAt?: number;
};

export type EditorTextLayer = EditorLayerBase & {
  kind: "text" | "signature";
  content: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: "normal" | "semibold" | "bold";
  fontStyle?: "normal" | "italic";
  color?: string;
  textAlign?: "left" | "center" | "right";
};

export type EditorHighlightLayer = EditorLayerBase & {
  kind: "highlight";
  color?: string;
  blendMode?: "multiply" | "normal";
};

export type EditorImageLayer = EditorLayerBase & {
  kind: "image";
  sourceUrl?: string;
  sourceBytes?: Uint8Array;
  mimeType?: "image/png" | "image/jpeg" | "image/webp";
};

export type EditorWhiteoutLayer = EditorLayerBase & {
  kind: "whiteout";
  fill?: string;
};

export type EditorShapeLayer = EditorLayerBase & {
  kind: "shape";
  shape: "rectangle" | "ellipse" | "line" | "arrow";
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

export type FutureEditorLayer =
  | EditorTextLayer
  | EditorHighlightLayer
  | EditorImageLayer
  | EditorWhiteoutLayer
  | EditorShapeLayer;
