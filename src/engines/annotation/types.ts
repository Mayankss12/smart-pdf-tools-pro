import type { NormalizedPoint, NormalizedRect, PdfPageIndex } from "../shared/types";

export const ANNOTATION_SCHEMA_VERSION = 1 as const;

export type AnnotationSchemaVersion = typeof ANNOTATION_SCHEMA_VERSION;
export type AnnotationId = string;

export type AnnotationTool =
  | "select"
  | "highlighter-pen"
  | "pen"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text-note";

export type AnnotationKind =
  | "highlighter-stroke"
  | "ink-stroke"
  | "rectangle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text-note";

export interface AnnotationStyle {
  readonly color: string;
  readonly opacity: number;
  readonly strokeWidth: number;
}

interface BaseAnnotation {
  readonly schemaVersion: AnnotationSchemaVersion;
  readonly id: AnnotationId;
  readonly pageIndex: PdfPageIndex;
  readonly kind: AnnotationKind;
  readonly style: AnnotationStyle;
}

export interface StrokeAnnotation extends BaseAnnotation {
  readonly kind: "highlighter-stroke" | "ink-stroke";
  readonly points: readonly NormalizedPoint[];
}

export interface ShapeBoxAnnotation extends BaseAnnotation {
  readonly kind: "rectangle" | "ellipse";
  readonly bounds: NormalizedRect;
}

export interface ShapeLineAnnotation extends BaseAnnotation {
  readonly kind: "line" | "arrow";
  readonly start: NormalizedPoint;
  readonly end: NormalizedPoint;
}

export interface TextNoteAnnotation extends BaseAnnotation {
  readonly kind: "text-note";
  readonly bounds: NormalizedRect;
  readonly text: string;
  readonly fontSize: number;
  readonly backgroundColor: string;
}

export type AnnotationLayer =
  | StrokeAnnotation
  | ShapeBoxAnnotation
  | ShapeLineAnnotation
  | TextNoteAnnotation;
