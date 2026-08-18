"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import { configurePdfJsWorker } from "@/lib/pdfjs-worker";
import {
  PdfEngineError,
  loadPdfDocument,
  validatePdfFile,
  type PdfValidationOptions,
} from "@/lib/pdf-engine";

export type PdfPageThumbnail = {
  pageNumber: number;
  thumbnail: string;
  thumbnailUrl: string;
};

type UsePdfPagesOptions = {
  thumbnailScale?: number;
  validation?: PdfValidationOptions;
};

type ActiveRenderTask = {
  cancel: () => void;
};

function createEmptyPages(pageCount: number): PdfPageThumbnail[] {
  return Array.from({ length: pageCount }, (_, index) => ({
    pageNumber: index + 1,
    thumbnail: "",
    thumbnailUrl: "",
  }));
}

function getPdfPagesErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) return error.message;

  if (error instanceof Error) {
    if (error.name === "RenderingCancelledException") {
      return "Thumbnail rendering was cancelled.";
    }

    return error.message || "This PDF could not be loaded.";
  }

  return "This PDF could not be loaded.";
}

export function usePdfPages(options: UsePdfPagesOptions = {}) {
  const thumbnailScale = options.thumbnailScale ?? 0.42;

  const renderTokenRef = useRef(0);
  const activeRenderTaskRef = useRef<ActiveRenderTask | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PdfPageThumbnail[]>([]);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const cancelActiveRender = useCallback(() => {
    try {
      activeRenderTaskRef.current?.cancel();
    } catch {
      // pdf.js can throw if the render task already completed.
      // Safe to ignore because this is only cleanup/cancellation.
    } finally {
      activeRenderTaskRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    renderTokenRef.current += 1;
    cancelActiveRender();

    setFile(null);
    setPages([]);
    setPageCount(0);
    setLoading(false);
    setProgress(0);
    setError(null);
  }, [cancelActiveRender]);

  useEffect(() => {
    configurePdfJsWorker(pdfjsLib);

    return () => {
      renderTokenRef.current += 1;
      cancelActiveRender();
    };
  }, [cancelActiveRender]);

  const loadFile = useCallback(
    async (selectedFile: File) => {
      const token = renderTokenRef.current + 1;
      renderTokenRef.current = token;

      cancelActiveRender();

      setFile(selectedFile);
      setPages([]);
      setPageCount(0);
      setLoading(true);
      setProgress(0);
      setError(null);

      let pdf: pdfjsLib.PDFDocumentProxy | null = null;

      try {
        configurePdfJsWorker(pdfjsLib);

        validatePdfFile(selectedFile, options.validation);

        const pdfDocument = await loadPdfDocument(selectedFile, options.validation);
        const totalPages = pdfDocument.getPageCount();

        if (renderTokenRef.current !== token) return;

        setPageCount(totalPages);
        setPages(createEmptyPages(totalPages));

        if (totalPages <= 0) {
          setLoading(false);
          setProgress(100);
          return;
        }

        const loadingTask = pdfjsLib.getDocument({
          data: await selectedFile.arrayBuffer(),
        });

        pdf = await loadingTask.promise;

        if (renderTokenRef.current !== token) return;

        const nextPages = createEmptyPages(totalPages);

        for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
          if (renderTokenRef.current !== token) return;

          const page = await pdf.getPage(pageNumber);

          try {
            if (renderTokenRef.current !== token) return;

            const viewport = page.getViewport({ scale: thumbnailScale });
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            if (!context) {
              nextPages[pageNumber - 1] = {
                pageNumber,
                thumbnail: "",
                thumbnailUrl: "",
              };

              setPages([...nextPages]);
              setProgress(Math.round((pageNumber / totalPages) * 100));
              continue;
            }

            canvas.width = Math.ceil(viewport.width * pixelRatio);
            canvas.height = Math.ceil(viewport.height * pixelRatio);
            context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

            const renderTask = page.render({
              canvasContext: context,
              viewport,
            });

            activeRenderTaskRef.current = renderTask;

            try {
              await renderTask.promise;
            } finally {
              if (activeRenderTaskRef.current === renderTask) {
                activeRenderTaskRef.current = null;
              }
            }

            if (renderTokenRef.current !== token) return;

            const thumbnail = canvas.toDataURL("image/png");

            nextPages[pageNumber - 1] = {
              pageNumber,
              thumbnail,
              thumbnailUrl: thumbnail,
            };

            setPages([...nextPages]);
            setProgress(Math.round((pageNumber / totalPages) * 100));
          } finally {
            page.cleanup();
          }
        }

        if (renderTokenRef.current === token) {
          setProgress(100);
          setLoading(false);
          setError(null);
        }
      } catch (caughtError) {
        if (renderTokenRef.current !== token) return;

        setFile(null);
        setPages([]);
        setPageCount(0);
        setProgress(0);
        setLoading(false);
        setError(getPdfPagesErrorMessage(caughtError));
      } finally {
        if (pdf) {
          await pdf.destroy();
        }
      }
    },
    [cancelActiveRender, options.validation, thumbnailScale],
  );

  const hasPages = pages.length > 0;

  const pageNumbers = useMemo(() => pages.map((page) => page.pageNumber), [pages]);

  return {
    file,
    pages,
    pageNumbers,
    pageCount,
    hasPages,
    loading,
    progress,
    error,
    loadFile,
    reset,
  };
}
