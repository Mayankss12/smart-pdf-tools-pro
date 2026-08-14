"use client";

import {
  ChevronLeft,
  ChevronRight,
  Languages,
  Loader2,
  Search,
  Square,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PDFPageProxy } from "pdfjs-dist";

import { trackEditorEvent } from "@/lib/editor/editor-analytics";
import {
  deduplicateFindRegions,
  findNormalizedSubstringRanges,
  getPdfSubstringBox,
} from "@/lib/editor/editor-find-geometry";
import {
  getAvailableOcrLanguages,
  type OcrLanguage,
  type OcrProgress,
  type OcrResult,
} from "@/lib/pdf-ocr-engine";

import type { EditorController } from "../hooks/useEditor";

export type EditorOcrPageResult = {
  readonly pageNumber: number;
  readonly result: OcrResult;
};

export type EditorFindHighlight = {
  readonly id: string;
  readonly pageNumber: number;
  readonly current: boolean;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

export type EditorSmartToolActivity = {
  readonly toolId: "ocr" | "find" | "translate";
  readonly progress: number | null;
};

type FindResult = Omit<EditorFindHighlight, "current"> & {
  readonly preview: string;
  readonly source: "pdf" | "ocr";
};

type TranslationOrigin = {
  readonly documentIdentity: number;
  readonly pageNumber: number;
  readonly objectId: string | null;
};

type EditorSmartToolsPanelProps = {
  readonly documentIdentity: number;
  readonly editor: EditorController;
  readonly ocrPages: readonly EditorOcrPageResult[];
  readonly translationConfigured: boolean;
  readonly onOcrPagesChange: (pages: EditorOcrPageResult[]) => void;
  readonly onFindHighlightChange: (highlights: EditorFindHighlight[]) => void;
  readonly onActivityChange: (activity: EditorSmartToolActivity | null) => void;
  readonly onStatusChange: (message: string) => void;
};

const TRANSLATION_LANGUAGES: readonly {
  readonly value: string;
  readonly label: string;
}[] = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ar", label: "Arabic" },
];

function canvasToPngFile(canvas: HTMLCanvasElement, pageNumber: number) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error(`Unable to prepare page ${pageNumber} for OCR.`));
        return;
      }

      resolve(new File([blob], `page-${pageNumber}.png`, { type: "image/png" }));
    }, "image/png");
  });
}

async function renderPageForOcr(
  page: PDFPageProxy,
  pageNumber: number,
  signal: AbortSignal,
) {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error(`Unable to render page ${pageNumber} for OCR.`);
  }

  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const renderTask = page.render({ canvasContext: context, viewport });
  const cancelRender = () => renderTask.cancel();
  signal.addEventListener("abort", cancelRender, { once: true });

  try {
    await renderTask.promise;

    if (signal.aborted) {
      throw new Error("OCR cancelled.");
    }

    return await canvasToPngFile(canvas, pageNumber);
  } finally {
    signal.removeEventListener("abort", cancelRender);
    page.cleanup();
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function findNativePdfMatches(
  page: PDFPageProxy,
  pageNumber: number,
  query: string,
) {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const results: FindResult[] = [];

  textContent.items.forEach((item, itemIndex) => {
    if (!("str" in item) || !item.str) return;

    const ranges = findNormalizedSubstringRanges(item.str, query);
    if (ranges.length === 0) return;

    const [x, baselineY] = viewport.convertToViewportPoint(
      item.transform[4] ?? 0,
      item.transform[5] ?? 0,
    );
    const height = Math.max(10, Math.abs(item.height || item.transform[3] || 12));
    const width = Math.max(8, Math.abs(item.width || 8));

    ranges.forEach((range, occurrenceIndex) => {
      results.push({
        id: `pdf-${pageNumber}-${itemIndex}-${occurrenceIndex}`,
        pageNumber,
        source: "pdf",
        preview: item.str,
        box: getPdfSubstringBox({
          text: item.str,
          start: range.start,
          length: range.length,
          x,
          y: Math.max(0, baselineY - height),
          width,
          height,
          direction: item.dir === "rtl" ? "rtl" : "ltr",
        }),
      });
    });
  });

  page.cleanup();
  return results;
}

function findOcrMatches(
  ocrPage: EditorOcrPageResult,
  pageWidth: number,
  pageHeight: number,
  query: string,
) {
  const { result, pageNumber } = ocrPage;
  const scaleX = pageWidth / Math.max(1, result.imageData.width);
  const scaleY = pageHeight / Math.max(1, result.imageData.height);
  const matches: FindResult[] = [];

  result.words.forEach((word, wordIndex) => {
    const ranges = findNormalizedSubstringRanges(word.text, query);
    if (ranges.length > 0) {
      matches.push({
        id: `ocr-${pageNumber}-${wordIndex}`,
        pageNumber,
        source: "ocr",
        preview: word.text,
        box: {
          x: word.bbox.x0 * scaleX,
          y: word.bbox.y0 * scaleY,
          width: Math.max(8, (word.bbox.x1 - word.bbox.x0) * scaleX),
          height: Math.max(10, (word.bbox.y1 - word.bbox.y0) * scaleY),
        },
      });
    }
  });

  return matches;
}

function toHighlights(results: readonly FindResult[], currentId: string | null) {
  return results.map<EditorFindHighlight>((result) => ({
    id: result.id,
    pageNumber: result.pageNumber,
    current: result.id === currentId,
    box: result.box,
  }));
}

function isOcrLanguage(value: string): value is OcrLanguage {
  return getAvailableOcrLanguages().some((language) => language.value === value);
}

function getSelectedEditorText(editor: EditorController) {
  const selected = editor.selectedObject;
  if (!selected) return "";
  return selected.data.text ?? selected.data.note ?? "";
}

async function getPageText(editor: EditorController) {
  if (!editor.pdfDocument) return "";
  const page = await editor.pdfDocument.getPage(editor.activePageNumber);
  try {
    const content = await page.getTextContent();
    return content.items
      .map((item) => ("str" in item ? item.str : ""))
      .filter(Boolean)
      .join(" ");
  } finally {
    page.cleanup();
  }
}

async function getPageTranslationText(
  editor: EditorController,
  ocrPages: readonly EditorOcrPageResult[],
) {
  const nativeText = (await getPageText(editor)).trim();
  const ocrText =
    ocrPages
      .find((item) => item.pageNumber === editor.activePageNumber)
      ?.result.fullText.trim() ?? "";
  const meaningfulNative = nativeText.replace(/\s+/g, "").length >= 12;
  if (meaningfulNative) {
    return { text: nativeText, source: "native text" } as const;
  }
  if (nativeText && ocrText) {
    return {
      text: `${nativeText}\n${ocrText}`,
      source: "mixed native and OCR text",
    } as const;
  }
  if (ocrText) return { text: ocrText, source: "OCR text" } as const;
  return { text: nativeText, source: "native text" } as const;
}

function readTranslationResponse(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const translatedText = Reflect.get(payload, "translatedText");
  return typeof translatedText === "string" ? translatedText : "";
}

export function EditorSmartToolsPanel({
  documentIdentity,
  editor,
  ocrPages,
  translationConfigured,
  onOcrPagesChange,
  onFindHighlightChange,
  onActivityChange,
  onStatusChange,
}: EditorSmartToolsPanelProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const findRunRef = useRef(0);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrScope, setOcrScope] = useState<"current" | "all">("current");
  const [ocrLanguage, setOcrLanguage] = useState<OcrLanguage>("auto");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [findResults, setFindResults] = useState<FindResult[]>([]);
  const [findIndex, setFindIndex] = useState(0);
  const [findRunning, setFindRunning] = useState(false);
  const [translateMode, setTranslateMode] = useState<"selection" | "page">("selection");
  const [sourceLanguage, setSourceLanguage] = useState("auto");
  const [targetLanguage, setTargetLanguage] = useState("es");
  const [translatedText, setTranslatedText] = useState("");
  const [translateError, setTranslateError] = useState("");
  const [translateRunning, setTranslateRunning] = useState(false);
  const [translationSource, setTranslationSource] = useState("");
  const [translationOrigin, setTranslationOrigin] =
    useState<TranslationOrigin | null>(null);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    findRunRef.current += 1;
    setQuery("");
    setFindResults([]);
    setFindIndex(0);
    setFindRunning(false);
    setTranslatedText("");
    setTranslateError("");
    setTranslateRunning(false);
    setTranslationSource("");
    setTranslationOrigin(null);
    setMessage("");
    onFindHighlightChange([]);
    onActivityChange(null);
  }, [documentIdentity, onActivityChange, onFindHighlightChange]);

  useEffect(() => {
    if (editor.activeTool === "find") {
      window.requestAnimationFrame(() => findInputRef.current?.focus());
    } else {
      onFindHighlightChange([]);
    }
  }, [editor.activeTool, onFindHighlightChange]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      void import("@/lib/pdf-ocr-engine").then(({ terminateOcrWorker }) =>
        terminateOcrWorker(),
      );
    };
  }, []);

  function clearFind() {
    findRunRef.current += 1;
    setQuery("");
    setFindResults([]);
    setFindIndex(0);
    setMessage("");
    onFindHighlightChange([]);
  }

  async function runOcr() {
    if (!editor.pdfDocument || ocrRunning) return;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setOcrRunning(true);
    setMessage("");
    setOcrProgress(null);

    const pageNumbers =
      ocrScope === "all"
        ? Array.from({ length: editor.totalPages }, (_, index) => index + 1)
        : [editor.activePageNumber];

    trackEditorEvent({
      type: "ocr_started",
      scope: ocrScope,
      pageCount: pageNumbers.length,
    });
    onActivityChange({ toolId: "ocr", progress: 0 });

    try {
      const { runOcrPipeline } = await import("@/lib/pdf-ocr-engine");
      const completed: EditorOcrPageResult[] = [];

      for (let index = 0; index < pageNumbers.length; index += 1) {
        const pageNumber = pageNumbers[index];
        const page = await editor.pdfDocument.getPage(pageNumber);
        const file = await renderPageForOcr(page, pageNumber, controller.signal);
        const [result] = await runOcrPipeline([file], {
          language: ocrLanguage,
          quality: "balanced",
          signal: controller.signal,
          onProgress(progress) {
            const percent =
              ((index + progress.percent / 100) / pageNumbers.length) * 100;
            setOcrProgress({
              ...progress,
              imageIndex: index + 1,
              totalImages: pageNumbers.length,
              percent,
              message: `Page ${pageNumber}: ${progress.message}`,
            });
            onActivityChange({ toolId: "ocr", progress: percent });
          },
        });

        if (result) {
          completed.push({ pageNumber, result });
          const completedNumbers = new Set(completed.map((item) => item.pageNumber));
          onOcrPagesChange([
            ...ocrPages.filter(
              (item) =>
                !pageNumbers.includes(item.pageNumber) ||
                !completedNumbers.has(item.pageNumber),
            ),
            ...completed,
          ].sort((left, right) => left.pageNumber - right.pageNumber));
        }
      }

      const successMessage =
        `OCR completed for ${completed.length} page${completed.length === 1 ? "" : "s"}. Searchable text will be included on export.`;
      setMessage(successMessage);
      onStatusChange(successMessage);
      trackEditorEvent({
        type: "ocr_completed",
        scope: ocrScope,
        pageCount: completed.length,
      });
    } catch (error) {
      const cancelled = controller.signal.aborted;
      const errorMessage = cancelled
        ? "OCR cancelled."
        : error instanceof Error
          ? error.message
          : "OCR failed.";
      setMessage(errorMessage);
      onStatusChange(errorMessage);
      if (cancelled) {
        trackEditorEvent({
          type: "ocr_cancelled",
          scope: ocrScope,
          pageCount: pageNumbers.length,
        });
      } else {
        trackEditorEvent({ type: "tool_error", toolId: "ocr", errorCode: "ocr_failed" });
      }
    } finally {
      const { terminateOcrWorker } = await import("@/lib/pdf-ocr-engine");
      await terminateOcrWorker();
      abortControllerRef.current = null;
      setOcrRunning(false);
      onActivityChange(null);
    }
  }

  async function runFind() {
    const normalizedQuery = query.trim();

    if (!editor.pdfDocument || !normalizedQuery) {
      setFindResults([]);
      setFindIndex(0);
      onFindHighlightChange([]);
      return;
    }

    setFindRunning(true);
    const runId = findRunRef.current + 1;
    findRunRef.current = runId;
    setMessage("");
    onActivityChange({ toolId: "find", progress: null });

    try {
      const results: FindResult[] = [];

      for (let pageNumber = 1; pageNumber <= editor.totalPages; pageNumber += 1) {
        if (findRunRef.current !== runId) return;
        const page = await editor.pdfDocument.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        results.push(
          ...(await findNativePdfMatches(page, pageNumber, normalizedQuery)),
        );

        const ocrPage = ocrPages.find((item) => item.pageNumber === pageNumber);
        if (ocrPage) {
          results.push(
            ...findOcrMatches(
              ocrPage,
              viewport.width,
              viewport.height,
              normalizedQuery,
            ),
          );
        }
        onActivityChange({
          toolId: "find",
          progress: (pageNumber / editor.totalPages) * 100,
        });
        if (pageNumber % 20 === 0) {
          await new Promise<void>((resolve) =>
            window.requestAnimationFrame(() => resolve()),
          );
        }
        if (results.length >= 5_000) break;
      }

      if (findRunRef.current !== runId) return;
      const uniqueResults = deduplicateFindRegions(results);
      setFindResults(uniqueResults);
      setFindIndex(0);

      const first = uniqueResults[0] ?? null;
      onFindHighlightChange(
        toHighlights(uniqueResults, first?.id ?? null),
      );
      if (first) editor.setActivePage(first.pageNumber);
      const resultMessage = uniqueResults.length
        ? `${uniqueResults.length} result${uniqueResults.length === 1 ? "" : "s"} found.`
        : "No results found.";
      setMessage(resultMessage);
      onStatusChange(resultMessage);
      trackEditorEvent({
        type: "find_performed",
        resultCount: uniqueResults.length,
        includedOcr: ocrPages.length > 0,
      });
    } catch (error) {
      setFindResults([]);
      onFindHighlightChange([]);
      const errorMessage = error instanceof Error ? error.message : "Search failed.";
      setMessage(errorMessage);
      onStatusChange(errorMessage);
      trackEditorEvent({ type: "tool_error", toolId: "find", errorCode: "find_failed" });
    } finally {
      setFindRunning(false);
      onActivityChange(null);
    }
  }

  function showFindResult(nextIndex: number) {
    if (findResults.length === 0) return;

    const normalized = (nextIndex + findResults.length) % findResults.length;
    const result = findResults[normalized];
    if (!result) return;

    setFindIndex(normalized);
    editor.setActivePage(result.pageNumber);
    onFindHighlightChange(toHighlights(findResults, result.id));
  }

  async function runTranslation() {
    if (!translationConfigured || translateRunning) return;

    const origin: TranslationOrigin = {
      documentIdentity,
      pageNumber: editor.activePageNumber,
      objectId: translateMode === "selection" ? editor.selectedObjectId : null,
    };

    setTranslateRunning(true);
    setTranslateError("");
    setTranslatedText("");
    setTranslationSource("");
    setTranslationOrigin(null);
    onActivityChange({ toolId: "translate", progress: null });
    trackEditorEvent({
      type: "translate_attempted",
      mode: translateMode,
      configured: translationConfigured,
    });

    try {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const pageSource =
        translateMode === "page"
          ? await getPageTranslationText(editor, ocrPages)
          : null;
      const text =
        translateMode === "selection"
          ? getSelectedEditorText(editor)
          : pageSource?.text ?? "";
      if (!text.trim()) {
        throw new Error(
          translateMode === "selection"
            ? "Select a text or note object with content first."
            : "No native or OCR text was found on the current page. Run OCR first if this is a scanned page.",
        );
      }

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        signal: controller.signal,
        body: JSON.stringify({
          text,
          sourceLanguage: sourceLanguage === "auto" ? undefined : sourceLanguage,
          targetLanguage,
        }),
      });
      const payload: unknown = await response.json();
      const result = readTranslationResponse(payload);
      if (!response.ok || !result) {
        const providerError =
          payload && typeof payload === "object"
            ? Reflect.get(payload, "error")
            : null;
        throw new Error(
          typeof providerError === "string"
            ? providerError
            : "Translation failed.",
        );
      }
      setTranslatedText(result);
      setTranslationSource(
        translateMode === "selection"
          ? "selected editor text"
          : (pageSource?.source ?? "native text"),
      );
      setTranslationOrigin(origin);
      onStatusChange(
        `Translation ready from ${
          translateMode === "selection"
            ? "selected editor text"
            : (pageSource?.source ?? "native text")
        }.`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof DOMException && error.name === "AbortError"
          ? "Translation cancelled."
          : error instanceof Error
            ? error.message
            : "Translation failed.";
      setTranslateError(errorMessage);
      onStatusChange(errorMessage);
      trackEditorEvent({
        type: "tool_error",
        toolId: "translate",
        errorCode: "translation_failed",
      });
    } finally {
      abortControllerRef.current = null;
      setTranslateRunning(false);
      onActivityChange(null);
    }
  }

  function applyTranslation() {
    if (
      !translatedText ||
      !translationOrigin ||
      translationOrigin.documentIdentity !== documentIdentity
    ) {
      setTranslateError(
        "This translation belongs to a different document. Translate again.",
      );
      return;
    }

    const sourceObject = translationOrigin.objectId
      ? editor.objects.find(
          (object) =>
            object.id === translationOrigin.objectId &&
            object.pageNumber === translationOrigin.pageNumber,
        )
      : null;
    const box = sourceObject
      ? {
          x: sourceObject.box.x + 18,
          y: sourceObject.box.y + 18,
          width: sourceObject.box.width,
          height: Math.max(48, sourceObject.box.height),
        }
      : { x: 48, y: 48, width: 280, height: 96 };

    editor.setActivePage(translationOrigin.pageNumber);
    editor.addObject({
      type: "text",
      pageNumber: translationOrigin.pageNumber,
      box,
      data: {
        text: translatedText,
        fontSize: sourceObject?.data.fontSize ?? 14,
        color: sourceObject?.data.color ?? "#111827",
        opacity: 1,
      },
      locked: false,
    });
    setTranslatedText("");
    setTranslateError("");
    setTranslationSource("");
    setTranslationOrigin(null);
    onStatusChange("Translation added as a new editable text object.");
  }

  if (
    editor.activeTool !== "ocr" &&
    editor.activeTool !== "find" &&
    editor.activeTool !== "translate"
  ) {
    return null;
  }

  return (
    <section className="border-b border-slate-200 bg-white px-3 py-2 shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2">
        {editor.activeTool === "ocr" ? (
          <>
            <span className="rounded-xl bg-white px-3 py-2 text-xs font-black text-violet-700 ring-1 ring-slate-200">
              Browser OCR
            </span>
            <select
              value={ocrScope}
              onChange={(event) => setOcrScope(event.target.value === "all" ? "all" : "current")}
              disabled={ocrRunning}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="OCR page scope"
            >
              <option value="current">Current page</option>
              <option value="all">All pages</option>
            </select>
            <select
              value={ocrLanguage}
              onChange={(event) => {
                if (isOcrLanguage(event.target.value)) {
                  setOcrLanguage(event.target.value);
                }
              }}
              disabled={ocrRunning}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="OCR language"
            >
              {getAvailableOcrLanguages().map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void runOcr()}
              disabled={ocrRunning}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-wait disabled:bg-slate-400"
            >
              {ocrRunning ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
              {ocrRunning ? "Processing" : message && !ocrPages.length ? "Retry OCR" : "Run OCR"}
            </button>
            {ocrRunning ? (
              <button
                type="button"
                onClick={() => abortControllerRef.current?.abort()}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200 bg-white px-3 text-xs font-black text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                <X size={14} />
                Cancel
              </button>
            ) : null}
            <span className="min-w-0 flex-1 text-xs font-bold text-slate-500">
              {ocrProgress
                ? `${Math.round(ocrProgress.percent)}% — ${ocrProgress.message}`
                : message || `${ocrPages.length} OCR page${ocrPages.length === 1 ? "" : "s"} ready`}
            </span>
            {ocrPages.length ? (
              <details className="w-full rounded-xl bg-white p-2 ring-1 ring-slate-200">
                <summary className="cursor-pointer text-xs font-black text-slate-600">
                  Extracted text
                </summary>
                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs text-slate-600">
                  {ocrPages
                    .map((item) => `Page ${item.pageNumber}\n${item.result.fullText}`)
                    .join("\n\n")}
                </pre>
              </details>
            ) : null}
          </>
        ) : null}

        {editor.activeTool === "find" ? (
          <>
            <Search size={16} className="ml-1 text-violet-600" />
            <input
              ref={findInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value) clearFind();
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  if (findResults.length) {
                    showFindResult(findIndex + (event.shiftKey ? -1 : 1));
                  } else {
                    void runFind();
                  }
                }
                if (event.key === "Escape") clearFind();
              }}
              placeholder="Find text in PDF and OCR results"
              className="h-9 min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200"
              aria-label="Find in PDF"
            />
            <button
              type="button"
              onClick={() => void runFind()}
              disabled={findRunning || !query.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-wait disabled:bg-slate-400"
            >
              {findRunning ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
              Find
            </button>
            <span className="min-w-[90px] text-center text-xs font-black text-slate-600">
              {findResults.length ? `${findIndex + 1} / ${findResults.length}` : "0 results"}
            </span>
            <button
              type="button"
              onClick={() => showFindResult(findIndex - 1)}
              disabled={!findResults.length}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-slate-100"
              aria-label="Previous search result"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => showFindResult(findIndex + 1)}
              disabled={!findResults.length}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-slate-100"
              aria-label="Next search result"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              onClick={clearFind}
              disabled={!query && !findResults.length}
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-not-allowed disabled:border-dashed disabled:bg-slate-100"
            >
              <X size={14} />
              Clear
            </button>
            <span className="w-full text-xs font-bold text-slate-500">{message}</span>
          </>
        ) : null}

        {editor.activeTool === "translate" ? (
          <>
            <span className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-violet-700 ring-1 ring-slate-200">
              <Languages size={14} />
              Translate
            </span>
            <select
              value={translateMode}
              onChange={(event) =>
                setTranslateMode(event.target.value === "page" ? "page" : "selection")
              }
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Translation source mode"
            >
              <option value="selection">Selected object text</option>
              <option value="page">Current page text</option>
            </select>
            <select
              value={sourceLanguage}
              onChange={(event) => setSourceLanguage(event.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Source language"
            >
              <option value="auto">Auto detect</option>
              {TRANSLATION_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>{language.label}</option>
              ))}
            </select>
            <select
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Target language"
            >
              {TRANSLATION_LANGUAGES.map((language) => (
                <option key={language.value} value={language.value}>{language.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void runTranslation()}
              disabled={translateRunning}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:cursor-wait disabled:bg-slate-400"
            >
              {translateRunning ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
              {translateError ? "Retry" : "Translate"}
            </button>
            {translatedText || translateError ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white p-3">
                {translateError ? (
                  <p className="text-xs font-bold text-red-600">{translateError}</p>
                ) : (
                  <>
                    <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Translation preview
                    </div>
                    {translationSource ? (
                      <div className="mt-1 text-[10px] font-bold text-slate-500">
                        Source: {translationSource}
                      </div>
                    ) : null}
                    <p className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap text-sm text-slate-700">
                      {translatedText}
                    </p>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setTranslatedText("")}
                        className="h-9 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={applyTranslation}
                        className="h-9 rounded-xl bg-violet-600 px-4 text-xs font-black text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
                      >
                        Add as new text
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <span className="min-w-0 flex-1 text-xs font-bold text-slate-500">
                Original content is preserved. Review before adding the translation.
              </span>
            )}
          </>
        ) : null}
      </div>
    </section>
  );
}
