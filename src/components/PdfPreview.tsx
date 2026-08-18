"use client";

import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

export function PdfPreview({
  file,
  maxPages = 4,
  overlay,
}: {
  file: File | null;
  maxPages?: number;
  overlay?: React.ReactNode;
}) {
  const [images, setImages] = useState<string[]>([]);

  useEffect(() => {
    configurePdfJsWorker(pdfjsLib);
  }, []);

  useEffect(() => {
    let mounted = true;
    let pdfDocument: pdfjsLib.PDFDocumentProxy | null = null;

    async function run() {
      if (!file) {
        setImages([]);
        return;
      }

      try {
        const loadedDocument = await pdfjsLib.getDocument({
          data: await file.arrayBuffer(),
        }).promise;
        pdfDocument = loadedDocument;
        const urls: string[] = [];

        for (let i = 1; i <= Math.min(loadedDocument.numPages, maxPages); i += 1) {
          if (!mounted) break;

          const page = await loadedDocument.getPage(i);

          try {
            if (!mounted) break;

            const viewport = page.getViewport({ scale: 0.55 });
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) continue;

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;

            if (mounted) {
              urls.push(canvas.toDataURL("image/png"));
            }
          } finally {
            page.cleanup();
          }
        }

        if (mounted) setImages(urls);
      } catch {
        if (mounted) setImages([]);
      } finally {
        const documentToDestroy = pdfDocument;
        pdfDocument = null;
        await documentToDestroy?.destroy();
      }
    }

    void run();

    return () => {
      mounted = false;
      const documentToDestroy = pdfDocument;
      pdfDocument = null;
      void documentToDestroy?.destroy();
    };
  }, [file, maxPages]);

  if (!file) return null;

  return (
    <div className="relative rounded-2xl border bg-slate-50 p-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src, index) => (
          <img
            key={index}
            src={src}
            alt={`Page ${index + 1}`}
            className="w-full rounded border bg-white"
          />
        ))}
      </div>
      {overlay ? (
        <div className="pointer-events-none absolute inset-0">{overlay}</div>
      ) : null}
    </div>
  );
}
