import {
  concatTransformationMatrix,
  popGraphicsState,
  pushGraphicsState,
  type PDFPage,
} from "pdf-lib";

export type EditorPageRotation = 0 | 90 | 180 | 270;

export type EditorPageGeometry = {
  readonly rotation: EditorPageRotation;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly pdfWidth: number;
  readonly pdfHeight: number;
  readonly pdfOriginX: number;
  readonly pdfOriginY: number;
};

type TransformationMatrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];

function normalizeRotation(angle: number): EditorPageRotation {
  const normalized = ((Math.round(angle) % 360) + 360) % 360;

  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }

  return 0;
}

export function getEditorPageGeometry(page: PDFPage): EditorPageGeometry {
  const cropBox = page.getCropBox();
  const rotation = normalizeRotation(page.getRotation().angle);
  const swapsAxes = rotation === 90 || rotation === 270;

  return {
    rotation,
    viewportWidth: swapsAxes ? cropBox.height : cropBox.width,
    viewportHeight: swapsAxes ? cropBox.width : cropBox.height,
    pdfWidth: cropBox.width,
    pdfHeight: cropBox.height,
    pdfOriginX: cropBox.x,
    pdfOriginY: cropBox.y,
  };
}

function getViewportToPdfMatrix(geometry: EditorPageGeometry): TransformationMatrix {
  const {
    rotation,
    pdfWidth,
    pdfHeight,
    pdfOriginX,
    pdfOriginY,
  } = geometry;

  if (rotation === 90) {
    return [0, 1, -1, 0, pdfOriginX + pdfWidth, pdfOriginY];
  }

  if (rotation === 180) {
    return [-1, 0, 0, -1, pdfOriginX + pdfWidth, pdfOriginY + pdfHeight];
  }

  if (rotation === 270) {
    return [0, -1, 1, 0, pdfOriginX, pdfOriginY + pdfHeight];
  }

  return [1, 0, 0, 1, pdfOriginX, pdfOriginY];
}

export async function withEditorPageTransform(
  page: PDFPage,
  geometry: EditorPageGeometry,
  draw: () => void | Promise<void>,
) {
  const matrix = getViewportToPdfMatrix(geometry);

  page.pushOperators(
    pushGraphicsState(),
    concatTransformationMatrix(...matrix),
  );

  try {
    await draw();
  } finally {
    page.pushOperators(popGraphicsState());
  }
}
