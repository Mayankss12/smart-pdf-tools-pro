import type { PdfPageGeometryContext, PdfPageIndex } from "@/engines/shared/types";

export interface AnnotatePageSnapshot {
  readonly pageIndex: PdfPageIndex;
  readonly pageNumber: number;
  readonly pageLabel: string;
  readonly previewUrl: string;
  readonly geometry: PdfPageGeometryContext;
}

export interface AnnotateUploadSummary {
  readonly fileName: string;
  readonly fileSize: number;
  readonly pageCount: number;
}

export interface AnnotationColorPreset {
  readonly label: string;
  readonly value: string;
}

export const ANNOTATION_COLOR_PRESETS: readonly AnnotationColorPreset[] = [
  { label: "Yellow", value: "#FFE45E" },
  { label: "Red", value: "#EF4444" },
  { label: "Blue", value: "#2563EB" },
  { label: "Green", value: "#16A34A" },
  { label: "Black", value: "#111827" },
  { label: "Violet", value: "#6550E8" },
] as const;
