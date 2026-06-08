import { PdfEngineError } from "@/lib/pdf-engine";

export type OcrLanguage = "auto" | "eng" | "hin" | "spa" | "fra" | "deu" | "ara";
export type OcrWorkerLanguage = "eng" | "hin" | "spa" | "fra" | "deu" | "ara" | "eng+hin" | "hin+eng" | "ara+eng";
export type OcrQuality = "fast" | "balanced" | "high";
export type OcrStage = "preprocess" | "ocr" | "overlay";

export type OcrDetectedLanguage =
  | "english"
  | "hindi"
  | "mixed"
  | "spanish"
  | "french"
  | "german"
  | "arabic"
  | "unknown";

export type OcrLanguageBreakdown = {
  english: number;
  hindi: number;
  arabic: number;
  other: number;
};

export type OcrProgress = {
  stage: OcrStage;
  imageIndex: number;
  totalImages: number;
  wordsProcessed?: number;
  totalWords?: number;
  percent: number;
  message: string;
};

export type OcrWord = {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
};

export type OcrResult = {
  fileName: string;
  imageData: {
    width: number;
    height: number;
  };
  words: OcrWord[];
  rawWords: OcrWord[];
  averageConfidence: number;
  language: string;
  workerLanguage: OcrWorkerLanguage;
  detectedLanguage: OcrDetectedLanguage;
  languageBreakdown: OcrLanguageBreakdown;
  languageSymbol: string;
  fullText: string;
};

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement | Blob | File | string) => Promise<unknown>;
  setParameters?: (parameters: Record<string, string>) => Promise<void>;
  terminate: () => Promise<void>;
};

type WorkerState = {
  worker: TesseractWorker;
  workerLanguage: OcrWorkerLanguage;
};

type PreprocessedImage = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  skewAngle: number;
};

type TesseractWordCandidate = Record<string, unknown>;

const OCR_LANGUAGES: Array<{
  value: OcrLanguage;
  label: string;
  symbol: string;
}> = [
  { value: "auto", label: "Auto detect", symbol: "🌐" },
  { value: "eng", label: "English", symbol: "EN" },
  { value: "hin", label: "Hindi", symbol: "अ" },
  { value: "spa", label: "Spanish", symbol: "ES" },
  { value: "fra", label: "French", symbol: "FR" },
  { value: "deu", label: "German", symbol: "DE" },
  { value: "ara", label: "Arabic", symbol: "ع" },
];

const MAX_WORKER_LOG_PERCENT = 86;

let workerState: WorkerState | null = null;
let activeTesseractLogger: ((message: unknown) => void) | null = null;
let workerInitPromise: Promise<TesseractWorker> | null = null;

export function getAvailableOcrLanguages() {
  return OCR_LANGUAGES;
}

export function getOcrLanguageSymbol(language: string) {
  const normalizedLanguage = language.toLowerCase();

  if (normalizedLanguage.includes("hin") || normalizedLanguage.includes("hindi")) return "अ";
  if (normalizedLanguage.includes("eng") || normalizedLanguage.includes("english")) return "EN";
  if (normalizedLanguage.includes("ara") || normalizedLanguage.includes("arabic")) return "ع";
  if (normalizedLanguage.includes("spa") || normalizedLanguage.includes("spanish")) return "ES";
  if (normalizedLanguage.includes("fra") || normalizedLanguage.includes("french")) return "FR";
  if (normalizedLanguage.includes("deu") || normalizedLanguage.includes("german")) return "DE";
  if (normalizedLanguage.includes("mixed")) return "🌐";

  return "🌐";
}

export async function terminateOcrWorker() {
  const currentWorker = workerState?.worker;

  workerState = null;
  workerInitPromise = null;
  activeTesseractLogger = null;

  if (currentWorker) {
    await currentWorker.terminate();
  }
}

export async function runOcrPipeline(
  files: File[],
  options: {
    language: string;
    quality: OcrQuality;
    onProgress?: (progress: OcrProgress) => void;
    signal?: AbortSignal;
  },
): Promise<OcrResult[]> {
  ensureBrowserRuntime();

  const requestedLanguage = normalizeRequestedLanguage(options.language);
  const workerLanguage = resolveWorkerLanguage(requestedLanguage);
  const quality = options.quality || "balanced";
  const totalImages = files.length;

  if (!files.length) {
    throw new PdfEngineError("PROCESSING_FAILED", "Upload at least one image for OCR.");
  }

  throwIfAborted(options.signal);

  const abortHandler = () => {
    void terminateOcrWorker();
  };

  options.signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    const worker = await getOcrWorker(workerLanguage, quality);
    const results: OcrResult[] = [];

    for (let index = 0; index < files.length; index += 1) {
      throwIfAborted(options.signal);

      const imageIndex = index + 1;
      const file = files[index];

      reportProgress(options.onProgress, {
        stage: "preprocess",
        imageIndex,
        totalImages,
        percent: getOverallPercent(index, totalImages, 2),
        message: `Scanning image ${imageIndex} of ${totalImages}...`,
      });

      const preprocessed = await preprocessImageForOcr(file, quality, options.signal);

      try {
        throwIfAborted(options.signal);

        activeTesseractLogger = (message) => {
          const parsed = parseTesseractProgress(message);

          if (!parsed) return;

          reportProgress(options.onProgress, {
            stage: "ocr",
            imageIndex,
            totalImages,
            percent: getOverallPercent(
              index,
              totalImages,
              18 + parsed.progress * (MAX_WORKER_LOG_PERCENT - 18),
            ),
            message:
              parsed.status ||
              `Reading text from image ${imageIndex} of ${totalImages}...`,
          });
        };

        reportProgress(options.onProgress, {
          stage: "ocr",
          imageIndex,
          totalImages,
          percent: getOverallPercent(index, totalImages, 18),
          message: `Reading text from image ${imageIndex} of ${totalImages}...`,
        });

        const rawResult = await worker.recognize(preprocessed.canvas);

        throwIfAborted(options.signal);

        const fullText = extractFullText(rawResult);
        const rawWords = extractWordsFromTesseractResult(
          rawResult,
          preprocessed.width,
          preprocessed.height,
        );

        const selectedWords = selectReliableOcrWords(rawWords, fullText, preprocessed.width, preprocessed.height);
        const languageBreakdown = getLanguageBreakdown(selectedWords, fullText);
        const detectedLanguage = detectResultLanguage(languageBreakdown, workerLanguage);
        const languageSymbol = getSymbolForDetectedLanguage(detectedLanguage);
        const averageConfidence = selectedWords.length
          ? selectedWords.reduce((sum, word) => sum + word.confidence, 0) / selectedWords.length
          : 0;

        reportProgress(options.onProgress, {
          stage: "ocr",
          imageIndex,
          totalImages,
          wordsProcessed: selectedWords.length,
          totalWords: rawWords.length,
          percent: getOverallPercent(index, totalImages, 92),
          message: `${languageSymbol} OCR found ${selectedWords.length} searchable word${selectedWords.length === 1 ? "" : "s"} in image ${imageIndex}.`,
        });

        results.push({
          fileName: file.name,
          imageData: {
            width: preprocessed.width,
            height: preprocessed.height,
          },
          words: selectedWords,
          rawWords,
          averageConfidence: Math.round(averageConfidence),
          language: requestedLanguage,
          workerLanguage,
          detectedLanguage,
          languageBreakdown,
          languageSymbol,
          fullText,
        });
      } finally {
        activeTesseractLogger = null;
        cleanupCanvas(preprocessed.canvas);
      }

      reportProgress(options.onProgress, {
        stage: "ocr",
        imageIndex,
        totalImages,
        percent: getOverallPercent(index, totalImages, 100),
        message: `OCR completed for image ${imageIndex} of ${totalImages}.`,
      });
    }

    return results;
  } finally {
    options.signal?.removeEventListener("abort", abortHandler);
  }
}

async function getOcrWorker(workerLanguage: OcrWorkerLanguage, quality: OcrQuality) {
  if (workerState?.worker && workerState.workerLanguage === workerLanguage) {
    await configureWorker(workerState.worker, quality, workerLanguage);
    return workerState.worker;
  }

  if (workerState?.worker && workerState.workerLanguage !== workerLanguage) {
    await terminateOcrWorker();
  }

  if (!workerInitPromise) {
    workerInitPromise = createWorker(workerLanguage);
  }

  const worker = await workerInitPromise;

  workerState = {
    worker,
    workerLanguage,
  };

  await configureWorker(worker, quality, workerLanguage);

  return worker;
}

async function createWorker(workerLanguage: OcrWorkerLanguage): Promise<TesseractWorker> {
  const tesseract = await import("tesseract.js");

  const workerFactory = tesseract.createWorker as unknown as (
    language?: string,
    oem?: number,
    options?: {
      logger?: (message: unknown) => void;
    },
  ) => Promise<TesseractWorker>;

  return workerFactory(workerLanguage, 1, {
    logger(message: unknown) {
      activeTesseractLogger?.(message);
    },
  });
}

async function configureWorker(
  worker: TesseractWorker,
  quality: OcrQuality,
  workerLanguage: OcrWorkerLanguage,
) {
  if (!worker.setParameters) return;

  const isMixedLanguage = workerLanguage.includes("+");
  const pageSegmentationMode =
    quality === "fast"
      ? "6"
      : quality === "high"
        ? "3"
        : isMixedLanguage
          ? "6"
          : "4";

  try {
    await worker.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: pageSegmentationMode,
      tessedit_create_hocr: "0",
      tessedit_create_tsv: "1",
    });
  } catch {
    // Tesseract builds differ by runtime. OCR still works without parameter tuning.
  }
}

async function preprocessImageForOcr(
  file: File,
  quality: OcrQuality,
  signal?: AbortSignal,
): Promise<PreprocessedImage> {
  throwIfAborted(signal);

  const source = await loadImageToCanvas(file, quality);

  try {
    throwIfAborted(signal);

    if (quality !== "fast") {
      grayscaleAndBoostContrast(source.canvas);
    }

    throwIfAborted(signal);

    const skewAngle = quality === "high" ? estimateSkewAngle(source.canvas, quality) : 0;

    if (quality === "high" && Math.abs(skewAngle) >= 0.45 && Math.abs(skewAngle) <= 5) {
      rotateCanvasInPlace(source.canvas, skewAngle);
    }

    throwIfAborted(signal);

    if (quality === "high") {
      sharpenCanvas(source.canvas);
      reduceSaltPepperNoise(source.canvas);
    }

    return {
      canvas: source.canvas,
      width: source.canvas.width,
      height: source.canvas.height,
      skewAngle,
    };
  } catch (error) {
    cleanupCanvas(source.canvas);
    throw error;
  }
}

async function loadImageToCanvas(file: File, quality: OcrQuality) {
  const image = await loadHtmlImage(file);
  const maxSide = quality === "high" ? 3200 : quality === "balanced" ? 2600 : 1800;
  const upscaleTarget = quality === "high" ? 1700 : 1400;
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);

  let scale = Math.min(1, maxSide / longestSide);

  if (longestSide < upscaleTarget) {
    scale = Math.min(2.25, upscaleTarget / Math.max(1, longestSide));
  }

  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to prepare OCR canvas.");
  }

  canvas.width = width;
  canvas.height = height;

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = quality === "fast" ? "medium" : "high";
  context.drawImage(image, 0, 0, width, height);

  return {
    canvas,
    width,
    height,
  };
}

async function loadHtmlImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await image.decode();

    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function grayscaleAndBoostContrast(canvas: HTMLCanvasElement) {
  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let min = 255;
  let max = 0;

  for (let index = 0; index < data.length; index += 4) {
    const luminance = Math.round(
      data[index] * 0.299 +
      data[index + 1] * 0.587 +
      data[index + 2] * 0.114,
    );

    min = Math.min(min, luminance);
    max = Math.max(max, luminance);

    data[index] = luminance;
    data[index + 1] = luminance;
    data[index + 2] = luminance;
  }

  const range = Math.max(1, max - min);
  const boost = range < 120 ? 1.42 : range < 180 ? 1.24 : 1.1;

  for (let index = 0; index < data.length; index += 4) {
    const value = data[index];
    const normalized = (value - min) / range;
    const boosted = clamp(Math.round((normalized - 0.5) * 255 * boost + 128), 0, 255);

    data[index] = boosted;
    data[index + 1] = boosted;
    data[index + 2] = boosted;
    data[index + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
}

function sharpenCanvas(canvas: HTMLCanvasElement) {
  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(imageData.data);
  const target = imageData.data;
  const width = canvas.width;
  const height = canvas.height;
  const kernel = [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ];

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      let sum = 0;
      let kernelIndex = 0;

      for (let ky = -1; ky <= 1; ky += 1) {
        for (let kx = -1; kx <= 1; kx += 1) {
          const sourceIndex = ((y + ky) * width + (x + kx)) * 4;
          sum += source[sourceIndex] * kernel[kernelIndex];
          kernelIndex += 1;
        }
      }

      const targetIndex = (y * width + x) * 4;
      const value = clamp(Math.round(sum), 0, 255);

      target[targetIndex] = value;
      target[targetIndex + 1] = value;
      target[targetIndex + 2] = value;
      target[targetIndex + 3] = 255;
    }
  }

  context.putImageData(imageData, 0, 0);
}

function estimateSkewAngle(canvas: HTMLCanvasElement, quality: OcrQuality) {
  const context = getCanvasContext(canvas);
  const width = canvas.width;
  const height = canvas.height;
  const imageData = context.getImageData(0, 0, width, height);
  const points: Array<[number, number]> = [];
  const step = quality === "high" ? 6 : 10;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;

      if (imageData.data[index] < 105) {
        points.push([x, y]);
      }
    }
  }

  if (points.length < 80) return 0;

  const maxAngle = quality === "high" ? 5 : 3;
  const angleStep = quality === "high" ? 0.5 : 1;
  let bestAngle = 0;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let angle = -maxAngle; angle <= maxAngle; angle += angleStep) {
    const score = getHorizontalProjectionScore(points, width, height, angle);

    if (score > bestScore) {
      bestScore = score;
      bestAngle = angle;
    }
  }

  return bestAngle;
}

function getHorizontalProjectionScore(
  points: Array<[number, number]>,
  width: number,
  height: number,
  angleDegrees: number,
) {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const centerX = width / 2;
  const centerY = height / 2;
  const rows = new Map<number, number>();

  points.forEach(([x, y]) => {
    const translatedX = x - centerX;
    const translatedY = y - centerY;
    const rotatedY = translatedX * sin + translatedY * cos + centerY;
    const bucket = Math.round(rotatedY / 3);

    rows.set(bucket, (rows.get(bucket) || 0) + 1);
  });

  let score = 0;

  rows.forEach((count) => {
    score += count * count;
  });

  return score;
}

function rotateCanvasInPlace(canvas: HTMLCanvasElement, angleDegrees: number) {
  const original = document.createElement("canvas");
  const originalContext = getCanvasContext(original);

  original.width = canvas.width;
  original.height = canvas.height;
  originalContext.drawImage(canvas, 0, 0);

  const context = getCanvasContext(canvas);

  context.save();
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((angleDegrees * Math.PI) / 180);
  context.drawImage(original, -canvas.width / 2, -canvas.height / 2);
  context.restore();

  cleanupCanvas(original);
}

function reduceSaltPepperNoise(canvas: HTMLCanvasElement) {
  const context = getCanvasContext(canvas);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(imageData.data);
  const target = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const index = (y * width + x) * 4;
      const value = source[index];
      let darkNeighbors = 0;
      let lightNeighbors = 0;

      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          if (offsetY === 0 && offsetX === 0) continue;

          const neighborIndex = ((y + offsetY) * width + (x + offsetX)) * 4;

          if (source[neighborIndex] < 128) darkNeighbors += 1;
          else lightNeighbors += 1;
        }
      }

      if (value < 128 && darkNeighbors <= 1) {
        target[index] = 255;
        target[index + 1] = 255;
        target[index + 2] = 255;
      }

      if (value >= 128 && lightNeighbors <= 1) {
        target[index] = 0;
        target[index + 1] = 0;
        target[index + 2] = 0;
      }
    }
  }

  context.putImageData(imageData, 0, 0);
}

function extractWordsFromTesseractResult(
  result: unknown,
  imageWidth: number,
  imageHeight: number,
): OcrWord[] {
  const data = getResultData(result);
  const directCandidates = collectWordCandidates(data);
  const directWords = normalizeCandidatesToWords(directCandidates);

  if (directWords.length > 0) return directWords;

  const tsvWords = extractWordsFromTsv(data.tsv);

  if (tsvWords.length > 0) return tsvWords;

  return createSyntheticWordsFromText(extractFullText(result), imageWidth, imageHeight);
}

function extractFullText(result: unknown) {
  const data = getResultData(result);

  if (typeof data.text === "string") return data.text.trim();

  if (result && typeof result === "object" && "text" in result) {
    const text = (result as { text?: unknown }).text;

    if (typeof text === "string") return text.trim();
  }

  return "";
}

function normalizeCandidatesToWords(candidates: TesseractWordCandidate[]) {
  const words: OcrWord[] = [];

  candidates.forEach((candidate) => {
    const text = String(candidate.text ?? "").trim();
    const confidence = normalizeConfidence(candidate.confidence ?? candidate.conf ?? 0);
    const bbox = normalizeBbox(candidate.bbox);

    if (!text || !bbox) return;

    words.push({
      text,
      confidence,
      bbox,
    });
  });

  return words;
}

function getResultData(result: unknown): Record<string, unknown> {
  if (result && typeof result === "object" && "data" in result) {
    const data = (result as { data?: unknown }).data;

    if (data && typeof data === "object") {
      return data as Record<string, unknown>;
    }
  }

  if (result && typeof result === "object") {
    return result as Record<string, unknown>;
  }

  return {};
}

function collectWordCandidates(data: Record<string, unknown>) {
  const directWords = data.words;

  if (Array.isArray(directWords)) {
    return directWords as TesseractWordCandidate[];
  }

  const blocks = data.blocks;

  if (!Array.isArray(blocks)) {
    return [];
  }

  const words: TesseractWordCandidate[] = [];

  blocks.forEach((block) => {
    const paragraphs = getArrayProperty(block, "paragraphs");

    paragraphs.forEach((paragraph) => {
      const lines = getArrayProperty(paragraph, "lines");

      lines.forEach((line) => {
        const lineWords = getArrayProperty(line, "words");

        lineWords.forEach((word) => {
          if (word && typeof word === "object") {
            words.push(word as TesseractWordCandidate);
          }
        });
      });
    });
  });

  return words;
}

function getArrayProperty(value: unknown, key: string) {
  if (!value || typeof value !== "object") return [];

  const property = (value as Record<string, unknown>)[key];

  return Array.isArray(property) ? property : [];
}

function extractWordsFromTsv(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return [];

  const lines = value.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split("\t");
  const leftIndex = headers.indexOf("left");
  const topIndex = headers.indexOf("top");
  const widthIndex = headers.indexOf("width");
  const heightIndex = headers.indexOf("height");
  const confidenceIndex = headers.indexOf("conf");
  const textIndex = headers.indexOf("text");

  if ([leftIndex, topIndex, widthIndex, heightIndex, confidenceIndex, textIndex].some((index) => index === -1)) {
    return [];
  }

  return lines
    .slice(1)
    .map((line) => {
      const cells = line.split("\t");
      const text = String(cells[textIndex] ?? "").trim();
      const left = Number(cells[leftIndex]);
      const top = Number(cells[topIndex]);
      const width = Number(cells[widthIndex]);
      const height = Number(cells[heightIndex]);
      const confidence = normalizeConfidence(cells[confidenceIndex]);

      if (!text || [left, top, width, height].some((number) => !Number.isFinite(number))) {
        return null;
      }

      if (width <= 0 || height <= 0) return null;

      return {
        text,
        confidence,
        bbox: {
          x0: left,
          y0: top,
          x1: left + width,
          y1: top + height,
        },
      } satisfies OcrWord;
    })
    .filter((word): word is OcrWord => Boolean(word));
}

function createSyntheticWordsFromText(text: string, imageWidth: number, imageHeight: number) {
  const cleanText = text.replace(/\s+/g, " ").trim();

  if (!cleanText) return [];

  const tokens = cleanText.split(" ").filter(Boolean).slice(0, 300);
  const wordsPerLine = Math.max(4, Math.min(12, Math.round(Math.sqrt(tokens.length) * 1.8)));
  const marginX = imageWidth * 0.08;
  const marginY = imageHeight * 0.12;
  const usableWidth = imageWidth - marginX * 2;
  const lineHeight = Math.max(22, imageHeight * 0.035);
  const wordHeight = Math.max(14, lineHeight * 0.72);

  return tokens.map((token, index) => {
    const lineIndex = Math.floor(index / wordsPerLine);
    const columnIndex = index % wordsPerLine;
    const wordWidth = Math.max(28, Math.min(usableWidth / wordsPerLine, token.length * 13));
    const x0 = marginX + columnIndex * (usableWidth / wordsPerLine);
    const y0 = marginY + lineIndex * lineHeight;

    return {
      text: token,
      confidence: 45,
      bbox: {
        x0,
        y0,
        x1: Math.min(imageWidth, x0 + wordWidth),
        y1: Math.min(imageHeight, y0 + wordHeight),
      },
    } satisfies OcrWord;
  });
}

function selectReliableOcrWords(
  rawWords: OcrWord[],
  fullText: string,
  imageWidth: number,
  imageHeight: number,
) {
  const cleanedWords = rawWords
    .map((word) => ({
      ...word,
      text: normalizeOcrText(word.text),
      confidence: clamp(Math.round(word.confidence), -100, 100),
    }))
    .filter((word) => Boolean(word.text));

  const reliableWords = cleanedWords.filter((word) => {
    const minConfidence = getMinimumConfidenceForWord(word.text);

    return word.confidence >= minConfidence;
  });

  if (reliableWords.length > 0) return reliableWords;

  const scriptWords = cleanedWords.filter((word) => {
    if (containsDevanagari(word.text) || containsLatin(word.text) || containsArabic(word.text)) {
      return word.confidence >= -10;
    }

    return word.confidence >= 0;
  });

  if (scriptWords.length > 0) {
    return scriptWords.slice(0, 500);
  }

  return createSyntheticWordsFromText(fullText, imageWidth, imageHeight);
}

function getMinimumConfidenceForWord(text: string) {
  if (containsDevanagari(text)) return 12;
  if (containsArabic(text)) return 15;
  if (containsLatin(text)) return text.length <= 2 ? 25 : 30;

  return 20;
}

function normalizeOcrText(text: string) {
  return text
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .replace(/[|]{2,}/g, "|")
    .trim();
}

function getLanguageBreakdown(words: OcrWord[], fullText: string): OcrLanguageBreakdown {
  const sourceText = words.length ? words.map((word) => word.text).join(" ") : fullText;
  let english = 0;
  let hindi = 0;
  let arabic = 0;
  let other = 0;

  Array.from(sourceText).forEach((character) => {
    if (/[A-Za-z]/.test(character)) {
      english += 1;
      return;
    }

    if (/[\u0900-\u097F]/.test(character)) {
      hindi += 1;
      return;
    }

    if (/[\u0600-\u06FF]/.test(character)) {
      arabic += 1;
      return;
    }

    if (/\S/.test(character) && !/[0-9.,:;!?()[\]{}'"`~@#$%^&*_+=/\\|-]/.test(character)) {
      other += 1;
    }
  });

  return {
    english,
    hindi,
    arabic,
    other,
  };
}

function detectResultLanguage(
  breakdown: OcrLanguageBreakdown,
  workerLanguage: OcrWorkerLanguage,
): OcrDetectedLanguage {
  const total = breakdown.english + breakdown.hindi + breakdown.arabic + breakdown.other;

  if (total === 0) {
    if (workerLanguage.includes("hin")) return "hindi";
    if (workerLanguage.includes("ara")) return "arabic";
    if (workerLanguage.includes("eng")) return "english";
    return "unknown";
  }

  const englishRatio = breakdown.english / total;
  const hindiRatio = breakdown.hindi / total;
  const arabicRatio = breakdown.arabic / total;

  const activeLanguages = [englishRatio, hindiRatio, arabicRatio].filter((ratio) => ratio >= 0.18).length;

  if (activeLanguages >= 2) return "mixed";
  if (hindiRatio >= 0.18) return "hindi";
  if (arabicRatio >= 0.18) return "arabic";
  if (englishRatio >= 0.18) return "english";

  if (workerLanguage === "spa") return "spanish";
  if (workerLanguage === "fra") return "french";
  if (workerLanguage === "deu") return "german";

  return "unknown";
}

function getSymbolForDetectedLanguage(language: OcrDetectedLanguage) {
  if (language === "hindi") return "अ";
  if (language === "english") return "EN";
  if (language === "arabic") return "ع";
  if (language === "spanish") return "ES";
  if (language === "french") return "FR";
  if (language === "german") return "DE";
  if (language === "mixed") return "🌐";

  return "OCR";
}

function containsDevanagari(text: string) {
  return /[\u0900-\u097F]/.test(text);
}

function containsLatin(text: string) {
  return /[A-Za-z]/.test(text);
}

function containsArabic(text: string) {
  return /[\u0600-\u06FF]/.test(text);
}

function normalizeConfidence(value: unknown) {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) return 0;

  if (confidence <= 1 && confidence >= 0) {
    return Math.round(confidence * 100);
  }

  return Math.round(confidence);
}

function normalizeBbox(value: unknown): OcrWord["bbox"] | null {
  if (!value || typeof value !== "object") return null;

  const bbox = value as Record<string, unknown>;
  const x0 = Number(bbox.x0 ?? bbox.left ?? bbox.x);
  const y0 = Number(bbox.y0 ?? bbox.top ?? bbox.y);
  const x1 = Number(bbox.x1 ?? bbox.right);
  const y1 = Number(bbox.y1 ?? bbox.bottom);

  if ([x0, y0, x1, y1].some((number) => !Number.isFinite(number))) return null;
  if (x1 <= x0 || y1 <= y0) return null;

  return {
    x0,
    y0,
    x1,
    y1,
  };
}

function parseTesseractProgress(message: unknown) {
  if (!message || typeof message !== "object") return null;

  const payload = message as Record<string, unknown>;
  const progress = Number(payload.progress);
  const status = typeof payload.status === "string" ? payload.status : "";

  if (!Number.isFinite(progress)) return null;

  return {
    status,
    progress: clamp(progress, 0, 1),
  };
}

function reportProgress(
  callback: ((progress: OcrProgress) => void) | undefined,
  progress: OcrProgress,
) {
  callback?.({
    ...progress,
    percent: Math.round(clamp(progress.percent, 0, 100)),
  });
}

function getOverallPercent(imageIndex: number, totalImages: number, imagePercent: number) {
  if (totalImages <= 0) return 0;

  return ((imageIndex + imagePercent / 100) / totalImages) * 100;
}

function normalizeRequestedLanguage(language: string): OcrLanguage {
  const normalizedLanguage = language.toLowerCase() as OcrLanguage;
  const supported = OCR_LANGUAGES.some((item) => item.value === normalizedLanguage);

  return supported ? normalizedLanguage : "auto";
}

function resolveWorkerLanguage(language: OcrLanguage): OcrWorkerLanguage {
  if (language === "auto") return "eng+hin";
  if (language === "hin") return "hin+eng";
  if (language === "ara") return "ara+eng";

  return language;
}

function throwIfAborted(signal?: AbortSignal) {
  if (!signal?.aborted) return;

  throw new PdfEngineError("PROCESSING_FAILED", "OCR cancelled.");
}

function ensureBrowserRuntime() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new PdfEngineError("PROCESSING_FAILED", "OCR is available only in the browser.");
  }
}

function getCanvasContext(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new PdfEngineError("PROCESSING_FAILED", "Unable to prepare OCR image processing.");
  }

  return context;
}

function cleanupCanvas(canvas: HTMLCanvasElement) {
  canvas.width = 0;
  canvas.height = 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
