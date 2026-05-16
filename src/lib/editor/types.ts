/**
 * PDFMantra Editor Types
 * ---------------------------------------------------------------------------
 * This file now serves two purposes:
 *
 * 1. It preserves the current live editor's legacy contracts so the app keeps
 *    working while the fresh editor architecture is introduced safely.
 *
 * 2. It defines the new Phase 1 editor architecture contracts:
 *    - compact pro ribbon command model
 *    - future-proof tool registry primitives
 *    - normalized 0–1 geometry primitives for the new editor engine
 *
 * Once the full fresh editor shell is complete, legacy percent-based types can
 * be retired in a controlled cleanup pass.
 */

/* -------------------------------------------------------------------------- */
/* Current editor compatibility                                                */
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
 * The fresh architecture will move toward normalized geometry objects instead.
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
/* Fresh editor architecture: normalized geometry                              */
/* -------------------------------------------------------------------------- */

/**
 * All fresh-editor geometry must use 0–1 normalized coordinates.
 * Example:
 * - x: 0.25 means 25% from the page's left edge
 * - width: 0.5 means 50% of the page width
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

/* -------------------------------------------------------------------------- */
/* Fresh editor architecture: command ribbon model                             */
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
/* Fresh editor architecture: future layer model                               */
/* -------------------------------------------------------------------------- */

export type EditorLayerKind =
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "whiteout"
  | "shape";

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
