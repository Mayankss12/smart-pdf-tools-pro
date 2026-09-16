type Availability = "available" | "downloadable" | "downloading" | "unavailable";

type DownloadMonitor = EventTarget & {
  addEventListener(
    type: "downloadprogress",
    listener: (event: Event & { loaded?: number }) => void,
  ): void;
};

type TranslatorInstance = {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy(): void;
};

type TranslatorApi = {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<Availability>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
    signal?: AbortSignal;
    monitor?: (monitor: DownloadMonitor) => void;
  }): Promise<TranslatorInstance>;
};

type LanguageDetectionResult = {
  readonly detectedLanguage: string;
  readonly confidence: number;
};

type LanguageDetectorInstance = {
  detect(text: string, options?: { signal?: AbortSignal }): Promise<LanguageDetectionResult[]>;
  destroy(): void;
};

type LanguageDetectorApi = {
  availability(): Promise<Availability>;
  create(options?: {
    signal?: AbortSignal;
    monitor?: (monitor: DownloadMonitor) => void;
  }): Promise<LanguageDetectorInstance>;
};

type BrowserTranslationGlobals = typeof globalThis & {
  Translator?: TranslatorApi;
  LanguageDetector?: LanguageDetectorApi;
};

export type BrowserTranslationProgress = {
  readonly stage: "detecting" | "downloading" | "translating";
  readonly progress: number | null;
};

function getBrowserTranslationGlobals() {
  return globalThis as BrowserTranslationGlobals;
}

export function isBrowserTranslationApiAvailable() {
  return typeof window !== "undefined" && Boolean(getBrowserTranslationGlobals().Translator);
}

function reportDownloadProgress(
  monitor: DownloadMonitor,
  onProgress?: (progress: BrowserTranslationProgress) => void,
) {
  monitor.addEventListener("downloadprogress", (event) => {
    const loaded = typeof event.loaded === "number" ? event.loaded : null;
    onProgress?.({
      stage: "downloading",
      progress: loaded === null ? null : Math.round(Math.max(0, Math.min(1, loaded)) * 100),
    });
  });
}

async function detectSourceLanguage(
  text: string,
  signal: AbortSignal | undefined,
  onProgress?: (progress: BrowserTranslationProgress) => void,
) {
  const detectorApi = getBrowserTranslationGlobals().LanguageDetector;
  if (!detectorApi) {
    throw new Error("Automatic language detection is unavailable in this browser. Select the source language manually.");
  }

  if ((await detectorApi.availability()) === "unavailable") {
    throw new Error("Automatic language detection is unavailable. Select the source language manually.");
  }

  onProgress?.({ stage: "detecting", progress: null });
  const detector = await detectorApi.create({
    signal,
    monitor: (monitor) => reportDownloadProgress(monitor, onProgress),
  });

  try {
    const candidates = await detector.detect(text, { signal });
    const detected = candidates.find(
      (candidate) => candidate.detectedLanguage && candidate.confidence > 0,
    );
    if (!detected) {
      throw new Error("The source language could not be detected. Select it manually and try again.");
    }
    return detected.detectedLanguage;
  } finally {
    detector.destroy();
  }
}

export async function translateWithBrowser(
  request: {
    readonly text: string;
    readonly sourceLanguage?: string;
    readonly targetLanguage: string;
  },
  options: {
    readonly signal?: AbortSignal;
    readonly onProgress?: (progress: BrowserTranslationProgress) => void;
  } = {},
) {
  const translatorApi = getBrowserTranslationGlobals().Translator;
  if (!translatorApi) {
    throw new Error("On-device translation is unavailable in this browser.");
  }

  const sourceLanguage = request.sourceLanguage ?? await detectSourceLanguage(
    request.text,
    options.signal,
    options.onProgress,
  );

  if (sourceLanguage === request.targetLanguage) {
    throw new Error("Source and target languages must be different.");
  }

  const availability = await translatorApi.availability({
    sourceLanguage,
    targetLanguage: request.targetLanguage,
  });
  if (availability === "unavailable") {
    throw new Error("This language pair is not available for on-device translation.");
  }

  const translator = await translatorApi.create({
    sourceLanguage,
    targetLanguage: request.targetLanguage,
    signal: options.signal,
    monitor: (monitor) => reportDownloadProgress(monitor, options.onProgress),
  });

  try {
    options.onProgress?.({ stage: "translating", progress: null });
    const translatedText = (await translator.translate(request.text, {
      signal: options.signal,
    })).trim();
    if (!translatedText) {
      throw new Error("On-device translation returned no text.");
    }
    return { translatedText, sourceLanguage };
  } finally {
    translator.destroy();
  }
}
