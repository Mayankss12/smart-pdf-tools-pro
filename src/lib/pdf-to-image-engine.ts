import { PdfEngineError } from "@/lib/pdf-errors";

export const MAX_PDF_IMAGE_CANVAS_PIXELS = 40_000_000;
export const HIGH_DPI_WARNING_PIXELS = 20_000_000;

export function getPdfRenderScale(dpi: number) {
  return Math.max(72, Math.min(450, dpi)) / 72;
}

export function getPdfRenderPixelArea(
  widthAt72Dpi: number,
  heightAt72Dpi: number,
  dpi: number,
) {
  const scale = getPdfRenderScale(dpi);
  return (
    Math.ceil(Math.max(1, widthAt72Dpi) * scale) *
    Math.ceil(Math.max(1, heightAt72Dpi) * scale)
  );
}

export function assertSafePdfRenderPixelArea(
  pageNumber: number,
  widthAt72Dpi: number,
  heightAt72Dpi: number,
  dpi: number,
) {
  const pixelArea = getPdfRenderPixelArea(widthAt72Dpi, heightAt72Dpi, dpi);
  if (pixelArea > MAX_PDF_IMAGE_CANVAS_PIXELS) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      `Page ${pageNumber} would require ${pixelArea.toLocaleString()} pixels at ${dpi} DPI. Choose a lower DPI to stay within the ${MAX_PDF_IMAGE_CANVAS_PIXELS.toLocaleString()} pixel browser limit.`,
    );
  }
  return pixelArea;
}

export function getSafePdfThumbnailScale(
  widthAt72Dpi: number,
  heightAt72Dpi: number,
  preferredScale = 0.36,
) {
  return Math.min(
    preferredScale,
    Math.sqrt(
      MAX_PDF_IMAGE_CANVAS_PIXELS /
        Math.max(1, widthAt72Dpi * heightAt72Dpi),
    ),
  );
}
