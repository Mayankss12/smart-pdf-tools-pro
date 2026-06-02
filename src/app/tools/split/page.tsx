"use client";

import {
  type DragEvent,
  type MouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Grid2X2,
  Layers,
  ListPlus,
  Loader2,
  MousePointer2,
  Package,
  RotateCcw,
  Scissors,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";
import { createZipBlob } from "@/lib/browser-zip";
import {
  PdfEngineError,
  downloadBlob,
  formatFileSize,
  loadPdfDocument,
  parsePageGroups,
  safeFileBaseName,
  splitPdfIntoGroups,
  validatePdfFile,
  type PageGroup,
  type PdfProcessingResult,
} from "@/lib/pdf-engine";

type BusyMode = "idle" | "reading" | "rendering" | "exporting";
type ThumbnailStatus = "idle" | "loading" | "ready" | "error";
type SplitMode = "custom" | "each" | "chunk" | "oddEven";

type GroupPlan = {
  groups: PageGroup[];
  error: string | null;
};

function getErrorMessage(error: unknown) {
  if (error instanceof PdfEngineError) {
    return error.message;
  }

  return "Split failed. Please check your PDF and page groups.";
}

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function createPageNumbers(pageCount: number) {
  return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function createPageGroup(label: string, pages: number[]): PageGroup {
  return { label, pages };
}

function formatRange(start: number, end: number) {
  return start === end ? `${start}` : `${start}-${end}`;
}

function collapsePagesToRanges(pages: number[]) {
  const sortedPages = [...new Set(pages)].sort((a, b) => a - b);
  const ranges: string[] = [];

  let rangeStart = sortedPages[0];
  let previous = sortedPages[0];

  for (let index = 1; index < sortedPages.length; index += 1) {
    const pageNumber = sortedPages[index];

    if (pageNumber === previous + 1) {
      previous = pageNumber;
      continue;
    }

    ranges.push(formatRange(rangeStart, previous));
    rangeStart = pageNumber;
    previous = pageNumber;
  }

  if (rangeStart !== undefined && previous !== undefined) {
    ranges.push(formatRange(rangeStart, previous));
  }

  return ranges;
}

function createChunkGroups(pageCount: number, chunkSize: number) {
  if (pageCount <= 0 || chunkSize <= 0) return [];

  const groups: PageGroup[] = [];

  for (let start = 1; start <= pageCount; start += chunkSize) {
    const end = Math.min(pageCount, start + chunkSize - 1);
    const pages = createPageNumbers(end - start + 1).map((offset) => start + offset - 1);

    groups.push(createPageGroup(formatRange(start, end), pages));
  }

  return groups;
}

function createEveryPageGroups(pageCount: number) {
  return createPageNumbers(pageCount).map((pageNumber) =>
    createPageGroup(`${pageNumber}`, [pageNumber]),
  );
}

function createOddEvenGroups(pageCount: number) {
  const pages = createPageNumbers(pageCount);
  const oddPages = pages.filter((pageNumber) => pageNumber % 2 === 1);
  const evenPages = pages.filter((pageNumber) => pageNumber % 2 === 0);
  const groups: PageGroup[] = [];

  if (oddPages.length) {
    groups.push(createPageGroup("Odd pages", oddPages));
  }

  if (evenPages.length) {
    groups.push(createPageGroup("Even pages", evenPages));
  }

  return groups;
}

function formatGroupsForInput(groups: PageGroup[]) {
  return groups.map((group) => group.label).join(",");
}

function getSelectedPages(groups: PageGroup[]) {
  return new Set(groups.flatMap((group) => group.pages));
}

function getDuplicatePages(groups: PageGroup[]) {
  const seen = new Set<number>();
  const duplicates = new Set<number>();

  groups.forEach((group) => {
    group.pages.forEach((pageNumber) => {
      if (seen.has(pageNumber)) {
        duplicates.add(pageNumber);
      }

      seen.add(pageNumber);
    });
  });

  return Array.from(duplicates).sort((a, b) => a - b);
}

function getUnassignedPages(pageCount: number, groups: PageGroup[]) {
  const selectedPages = getSelectedPages(groups);

  return createPageNumbers(pageCount).filter((pageNumber) => !selectedPages.has(pageNumber));
}

function getGroupBadgesForPage(pageNumber: number, groups: PageGroup[]) {
  return groups
    .map((group, index) => (group.pages.includes(pageNumber) ? `G${index + 1}` : null))
    .filter(Boolean) as string[];
}

function buildGroupPlan(
  splitMode: SplitMode,
  pageInput: string,
  pageCount: number,
  splitEveryCount: number,
): GroupPlan {
  if (pageCount <= 0) return { groups: [], error: null };

  try {
    if (splitMode === "custom") {
      return { groups: parsePageGroups(pageInput, pageCount), error: null };
    }

    if (splitMode === "each") {
      return { groups: createEveryPageGroups(pageCount), error: null };
    }

    if (splitMode === "chunk") {
      if (!Number.isInteger(splitEveryCount) || splitEveryCount < 1) {
        return { groups: [], error: "Split every N pages must be 1 or higher." };
      }

      return { groups: createChunkGroups(pageCount, splitEveryCount), error: null };
    }

    return { groups: createOddEvenGroups(pageCount), error: null };
  } catch (error) {
    return { groups: [], error: getErrorMessage(error) };
  }
}

function ProgressBar({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/75">
      <div
        className="h-full rounded-full bg-[var(--violet-600)] transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

export default function SplitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const renderTokenRef = useRef(0);

  const [file, setFile] = useState<File | null>(null);
  const [pageInput, setPageInput] = useState("1-4,5-8");
  const [pageCount, setPageCount] = useState(0);
  const [splitMode, setSplitMode] = useState<SplitMode>("custom");
  const [splitEveryCount, setSplitEveryCount] = useState(4);

  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>({});
  const [thumbnailStatus, setThumbnailStatus] = useState<ThumbnailStatus>("idle");
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 });
  const [exportProgress, setExportProgress] = useState(0);

  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [lastSelectedPage, setLastSelectedPage] = useState<number | null>(null);

  const [status, setStatus] = useState("Upload one PDF and define split groups.");
  const [busyMode, setBusyMode] = useState<BusyMode>("idle");
  const [results, setResults] = useState<PdfProcessingResult[]>([]);

  const busy = busyMode !== "idle";

  useEffect(() => {
    configurePdfWorker();
  }, []);

  const groupPlan = useMemo(
    () => buildGroupPlan(splitMode, pageInput, pageCount, splitEveryCount),
    [pageCount, pageInput, splitEveryCount, splitMode],
  );

  const groups = groupPlan.groups;

  const selectedPageSet = useMemo(() => getSelectedPages(groups), [groups]);
  const builderSelectedPageSet = useMemo(() => new Set(selectedPages), [selectedPages]);
  const duplicatePages = useMemo(() => getDuplicatePages(groups), [groups]);
  const unassignedPages = useMemo(
    () => (file ? getUnassignedPages(pageCount, groups) : []),
    [file, groups, pageCount],
  );
  const pageNumbers = useMemo(() => createPageNumbers(pageCount), [pageCount]);

  const renderPercent = useMemo(() => {
    if (!renderProgress.total) return 0;
    return Math.round((renderProgress.done / renderProgress.total) * 100);
  }, [renderProgress.done, renderProgress.total]);

  const hasValidGroups = Boolean(file && groups.length > 0 && !groupPlan.error);
  const canSplit = Boolean(file && groups.length > 0 && !groupPlan.error && !busy);

  async function renderThumbnails(selectedFile: File, totalPages: number) {
    const token = renderTokenRef.current + 1;
    renderTokenRef.current = token;

    setBusyMode("rendering");
    setThumbnailStatus("loading");
    setThumbnailUrls({});
    setRenderProgress({ done: 0, total: totalPages });
    setStatus("Rendering real PDF page thumbnails...");

    try {
      configurePdfWorker();

      const pdf = await pdfjsLib.getDocument({ data: await selectedFile.arrayBuffer() }).promise;
      const nextUrls: Record<number, string> = {};

      for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
        if (renderTokenRef.current !== token) return;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 0.38 });
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) continue;

        canvas.width = Math.ceil(viewport.width * pixelRatio);
        canvas.height = Math.ceil(viewport.height * pixelRatio);
        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        await page.render({ canvasContext: context, viewport }).promise;

        nextUrls[pageNumber] = canvas.toDataURL("image/png");

        if (renderTokenRef.current === token) {
          setThumbnailUrls({ ...nextUrls });
          setRenderProgress({ done: pageNumber, total: totalPages });
        }
      }

      if (renderTokenRef.current === token) {
        setThumbnailStatus("ready");
        setStatus(`PDF loaded with ${totalPages} page${totalPages > 1 ? "s" : ""}. Build split groups visually or with ranges.`);
      }
    } catch {
      if (renderTokenRef.current === token) {
        setThumbnailStatus("error");
        setStatus("PDF loaded, but thumbnails could not be rendered. You can still split with page ranges.");
      }
    } finally {
      if (renderTokenRef.current === token) {
        setBusyMode("idle");
      }
    }
  }

  async function handleFile(selectedFile?: File) {
    if (!selectedFile || busy) return;

    setBusyMode("reading");
    setResults([]);
    setSelectedPages([]);
    setLastSelectedPage(null);
    setThumbnailUrls({});
    setThumbnailStatus("idle");
    setRenderProgress({ done: 0, total: 0 });
    setExportProgress(0);
    setStatus("Reading PDF with PDFMantra engine...");

    try {
      validatePdfFile(selectedFile);
      const pdf = await loadPdfDocument(selectedFile);
      const totalPages = pdf.getPageCount();

      setFile(selectedFile);
      setPageCount(totalPages);

      if (totalPages <= 1) {
        setStatus("PDF loaded with 1 page. Splitting needs at least 2 pages.");
        setBusyMode("idle");
        return;
      }

      const initialGroups = createChunkGroups(totalPages, Math.min(4, totalPages));
      setPageInput(formatGroupsForInput(initialGroups));
      setSplitEveryCount(Math.min(4, totalPages));
      setSplitMode("custom");

      await renderThumbnails(selectedFile, totalPages);
    } catch (error) {
      renderTokenRef.current += 1;
      setFile(null);
      setPageCount(0);
      setResults([]);
      setSelectedPages([]);
      setLastSelectedPage(null);
      setThumbnailUrls({});
      setThumbnailStatus("idle");
      setRenderProgress({ done: 0, total: 0 });
      setStatus(getErrorMessage(error));
      setBusyMode("idle");
    }
  }

  function clearFile() {
    renderTokenRef.current += 1;
    setFile(null);
    setPageCount(0);
    setResults([]);
    setSelectedPages([]);
    setLastSelectedPage(null);
    setThumbnailUrls({});
    setThumbnailStatus("idle");
    setRenderProgress({ done: 0, total: 0 });
    setExportProgress(0);
    setBusyMode("idle");
    setStatus("Upload one PDF and define split groups.");
  }

  function handleUploadDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (busy) return;
    handleFile(event.dataTransfer.files?.[0]);
  }

  function applyCustomPreset(preset: string, label: string) {
    setSplitMode("custom");
    setPageInput(preset);
    setResults([]);
    setStatus(`Preset applied: ${label}.`);
  }

  function applyCoverAndRestPreset() {
    if (!pageCount || pageCount === 1) {
      applyCustomPreset("1", "cover only");
      return;
    }

    applyCustomPreset(`1,2-${pageCount}`, "cover + remaining pages");
  }

  function applyHalfPreset() {
    if (!pageCount) {
      applyCustomPreset("1-2,3-4", "first half + second half");
      return;
    }

    const midpoint = Math.ceil(pageCount / 2);
    const secondStart = Math.min(pageCount, midpoint + 1);
    const preset = secondStart <= pageCount ? `1-${midpoint},${secondStart}-${pageCount}` : `1-${pageCount}`;

    applyCustomPreset(preset, "first half + second half");
  }

  function applyChunkPreset(chunkSize: number) {
    const safePageCount = pageCount || chunkSize * 2;
    const groupsToApply = createChunkGroups(safePageCount, chunkSize);

    setSplitEveryCount(chunkSize);
    applyCustomPreset(formatGroupsForInput(groupsToApply), `${chunkSize}-page sets`);
  }

  function handlePageSelect(pageNumber: number, event: MouseEvent<HTMLButtonElement>) {
    if (busy) return;

    if (event.shiftKey && lastSelectedPage !== null) {
      const start = Math.min(lastSelectedPage, pageNumber);
      const end = Math.max(lastSelectedPage, pageNumber);
      setSelectedPages(createPageNumbers(end - start + 1).map((offset) => start + offset - 1));
      setLastSelectedPage(pageNumber);
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      setSelectedPages((current) => {
        if (current.includes(pageNumber)) {
          return current.filter((selectedPage) => selectedPage !== pageNumber);
        }

        return [...current, pageNumber].sort((a, b) => a - b);
      });
      setLastSelectedPage(pageNumber);
      return;
    }

    setSelectedPages([pageNumber]);
    setLastSelectedPage(pageNumber);
  }

  function clearSelection() {
    setSelectedPages([]);
    setLastSelectedPage(null);
    setStatus("Visual selection cleared.");
  }

  function selectUnassignedPages() {
    if (!unassignedPages.length) {
      setStatus("No unassigned pages found.");
      return;
    }

    setSelectedPages(unassignedPages);
    setLastSelectedPage(unassignedPages[unassignedPages.length - 1] ?? null);
    setStatus("Unassigned pages selected.");
  }

  function addSelectionToGroups(replaceExisting = false) {
    if (!selectedPages.length) {
      setStatus("Select pages from the visual grid first.");
      return;
    }

    const ranges = collapsePagesToRanges(selectedPages);

    if (!ranges.length) {
      setStatus("Select at least one page first.");
      return;
    }

    setSplitMode("custom");
    setPageInput((current) => {
      if (replaceExisting || !current.trim()) return ranges.join(",");
      return `${current.trim()},${ranges.join(",")}`;
    });
    setResults([]);
    setStatus(
      replaceExisting
        ? `Visual selection set as split group${ranges.length > 1 ? "s" : ""}.`
        : `Visual selection added as split group${ranges.length > 1 ? "s" : ""}.`,
    );
  }

  async function handleSplit() {
    if (!file || busy) {
      setStatus("Please upload one PDF first.");
      return;
    }

    if (groupPlan.error || !groups.length) {
      setStatus(groupPlan.error ?? "Enter valid split groups first.");
      return;
    }

    setBusyMode("exporting");
    setExportProgress(8);
    setResults([]);
    setStatus(`Creating ${groups.length} split PDF${groups.length > 1 ? "s" : ""}...`);

    try {
      setExportProgress(30);
      const outputs = await splitPdfIntoGroups(file, groups);
      setResults(outputs);

      if (outputs.length === 1) {
        setExportProgress(82);
        downloadBlob(outputs[0].blob, outputs[0].fileName);
        setExportProgress(100);
        setStatus("Split completed. Downloaded 1 PDF.");
      } else {
        setExportProgress(72);
        setStatus(`Packaging ${outputs.length} PDFs into one ZIP...`);

        const zipBlob = await createZipBlob(
          outputs.map((output) => ({
            fileName: output.fileName,
            blob: output.blob,
          })),
        );

        setExportProgress(92);
        downloadBlob(zipBlob, `PDFMantra-split-${safeFileBaseName(file.name)}.zip`);
        setExportProgress(100);
        setStatus(`Split completed. Downloaded 1 ZIP containing ${outputs.length} PDFs.`);
      }
    } catch (error) {
      setResults([]);
      setExportProgress(0);
      setStatus(getErrorMessage(error));
    } finally {
      setBusyMode("idle");
    }
  }

  const statusLooksLikeError =
    status.toLowerCase().includes("failed") ||
    status.toLowerCase().includes("invalid") ||
    status.toLowerCase().includes("outside") ||
    status.toLowerCase().includes("unsupported") ||
    status.toLowerCase().includes("too large") ||
    status.toLowerCase().includes("empty") ||
    status.toLowerCase().includes("range") ||
    status.toLowerCase().includes("valid split");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Scissors}
            eyebrow="PDFMantra Page Engine"
            title="Split PDFs into exact page groups."
            description="Upload one PDF, preview real page thumbnails, build split groups visually or with smart presets, then download separate PDFs or one ZIP."
            meta={
              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{groups.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Outputs</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{selectedPageSet.size || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Included</div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] lg:grid-cols-[1fr_390px]">
            <section className="min-h-[680px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div
                onClick={() => {
                  if (!busy) fileInputRef.current?.click();
                }}
                onDrop={handleUploadDrop}
                onDragOver={(event) => event.preventDefault()}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && !busy) {
                    fileInputRef.current?.click();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-disabled={busy}
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={22} /> : <Upload size={22} />}
                </div>

                <div className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {file ? file.name : "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {file
                    ? `${pageCount} page${pageCount > 1 ? "s" : ""} loaded • ${formatFileSize(file.size)}`
                    : "Click here or drag one PDF to begin."}
                </div>

                {busyMode === "rendering" ? (
                  <div className="mx-auto mt-4 max-w-md">
                    <ProgressBar value={renderPercent} />
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      Rendering thumbnails {renderProgress.done}/{renderProgress.total}
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                    <Upload size={17} />
                    Choose PDF
                  </div>
                )}
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-3 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      <Grid2X2 size={14} />
                      Visual split board
                    </div>
                    <h2 className="display-font mt-3 text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Page Thumbnails</h2>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      Click pages to select. Use Shift for page ranges and Ctrl for multi-select, then add the selection as split groups.
                    </p>
                  </div>

                  {file ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={selectUnassignedPages}
                        disabled={busy || !unassignedPages.length}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <MousePointer2 size={15} />
                        Select Missing
                      </button>
                      <button
                        type="button"
                        onClick={clearSelection}
                        disabled={busy || !selectedPages.length}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        onClick={clearFile}
                        disabled={busy}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-100 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    </div>
                  ) : null}
                </div>

                {busyMode === "reading" ? (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : pageNumbers.length > 0 ? (
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    {pageNumbers.map((pageNumber) => {
                      const isIncluded = selectedPageSet.has(pageNumber);
                      const isBuilderSelected = builderSelectedPageSet.has(pageNumber);
                      const badges = getGroupBadgesForPage(pageNumber, groups);

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={(event) => handlePageSelect(pageNumber, event)}
                          disabled={busy}
                          className={`overflow-hidden rounded-[1.35rem] border bg-white text-left shadow-sm outline-none transition hover:border-[var(--violet-border)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                            isBuilderSelected
                              ? "border-[var(--violet-600)] ring-4 ring-violet-100"
                              : isIncluded
                                ? "border-[var(--violet-border)]"
                                : "border-[var(--border-light)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-light)] bg-[var(--bg-base)] px-4 py-3">
                            <div>
                              <div className="text-sm font-bold text-[var(--text-primary)]">Page {pageNumber}</div>
                              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                {isIncluded ? "Included" : "Not included"}
                              </div>
                            </div>
                            {badges.length ? (
                              <div className="flex flex-wrap justify-end gap-1">
                                {badges.slice(0, 3).map((badge) => (
                                  <span
                                    key={badge}
                                    className="rounded-full bg-[var(--violet-50)] px-2 py-1 text-[10px] font-bold text-[var(--violet-600)]"
                                  >
                                    {badge}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex aspect-[3/4] items-center justify-center bg-[var(--bg-base)] p-4">
                            {thumbnailUrls[pageNumber] ? (
                              <img
                                src={thumbnailUrls[pageNumber]}
                                alt={`PDF page ${pageNumber}`}
                                className="h-full w-full rounded border border-[var(--border-light)] bg-white object-contain shadow-sm"
                                draggable={false}
                              />
                            ) : thumbnailStatus === "error" ? (
                              <div className="px-4 text-center">
                                <FileText className="mx-auto text-[var(--violet-400)]" size={34} />
                                <div className="mt-2 text-xs font-semibold text-[var(--text-secondary)]">Preview unavailable</div>
                              </div>
                            ) : (
                              <div className="w-full px-5">
                                <div className="mx-auto h-24 w-20 animate-pulse rounded-xl bg-white shadow-sm" />
                                <div className="mx-auto mt-3 h-2 w-24 animate-pulse rounded-full bg-white" />
                                <div className="mx-auto mt-2 h-2 w-16 animate-pulse rounded-full bg-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-5 flex min-h-80 items-center justify-center rounded-[1.35rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to build split groups visually.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <h2 className="display-font text-[1.75rem] font-bold tracking-[-0.02em] text-[var(--text-primary)]">Split Planner</h2>

                <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                  Choose a split mode, preview the output groups, then export separate PDFs or one ZIP.
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  {[
                    { id: "custom", label: "Custom Groups" },
                    { id: "each", label: "Every Page" },
                    { id: "chunk", label: "Every N Pages" },
                    { id: "oddEven", label: "Odd / Even" },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setSplitMode(mode.id as SplitMode);
                        setResults([]);
                        setStatus(`Split mode selected: ${mode.label}.`);
                      }}
                      disabled={busy}
                      className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                        splitMode === mode.id
                          ? "border-[var(--violet-600)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                          : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>

                {splitMode === "custom" ? (
                  <>
                    <div className="mt-5">
                      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
                        <Sparkles size={16} className="text-[var(--violet-600)]" />
                        Smart presets
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" onClick={() => applyChunkPreset(2)} disabled={busy} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40">2-page sets</button>
                        <button type="button" onClick={() => applyChunkPreset(4)} disabled={busy} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40">4-page sets</button>
                        <button type="button" onClick={applyHalfPreset} disabled={busy} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40">Halves</button>
                        <button type="button" onClick={applyCoverAndRestPreset} disabled={busy} className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] hover:text-[var(--violet-600)] disabled:cursor-not-allowed disabled:opacity-40">Cover + Rest</button>
                      </div>
                    </div>

                    <label className="mt-5 block">
                      <span className="text-sm font-semibold text-[var(--text-primary)]">Page groups</span>
                      <input
                        value={pageInput}
                        onChange={(event) => {
                          setSplitMode("custom");
                          setPageInput(event.target.value);
                          setResults([]);
                        }}
                        placeholder="Example: 1-4,5-8"
                        disabled={busy}
                        className="input-premium mt-2"
                      />
                    </label>

                    <div className="mt-4 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--violet-600)]">
                        <ListPlus size={16} />
                        Visual group builder
                      </div>
                      <div className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                        Selected pages: {selectedPages.length ? collapsePagesToRanges(selectedPages).join(", ") : "None"}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => addSelectionToGroups(false)}
                          disabled={busy || !selectedPages.length}
                          className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Add Group
                        </button>
                        <button
                          type="button"
                          onClick={() => addSelectionToGroups(true)}
                          disabled={busy || !selectedPages.length}
                          className="rounded-2xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Replace
                        </button>
                      </div>
                    </div>
                  </>
                ) : null}

                {splitMode === "chunk" ? (
                  <label className="mt-5 block rounded-2xl border border-[var(--border-light)] bg-white p-4">
                    <span className="flex items-center justify-between text-sm font-semibold text-[var(--text-primary)]">
                      Split every <span>{splitEveryCount} page{splitEveryCount === 1 ? "" : "s"}</span>
                    </span>
                    <input
                      type="range"
                      min={1}
                      max={Math.max(1, Math.min(pageCount || 20, 20))}
                      value={splitEveryCount}
                      onChange={(event) => {
                        setSplitEveryCount(Number(event.target.value));
                        setResults([]);
                      }}
                      disabled={busy}
                      className="mt-3 w-full"
                    />
                  </label>
                ) : null}

                <div className="mt-5 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--violet-600)]">
                    <Layers size={17} />
                    Output files
                  </div>

                  {groupPlan.error ? (
                    <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm font-semibold text-red-700">
                      {groupPlan.error}
                    </div>
                  ) : hasValidGroups ? (
                    <div className="mt-3 max-h-72 space-y-2 overflow-auto pr-1">
                      {groups.map((group, index) => (
                        <div key={`${group.label}-${index}`} className="rounded-xl border border-[var(--border-light)] bg-white px-3 py-3 text-sm font-medium text-[var(--text-secondary)]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold text-[var(--text-primary)]">Split file {index + 1}</span>
                            <span className="rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-2.5 py-1 text-xs font-semibold text-[var(--violet-600)]">
                              {group.pages.length} page{group.pages.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="mt-1 text-xs font-medium text-[var(--text-muted)]">Pages {group.label}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-medium text-[var(--violet-600)]">Upload a PDF and enter valid page groups.</p>
                  )}
                </div>

                {file && duplicatePages.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertTriangle size={16} />
                      Duplicate pages
                    </div>
                    Pages {duplicatePages.slice(0, 14).join(", ")} appear in more than one output group.
                  </div>
                ) : null}

                {file && unassignedPages.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium leading-6 text-amber-900">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <AlertTriangle size={16} />
                      Pages not included
                    </div>
                    {unassignedPages.length > 12
                      ? `${unassignedPages.length} pages are not included in the output groups.`
                      : `Pages ${unassignedPages.join(", ")} are not included.`}
                  </div>
                ) : null}

                {busyMode === "exporting" ? (
                  <div className="mt-4 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                      <span>Export progress</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {results.length > 0 ? (
                  <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-800">
                    <div className="mb-1 flex items-center gap-2 font-semibold">
                      <CheckCircle2 size={16} />
                      Last output
                    </div>
                    {results.length === 1
                      ? `1 PDF created • ${formatFileSize(results[0].outputSize)}.`
                      : `${results.length} PDFs created and packed into one ZIP.`}
                  </div>
                ) : null}

                <button type="button" onClick={handleSplit} disabled={!canSplit} className="btn-primary mt-5 w-full">
                  {busyMode === "exporting" ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Splitting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>{groups.length > 1 ? "Split & Download ZIP" : "Split & Download"}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)] shadow-[var(--shadow-soft)]">
                <div className="mb-1 flex items-center gap-2 font-semibold text-[var(--text-primary)]">
                  <Package size={16} />
                  Engine grouping
                </div>
                One group downloads as a PDF. Multiple groups download together as one ZIP file.
              </div>

              <div
                className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 shadow-[var(--shadow-soft)] ${
                  statusLooksLikeError
                    ? "border-red-100 bg-red-50 text-red-700"
                    : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={16} />
                  Status
                </div>
                {status}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </>
  );
}