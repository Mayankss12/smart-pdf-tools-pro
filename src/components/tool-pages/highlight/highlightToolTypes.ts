import type {
  PdfPageGeometryContext,
  PdfPageIndex,
} from "@/engines/shared/types";

import type {
  TextSnapUnit,
} from "@/engines/highlight/textSnapper";

import type {
  PdfJsTextSnapExtractionDiagnostics,
} from "@/adapters/pdfjs/textContentAdapter";

export interface HighlightColorPreset {
  readonly label: string;
  readonly value: string;
}

export const HIGHLIGHT_COLOR_PRESETS: readonly HighlightColorPreset[] = [
  {
    label: "Yellow",
    value: "#FFE45E",
  },
  {
    label: "Green",
    value: "#86EFAC",
  },
  {
    label: "Blue",
    value: "#93C5FD",
  },
  {
    label: "Pink",
    value: "#F9A8D4",
  },
  {
    label: "Orange",
    value: "#FDBA74",
  },
] as const;

export interface HighlightPageSnapshot {
  readonly pageIndex: PdfPageIndex;
  readonly pageNumber: number;
  readonly previewUrl: string;
  readonly pageLabel: string;
  readonly geometry: PdfPageGeometryContext;
  readonly textUnits: readonly TextSnapUnit[];
  readonly textDiagnostics: PdfJsTextSnapExtractionDiagnostics;
}

export interface HighlightUploadSummary {
  readonly fileName: string;
  readonly fileSize: number;
  readonly pageCount: number;
}
