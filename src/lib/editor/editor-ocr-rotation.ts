import type { OcrResult, OcrWord } from "@/lib/pdf-ocr-engine";
import type { EditorPageRotationDirection } from "@/lib/pdf-tools/editor-page-management";

function rotateOcrWord(
  word: OcrWord,
  width: number,
  height: number,
  direction: EditorPageRotationDirection,
): OcrWord {
  const { x0, y0, x1, y1 } = word.bbox;
  return {
    ...word,
    bbox:
      direction === "clockwise"
        ? {
            x0: height - y1,
            y0: x0,
            x1: height - y0,
            y1: x1,
          }
        : {
            x0: y0,
            y0: width - x1,
            x1: y1,
            y1: width - x0,
          },
  };
}

export function rotateEditorOcrResult(
  result: OcrResult,
  direction: EditorPageRotationDirection,
): OcrResult {
  const { width, height } = result.imageData;
  return {
    ...result,
    imageData: {
      width: height,
      height: width,
    },
    words: result.words.map((word) =>
      rotateOcrWord(word, width, height, direction),
    ),
    rawWords: result.rawWords.map((word) =>
      rotateOcrWord(word, width, height, direction),
    ),
  };
}
