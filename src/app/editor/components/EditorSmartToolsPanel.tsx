"use client";

import { ChevronLeft, ChevronRight, Loader2, Search, Square, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { PDFPageProxy } from "pdfjs-dist";

import type {
  OcrProgress,
  OcrResult,
} from "@/lib/pdf-ocr-engine";

import type { EditorController } from "../hooks/useEditor";

export type EditorOcrPageResult = {
  readonly pageNumber: number;
  readonly result: OcrResult;
};

export type EditorFindHighlight = {
  readonly pageNumber: number;
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
};

type FindResult = EditorFindHighlight & {
  readonly id: string;
  readonly preview: string;
  readonly source: "pdf" | "ocr";
};

type EditorSmartToolsPanelProps = {
  readonly editor: EditorController;
  readonly ocrPages: readonly EditorOcrPageResult[];
  readonly onOcrPagesChange: (pages: EditorOcrPageResult[]) => void;
  readonly onFindHighlightChange: (highlight: EditorFindHighlight | null) => void;
};

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

function countOccurrences(text: string, query: string) {
  const positions: number[] = [];
  const haystack = text.toLocaleLowerCase();
  const needle = query.toLocaleLowerCase();
  let fromIndex = 0;

  while (needle && fromIndex < haystack.length) {
    const index = haystack.indexOf(needle, fromIndex);
    if (index < 0) break;
    positions.push(index);
    fromIndex = index + Math.max(1, needle.length);
  }

  return positions;
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

    const positions = countOccurrences(item.str, query);
    if (positions.length === 0) return;

    const [x, baselineY] = viewport.convertToViewportPoint(
      item.transform[4] ?? 0,
      item.transform[5] ?? 0,
    );
    const height = Math.max(10, Math.abs(item.height || item.transform[3] || 12));
    const width = Math.max(8, Math.abs(item.width || 8));

    for (let occurrenceIndex = 0; occurrenceIndex < positions.length; occurrenceIndex += 1) {
      results.push({
        id: `pdf-${pageNumber}-${itemIndex}-${occurrenceIndex}`,
        pageNumber,
        source: "pdf",
        preview: item.str,
        box: {
          x,
          y: Math.max(0, baselineY - height),
          width,
          height,
        },
      });
    }
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
    const positions = countOccurrences(word.text, query);

    for (let occurrenceIndex = 0; occurrenceIndex < positions.length; occurrenceIndex += 1) {
      matches.push({
        id: `ocr-${pageNumber}-${wordIndex}-${occurrenceIndex}`,
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

export function EditorSmartToolsPanel({
  editor,
  ocrPages,
  onOcrPagesChange,
  onFindHighlightChange,
}: EditorSmartToolsPanelProps) {
  const abortControllerRef = useRef<AbortController | null>(null);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const [ocrScope, setOcrScope] = useState<"current" | "all">("current");
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [findResults, setFindResults] = useState<FindResult[]>([]);
  const [findIndex, setFindIndex] = useState(0);
  const [findRunning, setFindRunning] = useState(false);

  useEffect(() => {
    if (editor.activeTool === "find") {
      window.requestAnimationFrame(() => findInputRef.current?.focus());
    } else {
      onFindHighlightChange(null);
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

    try {
      const { runOcrPipeline } = await import("@/lib/pdf-ocr-engine");
      const completed: EditorOcrPageResult[] = [];

      for (let index = 0; index < pageNumbers.length; index += 1) {
        const pageNumber = pageNumbers[index];
        const page = await editor.pdfDocument.getPage(pageNumber);
        const file = await renderPageForOcr(page, pageNumber, controller.signal);
        const [result] = await runOcrPipeline([file], {
          language: "auto",
          quality: "balanced",
          signal: controller.signal,
          onProgress(progress) {
            setOcrProgress({
              ...progress,
              imageIndex: index + 1,
              totalImages: pageNumbers.length,
              percent: ((index + progress.percent / 100) / pageNumbers.length) * 100,
              message: `Page ${pageNumber}: ${progress.message}`,
            });
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

      setMessage(
        `OCR completed for ${completed.length} page${completed.length === 1 ? "" : "s"}. Searchable text will be included on export.`,
      );
    } catch (error) {
      setMessage(
        controller.signal.aborted
          ? "OCR cancelled."
          : error instanceof Error
            ? error.message
            : "OCR failed.",
      );
    } finally {
      const { terminateOcrWorker } = await import("@/lib/pdf-ocr-engine");
      await terminateOcrWorker();
      abortControllerRef.current = null;
      setOcrRunning(false);
    }
  }

  async function runFind() {
    const normalizedQuery = query.trim();

    if (!editor.pdfDocument || !normalizedQuery) {
      setFindResults([]);
      setFindIndex(0);
      onFindHighlightChange(null);
      return;
    }

    setFindRunning(true);
    setMessage("");

    try {
      const results: FindResult[] = [];

      for (let pageNumber = 1; pageNumber <= editor.totalPages; pageNumber += 1) {
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
      }

      setFindResults(results);
      setFindIndex(0);

      const first = results[0] ?? null;
      onFindHighlightChange(first);
      if (first) editor.setActivePage(first.pageNumber);
      setMessage(
        results.length
          ? `${results.length} result${results.length === 1 ? "" : "s"} found.`
          : "No results found.",
      );
    } catch (error) {
      setFindResults([]);
      onFindHighlightChange(null);
      setMessage(error instanceof Error ? error.message : "Search failed.");
    } finally {
      setFindRunning(false);
    }
  }

  function showFindResult(nextIndex: number) {
    if (findResults.length === 0) return;

    const normalized = (nextIndex + findResults.length) % findResults.length;
    const result = findResults[normalized];
    if (!result) return;

    setFindIndex(normalized);
    editor.setActivePage(result.pageNumber);
    onFindHighlightChange(result);
  }

  if (editor.activeTool !== "ocr" && editor.activeTool !== "find") {
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
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700"
              aria-label="OCR page scope"
            >
              <option value="current">Current page</option>
              <option value="all">All pages</option>
            </select>
            <button
              type="button"
              onClick={() => void runOcr()}
              disabled={ocrRunning}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
            >
              {ocrRunning ? <Loader2 size={14} className="animate-spin" /> : <Square size={13} />}
              {ocrRunning ? "Processing" : "Run OCR"}
            </button>
            {ocrRunning ? (
              <button
                type="button"
                onClick={() => abortControllerRef.current?.abort()}
                className="inline-flex h-9 items-center gap-1 rounded-xl border border-red-200 bg-white px-3 text-xs font-black text-red-600"
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
        ) : (
          <>
            <Search size={16} className="ml-1 text-violet-600" />
            <input
              ref={findInputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (!event.target.value) {
                  setFindResults([]);
                  setFindIndex(0);
                  onFindHighlightChange(null);
                }
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
                if (event.key === "Escape") {
                  editor.setActiveTool("select");
                }
              }}
              placeholder="Find text in PDF and OCR results"
              className="h-9 min-w-[240px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-violet-400"
              aria-label="Find in PDF"
            />
            <button
              type="button"
              onClick={() => void runFind()}
              disabled={findRunning || !query.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-violet-600 px-4 text-xs font-black text-white disabled:opacity-50"
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
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"
              aria-label="Previous search result"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => showFindResult(findIndex + 1)}
              disabled={!findResults.length}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40"
              aria-label="Next search result"
            >
              <ChevronRight size={15} />
            </button>
            <span className="w-full text-xs font-bold text-slate-500">{message}</span>
          </>
        )}
      </div>
    </section>
  );
}
