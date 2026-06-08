import { PDFDocument, rgb } from "pdf-lib";

import {
  PdfEngineError,
  getReductionPercent,
  safeFileBaseName,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

export type ImageToPdfPageSize = "a4" | "letter" | "legal" | "a3" | "original";
export type ImageToPdfOrientation = "auto" | "portrait" | "landscape";
export type ImageToPdfFitMode