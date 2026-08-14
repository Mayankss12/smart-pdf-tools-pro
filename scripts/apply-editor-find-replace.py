from pathlib import Path

path = Path("src/app/editor/components/EditorSmartToolsPanel.tsx")
text = path.read_text()

replacements = [
    (
        '''import type { EditorController } from "../hooks/useEditor";''',
        '''import type { EditorController, EditorObject } from "../hooks/useEditor";''',
    ),
    (
        '''import {
  deduplicateFindRegions,
  findNormalizedSubstringRanges,
  getOcrWordPdfBox,
  getPdfSubstringBox,
} from "@/lib/editor/editor-find-geometry";''',
        '''import {
  deduplicateFindRegions,
  findNormalizedSubstringRanges,
  getOcrWordPdfBox,
  getPdfSubstringBox,
} from "@/lib/editor/editor-find-geometry";
import {
  applyFindReplaceBatch,
  findEditorObjectTextMatches,
  isFindMatchCoveredByExistingTextEdit,
  isReplaceableFindMatch,
  type EditorFindReplaceMatch,
} from "@/lib/editor/editor-find-replace";''',
    ),
    (
        '''type FindResult = {
  readonly id: string;
  readonly pageNumber: number;
  readonly source: "pdf" | "ocr";
  readonly box: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly preview: string;
};''',
        '''type FindResult = EditorFindReplaceMatch & {
  readonly preview: string;
};''',
    ),
    (
        '''  const [findStatus, setFindStatus] = useState("");
  const [findBusy, setFindBusy] = useState(false);''',
        '''  const [findStatus, setFindStatus] = useState("");
  const [findBusy, setFindBusy] = useState(false);
  const [replaceValue, setReplaceValue] = useState("");
  const [replaceRefreshPending, setReplaceRefreshPending] = useState(false);''',
    ),
    (
        '''          results.push({
            id: `pdf-${pageNumber}-${itemIndex}-${occurrenceIndex}`,
            pageNumber,
            source: "pdf",
            box: getPdfSubstringBox({
              text,
              start: range.start,
              length: range.length,
              x: Number(item.transform?.[4] ?? 0),
              y: viewport.height - Number(item.transform?.[5] ?? 0) - itemHeight,
              width: itemWidth,
              height: itemHeight,
              direction: item.dir,
            }),
            preview: text,
          });''',
        '''          results.push({
            id: `pdf-${pageNumber}-${itemIndex}-${occurrenceIndex}`,
            pageNumber,
            source: "pdf",
            box: getPdfSubstringBox({
              text,
              start: range.start,
              length: range.length,
              x: Number(item.transform?.[4] ?? 0),
              y: viewport.height - Number(item.transform?.[5] ?? 0) - itemHeight,
              width: itemWidth,
              height: itemHeight,
              direction: item.dir,
            }),
            preview: text,
            matchedText: text.slice(range.start, range.start + range.length),
            matchStart: range.start,
            matchLength: range.length,
          });''',
    ),
    (
        '''          return {
            id: `ocr-${pageNumber}-${wordIndex}`,
            pageNumber,
            source: "ocr" as const,
            box: getOcrWordPdfBox({
              bbox: word.bbox,
              imageWidth: result.imageData.width,
              imageHeight: result.imageData.height,
              pageWidth: viewport.width,
              pageHeight: viewport.height,
              rotation,
            }),
            preview: word.text,
          };''',
        '''          return {
            id: `ocr-${pageNumber}-${wordIndex}`,
            pageNumber,
            source: "ocr" as const,
            box: getOcrWordPdfBox({
              bbox: word.bbox,
              imageWidth: result.imageData.width,
              imageHeight: result.imageData.height,
              pageWidth: viewport.width,
              pageHeight: viewport.height,
              rotation,
            }),
            preview: word.text,
            matchedText: word.text,
            matchStart: 0,
            matchLength: word.text.length,
          };''',
    ),
    (
        '''      const deduplicated = deduplicateFindRegions([
        ...nativeResults,
        ...ocrResults,
      ]);

      setFindResults(deduplicated);
      setFindIndex(0);

      if (deduplicated.length > 0) {
        editor.setActivePage(deduplicated[0].pageNumber);
      }

      const nativeCount = deduplicated.filter(
        (result) => result.source === "pdf",
      ).length;
      const ocrCount = deduplicated.length - nativeCount;
      const status =
        deduplicated.length > 0
          ? `Found ${deduplicated.length} result${
              deduplicated.length === 1 ? "" : "s"
            }: ${nativeCount} native PDF text, ${ocrCount} OCR fallback.`
          : "No matching text was found in native PDF text or OCR fallback.";

      setFindStatus(status);
      onStatusChange(status);''',
        '''      const deduplicated = deduplicateFindRegions([
        ...nativeResults,
        ...ocrResults,
      ]).filter(
        (result) => !isFindMatchCoveredByExistingTextEdit(result, editor.objects),
      );
      const editorTextById = new Map(
        editor.objects.map((object) => [object.id, object.data.text ?? ""]),
      );
      const editorResults: FindResult[] = findEditorObjectTextMatches(
        editor.objects,
        query,
      ).map((result) => ({
        ...result,
        preview: result.editorObjectId
          ? editorTextById.get(result.editorObjectId) ?? result.matchedText
          : result.matchedText,
      }));
      const allResults = [...deduplicated, ...editorResults].sort(
        (left, right) =>
          left.pageNumber - right.pageNumber ||
          left.box.y - right.box.y ||
          left.box.x - right.box.x,
      );

      setFindResults(allResults);
      setFindIndex(0);

      if (allResults.length > 0) {
        editor.setActivePage(allResults[0].pageNumber);
        if (allResults[0].source === "editor" && allResults[0].editorObjectId) {
          editor.selectObject(allResults[0].editorObjectId);
        }
      }

      const nativeCount = allResults.filter(
        (result) => result.source === "pdf",
      ).length;
      const ocrCount = allResults.filter(
        (result) => result.source === "ocr",
      ).length;
      const editorCount = allResults.length - nativeCount - ocrCount;
      const status =
        allResults.length > 0
          ? `Found ${allResults.length} result${
              allResults.length === 1 ? "" : "s"
            }: ${nativeCount} native PDF text, ${editorCount} editor text, ${ocrCount} OCR fallback.`
          : "No matching text was found in PDF text, editor text, or OCR fallback.";

      setFindStatus(status);
      onStatusChange(status);''',
    ),
    (
        '''  function navigateFindResult(direction: 1 | -1) {
    if (findResults.length === 0) return;

    const nextIndex =
      (findIndex + direction + findResults.length) % findResults.length;
    const result = findResults[nextIndex];
    setFindIndex(nextIndex);
    editor.setActivePage(result.pageNumber);
  }
''',
        '''  function navigateFindResult(direction: 1 | -1) {
    if (findResults.length === 0) return;

    const nextIndex =
      (findIndex + direction + findResults.length) % findResults.length;
    const result = findResults[nextIndex];
    setFindIndex(nextIndex);
    editor.setActivePage(result.pageNumber);
    if (result.source === "editor" && result.editorObjectId) {
      editor.selectObject(result.editorObjectId);
    }
  }

  function replaceFindMatches(matches: readonly FindResult[], label: string) {
    const eligible = matches.filter(isReplaceableFindMatch);
    const skippedOcr = matches.length - eligible.length;

    if (eligible.length === 0) {
      const status =
        "OCR fallback matches are find-only because scanned-image text cannot be replaced safely without altering the page image.";
      setFindStatus(status);
      onStatusChange(status);
      return;
    }

    const batch = applyFindReplaceBatch({
      objects: editor.objects,
      matches: eligible,
      replacement: replaceValue,
    });

    if (batch.replacedCount === 0) {
      const status = "No replaceable matches were changed.";
      setFindStatus(status);
      onStatusChange(status);
      return;
    }

    editor.applyObjectBatch(
      batch.objects as EditorObject[],
      batch.selectedObjectId,
    );
    setFindResults([]);
    setFindIndex(0);
    setReplaceRefreshPending(true);

    const status = `${label}: replaced ${batch.replacedCount} match${
      batch.replacedCount === 1 ? "" : "es"
    }${skippedOcr ? `; skipped ${skippedOcr} OCR fallback match${skippedOcr === 1 ? "" : "es"}` : ""}.`;
    setFindStatus(status);
    onStatusChange(status);
  }

  function replaceCurrentFindResult() {
    const current = findResults[findIndex];
    if (!current) return;
    replaceFindMatches([current], "Replace");
  }

  function replaceAllFindResults() {
    replaceFindMatches(findResults, "Replace all");
  }
''',
    ),
    (
        '''  useEffect(() => {
    if (activeTool !== "find" || findResults.length === 0) {
      clearFindHighlights();
      return;
    }

    const pageResults = findResults.filter(
      (result) => result.pageNumber === editor.activePageNumber,
    );
    setFindHighlights(
      pageResults.map((result) => ({
        id: result.id,
        pageNumber: result.pageNumber,
        box: result.box,
        active: findResults[findIndex]?.id === result.id,
      })),
    );
  }, [
    activeTool,
    clearFindHighlights,
    editor.activePageNumber,
    findIndex,
    findResults,
    setFindHighlights,
  ]);
''',
        '''  useEffect(() => {
    if (activeTool !== "find" || findResults.length === 0) {
      clearFindHighlights();
      return;
    }

    const pageResults = findResults.filter(
      (result) => result.pageNumber === editor.activePageNumber,
    );
    setFindHighlights(
      pageResults.map((result) => ({
        id: result.id,
        pageNumber: result.pageNumber,
        box: result.box,
        active: findResults[findIndex]?.id === result.id,
      })),
    );
  }, [
    activeTool,
    clearFindHighlights,
    editor.activePageNumber,
    findIndex,
    findResults,
    setFindHighlights,
  ]);

  useEffect(() => {
    if (!replaceRefreshPending) return;
    setReplaceRefreshPending(false);
    void runFind();
    // Refresh only after the editor object batch from Replace/Replace All lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor.objects, replaceRefreshPending]);
''',
    ),
    (
        '''            {findResults.length > 0 ? (
              <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateFindResult(-1)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                >
                  Previous
                </button>
                <div className="text-center text-xs font-black text-slate-500">
                  {findIndex + 1} / {findResults.length}
                </div>
                <button
                  type="button"
                  onClick={() => navigateFindResult(1)}
                  className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                >
                  Next
                </button>
              </div>
            ) : null}

            <div className="mt-3 text-[11px] leading-5 text-slate-500">
              {findStatus ||
                "Native PDF text is searched first. OCR is used automatically on pages that do not have usable text."}
            </div>

            {findResults[findIndex] ? (
              <button
                type="button"
                onClick={() =>
                  editor.setActivePage(findResults[findIndex].pageNumber)
                }
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-violet-600">
                  Page {findResults[findIndex].pageNumber} ·{" "}
                  {findResults[findIndex].source === "pdf"
                    ? "PDF text"
                    : "OCR fallback"}
                </span>
                <span className="mt-1 block line-clamp-3 text-xs font-bold leading-5 text-slate-700">
                  {findResults[findIndex].preview}
                </span>
              </button>
            ) : null}''',
        '''            {findResults.length > 0 ? (
              <>
                <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateFindResult(-1)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                  >
                    Previous
                  </button>
                  <div className="text-center text-xs font-black text-slate-500">
                    {findIndex + 1} / {findResults.length}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateFindResult(1)}
                    className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700"
                  >
                    Next
                  </button>
                </div>

                <div className="mt-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
                  <label className="block text-[10px] font-black uppercase tracking-[0.08em] text-violet-700">
                    Replace with
                  </label>
                  <input
                    value={replaceValue}
                    onChange={(event) => setReplaceValue(event.target.value)}
                    placeholder="Blank removes the matched text"
                    className="mt-2 h-10 w-full rounded-xl border border-violet-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={
                        findBusy ||
                        !findResults[findIndex] ||
                        !isReplaceableFindMatch(findResults[findIndex])
                      }
                      onClick={replaceCurrentFindResult}
                      className="h-9 rounded-xl border border-violet-200 bg-white text-xs font-black text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      disabled={
                        findBusy ||
                        !findResults.some(isReplaceableFindMatch)
                      }
                      onClick={replaceAllFindResults}
                      className="h-9 rounded-xl bg-violet-600 text-xs font-black text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Replace all
                    </button>
                  </div>
                  {findResults.some((result) => result.source === "ocr") ? (
                    <div className="mt-2 text-[10px] font-bold leading-4 text-amber-700">
                      OCR fallback matches remain find-only; scanned-image text is not painted over automatically.
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="mt-3 text-[11px] leading-5 text-slate-500">
              {findStatus ||
                "Native PDF text and current editor text are searched first. OCR is used automatically on pages without usable text."}
            </div>

            {findResults[findIndex] ? (
              <button
                type="button"
                onClick={() => {
                  const result = findResults[findIndex];
                  editor.setActivePage(result.pageNumber);
                  if (result.source === "editor" && result.editorObjectId) {
                    editor.selectObject(result.editorObjectId);
                  }
                }}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-violet-300 hover:bg-violet-50"
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-violet-600">
                  Page {findResults[findIndex].pageNumber} ·{" "}
                  {findResults[findIndex].source === "pdf"
                    ? "PDF text"
                    : findResults[findIndex].source === "editor"
                      ? "Editor text"
                      : "OCR fallback"}
                </span>
                <span className="mt-1 block line-clamp-3 text-xs font-bold leading-5 text-slate-700">
                  {findResults[findIndex].preview}
                </span>
              </button>
            ) : null}''',
    ),
]

for old, new in replacements:
    count = text.count(old)
    if count != 1:
        raise SystemExit(
            f"Guarded replacement expected exactly 1 match, found {count}: {old[:120]!r}"
        )
    text = text.replace(old, new, 1)

path.write_text(text)
print("Editor Smart Tools Find & Replace patch applied.")
