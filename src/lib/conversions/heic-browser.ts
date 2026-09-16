import { getConversionById } from "@/lib/conversions/registry";
import { validateConversionFiles } from "@/lib/conversions/security";
import { PdfEngineError } from "@/lib/pdf-engine";

const JPEG_QUALITY = 0.94;
const MAX_DECODED_TOTAL_BYTES = 180 * 1024 * 1024;

export type HeicDecodeProgress = {
  readonly completed: number;
  readonly total: number;
  readonly fileName: string;
};

function jpegFileName(fileName: string) {
  const baseName = fileName.replace(/\.(heic|heif)$/i, "").trim() || "image";
  return `${baseName}.jpg`;
}

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("HEIC conversion cancelled.", "AbortError");
  }
}

/**
 * Decode sequentially so multiple full-resolution HEIC decoders are never
 * retained at once. The output flows through the existing image-to-PDF engine.
 */
export async function decodeHeicFilesForPdf(
  files: readonly File[],
  options: {
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: HeicDecodeProgress) => void;
  } = {},
) {
  const conversion = getConversionById("heic-to-pdf");
  if (!conversion) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "HEIC conversion configuration is unavailable.",
    );
  }

  await validateConversionFiles(conversion, files);
  throwIfAborted(options.signal);

  const { heicTo, isHeic } = await import("heic-to/csp");
  const decoded: File[] = [];
  let decodedBytes = 0;

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    throwIfAborted(options.signal);

    if (!(await isHeic(file))) {
      throw new PdfEngineError(
        "INVALID_FILE_TYPE",
        `${file.name} is not a recognized HEIC or HEIF image.`,
      );
    }

    let output: Blob;
    try {
      output = await heicTo({
        blob: file,
        type: "image/jpeg",
        quality: JPEG_QUALITY,
      });
    } catch {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        `${file.name} could not be decoded. It may use an unsupported HEIF codec or be damaged.`,
      );
    }

    throwIfAborted(options.signal);
    if (!output.size) {
      throw new PdfEngineError(
        "PROCESSING_FAILED",
        `${file.name} produced an empty decoded image.`,
      );
    }

    decodedBytes += output.size;
    if (decodedBytes > MAX_DECODED_TOTAL_BYTES) {
      throw new PdfEngineError(
        "FILE_TOO_LARGE",
        "Decoded images exceed the safe 180 MB batch limit. Convert fewer HEIC photos at once.",
      );
    }

    decoded.push(
      new File([output], jpegFileName(file.name), {
        type: "image/jpeg",
        lastModified: file.lastModified,
      }),
    );
    options.onProgress?.({
      completed: index + 1,
      total: files.length,
      fileName: file.name,
    });
  }

  return decoded;
}
