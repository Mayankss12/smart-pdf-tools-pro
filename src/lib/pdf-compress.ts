import * as pdfjs from "pdfjs-dist";
import { degrees, PDFDocument } from "pdf-lib";

import { PdfEngineError } from "@/lib/pdf-errors";
import { readValidatedPdfBytes } from "@/lib/pdf-document-safety";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

if (typeof window !== "undefined") {
  configurePdfJsWorker(pdfjs);
}

export type CompressionLevel = "low" | "medium" | "high";
export type CompressionMode = "auto" | "structural" | "scan";
export type CompressionMethod = Exclude<CompressionMode, "auto">;

export type CompressionProgress = {
  readonly percent: number | null;
  readonly message: string;
  readonly pageNumber?: number;
  readonly pageCount?: number;
};

export type CompressionAnalysis = {
  readonly selectedMethod: CompressionMethod;
  readonly reason: string;
  readonly pageCount: number;
  readonly textCharacters: number;
  readonly imageOperations: number;
};

export type PdfCompressionOptions = {
  readonly mode: CompressionMode;
  readonly level: CompressionLevel;
  readonly targetBytes?: number | null;
  readonly removeMetadata?: boolean;
  readonly signal?: AbortSignal;
  readonly onProgress?: (progress: CompressionProgress) => void;
};

export type PdfCompressionResult = {
  readonly blob: Blob;
  readonly originalSize: number;
  readonly compressedSize: number;
  readonly qualityUsed: number;
  readonly targetMet: boolean;
  readonly method: CompressionMethod;
  readonly analysis: CompressionAnalysis;
  readonly usedOriginal: boolean;
};

const LEVEL_CONFIG: Record<
  CompressionLevel,
  { readonly scale: number; readonly quality: number }
> = {
  low: { scale: 2, quality: 0.94 },
  medium: { scale: 1.5, quality: 0.84 },
  high: { scale: 1.15, quality: 0.7 },
};

const MAX_CANVAS_PIXELS = 40_000_000;

function throwIfAborted(signal: AbortSignal | undefined) {
  if (signal?.aborted) {
    throw new DOMException("Compression cancelled.", "AbortError");
  }
}

function report(
  callback: PdfCompressionOptions["onProgress"],
  progress: CompressionProgress,
) {
  callback?.(progress);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(
            new PdfEngineError(
              "PROCESSING_FAILED",
              "The browser could not encode a compressed page image.",
            ),
          );
          return;
        }
        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      "image/jpeg",
      quality,
    );
  });
}

function getSafeRenderScale(width: number, height: number, requestedScale: number) {
  const requestedPixels = width * requestedScale * height * requestedScale;
  if (requestedPixels <= MAX_CANVAS_PIXELS) return requestedScale;

  return Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
}

async function analyzePdfComposition(
  pdf: pdfjs.PDFDocumentProxy,
  signal: AbortSignal | undefined,
  onProgress: PdfCompressionOptions["onProgress"],
) {
  let textCharacters = 0;
  let imageOperations = 0;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    throwIfAborted(signal);
    const page = await pdf.getPage(pageNumber);
    try {
      const [text, operators] = await Promise.all([
        page.getTextContent(),
        page.getOperatorList(),
      ]);
      textCharacters += text.items.reduce(
        (sum, item) => sum + ("str" in item ? item.str.length : 0),
        0,
      );
      imageOperations += operators.fnArray.filter(
        (operation) =>
          operation === pdfjs.OPS.paintImageXObject ||
          operation === pdfjs.OPS.paintInlineImageXObject ||
          operation === pdfjs.OPS.paintImageMaskXObject,
      ).length;
    } finally {
      page.cleanup();
    }
    report(onProgress, {
      percent: null,
      message: `Inspected page ${pageNumber} of ${pdf.numPages}.`,
      pageNumber,
      pageCount: pdf.numPages,
    });
  }

  const averageText = textCharacters / Math.max(1, pdf.numPages);
  const averageImages = imageOperations / Math.max(1, pdf.numPages);
  const imageHeavy = averageText < 80 && averageImages >= 1;

  return {
    selectedMethod: imageHeavy ? "scan" : "structural",
    reason: imageHeavy
      ? "Auto selected Scan Compression because pages contain little selectable text and are image-heavy."
      : "Auto selected Preserve Text because selectable text or vector structure was detected.",
    pageCount: pdf.numPages,
    textCharacters,
    imageOperations,
  } satisfies CompressionAnalysis;
}

function clearMetadata(pdf: PDFDocument) {
  pdf.setTitle("");
  pdf.setAuthor("");
  pdf.setSubject("");
  pdf.setKeywords([]);
  pdf.setCreator("PDFMantra");
  pdf.setProducer("PDFMantra");
}

async function structurallyCompress(
  bytes: Uint8Array,
  removeMetadata: boolean,
  signal: AbortSignal | undefined,
  onProgress: PdfCompressionOptions["onProgress"],
) {
  throwIfAborted(signal);
  report(onProgress, {
    percent: null,
    message: "Optimizing PDF structure while preserving text, vectors, links, forms, and page geometry…",
  });
  const pdf = await PDFDocument.load(bytes);
  if (pdf.getPageCount() === 0) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "This PDF has no pages to compress.",
    );
  }
  if (removeMetadata) clearMetadata(pdf);
  throwIfAborted(signal);
  return pdf.save({
    useObjectStreams: true,
    addDefaultPage: false,
    objectsPerTick: 40,
  });
}

async function scanCompress(
  sourceBytes: Uint8Array,
  level: CompressionLevel,
  targetBytes: number | null,
  signal: AbortSignal | undefined,
  onProgress: PdfCompressionOptions["onProgress"],
) {
  const source = await pdfjs.getDocument({ data: sourceBytes.slice() }).promise;
  const baseProfile = LEVEL_CONFIG[level];
  const profiles = targetBytes
    ? [
        baseProfile,
        {
          scale: Math.max(0.8, baseProfile.scale * 0.8),
          quality: Math.max(0.55, baseProfile.quality - 0.14),
        },
        {
          scale: Math.max(0.65, baseProfile.scale * 0.62),
          quality: Math.max(0.42, baseProfile.quality - 0.28),
        },
        {
          scale: Math.max(0.5, baseProfile.scale * 0.48),
          quality: 0.34,
        },
      ]
    : [baseProfile];
  let smallest:
    | {
        readonly bytes: Uint8Array;
        readonly quality: number;
      }
    | undefined;

  try {
    for (let profileIndex = 0; profileIndex < profiles.length; profileIndex += 1) {
      const profile = profiles[profileIndex];
      const output = await PDFDocument.create();

      for (let pageNumber = 1; pageNumber <= source.numPages; pageNumber += 1) {
        throwIfAborted(signal);
        const page = await source.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1, rotation: 0 });
        const scale = getSafeRenderScale(
          baseViewport.width,
          baseViewport.height,
          profile.scale,
        );
        const viewport = page.getViewport({ scale, rotation: 0 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });

        if (!context) {
          throw new PdfEngineError(
            "PROCESSING_FAILED",
            "The browser could not allocate a page-rendering canvas.",
          );
        }

        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const renderTask = page.render({ canvasContext: context, viewport });
        const cancelRender = () => renderTask.cancel();
        signal?.addEventListener("abort", cancelRender, { once: true });

        try {
          await renderTask.promise;
          throwIfAborted(signal);
          const jpegBytes = await canvasToJpeg(canvas, profile.quality);
          const image = await output.embedJpg(jpegBytes);
          const outputPage = output.addPage([
            baseViewport.width,
            baseViewport.height,
          ]);
          outputPage.setRotation(degrees(page.rotate));
          outputPage.drawImage(image, {
            x: 0,
            y: 0,
            width: baseViewport.width,
            height: baseViewport.height,
          });
        } finally {
          signal?.removeEventListener("abort", cancelRender);
          page.cleanup();
          canvas.width = 0;
          canvas.height = 0;
        }

        const completedPages = profileIndex * source.numPages + pageNumber;
        const maximumPages = profiles.length * source.numPages;
        report(onProgress, {
          percent: Math.round((completedPages / maximumPages) * 92),
          message:
            profiles.length > 1
              ? `Target attempt ${profileIndex + 1} of ${profiles.length}: page ${pageNumber} of ${source.numPages}.`
              : `Compressed page ${pageNumber} of ${source.numPages}.`,
          pageNumber,
          pageCount: source.numPages,
        });
      }

      throwIfAborted(signal);
      const candidateBytes = await output.save({
        useObjectStreams: true,
        addDefaultPage: false,
        objectsPerTick: 30,
      });
      if (!smallest || candidateBytes.length < smallest.bytes.length) {
        smallest = {
          bytes: candidateBytes,
          quality: profile.quality,
        };
      }
      if (targetBytes && candidateBytes.length <= targetBytes) break;
    }

    if (!smallest) {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        "Scan compression produced no output.",
      );
    }

    report(onProgress, {
      percent: 96,
      message: "Finalizing scan-compressed PDF…",
    });
    return smallest;
  } finally {
    await source.destroy();
  }
}

export async function compressPdf(
  file: File,
  options: PdfCompressionOptions,
): Promise<PdfCompressionResult> {
  configurePdfJsWorker(pdfjs);
  const bytes = await readValidatedPdfBytes(file);
  throwIfAborted(options.signal);

  let analysis: CompressionAnalysis;
  if (options.mode === "auto") {
    report(options.onProgress, {
      percent: null,
      message: "Inspecting page text and image composition…",
    });
    const inspectionDocument = await pdfjs.getDocument({
      data: bytes.slice(),
    }).promise;
    try {
      analysis = await analyzePdfComposition(
        inspectionDocument,
        options.signal,
        options.onProgress,
      );
    } finally {
      await inspectionDocument.destroy();
    }
  } else {
    const pdf = await PDFDocument.load(bytes);
    analysis = {
      selectedMethod: options.mode,
      reason:
        options.mode === "structural"
          ? "Preserve Text was selected. Text, vectors, links, forms, page sizes, and rotations remain structural."
          : "Scan Compression was selected. Pages are rasterized and text, links, forms, and vectors are flattened.",
      pageCount: pdf.getPageCount(),
      textCharacters: 0,
      imageOperations: 0,
    };
  }

  const method = analysis.selectedMethod;
  const structural =
    method === "structural"
      ? await structurallyCompress(
          bytes,
          Boolean(options.removeMetadata),
          options.signal,
          options.onProgress,
        )
      : null;
  const scan =
    method === "scan"
      ? await scanCompress(
          bytes,
          options.level,
          options.targetBytes ?? null,
          options.signal,
          options.onProgress,
        )
      : null;
  const outputBytes = structural ?? scan?.bytes;
  if (!outputBytes) {
    throw new PdfEngineError("PROCESSING_FAILED", "Compression produced no output.");
  }

  const outputLarger = outputBytes.length >= bytes.length;
  const finalBytes = outputLarger ? bytes : outputBytes;
  const blob = new Blob([finalBytes], { type: "application/pdf" });
  const targetBytes = options.targetBytes ?? null;

  report(options.onProgress, {
    percent: 100,
    message: outputLarger
      ? "The optimized output was not smaller, so the original PDF was preserved."
      : "Compression complete.",
  });

  return {
    blob,
    originalSize: bytes.length,
    compressedSize: blob.size,
    qualityUsed: method === "scan" ? scan?.quality ?? 1 : 1,
    targetMet: targetBytes === null || blob.size <= targetBytes,
    method,
    analysis,
    usedOriginal: outputLarger,
  };
}
