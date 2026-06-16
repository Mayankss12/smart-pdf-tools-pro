import * as pdfjsLib from "pdfjs-dist";

export type DetectedImage = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function multiply(a: number[], b: number[]) {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function applyMatrix(m: number[], x: number, y: number) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

// Returns image rectangles in UNSCALED page units (scale = 1), matching the
// editor's object box coordinate system.
export async function detectPageImages(page: any): Promise<DetectedImage[]> {
  const OPS = (pdfjsLib as any).OPS;

  if (!OPS) return [];

  const viewport = page.getViewport({ scale: 1 });
  const opList = await page.getOperatorList();

  const images: DetectedImage[] = [];
  const stack: number[][] = [];
  let ctm = [1, 0, 0, 1, 0, 0];

  const IMAGE_OPS = new Set<number>(
    [
      OPS.paintImageXObject,
      OPS.paintJpegXObject,
      OPS.paintImageMaskXObject,
      OPS.paintInlineImageXObject,
    ].filter((value) => typeof value === "number"),
  );

  for (let index = 0; index < opList.fnArray.length; index += 1) {
    const fn = opList.fnArray[index];
    const args = opList.argsArray[index];

    if (fn === OPS.save) {
      stack.push(ctm.slice());
    } else if (fn === OPS.restore) {
      ctm = stack.pop() || ctm;
    } else if (fn === OPS.transform) {
      ctm = multiply(ctm, args as number[]);
    } else if (IMAGE_OPS.has(fn)) {
      const corners = [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ].map(([ux, uy]) => {
        const [px, py] = applyMatrix(ctm, ux, uy);
        return viewport.convertToViewportPoint(px, py);
      });

      const xs = corners.map((point) => point[0]);
      const ys = corners.map((point) => point[1]);

      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const width = maxX - minX;
      const height = maxY - minY;

      if (width > 6 && height > 6) {
        images.push({ x: minX, y: minY, width, height });
      }
    }
  }

  return images;
}
