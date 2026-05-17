// src/lib/editor/types.ts

/**
 * Core Tooling State
 */
export type ActiveTool = "select" | "edit" | "text" | "highlight";

/**
 * Layer Identification & Interaction
 */
export type LayerType = "text" | "highlight";

export type ResizeHandle =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right";

export interface Point {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Base Layer Model
 *
 * All coordinates and dimensions must be stored in absolute PDF Points (pt).
 * 1 pt = 1/72 inch.
 *
 * These values stay unscaled in editor state.
 * UI rendering converts pt -> px by multiplying with zoomScale.
 */
export interface BaseLayer {
  id: string;
  type: LayerType;
  pageIndex: number; // 0-based page index

  x: number; // Unscaled PDF points (pt)
  y: number; // Unscaled PDF points (pt)
  width: number; // Unscaled PDF points (pt)
  height: number; // Unscaled PDF points (pt)
}

/**
 * Text Layer Model
 */
export interface TextLayer extends BaseLayer {
  type: "text";
  content: string;

  fontSize: number; // Unscaled PDF points (pt)
  fontFamily: "Helvetica";

  isBold: boolean;
  isItalic: boolean;

  color: string; // Hex format, e.g. "#000000"
}

/**
 * Highlight Layer Model
 */
export interface HighlightLayer extends BaseLayer {
  type: "highlight";

  opacity: number; // Float between 0.0 and 1.0
  color: string; // Hex format, e.g. "#FFFF00"
}

export type PdfLayer = TextLayer | HighlightLayer;

/**
 * Document & Canvas State Models
 */
export interface PageThumb {
  pageIndex: number;
  thumbnailUrl: string; // Blob URL or base64 preview image

  width: number; // Native PDF width in pt
  height: number; // Native PDF height in pt

  rotation: 0 | 90 | 180 | 270;
  status: "loading" | "ready" | "error";
}

/**
 * Drag & Resize State
 *
 * This strictly separates:
 * - Browser screen pixels from MouseEvent / TouchEvent
 * - PDF point values used by layer data
 *
 * Movement formula:
 * deltaPt = deltaPx / zoomScale
 */
export interface DragState {
  isDragging: boolean;
  layerId: string | null;
  activeHandle: ResizeHandle | "move" | null;

  /**
   * Browser screen pixels captured when the pointer interaction begins.
   */
  pointerStartClientX: number;
  pointerStartClientY: number;

  /**
   * Original layer geometry in PDF points before drag/resize begins.
   */
  initialLayerX: number;
  initialLayerY: number;

  /**
   * Required only for resize interactions.
   */
  initialLayerWidth?: number;
  initialLayerHeight?: number;
}

/**
 * The Editor State Shape
 *
 * This is the shared typed state contract for the editor UI.
 * It can later be backed by React Context, Zustand, or another state layer.
 */
export interface EditorState {
  activeTool: ActiveTool;
  selectedLayerId: string | null;

  zoomScale: number; // e.g. 1.0 = 100%, 1.5 = 150%
  currentPageIndex: number;

  layers: PdfLayer[];
  dragState: DragState;
}
