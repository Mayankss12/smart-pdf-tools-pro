import {
  StandardFonts,
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import {
  PdfEngineError,
  createPdfFileName,
  loadPdfDocument,
  savePdfResult,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";
import {
  getEditorPageGeometry,
  withEditorPageTransform,
} from "@/lib/pdf-tools/editor-page-geometry";

export type WatermarkMode = "text" | "image" | "both";
export type WatermarkLayout = "single" | "tile";
export type WatermarkFontStyle =
  | "regular"
  | "bold"
  | "italic"
  | "boldItalic";

export type WatermarkExportOptions = {
  readonly mode: WatermarkMode;
  readonly layout: WatermarkLayout;
  readonly targetPages: readonly number[];
  readonly text: string;
  readonly fontSize: number;
  readonly opacity: number;
  readonly angle: number;
  readonly fontStyle: WatermarkFontStyle;
  readonly color: readonly [number, number, number];
  readonly position: {
    readonly xPercent: number;
    readonly yPercent: number;
  };
  readonly tileGap: number;
  readonly imageFile: File | null;
  readonly imageScale: number;
};

const FONT_MAP: Record<WatermarkFontStyle, StandardFonts> = {
  regular: StandardFonts.Helvetica,
  bold: StandardFonts.HelveticaBold,
  italic: StandardFonts.HelveticaOblique,
  boldItalic: StandardFonts.HelveticaBoldOblique,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTileCenters(width: number, height: number, gap: number) {
  const safeGap = clamp(gap, 120, 420);
  const centers: Array<{ x: number; y: number }> = [];

  for (let y = -height * 0.1; y <= height * 1.1; y += safeGap) {
    for (let x = -width * 0.1; x <= width * 1.1; x += safeGap) {
      centers.push({ x, y });
    }
  }

  return centers;
}

function getSafeCenter({
  x,
  y,
  objectWidth,
  objectHeight,
  surfaceWidth,
  surfaceHeight,
  angle,
}: {
  readonly x: number;
  readonly y: number;
  readonly objectWidth: number;
  readonly objectHeight: number;
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly angle: number;
}) {
  const radians = (angle * Math.PI) / 180;
  const halfWidth = objectWidth / 2;
  const halfHeight = objectHeight / 2;
  const extentX =
    Math.abs(Math.cos(radians)) * halfWidth +
    Math.abs(Math.sin(radians)) * halfHeight;
  const extentY =
    Math.abs(Math.sin(radians)) * halfWidth +
    Math.abs(Math.cos(radians)) * halfHeight;
  const margin = 10;
  const minimumX = margin + extentX;
  const maximumX = surfaceWidth - margin - extentX;
  const minimumY = margin + extentY;
  const maximumY = surfaceHeight - margin - extentY;

  return {
    x:
      minimumX <= maximumX
        ? clamp(x, minimumX, maximumX)
        : surfaceWidth / 2,
    y:
      minimumY <= maximumY
        ? clamp(y, minimumY, maximumY)
        : surfaceHeight / 2,
  };
}

function withCenterRotation(
  page: PDFPage,
  x: number,
  y: number,
  angle: number,
  draw: () => void,
) {
  const radians = (angle * Math.PI) / 180;
  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(
      Math.cos(radians),
      Math.sin(radians),
      -Math.sin(radians),
      Math.cos(radians),
      x,
      y,
    ),
  );
  try {
    draw();
  } finally {
    page.pushOperators(popGraphicsState());
  }
}

function drawWatermarkText({
  page,
  font,
  text,
  fontSize,
  opacity,
  angle,
  color,
  center,
  surfaceWidth,
  surfaceHeight,
  clipSafe,
}: {
  readonly page: PDFPage;
  readonly font: PDFFont;
  readonly text: string;
  readonly fontSize: number;
  readonly opacity: number;
  readonly angle: number;
  readonly color: readonly [number, number, number];
  readonly center: { readonly x: number; readonly y: number };
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly clipSafe: boolean;
}) {
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const safeCenter = clipSafe
    ? getSafeCenter({
        ...center,
        objectWidth: textWidth,
        objectHeight: fontSize,
        surfaceWidth,
        surfaceHeight,
        angle,
      })
    : center;

  withCenterRotation(page, safeCenter.x, safeCenter.y, angle, () => {
    page.drawText(text, {
      x: -textWidth / 2,
      y: -fontSize / 2,
      size: fontSize,
      font,
      color: rgb(color[0], color[1], color[2]),
      opacity,
    });
  });
}

function getImageSize(
  image: PDFImage,
  imageScale: number,
  surfaceWidth: number,
  surfaceHeight: number,
) {
  const requestedWidth = clamp(
    surfaceWidth * (imageScale / 100),
    Math.min(60, surfaceWidth),
    surfaceWidth * 0.92,
  );
  const requestedHeight = requestedWidth * (image.height / image.width);
  const fitScale = Math.min(
    1,
    (surfaceHeight * 0.92) / Math.max(1, requestedHeight),
  );

  return {
    width: requestedWidth * fitScale,
    height: requestedHeight * fitScale,
  };
}

function drawWatermarkImage({
  page,
  image,
  imageScale,
  opacity,
  angle,
  center,
  surfaceWidth,
  surfaceHeight,
  clipSafe,
}: {
  readonly page: PDFPage;
  readonly image: PDFImage;
  readonly imageScale: number;
  readonly opacity: number;
  readonly angle: number;
  readonly center: { readonly x: number; readonly y: number };
  readonly surfaceWidth: number;
  readonly surfaceHeight: number;
  readonly clipSafe: boolean;
}) {
  const imageSize = getImageSize(
    image,
    imageScale,
    surfaceWidth,
    surfaceHeight,
  );
  const safeCenter = clipSafe
    ? getSafeCenter({
        ...center,
        objectWidth: imageSize.width,
        objectHeight: imageSize.height,
        surfaceWidth,
        surfaceHeight,
        angle,
      })
    : center;

  withCenterRotation(page, safeCenter.x, safeCenter.y, angle, () => {
    page.drawImage(image, {
      x: -imageSize.width / 2,
      y: -imageSize.height / 2,
      width: imageSize.width,
      height: imageSize.height,
      opacity,
    });
  });
}

export async function applyWatermark(
  file: File,
  options: WatermarkExportOptions,
): Promise<PdfProcessingResult> {
  const text = options.text.trim();
  const needsText = options.mode === "text" || options.mode === "both";
  const needsImage = options.mode === "image" || options.mode === "both";

  if (needsText && !text) {
    throw new PdfEngineError("PROCESSING_FAILED", "Enter watermark text first.");
  }
  if (needsImage && !options.imageFile) {
    throw new PdfEngineError(
      "PROCESSING_FAILED",
      "Upload a PNG or JPG watermark image first.",
    );
  }
  if (!options.targetPages.length) {
    throw new PdfEngineError(
      "INVALID_PAGE_RANGE",
      "Select at least one target page.",
    );
  }

  const pdf = await loadPdfDocument(file);
  const pages = pdf.getPages();
  const invalidTarget = options.targetPages.find(
    (pageNumber) =>
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      pageNumber > pages.length,
  );
  if (invalidTarget !== undefined) {
    throw new PdfEngineError(
      "INVALID_PAGE_RANGE",
      `Page ${invalidTarget} is outside this PDF's page range.`,
    );
  }

  const targetPageSet = new Set(options.targetPages);
  const opacity = clamp(options.opacity, 0, 1);
  const angle = clamp(options.angle, -180, 180);
  const fontSize = clamp(options.fontSize, 8, 220);
  const xPercent = clamp(options.position.xPercent, 4, 96);
  const yPercent = clamp(options.position.yPercent, 4, 96);
  const font = needsText
    ? await pdf.embedFont(FONT_MAP[options.fontStyle])
    : null;
  let embeddedImage: PDFImage | null = null;

  if (needsImage && options.imageFile) {
    const imageBytes = await options.imageFile.arrayBuffer();
    const lowerName = options.imageFile.name.toLowerCase();
    const isPng =
      options.imageFile.type === "image/png" || lowerName.endsWith(".png");
    embeddedImage = isPng
      ? await pdf.embedPng(imageBytes)
      : await pdf.embedJpg(imageBytes);
  }

  for (let index = 0; index < pages.length; index += 1) {
    if (!targetPageSet.has(index + 1)) continue;

    const page = pages[index];
    const geometry = getEditorPageGeometry(page);
    const centers =
      options.layout === "tile"
        ? getTileCenters(
            geometry.viewportWidth,
            geometry.viewportHeight,
            options.tileGap,
          )
        : [
            {
              x: (xPercent / 100) * geometry.viewportWidth,
              y:
                geometry.viewportHeight -
                (yPercent / 100) * geometry.viewportHeight,
            },
          ];

    await withEditorPageTransform(page, geometry, () => {
      for (const center of centers) {
        if (needsText && font) {
          drawWatermarkText({
            page,
            font,
            text,
            fontSize,
            opacity,
            angle,
            color: options.color,
            center,
            surfaceWidth: geometry.viewportWidth,
            surfaceHeight: geometry.viewportHeight,
            clipSafe: options.layout === "single",
          });
        }
        if (needsImage && embeddedImage) {
          drawWatermarkImage({
            page,
            image: embeddedImage,
            imageScale: options.imageScale,
            opacity,
            angle,
            center,
            surfaceWidth: geometry.viewportWidth,
            surfaceHeight: geometry.viewportHeight,
            clipSafe: options.layout === "single",
          });
        }
      }
    });
  }

  return savePdfResult(
    pdf,
    file.size,
    createPdfFileName("watermarked", file.name),
  );
}
