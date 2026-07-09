"use client";

import {
  Download,
  FileText,
  Highlighter,
  Loader2,
  Paintbrush,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  PdfHighlighter,
  PdfLoader,
  TextHighlight,
  exportPdf,
  useHighlightContainerContext,
} from "react-pdf-highlighter-plus";
import type {
  GhostHighlight,
  Highlight,
  HighlightType,
  PdfSelection,
  TextHighlightStyle,
  ViewportHighlight,
} from "react-pdf-highlighter-plus";

import { Header } from "@/components/Header";
import { ToolPageHeader } from "@/components/ToolPageHeader";

const DEFAULT_HIGHLIGHT_COLOR = "rgba(255, 226, 143, 1)";
const HIGHLIGHT_COLORS = [
  { label: "Yellow", value: "rgba(255, 226, 143, 1)" },
  { label: "Green", value: "rgba(200, 230, 201, 1)" },
  { label: "Blue", value: "rgba(187, 222, 251, 1)" },
  { label: "Pink", value: "rgba(248, 187, 208, 1)" },
  { label: "Purple", value: "rgba(225, 190, 231, 1)" },
] as const;

type PdfMantraHighlight = Highlight & {
  id: string;
  type: Extract<HighlightType, "text">;
  highlightColor: string;
  highlightStyle: NonNullable<TextHighlightStyle["highlightStyle"]>;
  content: GhostHighlight["content"];
};

function createStatusClassName(tone: "info" | "success" | "error"): string {
  if (tone === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800";
  }

  if (tone === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-[var(--violet-border)] bg-[var(--violet-50)] text-[var(--violet-600)]";
}

function createId(): string {
  return crypto.randomUUID();
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function getPreviewText(highlight: PdfMantraHighlight): string {
  const text = highlight.content?.text?.replace(/\s+/g, " ").trim();

  if (!text) {
    return "Text highlight";
  }

  return text.length > 92 ? `${text.slice(0, 89)}...` : text;
}

function HighlightRenderer({
  onDelete,
  onStyleChange,
}: {
  onDelete: (id: string) => void;
  onStyleChange: (id: string, style: TextHighlightStyle) => void;
}) {
  const { highlight, isScrolledTo } =
    useHighlightContainerContext<PdfMantraHighlight>();

  const viewportHighlight = highlight as ViewportHighlight<PdfMantraHighlight>;

  return (
    <TextHighlight
      highlight={viewportHighlight}
      isScrolledTo={isScrolledTo}
      highlightColor={highlight.highlightColor}
      highlightStyle={highlight.highlightStyle}
      copyText={highlight.content?.text}
      onDelete={() => onDelete(highlight.id)}
      onStyleChange={(style) => onStyleChange(highlight.id, style)}
      colorPresets={HIGHLIGHT_COLORS.map((item) => item.value)}
    />
  );
}

export function HighlightPlusToolPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [documentBytes, setDocumentBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [highlights, setHighlights] = useState<PdfMantraHighlight[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>(
    DEFAULT_HIGHLIGHT_COLOR,
  );
  const [selectedStyle, setSelectedStyle] = useState<
    NonNullable<TextHighlightStyle["highlightStyle"]>
  >("highlight");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState(
    "Upload a PDF, select text, and PDFMantra will save the highlight using the latest Plus engine.",
  );
  const [statusTone, setStatusTone] = useState<"info" | "success" | "error">(
    "info",
  );

  const highlightedTextCount = useMemo(
    () => highlights.filter((highlight) => Boolean(highlight.content?.text)).length,
    [highlights],
  );

  function updateStatus(
    nextStatus: string,
    tone: "info" | "success" | "error" = "info",
  ) {
    setStatus(nextStatus);
    setStatusTone(tone);
  }

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      updateStatus("Please choose a valid PDF file.", "error");
      return;
    }

    setBusy(true);
    updateStatus("Reading PDF and opening the Plus highlight workspace...", "info");

    try {
      const bytes = new Uint8Array(await file.arrayBuffer());

      setDocumentBytes(bytes);
      setFileName(file.name);
      setFileSize(file.size);
      setHighlights([]);
      updateStatus(
        "PDF ready. Select any text in the viewer to create a highlight immediately.",
        "success",
      );
    } catch (error) {
      console.error(error);
      updateStatus("Unable to read this PDF. Please try another file.", "error");
    } finally {
      setBusy(false);
    }
  }

  function clearWorkspace() {
    setDocumentBytes(null);
    setFileName("");
    setFileSize(0);
    setHighlights([]);
    setSelectedColor(DEFAULT_HIGHLIGHT_COLOR);
    setSelectedStyle("highlight");
    updateStatus(
      "Upload a PDF, select text, and PDFMantra will save the highlight using the latest Plus engine.",
      "info",
    );
  }

  function createHighlight(selection: PdfSelection) {
    const ghostHighlight = selection.makeGhostHighlight();

    const nextHighlight: PdfMantraHighlight = {
      ...ghostHighlight,
      id: createId(),
      type: "text",
      content: ghostHighlight.content,
      highlightColor: selectedColor,
      highlightStyle: selectedStyle,
    };

    setHighlights((current) => [nextHighlight, ...current]);
    updateStatus(
      `Text highlight added. ${highlights.length + 1} mark${highlights.length + 1 === 1 ? "" : "s"} ready for export.`,
      "success",
    );
  }

  function deleteHighlight(id: string) {
    setHighlights((current) => current.filter((highlight) => highlight.id !== id));
    updateStatus("Highlight removed.", "success");
  }

  function updateHighlightStyle(id: string, style: TextHighlightStyle) {
    setHighlights((current) =>
      current.map((highlight) =>
        highlight.id === id
          ? {
              ...highlight,
              highlightColor: style.highlightColor ?? highlight.highlightColor,
              highlightStyle: style.highlightStyle ?? highlight.highlightStyle,
            }
          : highlight,
      ),
    );
    updateStatus("Highlight style updated.", "success");
  }

  async function handleExport() {
    if (!documentBytes) {
      updateStatus("Upload a PDF first.", "error");
      return;
    }

    if (highlights.length === 0) {
      updateStatus("Add at least one text highlight before exporting.", "info");
      return;
    }

    setExporting(true);
    updateStatus("Embedding highlights into the PDF export...", "info");

    try {
      const output = await exportPdf(documentBytes, highlights, {
        textHighlightColor: selectedColor,
        areaHighlightColor: selectedColor,
      });
      const cleanName = fileName.replace(/\.pdf$/i, "") || "PDFMantra-highlight-plus";

      downloadPdf(output, `${cleanName}-highlighted-plus.pdf`);
      updateStatus("Export complete. The highlighted PDF download has started.", "success");
    } catch (error) {
      console.error(error);
      updateStatus(
        "Plus-engine export failed. This branch exists to test compatibility before adopting it as the final Highlight tool.",
        "error",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <ToolPageHeader
            icon={Highlighter}
            eyebrow="PDFMantra Highlight Plus Prototype"
            title="Test the latest Plus highlighter inside PDFMantra."
            description="This isolated branch evaluates the latest react-pdf-highlighter-plus engine for our standalone Highlight PDF tool before we decide whether to replace or merge it with PDFMantra’s existing Smart Highlight engine."
            meta={
              <div className="grid min-w-[220px] grid-cols-3 divide-x divide-[var(--border-light)] text-center">
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {documentBytes ? "Open" : "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    PDF
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {highlights.length || "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Marks
                  </div>
                </div>
                <div className="px-3">
                  <div className="text-[1.35rem] font-bold tracking-[-0.03em] text-[var(--text-primary)]">
                    {highlightedTextCount || "-"}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                    Text
                  </div>
                </div>
              </div>
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </ToolPageHeader>

          <div className="mt-6 grid overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-[var(--bg-card)] shadow-[var(--shadow-card)] xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="min-h-[820px] border-r border-[var(--border-light)] bg-[var(--bg-base)] p-5 sm:p-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={(event) => {
                  event.preventDefault();
                  handleFile(event.dataTransfer.files?.[0]);
                }}
                onDragOver={(event) => event.preventDefault()}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    fileInputRef.current?.click();
                  }
                }}
                className="cursor-pointer rounded-[1.5rem] border-2 border-dashed border-[var(--violet-border)] bg-[var(--bg-card)] p-6 text-center shadow-[var(--shadow-soft)] transition hover:border-[var(--border-focus)] hover:bg-[var(--violet-50)]"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--violet-600)] text-white shadow-[0_16px_36px_rgba(101,80,232,0.20)]">
                  <FileText size={22} />
                </div>

                <div className="font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  {fileName || "Drop PDF here"}
                </div>

                <div className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                  {fileName
                    ? `${formatFileSize(fileSize)} · latest Plus prototype workspace`
                    : "Click here or drag a PDF to test the latest highlighter integration."}
                </div>

                <div className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-4 py-2 text-sm font-semibold text-[var(--violet-600)]">
                  <Upload size={17} />
                  Choose PDF
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.75rem] border border-[var(--border-light)] bg-white shadow-[var(--shadow-soft)]">
                {busy ? (
                  <div className="flex min-h-[620px] items-center justify-center bg-[var(--bg-card)]">
                    <div className="flex items-center gap-3 rounded-full border border-[var(--violet-border)] bg-[var(--violet-50)] px-5 py-4 text-sm font-semibold text-[var(--violet-600)]">
                      <Loader2 className="animate-spin" size={18} />
                      Preparing Plus viewer
                    </div>
                  </div>
                ) : documentBytes ? (
                  <div className="h-[720px] bg-[#e5e7eb]">
                    <PdfLoader document={documentBytes}>
                      {(pdfDocument) => (
                        <PdfHighlighter
                          pdfDocument={pdfDocument}
                          highlights={highlights}
                          utilsRef={() => undefined}
                          onSelection={createHighlight}
                          pdfScaleValue="page-width"
                          textSelectionColor={selectedColor}
                          theme={{ mode: "light" }}
                          style={{ height: "100%" }}
                        >
                          <HighlightRenderer
                            onDelete={deleteHighlight}
                            onStyleChange={updateHighlightStyle}
                          />
                        </PdfHighlighter>
                      )}
                    </PdfLoader>
                  </div>
                ) : (
                  <div className="flex min-h-[620px] items-center justify-center bg-[var(--bg-card)] text-center">
                    <div className="max-w-md px-6">
                      <Highlighter className="mx-auto text-[var(--violet-400)]" size={42} />
                      <h2 className="display-font mt-4 text-2xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                        Upload a PDF to test Plus highlighting
                      </h2>
                      <p className="mt-2 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                        The first prototype focuses on text selection, inline style changes, delete, and built-in PDF export from the latest Plus package.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <aside className="bg-[var(--bg-card)] p-5 sm:p-6">
              <div className="rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-panel)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="display-font text-xl font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Plus Engine Controls
                    </h2>
                    <p className="mt-1 text-sm font-normal leading-6 text-[var(--text-secondary)]">
                      These defaults apply when you select new text in the viewer. Existing highlights also expose their own inline style toolbar.
                    </p>
                  </div>
                  {documentBytes && (
                    <button
                      type="button"
                      onClick={clearWorkspace}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-700 transition hover:bg-red-100"
                      aria-label="Remove PDF"
                    >
                      <X size={17} />
                    </button>
                  )}
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">New highlight color</div>
                  <div className="mt-3 grid grid-cols-5 gap-2">
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.label}
                        type="button"
                        onClick={() => setSelectedColor(color.value)}
                        className={`h-11 rounded-2xl border transition ${
                          selectedColor === color.value
                            ? "border-[var(--text-primary)] ring-2 ring-[rgba(24,21,46,0.12)]"
                            : "border-[var(--border-light)] hover:border-[var(--border-focus)]"
                        }`}
                        style={{ backgroundColor: color.value }}
                        aria-label={`Use ${color.label} highlight`}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">New highlight style</div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["highlight", "underline", "strikethrough"] as const).map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setSelectedStyle(style)}
                        className={`rounded-full border px-3 py-3 text-xs font-semibold capitalize transition ${
                          selectedStyle === style
                            ? "border-[var(--text-primary)] bg-[var(--violet-50)] text-[var(--violet-600)]"
                            : "border-[var(--border-light)] bg-white text-[var(--text-secondary)] hover:border-[var(--border-focus)]"
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || !documentBytes || highlights.length === 0}
                  className="btn-primary mt-5 w-full"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="animate-spin" size={18} />
                      <span>Exporting</span>
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      <span>Export Plus Highlighted PDF</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-5 rounded-[1.5rem] border border-[var(--border-light)] bg-[var(--bg-card)] p-5 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="display-font text-lg font-bold tracking-[-0.02em] text-[var(--text-primary)]">
                      Prototype Highlights
                    </h3>
                    <p className="mt-1 text-sm font-normal text-[var(--text-secondary)]">
                      {highlights.length === 0
                        ? "No highlights created yet."
                        : `${highlights.length} highlight${highlights.length === 1 ? "" : "s"} captured by the Plus engine.`}
                    </p>
                  </div>
                  {highlights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlights([]);
                        updateStatus("All prototype highlights cleared.", "success");
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      <Trash2 size={14} />
                      Clear
                    </button>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {highlights.length === 0 ? (
                    <div className="rounded-[1.25rem] border border-[var(--border-light)] bg-[var(--violet-50)] p-4 text-sm font-medium leading-6 text-[var(--text-secondary)]">
                      Select PDF text in the viewer. The highlight will be saved instantly and can be restyled from the inline toolbar.
                    </div>
                  ) : (
                    highlights.map((highlight) => (
                      <div
                        key={highlight.id}
                        className="rounded-[1.25rem] border border-[var(--border-light)] bg-white p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
                            <Paintbrush size={15} />
                            Text highlight
                          </div>
                          <div
                            className="h-5 w-5 rounded-full border border-white shadow-sm"
                            style={{ backgroundColor: highlight.highlightColor }}
                          />
                        </div>
                        <p className="mt-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">
                          {getPreviewText(highlight)}
                        </p>
                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
                          {highlight.highlightStyle}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteHighlight(highlight.id)}
                          className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={`mt-5 rounded-[1.5rem] border p-4 text-sm font-medium leading-6 ${createStatusClassName(statusTone)}`}>
                <div className="mb-1 flex items-center gap-2 font-semibold">
                  <Highlighter size={16} />
                  Prototype status
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
