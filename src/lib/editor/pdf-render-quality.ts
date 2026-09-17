export const EDITOR_MIN_OUTPUT_SCALE = 2;
export const EDITOR_MAX_OUTPUT_SCALE = 3;
export const EDITOR_MAIN_CANVAS_MAX_PIXELS = 32_000_000;
export const EDITOR_THUMBNAIL_MAX_PIXELS = 4_000_000;

type RenderScaleOptions = {
  readonly devicePixelRatio?: number;
  readonly minimumScale?: number;
  readonly maximumScale?: number;
  readonly maximumPixels?: number;
};

export function getEditorRenderOutputScale(
  viewportWidth: number,
  viewportHeight: number,
  options: RenderScaleOptions = {},
) {
  const width = Math.max(1, viewportWidth);
  const height = Math.max(1, viewportHeight);
  const minimumScale = Math.max(1, options.minimumScale ?? EDITOR_MIN_OUTPUT_SCALE);
  const maximumScale = Math.max(minimumScale, options.maximumScale ?? EDITOR_MAX_OUTPUT_SCALE);
  const deviceScale = Number.isFinite(options.devicePixelRatio)
    ? Math.max(1, options.devicePixelRatio ?? 1)
    : 1;
  const desiredScale = Math.min(maximumScale, Math.max(minimumScale, deviceScale));
  const maximumPixels = Math.max(width * height, options.maximumPixels ?? EDITOR_MAIN_CANVAS_MAX_PIXELS);
  const pixelSafeScale = Math.sqrt(maximumPixels / (width * height));

  return Math.max(1, Math.min(desiredScale, pixelSafeScale));
}

export function getPdfJsOutputTransform(outputScale: number) {
  return outputScale === 1
    ? undefined
    : [outputScale, 0, 0, outputScale, 0, 0];
}
