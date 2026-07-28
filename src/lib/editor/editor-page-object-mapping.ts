import type {
  EditorObject,
  EditorObjectData,
  EditorPoint,
} from "@/app/editor/hooks/useEditor";
import type { EditorPageRotationDirection } from "@/lib/pdf-tools/editor-page-management";

function rotatePoint(
  point: EditorPoint,
  width: number,
  height: number,
  direction: EditorPageRotationDirection,
): EditorPoint {
  if (direction === "clockwise") {
    return {
      x: height - point.y,
      y: point.x,
    };
  }

  return {
    x: point.y,
    y: width - point.x,
  };
}

function rotatePathData(
  pathData: string | undefined,
  width: number,
  height: number,
  direction: EditorPageRotationDirection,
) {
  if (!pathData) return pathData;

  const pieces = pathData.trim().split(/\s+/);
  const rotated: string[] = [];

  for (let index = 0; index < pieces.length - 2; index += 3) {
    const command = pieces[index];
    const x = Number(pieces[index + 1]);
    const y = Number(pieces[index + 2]);

    if (
      (command !== "M" && command !== "L") ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      continue;
    }

    const point = rotatePoint({ x, y }, width, height, direction);
    rotated.push(command, String(point.x), String(point.y));
  }

  return rotated.length ? rotated.join(" ") : pathData;
}

function rotateObjectData(
  data: EditorObjectData,
  width: number,
  height: number,
  direction: EditorPageRotationDirection,
): EditorObjectData {
  return {
    ...data,
    lineStart: data.lineStart
      ? rotatePoint(data.lineStart, width, height, direction)
      : undefined,
    lineEnd: data.lineEnd
      ? rotatePoint(data.lineEnd, width, height, direction)
      : undefined,
    pathData: rotatePathData(data.pathData, width, height, direction),
    drawWidth: data.pathData ? height : data.drawWidth,
    drawHeight: data.pathData ? width : data.drawHeight,
  };
}

export function remapObjectsAfterPageInsertion(
  objects: readonly EditorObject[],
  insertedPageNumber: number,
) {
  return objects.map((object) =>
    object.pageNumber >= insertedPageNumber
      ? { ...object, pageNumber: object.pageNumber + 1 }
      : object,
  );
}

export function remapObjectsAfterPageReorder(
  objects: readonly EditorObject[],
  pageOrder: readonly number[],
) {
  const nextPageByOldPage = new Map(
    pageOrder.map((oldPageNumber, index) => [oldPageNumber, index + 1]),
  );

  return objects.map((object) => ({
    ...object,
    pageNumber: nextPageByOldPage.get(object.pageNumber) ?? object.pageNumber,
  }));
}

export function remapObjectsAfterPageRotation({
  objects,
  pageNumber,
  oldViewportWidth,
  oldViewportHeight,
  direction,
}: {
  readonly objects: readonly EditorObject[];
  readonly pageNumber: number;
  readonly oldViewportWidth: number;
  readonly oldViewportHeight: number;
  readonly direction: EditorPageRotationDirection;
}) {
  return objects.map((object) => {
    if (object.pageNumber !== pageNumber) return object;

    const { x, y, width, height } = object.box;
    const nextBox =
      direction === "clockwise"
        ? {
            x: oldViewportHeight - y - height,
            y: x,
            width: height,
            height: width,
          }
        : {
            x: y,
            y: oldViewportWidth - x - width,
            width: height,
            height: width,
          };

    return {
      ...object,
      box: nextBox,
      data: rotateObjectData(object.data, width, height, direction),
    };
  });
}

export function remapPageResults<T extends { readonly pageNumber: number }>(
  items: readonly T[],
  pageOrder: readonly number[],
) {
  const nextPageByOldPage = new Map(
    pageOrder.map((oldPageNumber, index) => [oldPageNumber, index + 1]),
  );

  return items
    .map((item) => ({
      ...item,
      pageNumber: nextPageByOldPage.get(item.pageNumber) ?? item.pageNumber,
    }))
    .sort((left, right) => left.pageNumber - right.pageNumber);
}

export function shiftPageResultsAfterInsertion<
  T extends { readonly pageNumber: number },
>(items: readonly T[], insertedPageNumber: number) {
  return items.map((item) =>
    item.pageNumber >= insertedPageNumber
      ? { ...item, pageNumber: item.pageNumber + 1 }
      : item,
  );
}
