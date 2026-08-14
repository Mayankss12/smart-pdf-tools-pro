import type { ExistingTextEditSource } from "./existing-text-edit";
import {
  findNormalizedSubstringRanges,
  getPdfSubstringBox,
  type FindGeometryBox,
} from "./editor-find-geometry";

export type EditorFindReplaceSource = "pdf" | "ocr" | "editor";

export type EditorFindReplaceMatch = {
  readonly id: string;
  readonly pageNumber: number;
  readonly source: EditorFindReplaceSource;
  readonly box: FindGeometryBox;
  readonly matchedText: string;
  readonly matchStart: number;
  readonly matchLength: number;
  readonly editorObjectId?: string;
};

export type FindReplaceEditorObject = {
  readonly id: string;
  readonly type: string;
  readonly pageNumber: number;
  readonly box: FindGeometryBox;
  readonly locked?: boolean;
  readonly data: {
    readonly text?: string;
    readonly textRuns?: readonly unknown[];
    readonly fontSize?: number;
    readonly fontWeight?: "normal" | "bold";
    readonly fontStyle?: "normal" | "italic";
    readonly textDecoration?: "none" | "underline";
    readonly color?: string;
    readonly sourceTextEdit?: ExistingTextEditSource;
    readonly [key: string]: unknown;
  };
};

export type FindReplacementObject = FindReplaceEditorObject & {
  readonly type: "text";
  readonly data: FindReplaceEditorObject["data"] & {
    readonly text: string;
    readonly sourceTextEdit: ExistingTextEditSource;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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
    Math.max(0, left.width) * Math.max(0, left.height),
    Math.max(0, right.width) * Math.max(0, right.height),
  );

  return smallerArea > 0 ? overlapArea / smallerArea : 0;
}

export function getFindReplacementSourceId(match: EditorFindReplaceMatch) {
  return `find:${match.source}:${match.id}`;
}

export function isReplaceableFindMatch(match: EditorFindReplaceMatch) {
  return match.source === "pdf" || match.source === "editor";
}

export function isFindMatchCoveredByExistingTextEdit(
  match: EditorFindReplaceMatch,
  objects: readonly FindReplaceEditorObject[],
) {
  if (match.source === "editor") return false;

  return objects.some((object) => {
    if (object.pageNumber !== match.pageNumber) return false;
    const source = object.data.sourceTextEdit;
    return source ? overlapRatio(match.box, source.coverBox) >= 0.55 : false;
  });
}

export function replaceTextRanges(
  text: string,
  ranges: readonly { readonly start: number; readonly length: number }[],
  replacement: string,
) {
  let nextText = text;
  const sorted = [...ranges].sort((left, right) => right.start - left.start);

  for (const range of sorted) {
    const start = clamp(Math.round(range.start), 0, nextText.length);
    const length = clamp(Math.round(range.length), 0, nextText.length - start);
    nextText = `${nextText.slice(0, start)}${replacement}${nextText.slice(
      start + length,
    )}`;
  }

  return nextText;
}

export function findEditorObjectTextMatches(
  objects: readonly FindReplaceEditorObject[],
  query: string,
): EditorFindReplaceMatch[] {
  const needle = query.trim();
  if (!needle) return [];

  const results: EditorFindReplaceMatch[] = [];

  for (const object of objects) {
    if (object.locked) continue;
    const text = object.data.text ?? "";
    if (!text) continue;

    const ranges = findNormalizedSubstringRanges(text, needle);

    ranges.forEach((range, occurrenceIndex) => {
      results.push({
        id: `editor-${object.id}-${occurrenceIndex}`,
        pageNumber: object.pageNumber,
        source: "editor",
        box: getPdfSubstringBox({
          text,
          start: range.start,
          length: range.length,
          x: object.box.x,
          y: object.box.y,
          width: object.box.width,
          height: object.box.height,
          direction: "ltr",
        }),
        matchedText: text.slice(range.start, range.start + range.length),
        matchStart: range.start,
        matchLength: range.length,
        editorObjectId: object.id,
      });
    });
  }

  return results;
}

function createReplacementId(match: EditorFindReplaceMatch) {
  return `find-replace-${match.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function createVisualFindReplacementObject(
  match: EditorFindReplaceMatch,
  replacement: string,
): FindReplacementObject {
  if (match.source !== "pdf") {
    throw new Error("Only native PDF matches can create visual replacement objects.");
  }

  const fontSize = clamp(match.box.height * 0.82, 8, 72);
  const sourceBox = {
    x: Math.max(0, match.box.x),
    y: Math.max(0, match.box.y),
    width: Math.max(10, match.box.width + 4),
    height: Math.max(8, match.box.height + 2),
  };
  const sourceTextEdit: ExistingTextEditSource = {
    sourceItemId: getFindReplacementSourceId(match),
    originalText: match.matchedText,
    fontName: null,
    fontSize,
    baselineOffset: Math.max(1, match.box.height),
    sourceBox,
    coverBox: {
      x: Math.max(0, match.box.x - 0.75),
      y: Math.max(0, match.box.y - 0.75),
      width: Math.max(1, match.box.width + 1.5),
      height: Math.max(1, match.box.height + 1.5),
    },
  };

  return {
    id: createReplacementId(match),
    type: "text",
    pageNumber: match.pageNumber,
    box: sourceBox,
    data: {
      text: replacement,
      textRuns: undefined,
      fontSize,
      fontWeight: "normal",
      fontStyle: "normal",
      textDecoration: "none",
      color: "#111827",
      sourceTextEdit,
    },
  };
}

export function applyFindReplaceBatch({
  objects,
  matches,
  replacement,
}: {
  readonly objects: readonly FindReplaceEditorObject[];
  readonly matches: readonly EditorFindReplaceMatch[];
  readonly replacement: string;
}) {
  const eligible = matches.filter(isReplaceableFindMatch);
  const editorMatches = new Map<string, EditorFindReplaceMatch[]>();
  const pdfMatches: EditorFindReplaceMatch[] = [];

  for (const match of eligible) {
    if (match.source === "editor" && match.editorObjectId) {
      const group = editorMatches.get(match.editorObjectId) ?? [];
      group.push(match);
      editorMatches.set(match.editorObjectId, group);
    } else if (match.source === "pdf") {
      pdfMatches.push(match);
    }
  }

  const nextObjects = objects.map((object) => {
    const groupedMatches = editorMatches.get(object.id);
    if (!groupedMatches?.length) return object;

    const text = object.data.text ?? "";
    const nextText = replaceTextRanges(
      text,
      groupedMatches.map((match) => ({
        start: match.matchStart,
        length: match.matchLength,
      })),
      replacement,
    );

    return {
      ...object,
      data: {
        ...object.data,
        text: nextText,
        textRuns: undefined,
      },
    };
  });

  const existingIds = new Set(nextObjects.map((object) => object.id));
  const appended: FindReplacementObject[] = [];

  for (const match of pdfMatches) {
    const replacementObject = createVisualFindReplacementObject(match, replacement);
    if (existingIds.has(replacementObject.id)) continue;
    existingIds.add(replacementObject.id);
    appended.push(replacementObject);
  }

  const selectedObjectId =
    appended[0]?.id ??
    [...editorMatches.keys()].find((id) => nextObjects.some((object) => object.id === id)) ??
    null;

  return {
    objects: [...nextObjects, ...appended],
    replacedCount:
      pdfMatches.length +
      [...editorMatches.values()].reduce((count, group) => count + group.length, 0),
    selectedObjectId,
  };
}
