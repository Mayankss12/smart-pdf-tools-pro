export type FindGeometryBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export function findNormalizedSubstringRanges(text: string, query: string) {
  const directHaystack = text.toLocaleLowerCase();
  const directNeedle = query.toLocaleLowerCase();
  const normalizedHaystack = directHaystack.normalize("NFC");
  const normalizedNeedle = directNeedle.normalize("NFC");
  const canUseNormalizedOffsets =
    normalizedHaystack.length === directHaystack.length &&
    normalizedNeedle.length === directNeedle.length;
  const haystack = canUseNormalizedOffsets
    ? normalizedHaystack
    : directHaystack;
  const needle = canUseNormalizedOffsets ? normalizedNeedle : directNeedle;
  const ranges: { readonly start: number; readonly length: number }[] = [];
  let fromIndex = 0;

  while (needle && fromIndex < haystack.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index < 0) break;
    ranges.push({ start: index, length: needle.length });
    fromIndex = index + Math.max(1, needle.length);
  }
  return ranges;
}

export function getPdfSubstringBox({
  text,
  start,
  length,
  x,
  y,
  width,
  height,
  direction,
}: {
  readonly text: string;
  readonly start: number;
  readonly length: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly direction: "ltr" | "rtl";
}): FindGeometryBox {
  const safeLength = Math.max(1, text.length);
  const startRatio = Math.max(0, Math.min(1, start / safeLength));
  const endRatio = Math.max(
    startRatio,
    Math.min(1, (start + length) / safeLength),
  );
  const matchWidth = Math.max(2, width * (endRatio - startRatio));
  const matchX =
    direction === "rtl"
      ? x + width * (1 - endRatio)
      : x + width * startRatio;
  return { x: matchX, y, width: matchWidth, height };
}

function overlapRatio(left: FindGeometryBox, right: FindGeometryBox) {
  const overlapWidth = Math.max(
    0,
    Math.min(left.x + left.width, right.x + right.width) -
      Math.max(left.x, right.x),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(left.y + left.height, right.y + right.height) -
      Math.max(left.y, right.y),
  );
  const overlapArea = overlapWidth * overlapHeight;
  const smallerArea = Math.min(
    left.width * left.height,
    right.width * right.height,
  );
  return smallerArea > 0 ? overlapArea / smallerArea : 0;
}

export function deduplicateFindRegions<
  T extends {
    readonly pageNumber: number;
    readonly source: "pdf" | "ocr";
    readonly box: FindGeometryBox;
  },
>(results: readonly T[]) {
  const deduplicated: T[] = [];
  for (const result of results) {
    const duplicate = deduplicated.some(
      (existing) =>
        existing.pageNumber === result.pageNumber &&
        existing.source !== result.source &&
        overlapRatio(existing.box, result.box) >= 0.65,
    );
    if (!duplicate) deduplicated.push(result);
  }
  return deduplicated;
}
