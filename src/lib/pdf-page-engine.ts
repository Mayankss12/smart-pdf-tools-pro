import { PDFDocument } from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

function uniqueSortedPageNumbers(pageNumbers: number[]) {
  return Array.from(new Set(pageNumbers)).sort((a, b) => a - b);
}

function validatePageNumbers(pageNumbers: number[], totalPages: number) {
  if (pageNumbers.length === 0) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "Select at least one page first.");
  }

  for (const pageNumber of pageNumbers) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > totalPages) {
      throw new PdfEngineError(
        "INVALID_PAGE_RANGE",
        `Page ${pageNumber} is outside this PDF. Total pages: ${totalPages}.`,
      );
    }
  }
}

export async function deletePdfPages(
  file: File,
  pagesToDelete: number[],
): Promise<PdfProcessingResult> {
  const sourcePdf = await loadPdfDocument(file);
  const totalPages = sourcePdf.getPageCount();
  const cleanDeletePages = uniqueSortedPageNumbers(pagesToDelete);

  validatePageNumbers(cleanDeletePages, totalPages);

  if (cleanDeletePages.length >= totalPages) {
    throw new PdfEngineError("INVALID_PAGE_RANGE", "You cannot delete all pages. Keep at least one page.");
  }

  const deleteSet = new Set(cleanDeletePages);
  const pagesToKeep = sourcePdf
    .getPageIndices()
    .filter((pageIndex) => !deleteSet.has(pageIndex + 1));

  const outputPdf = await PDFDocument.create();
  const copiedPages = await outputPdf.copyPages(sourcePdf, pagesToKeep);
  copiedPages.forEach((page) => outputPdf.addPage(page));

  return savePdfResult(outputPdf, file.size, createPdfFileName("deleted-pages", file.name));
}

export async function extractPdfPages(
  file: File,
  pagesToExtract: number[],
): Promise<PdfProcessingResult> {
  const sourcePdf = await loadPdfDocument(file);
  const totalPages = sourcePdf.getPageCount();
  const cleanExtractPages = uniqueSortedPageNumbers(pagesToExtract);

  validatePageNumbers(cleanExtractPages, totalPages);

  const outputPdf = await PDFDocument.create();
  const copiedPages = await outputPdf.copyPages(
    sourcePdf,
    cleanExtractPages.map((pageNumber) => pageNumber - 1),
  );
  copiedPages.forEach((page) => outputPdf.addPage(page));

  return savePdfResult(outputPdf, file.size, createPdfFileName("extracted-pages", file.name));
}
