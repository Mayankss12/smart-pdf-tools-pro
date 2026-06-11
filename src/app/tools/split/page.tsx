"use client";

import {
  type DragEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Download,
  FileText,
  Grid2X2,
  Layers,
  ListPlus,
  Loader2,
  MoreHorizontal,
  MousePointer2,
  Package,
  RotateCcw,
  Scissors,
  Upload,
  X,
} from "lucide-react";

import { Header } from "@/components/Header";
import { useEntitlement } from "@/hooks/useEntitlement";
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
type OpenPanel = "mode" | "presets" | "selection" | "help" | null;
type PerRow = 1 | 2 | 3 | 4 | 5;

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
        className="h-full rounded-full bg-violet-600 transition-all duration-300"
        style={{ width: `${safeValue}%` }}
      />
    </div>
  );
}

function IconButton({
  label,
  icon,
  onClick,
  disabled,
  active,
  danger,
}: {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`group relative flex h-9 w-9 items-center justify-center rounded-xl border bg-white transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
          : active
            ? "border-violet-300 bg-violet-50 text-violet-700"
            : "border-slate-200 text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
      }`}
    >
      {icon}
      <span className="pointer-events-none absolute top-full z-50 mt-2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition delay-300 group-hover:opacity-100">
        {label}
      </span>
    </button>
  );
}

function getGridClass(perRow: PerRow) {
  if (perRow === 1) return "grid-cols-1";
  if (perRow === 2) return "grid-cols-2";
  if (perRow === 3) return "grid-cols-2 md:grid-cols-3";
  if (perRow === 4) return "grid-cols-2 lg:grid-cols-4";
  return "grid-cols-2 lg:grid-cols-5";
}

export default function SplitPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const renderTokenRef = useRef(0);

  const { recordExport } = useEntitlement();

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
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [perRow, setPerRow] = useState<PerRow>(4);

  const busy = busyMode !== "idle";

  useEffect(() => {
    configurePdfWorker();
  }, []);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!toolbarRef.current) return;
      if (event.target instanceof Node && toolbarRef.current.contains(event.target)) return;

      setOpenPanel(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
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

  function togglePanel(nextPanel: OpenPanel) {
    setOpenPanel((current) => (current === nextPanel ? null : nextPanel));
  }

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
    setOpenPanel(null);
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
    setOpenPanel(null);
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
    setOpenPanel(null);
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
    setOpenPanel(null);
    setStatus(`Creating ${groups.length} split PDF${groups.length > 1 ? "s" : ""}...`);

    try {
      setExportProgress(30);
      const outputs = await splitPdfIntoGroups(file, groups);

      setExportProgress(72);
      setStatus("Checking export allowance...");

      const exportRecord = await recordExport({
        toolKey: "split",
        exportKind: "clean",
      });

      if (!exportRecord.allowed) {
        setResults([]);
        setExportProgress(0);

        const limitMessage =
          exportRecord.error ||
          (exportRecord.identityType === "guest"
            ? "Guest clean export limit reached for today. Sign in to get 5 clean exports/day."
            : `${exportRecord.planLabel} clean export limit reached for today.`);

        setStatus(limitMessage);
        return;
      }

      setResults(outputs);

      if (outputs.length === 1) {
        setExportProgress(86);
        downloadBlob(outputs[0].blob, outputs[0].fileName);
        setExportProgress(100);
        setStatus("Split completed. Downloaded 1 PDF.");
      } else {
        setExportProgress(80);
        setStatus(`Packaging ${outputs.length} PDFs into one ZIP...`);

        const zipBlob = await createZipBlob(
          outputs.map((output) => ({
            fileName: output.fileName,
            blob: output.blob,
          })),
        );

        setExportProgress(94);
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
    status.toLowerCase().includes("unable") ||
    status.toLowerCase().includes("limit") ||
    status.toLowerCase().includes("valid split");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(event) => handleFile(event.target.files?.[0])}
          />

          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Scissors size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Split PDF</h1>
              <p className="text-sm text-slate-500">
                Split one PDF into exact page groups with visual selection and ZIP export.
              </p>
            </div>
          </div>

          {file ? (
            <div
              ref={toolbarRef}
              className="relative z-40 mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {pageCount} page{pageCount === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-violet-100 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {groups.length} output{groups.length === 1 ? "" : "s"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {selectedPageSet.size}/{pageCount} included
                </span>
                {results.length ? (
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                    Created {results.length}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <IconButton
                  label="Select missing"
                  icon={<MousePointer2 size={16} />}
                  onClick={selectUnassignedPages}
                  disabled={busy || !unassignedPages.length}
                />

                <IconButton
                  label="Clear selection"
                  icon={<X size={16} />}
                  onClick={clearSelection}
                  disabled={busy || !selectedPages.length}
                  danger={selectedPages.length > 0}
                />

                <span className="mx-1 hidden h-7 w-px bg-slate-200 sm:inline-block" />

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("mode")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Grid2X2 size={15} />
                    {splitMode === "custom"
                      ? "Custom"
                      : splitMode === "each"
                        ? "Every page"
                        : splitMode === "chunk"
                          ? "Every N"
                          : "Odd/Even"}
                  </button>

                  {openPanel === "mode" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      {[
                        { id: "custom", label: "Custom groups", desc: "Use ranges like 1-4,5-8." },
                        { id: "each", label: "Every page", desc: "Create one PDF per page." },
                        { id: "chunk", label: "Every N pages", desc: "Split into equal page chunks." },
                        { id: "oddEven", label: "Odd / Even", desc: "Create odd and even page files." },
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
                          className={`w-full rounded-xl p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            splitMode === mode.id
                              ? "bg-violet-50 text-violet-700"
                              : "text-slate-600 hover:bg-violet-50"
                          }`}
                        >
                          <div className="text-sm font-bold">{mode.label}</div>
                          <div className="mt-1 text-xs font-medium leading-5">{mode.desc}</div>
                        </button>
                      ))}

                      {splitMode === "chunk" ? (
                        <label className="mt-3 block rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                            Split every <span>{splitEveryCount} pages</span>
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
                            className="mt-2 w-full"
                          />
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("selection")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ListPlus size={15} />
                    Group
                  </button>

                  {openPanel === "selection" ? (
                    <div className="absolute right-0 z-50 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                      <div className="rounded-xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">
                        {selectedSummary}
                      </div>

                      <button
                        type="button"
                        onClick={() => addSelectionToGroups(false)}
                        disabled={busy || !selectedPages.length}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <ListPlus size={15} />
                        Add as group
                      </button>

                      <button
                        type="button"
                        onClick={() => addSelectionToGroups(true)}
                        disabled={busy || !selectedPages.length}
                        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <Layers size={15} />
                        Replace groups
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel("presets")}
                    disabled={busy}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MoreHorizontal size={15} />
                    Presets
                  </button>

                  {openPanel === "presets" ? (
                    <div className="absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                      <button type="button" onClick={() => applyChunkPreset(2)} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40">
                        2-page sets
                      </button>
                      <button type="button" onClick={() => applyChunkPreset(4)} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40">
                        4-page sets
                      </button>
                      <button type="button" onClick={applyHalfPreset} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40">
                        First half + second half
                      </button>
                      <button type="button" onClick={applyCoverAndRestPreset} disabled={busy} className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40">
                        Cover + rest
                      </button>

                      <button
                        type="button"
                        onClick={clearFile}
                        disabled={!file || busy}
                        className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X size={15} />
                        Remove PDF
                      </button>
                    </div>
                  ) : null}
                </div>

                <IconButton
                  label="Reset groups"
                  icon={<RotateCcw size={16} />}
                  onClick={() => applyChunkPreset(Math.min(4, pageCount || 4))}
                  disabled={busy || !file}
                />

                <IconButton
                  label="Help"
                  icon={<CircleHelp size={16} />}
                  onClick={() => togglePanel("help")}
                  active={openPanel === "help"}
                />

                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={!canSplit}
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyMode === "exporting" ? <Loader2 className="animate-spin" size={17} /> : <Download size={17} />}
                  {busyMode === "exporting" ? "Splitting" : groups.length > 1 ? "Export ZIP" : "Export"}
                </button>
              </div>

              {openPanel === "help" ? (
                <div className="absolute right-3 top-full z-50 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 text-xs font-semibold leading-5 text-slate-600 shadow-xl">
                  Custom example: 1-4,5-8. Click pages, then Add Group or Replace. Multiple outputs download as one ZIP.
                </div>
              ) : null}
            </div>
          ) : null}

          <section
            onDrop={handleUploadDrop}
            onDragOver={(event) => event.preventDefault()}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="flex min-h-[400px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/35 text-center transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-[0_16px_34px_rgba(101,80,232,0.24)]">
                  {busyMode === "reading" || busyMode === "rendering" ? <Loader2 className="animate-spin" size={24} /> : <Upload size={24} />}
                </div>
                <div className="mt-5 text-lg font-bold text-slate-900">Drop PDF here</div>
                <div className="mt-2 text-sm font-medium text-slate-500">Browse file or drag and drop</div>
                <div className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
                  Visual groups · Range split · ZIP export
                </div>
              </button>
            ) : (
              <>
                <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-violet-200 bg-violet-50/55 px-4 py-3 text-sm font-bold text-violet-700 transition hover:border-violet-300 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-[160px]"
                  >
                    <Upload size={16} />
                    Change PDF
                  </button>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                      Per row
                    </span>
                    <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                      {([1, 2, 3, 4, 5] as PerRow[]).map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPerRow(value)}
                          disabled={busy}
                          className={`h-8 w-8 rounded-lg text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            perRow === value
                              ? "bg-violet-600 text-white shadow-sm"
                              : "text-slate-500 hover:bg-white hover:text-violet-700"
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                        Split groups
                      </div>
                      <div className="mt-1 truncate text-sm font-semibold text-slate-600">
                        {outputSummary}
                      </div>
                    </div>

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
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100 disabled:cursor-not-allowed disabled:opacity-50 lg:w-80"
                      />
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    {groupPlan.error ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-3 py-1.5 text-red-700">
                        <AlertTriangle size={13} />
                        {groupPlan.error}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                        <CheckCircle2 size={13} />
                        {groups.length} output group{groups.length === 1 ? "" : "s"} ready
                      </span>
                    )}

                    {duplicatePages.length ? (
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
                        Duplicate pages: {duplicatePages.join(", ")}
                      </span>
                    ) : null}

                    {unassignedPages.length ? (
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-500">
                        Missing: {unassignedPages.join(", ")}
                      </span>
                    ) : null}

                    {thumbnailStatus === "error" ? (
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
                        Thumbnails unavailable
                      </span>
                    ) : null}
                  </div>
                </div>

                {busyMode === "rendering" ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Rendering thumbnails {renderProgress.done}/{renderProgress.total}</span>
                      <span>{renderPercent}%</span>
                    </div>
                    <ProgressBar value={renderPercent} />
                  </div>
                ) : null}

                {busyMode === "exporting" ? (
                  <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-bold text-violet-700">
                      <span>Splitting PDF...</span>
                      <span>{exportProgress}%</span>
                    </div>
                    <ProgressBar value={exportProgress} />
                  </div>
                ) : null}

                {results.length ? (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                    <Package size={16} />
                    Created {results.length} output PDF{results.length === 1 ? "" : "s"}
                  </div>
                ) : null}

                <div className={`grid ${getGridClass(perRow)} gap-4`}>
                  {pageNumbers.length ? (
                    pageNumbers.map((pageNumber) => {
                      const isIncluded = selectedPageSet.has(pageNumber);
                      const isBuilderSelected = builderSelectedPageSet.has(pageNumber);
                      const badges = getGroupBadgesForPage(pageNumber, groups);

                      return (
                        <button
                          key={pageNumber}
                          type="button"
                          onClick={(event) => handlePageSelect(pageNumber, event)}
                          disabled={busy}
                          className={`group rounded-2xl border bg-white p-3 text-left shadow-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            isBuilderSelected
                              ? "border-violet-500 ring-4 ring-violet-100"
                              : isIncluded
                                ? "border-violet-200"
                                : "border-slate-200 hover:border-violet-300"
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-50 text-xs font-bold text-violet-700">
                              {pageNumber}
                            </div>

                            <div className="flex flex-wrap justify-end gap-1">
                              {badges.length ? (
                                badges.slice(0, 3).map((badge) => (
                                  <span
                                    key={badge}
                                    className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"
                                  >
                                    {badge}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">
                                  Missing
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                            <div className={`${perRow === 1 ? "min-h-[520px]" : "aspect-[3/4]"} flex items-center justify-center p-3`}>
                              {thumbnailUrls[pageNumber] ? (
                                <img
                                  src={thumbnailUrls[pageNumber]}
                                  alt={`Page ${pageNumber}`}
                                  className="max-h-full max-w-full rounded-xl object-contain shadow-sm"
                                  draggable={false}
                                />
                              ) : (
                                <div className="flex h-full min-h-[180px] w-full flex-col items-center justify-center text-center">
                                  <FileText className="text-violet-300" size={36} />
                                  <span className="mt-2 text-xs font-bold text-slate-400">
                                    Page {pageNumber}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="col-span-full flex min-h-[300px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                      <Loader2 className="animate-spin text-violet-600" size={24} />
                      <div className="mt-3 text-sm font-bold text-slate-700">
                        Preparing page previews...
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          <div className={`mt-3 truncate px-1 text-sm font-medium ${statusLooksLikeError ? "text-red-600" : "text-slate-500"}`}>
            {file && !statusLooksLikeError && busyMode === "idle"
              ? `${outputSummary} · ${selectedSummary}`
              : status}
          </div>
        </section>
      </main>
    </>
  );
}
