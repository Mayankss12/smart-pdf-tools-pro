import {
  PDFArray,
  PDFDict,
  PDFName,
  PDFNumber,
  PDFRawStream,
  PDFRef,
  decodePDFRawStream,
  type PDFDocument,
  type PDFObject,
} from "pdf-lib";

// Resamples oversized photos inside a PDF without touching text, vectors,
// links or forms. Each image is replaced in place, so every page that uses it
// keeps pointing at the same object.

export type ImageDownsampleProfile = {
  // Images are reduced only when they carry more pixels than this many dots
  // per inch across the largest page that shows them.
  readonly maxDpi: number;
  readonly jpegQuality: number;
};

export type DecodedImageSource =
  | { readonly kind: "jpeg"; readonly bytes: Uint8Array }
  | {
      readonly kind: "pixels";
      readonly rgba: Uint8ClampedArray;
      readonly width: number;
      readonly height: number;
    };

// Decodes, resizes and JPEG-encodes one image. The browser implementation
// lives in createBrowserImageCodec; tests can pass their own.
export type ImageResampleCodec = (
  source: DecodedImageSource,
  targetWidth: number,
  targetHeight: number,
  quality: number,
) => Promise<Uint8Array>;

export type ImageDownsampleResult = {
  readonly inspectedImages: number;
  readonly resampledImages: number;
  readonly savedBytes: number;
};

const POINTS_PER_INCH = 72;
const MIN_SCALE_GAIN = 0.9;
const MIN_BYTE_GAIN = 0.95;
const MIN_IMAGE_SIDE = 16;
const MAX_FORM_DEPTH = 8;

function name(value: string) {
  return PDFName.of(value);
}

function getFilters(dict: PDFDict) {
  const filter = dict.lookup(name("Filter"));
  // PDFName.asString() includes the leading "/"; strip it so comparisons
  // like filter !== "DCTDecode" work correctly.
  const strip = (n: PDFName) => n.asString().replace(/^\//, "");
  if (filter instanceof PDFName) return [strip(filter)];
  if (filter instanceof PDFArray) {
    return filter.asArray().map((entry) =>
      entry instanceof PDFName ? strip(entry) : "",
    );
  }
  return [];
}

// Only grey and RGB images can round-trip through a canvas; CMYK, indexed and
// separation colour spaces are left alone.
function getComponentCount(colorSpace: PDFObject | undefined) {
  if (colorSpace === name("DeviceRGB")) return 3;
  if (colorSpace === name("DeviceGray")) return 1;

  if (colorSpace instanceof PDFArray && colorSpace.lookup(0) === name("ICCBased")) {
    const profile = colorSpace.lookup(1);
    const components = profile instanceof PDFRawStream
      ? profile.dict.lookup(name("N"))
      : undefined;
    const count = components instanceof PDFNumber ? components.asNumber() : 0;
    return count === 1 || count === 3 ? count : null;
  }

  return null;
}

type ImageCandidate = {
  readonly ref: PDFRef;
  readonly stream: PDFRawStream;
  readonly width: number;
  readonly height: number;
  readonly components: 1 | 3;
  readonly filter: "DCTDecode" | "FlateDecode";
  // Longest side, in points, of the largest page that shows this image.
  maxPageSidePoints: number;
};

function inspectImage(ref: PDFRef, stream: PDFRawStream): ImageCandidate | null {
  const dict = stream.dict;
  const width = dict.lookup(name("Width"));
  const height = dict.lookup(name("Height"));
  const bits = dict.lookup(name("BitsPerComponent"));

  if (!(width instanceof PDFNumber) || !(height instanceof PDFNumber)) return null;
  if (!(bits instanceof PDFNumber) || bits.asNumber() !== 8) return null;
  if (dict.lookup(name("ImageMask"))) return null;
  // Decode arrays and colour-key masks work on exact sample values, which a
  // lossy re-encode would break.
  if (dict.lookup(name("Decode")) || dict.lookup(name("Mask")) instanceof PDFArray) {
    return null;
  }

  const filters = getFilters(dict);
  if (filters.length !== 1) return null;
  const [filter] = filters;
  if (filter !== "DCTDecode" && filter !== "FlateDecode") return null;

  const components = getComponentCount(dict.lookup(name("ColorSpace")));
  if (components !== 1 && components !== 3) return null;

  if (filter === "FlateDecode") {
    const parms = dict.lookup(name("DecodeParms"));
    if (parms instanceof PDFDict) {
      const predictor = parms.lookup(name("Predictor"));
      const value = predictor instanceof PDFNumber ? predictor.asNumber() : 1;
      if (value !== 1 && value < 10) return null;
    } else if (parms) {
      return null;
    }
  }

  if (width.asNumber() < MIN_IMAGE_SIDE || height.asNumber() < MIN_IMAGE_SIDE) return null;

  return {
    ref,
    stream,
    width: width.asNumber(),
    height: height.asNumber(),
    components,
    filter,
    maxPageSidePoints: 0,
  };
}

function collectPageImages(
  document: PDFDocument,
  resources: PDFDict | undefined,
  pageSidePoints: number,
  candidates: Map<string, ImageCandidate | null>,
  visitedForms: Set<string>,
  depth: number,
) {
  const xObjects = resources?.lookupMaybe(name("XObject"), PDFDict);
  if (!xObjects || depth > MAX_FORM_DEPTH) return;

  for (const [, value] of xObjects.entries()) {
    if (!(value instanceof PDFRef)) continue;
    const key = value.toString();
    const object = document.context.lookup(value);
    if (!(object instanceof PDFRawStream)) continue;

    const subtype = object.dict.lookup(name("Subtype"));
    if (subtype === name("Image")) {
      if (!candidates.has(key)) candidates.set(key, inspectImage(value, object));
      const candidate = candidates.get(key);
      if (candidate) {
        candidate.maxPageSidePoints = Math.max(candidate.maxPageSidePoints, pageSidePoints);
      }
    } else if (subtype === name("Form") && !visitedForms.has(key)) {
      visitedForms.add(key);
      collectPageImages(
        document,
        object.dict.lookupMaybe(name("Resources"), PDFDict),
        pageSidePoints,
        candidates,
        visitedForms,
        depth + 1,
      );
    }
  }
}

function paethPredictor(left: number, up: number, upLeft: number) {
  const estimate = left + up - upLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceUp = Math.abs(estimate - up);
  const distanceUpLeft = Math.abs(estimate - upLeft);
  if (distanceLeft <= distanceUp && distanceLeft <= distanceUpLeft) return left;
  return distanceUp <= distanceUpLeft ? up : upLeft;
}

// Reverses PNG row filters (PDF /Predictor 10–15) on 8-bit samples.
export function removePngPredictor(
  data: Uint8Array,
  width: number,
  height: number,
  components: number,
) {
  const rowLength = width * components;
  const output = new Uint8Array(rowLength * height);

  if (data.length < (rowLength + 1) * height) {
    throw new Error("Predicted image data is shorter than its dimensions.");
  }

  for (let row = 0; row < height; row += 1) {
    const filter = data[row * (rowLength + 1)];
    const input = row * (rowLength + 1) + 1;
    const current = row * rowLength;
    const previous = current - rowLength;

    for (let column = 0; column < rowLength; column += 1) {
      const raw = data[input + column];
      const left = column >= components ? output[current + column - components] : 0;
      const up = row > 0 ? output[previous + column] : 0;
      const upLeft = row > 0 && column >= components
        ? output[previous + column - components]
        : 0;

      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + ((left + up) >> 1);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      output[current + column] = value & 0xff;
    }
  }

  return output;
}

function toRgba(samples: Uint8Array, width: number, height: number, components: 1 | 3) {
  const pixelCount = width * height;
  if (samples.length < pixelCount * components) {
    throw new Error("Image data is shorter than its dimensions.");
  }

  const rgba = new Uint8ClampedArray(pixelCount * 4);
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const source = pixel * components;
    const target = pixel * 4;
    rgba[target] = samples[source];
    rgba[target + 1] = samples[source + (components === 3 ? 1 : 0)];
    rgba[target + 2] = samples[source + (components === 3 ? 2 : 0)];
    rgba[target + 3] = 255;
  }
  return rgba;
}

function decodeCandidate(candidate: ImageCandidate): DecodedImageSource {
  if (candidate.filter === "DCTDecode") {
    return { kind: "jpeg", bytes: candidate.stream.getContents() };
  }

  let samples = decodePDFRawStream(candidate.stream).decode();
  const parms = candidate.stream.dict.lookupMaybe(name("DecodeParms"), PDFDict);
  const predictor = parms?.lookup(name("Predictor"));
  if (predictor instanceof PDFNumber && predictor.asNumber() >= 10) {
    samples = removePngPredictor(
      samples,
      candidate.width,
      candidate.height,
      candidate.components,
    );
  }

  return {
    kind: "pixels",
    rgba: toRgba(samples, candidate.width, candidate.height, candidate.components),
    width: candidate.width,
    height: candidate.height,
  };
}

function getTargetScale(candidate: ImageCandidate, profile: ImageDownsampleProfile) {
  const maxPixels = (candidate.maxPageSidePoints / POINTS_PER_INCH) * profile.maxDpi;
  return Math.min(1, maxPixels / candidate.width, maxPixels / candidate.height);
}

export async function downsamplePdfImages(
  document: PDFDocument,
  profile: ImageDownsampleProfile,
  codec: ImageResampleCodec,
  options: {
    readonly signal?: AbortSignal;
    readonly onImage?: (completed: number, total: number) => void;
  } = {},
): Promise<ImageDownsampleResult> {
  const candidates = new Map<string, ImageCandidate | null>();
  const visitedForms = new Set<string>();

  for (const page of document.getPages()) {
    const { width, height } = page.getSize();
    collectPageImages(
      document,
      page.node.Resources(),
      Math.max(width, height),
      candidates,
      visitedForms,
      0,
    );
  }

  const queue = [...candidates.values()].filter(
    (candidate): candidate is ImageCandidate =>
      candidate !== null && getTargetScale(candidate, profile) < MIN_SCALE_GAIN,
  );
  let resampledImages = 0;
  let savedBytes = 0;

  for (let index = 0; index < queue.length; index += 1) {
    if (options.signal?.aborted) {
      throw new DOMException("Compression cancelled.", "AbortError");
    }

    const candidate = queue[index];
    const scale = getTargetScale(candidate, profile);
    const targetWidth = Math.max(1, Math.round(candidate.width * scale));
    const targetHeight = Math.max(1, Math.round(candidate.height * scale));
    const originalLength = candidate.stream.getContentsSize();

    try {
      const jpeg = await codec(
        decodeCandidate(candidate),
        targetWidth,
        targetHeight,
        profile.jpegQuality,
      );

      if (jpeg.length < originalLength * MIN_BYTE_GAIN) {
        const dict = candidate.stream.dict;
        // Canvas JPEGs are always 3-channel, so grey images become RGB.
        const colorSpace = candidate.components === 3
          ? dict.get(name("ColorSpace"))
          : name("DeviceRGB");
        const entries: Record<string, PDFObject | number | string> = {
          Type: "XObject",
          Subtype: "Image",
          Width: targetWidth,
          Height: targetHeight,
          BitsPerComponent: 8,
          Filter: "DCTDecode",
        };
        if (colorSpace) entries.ColorSpace = colorSpace;
        for (const key of ["SMask", "Intent", "Interpolate", "OC", "Metadata"]) {
          const value = dict.get(name(key));
          if (value) entries[key] = value;
        }

        document.context.assign(
          candidate.ref,
          document.context.stream(jpeg, entries),
        );
        resampledImages += 1;
        savedBytes += originalLength - jpeg.length;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
      // An image the browser cannot decode is kept exactly as it was.
    }

    options.onImage?.(index + 1, queue.length);
  }

  return {
    inspectedImages: [...candidates.values()].filter(Boolean).length,
    resampledImages,
    savedBytes,
  };
}

async function encodeCanvasJpeg(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
) {
  const blob = "convertToBlob" in canvas
    ? await canvas.convertToBlob({ type: "image/jpeg", quality })
    : await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
  if (!blob) throw new Error("The browser could not encode a resampled image.");
  return new Uint8Array(await blob.arrayBuffer());
}

function createCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas === "function") return new OffscreenCanvas(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createBrowserImageCodec(): ImageResampleCodec {
  return async (source, targetWidth, targetHeight, quality) => {
    const bitmap = source.kind === "jpeg"
      ? await createImageBitmap(new Blob([source.bytes.slice()], { type: "image/jpeg" }))
      : await createImageBitmap(new ImageData(source.rgba, source.width, source.height));

    try {
      // Halve in steps first; one large drawImage jump aliases fine detail.
      let current: ImageBitmap | OffscreenCanvas | HTMLCanvasElement = bitmap;
      let width = bitmap.width;
      let height = bitmap.height;

      while (width / 2 >= targetWidth && height / 2 >= targetHeight) {
        width = Math.round(width / 2);
        height = Math.round(height / 2);
        const step = createCanvas(width, height);
        const context = step.getContext("2d") as CanvasRenderingContext2D | null;
        if (!context) throw new Error("Unable to allocate an image canvas.");
        context.imageSmoothingQuality = "high";
        context.drawImage(current, 0, 0, width, height);
        current = step;
      }

      const output = createCanvas(targetWidth, targetHeight);
      const context = output.getContext("2d") as CanvasRenderingContext2D | null;
      if (!context) throw new Error("Unable to allocate an image canvas.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, targetWidth, targetHeight);
      context.imageSmoothingQuality = "high";
      context.drawImage(current, 0, 0, targetWidth, targetHeight);

      return await encodeCanvasJpeg(output, quality);
    } finally {
      bitmap.close();
    }
  };
}
