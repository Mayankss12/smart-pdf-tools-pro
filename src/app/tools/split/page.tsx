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
  ChevronDown,
  CircleHelp,
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
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
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

  const selectedSummary = useMemo(() => {
    if (!selectedPages.length) return "No page selected";
    return `${selectedPages.length} page${selectedPages.length === 1 ? "" : "s"} selected`;
  }, [selectedPages.length]);

  const outputSummary = useMemo(() => {
    if (groupPlan.error) return groupPlan.error;
    if (!file) return "No PDF loaded";
    if (!groups.length) return "No output group ready";
    return `${groups.length} output file${groups.length === 1 ? "" : "s"} · ${selectedPageSet.size}/${pageCount} pages included`;
  }, [file, groupPlan.error, groups.length, pageCount, selectedPageSet.size]);

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
        <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <section className="relative overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] px-4 py-5 shadow-[var(--shadow-soft)] sm:px-5 sm:py-6 lg:px-6">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(101,80,232,0.14)_0%,rgba(101,80,232,0.05)_38%,transparent_72%)]"
            />

            <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_14px_34px_rgba(101,80,232,0.18)]">
                  <Scissors size={20} />
                </div>

                <div>
                  <h1 className="display-font max-w-4xl text-[2rem] font-bold leading-[1.12] tracking-[-0.025em] text-[var(--text-primary)] sm:text-[2.45rem] lg:text-[2.8rem]">
                    Split PDFs into exact page groups.
                  </h1>
                  <p className="mt-3 max-w-3xl text-[15px] font-normal leading-7 text-[var(--text-secondary)]">
                    Upload one PDF, preview real page thumbnails, build groups visually or by range, then export PDFs or one ZIP.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[270px] grid-cols-3 divide-x divide-[var(--border-light)] rounded-[1.25rem] border border-[var(--border-light)] bg-white/92 p-3 text-center shadow-[var(--shadow-soft)] backdrop-blur">
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{pageCount || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Pages</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">{groups.length || "-"}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">Outputs</div>
                </div>
                <div className="px-3">
                  <div className="text-[1.25rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {results.length || selectedPageSet.size || "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    {results.length ? "Created" : "Included"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)]">
            <section className="min-h-[660px] bg-[var(--bg-base)] p-3 sm:p-4">
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
                className="cursor-pointer rounded-[1.25rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-4 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)] focus:border-[var(--border-focus)] focus:outline-none focus:ring-4 focus:ring-violet-100 aria-disabled:cursor-not-allowed aria-disabled:opacity-70"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white">
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} />}
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
                  <div className="mx-auto mt-3 max-w-md">
                    <ProgressBar value={renderPercent} />
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--violet-600)]">
                      Rendering thumbnails {renderProgress.done}/{renderProgress.total}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-[var(--shadow-soft)] sm:p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm font-normal text-[var(--text-secondary)]">
                    Click pages to select. Shift selects ranges, Ctrl toggles pages.
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        {splitMode === "custom"
                          ? "Custom groups"
                          : splitMode === "each"
                            ? "Every page"
                            : splitMode === "chunk"
                              ? "Every N pages"
                              : "Odd / Even"}
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute left-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
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
                            className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                              splitMode === mode.id
                                ? "bg-[var(--violet-50)] text-[var(--violet-600)]"
                                : "text-[var(--text-secondary)] hover:bg-[var(--violet-50)]"
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </details>

                    {splitMode === "custom" ? (
                      <input
                        value={pageInput}
                        onChange={(event) => {
                          setSplitMode("custom");
                          setPageInput(event.target.value);
                          setResults([]);
                        }}
                        placeholder="1-4,5-8"
                        disabled={busy}
                        className="h-10 w-52 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)] outline-none transition focus:border-[var(--border-focus)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    ) : null}

                    {splitMode === "chunk" ? (
                      <label className="inline-flex h-10 items-center gap-3 rounded-full border border-[var(--border-light)] bg-white px-4 text-sm font-semibold text-[var(--text-secondary)]">
                        Every {splitEveryCount}
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
                          className="w-28"
                        />
                      </label>
                    ) : null}

                    <details className="group relative">
                      <summary className="inline-flex cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] [&::-webkit-details-marker]:hidden">
                        More options
                        <ChevronDown size={15} className="transition group-open:rotate-180" />
                      </summary>

                      <div className="absolute right-0 z-30 mt-2 w-56 rounded-2xl border border-[var(--border-light)] bg-white p-2 shadow-[var(--shadow-card)]">
                        <button type="button" onClick={() => applyChunkPreset(2)} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">2-page sets</button>
                        <button type="button" onClick={() => applyChunkPreset(4)} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">4-page sets</button>
                        <button type="button" onClick={applyHalfPreset} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Halves</button>
                        <button type="button" onClick={applyCoverAndRestPreset} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">Cover + Rest</button>
                        <button type="button" onClick={selectUnassignedPages} disabled={busy || !unassignedPages.length} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">
                          <MousePointer2 size={15} />
                          Select missing
                        </button>
                        <button type="button" onClick={clearFile} disabled={!file || busy} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                          <X size={15} />
                          Remove PDF
                        </button>
                      </div>
                    </details>

                    <div className="group relative">
                      <button
                        type="button"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] transition hover:bg-[var(--violet-50)]"
                        aria-label="Split help"
                      >
                        <CircleHelp size={17} />
                      </button>
                      <div className="pointer-events-none absolute right-0 z-30 mt-2 w-72 rounded-2xl border border-[var(--border-light)] bg-white p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)] opacity-0 shadow-[var(--shadow-card)] transition group-hover:opacity-100">
                        Custom example: 1-4,5-8<br />
                        Click pages, then Add Group or Replace.<br />
                        Multiple outputs download as one ZIP.<br />
                        {outputSummary}
                      </div>
                    </div>

                    <button type="button" onClick={handleSplit} disabled={!canSplit} className="btn-primary px-4 py-2">
                      {busyMode === "exporting" ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          <span>Splitting</span>
                        </>
                      ) : (
                        <>
                          <Download size={18} />
                          <span>{groups.length > 1 ? "Export ZIP" : "Export"}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <span className={`rounded-full border px-3 py-1.5 ${groupPlan.error ? "border-red-100 bg-red-50 text-red-700" : "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]"}`}>
                    {outputSummary}
                  </span>

                  {duplicatePages.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
                      <AlertTriangle size={13} />
                      Duplicate: {duplicatePages.slice(0, 8).join(", ")}
                    </span>
                  ) : null}

                  {unassignedPages.length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-amber-900">
                      <AlertTriangle size={13} />
                      Missing: {unassignedPages.length > 8 ? `${unassignedPages.length} pages` : unassignedPages.join(", ")}
                    </span>
                  ) : null}
                </div>

                {busyMode === "exporting" ? (
                  <div className="mt-3 rounded-2xl border border-[var(--violet-border)] bg-[var(--violet-50)] p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-[var(--violet-600)]">
                      <span>Exporting</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {results.length > 0 ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <CheckCircle2 size={16} />
                    {results.length === 1
                      ? `1 PDF created • ${formatFileSize(results[0].outputSize)}`
                      : `${results.length} PDFs packed into ZIP`}
                  </div>
                ) : null}

                {busyMode === "reading" ? (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-[var(--violet-border)] bg-[var(--violet-50)]">
                    <div className="flex items-center gap-2 rounded-full border border-[var(--violet-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--violet-600)] shadow-[var(--shadow-soft)]">
                      <Loader2 className="animate-spin" size={18} />
                      Reading PDF
                    </div>
                  </div>
                ) : pageNumbers.length > 0 ? (
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
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
                          className={`group overflow-hidden rounded-[1.25rem] border bg-white p-3 text-left shadow-sm outline-none transition hover:border-[var(--violet-border)] focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-70 ${
                            isBuilderSelected
                              ? "border-[var(--violet-600)] ring-4 ring-violet-100"
                              : isIncluded
                                ? "border-[var(--violet-border)]"
                                : "border-[var(--border-light)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--violet-50)] text-xs font-bold text-[var(--violet-600)]">
                                {pageNumber}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-[var(--text-primary)]">Page {pageNumber}</div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                                  {isIncluded ? "Included" : "Not included"}
                                </div>
                              </div>
                            </div>

                            {badges.length ? (
                              <div className="flex flex-wrap justify-end gap-1">
                                {badges.slice(0, 2).map((badge) => (
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

                          <div className="overflow-hidden rounded-2xl border border-[var(--border-light)] bg-[var(--bg-base)]">
                            <div className="flex aspect-[3/4] items-center justify-center">
                              {thumbnailUrls[pageNumber] ? (
                                <img
                                  src={thumbnailUrls[pageNumber]}
                                  alt={`PDF page ${pageNumber}`}
                                  className="h-full w-full object-contain"
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
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 flex min-h-80 items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--violet-border)] bg-[var(--violet-50)]/52 text-center">
                    <div>
                      <FileText className="mx-auto text-[var(--violet-400)]" size={42} />
                      <div className="mt-3 text-[15px] font-semibold text-[var(--text-primary)]">No PDF loaded</div>
                      <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">Upload a PDF to build split groups visually.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className={`mt-3 px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-[var(--text-secondary)]"}`}>
            {status}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs font-semibold text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1">
              <Package size={14} />
              One group downloads as PDF. Multiple groups download as ZIP.
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers size={14} />
              {groups.length || 0} output group{groups.length === 1 ? "" : "s"}.
            </span>
          </div>

          {selectedPages.length > 0 ? (
            <div className="fixed inset-x-0 bottom-5 z-40 mx-auto flex w-[calc(100%-2rem)] max-w-3xl flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-white/95 px-3 py-2 text-sm font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-card)] backdrop-blur">
              <span className="px-2 text-[var(--violet-600)]">{selectedSummary}</span>
              <button type="button" onClick={() => addSelectionToGroups(false)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">
                <ListPlus className="mr-1 inline" size={14} />
                Add Group
              </button>
              <button type="button" onClick={() => addSelectionToGroups(true)} disabled={busy} className="rounded-full px-3 py-1.5 transition hover:bg-[var(--violet-50)] disabled:cursor-not-allowed disabled:opacity-40">
                Replace
              </button>
              <button type="button" onClick={clearSelection} disabled={busy} className="rounded-full px-3 py-1.5 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40">
                ✕ Clear
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </>
  );
}
