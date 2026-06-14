"use client";

import { useMemo, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  AlignLeft,
  Download,
  FileText,
  Loader2,
  RefreshCcw,
  Settings2,
  Type,
} from "lucide-react";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

type PageSize = "a4" | "letter";
type FontChoice = "helvetica" | "times" | "courier";

const PAGE_SIZES: Record<PageSize, { label: string; width: number; height: number }> = {
  a4: { label: "A4", width: 595.28, height: 841.89 },
  letter: { label: "Letter", width: 612, height: 792 },
};

const SAMPLE_TEXT =
  "Paste or type your text here.\n\nThis tool converts plain text into a clean PDF document in your browser.";

function getFont(fontChoice: FontChoice) {
  if (fontChoice === "times") return StandardFonts.TimesRoman;
  if (fontChoice === "courier") return StandardFonts.Courier;
  return StandardFonts.Helvetica;
}

function safeFileName(value: string) {
  const cleaned = value
    .trim()
    .replace(/[^a-zA-Z0-9\s-_]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return cleaned || "text-to-pdf";
}

function splitLongWord(
  word: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
) {
  const parts: string[] = [];
  let current = "";

  for (const character of word) {
    const next = current + character;

    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
    } else {
      if (current) parts.push(current);
      current = character;
    }
  }

  if (current) parts.push(current);
  return parts;
}

function wrapTextLine(
  line: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (text: string, size: number) => number },
  fontSize: number,
) {
  if (!line.trim()) return [""];

  const words = line.split(/\s+/);
  const wrapped: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      wrapped.push(currentLine);
      currentLine = "";
    }

    if (font.widthOfTextAtSize(word, fontSize) > maxWidth) {
      wrapped.push(...splitLongWord(word, maxWidth, font, fontSize));
    } else {
      currentLine = word;
    }
  }

  if (currentLine) wrapped.push(currentLine);
  return wrapped;
}

function downloadPdf(bytes: Uint8Array, fileName: string) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

export default function TextToPdfPage() {
  const [text, setText] = useState(SAMPLE_TEXT);
  const [title, setTitle] = useState("Text Document");
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [fontChoice, setFontChoice] = useState<FontChoice>("helvetica");
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(18);
  const [margin, setMargin] = useState(54);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Type or paste text to convert it into PDF.");

  const pageMeta = PAGE_SIZES[pageSize];

  const estimatedLines = useMemo(() => {
    return text.split("\n").length;
  }, [text]);

  async function handleCreatePdf() {
    if (!text.trim()) {
      setStatus("Please enter text before creating a PDF.");
      return;
    }

    setBusy(true);
    setStatus("Creating PDF from text...");

    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(getFont(fontChoice));
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const usableWidth = pageMeta.width - margin * 2;
      const titleHeight = title.trim() ? 32 : 0;
      const lineStep = Math.max(lineHeight, fontSize + 4);

      let page = pdfDoc.addPage([pageMeta.width, pageMeta.height]);
      let cursorY = pageMeta.height - margin;

      if (title.trim()) {
        page.drawText(title.trim(), {
          x: margin,
          y: cursorY,
          size: Math.max(fontSize + 5, 16),
          font: boldFont,
          color: rgb(0.08, 0.07, 0.18),
        });
        cursorY -= titleHeight;
      }

      const rawLines = text.replace(/\r\n/g, "\n").split("\n");

      for (const rawLine of rawLines) {
        const wrappedLines = wrapTextLine(rawLine, usableWidth, font, fontSize);

        for (const line of wrappedLines) {
          if (cursorY < margin) {
            page = pdfDoc.addPage([pageMeta.width, pageMeta.height]);
            cursorY = pageMeta.height - margin;
          }

          if (line) {
            page.drawText(line, {
              x: margin,
              y: cursorY,
              size: fontSize,
              font,
              color: rgb(0.12, 0.13, 0.18),
            });
          }

          cursorY -= lineStep;
        }
      }

      const pageCount = pdfDoc.getPageCount();
      const pages = pdfDoc.getPages();

      pages.forEach((pdfPage, index) => {
        const footer = `Page ${index + 1} of ${pageCount}`;
        const footerWidth = font.widthOfTextAtSize(footer, 9);

        pdfPage.drawText(footer, {
          x: pageMeta.width - margin - footerWidth,
          y: Math.max(22, margin / 2),
          size: 9,
          font,
          color: rgb(0.45, 0.45, 0.55),
        });
      });

      const bytes = await pdfDoc.save();
      downloadPdf(bytes, `PDFMantra-${safeFileName(title)}.pdf`);

      setStatus(`PDF created successfully with ${pageCount} page${pageCount === 1 ? "" : "s"}. Download started.`);
    } catch {
      setStatus("Unable to create PDF from this text. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function resetTool() {
    setText(SAMPLE_TEXT);
    setTitle("Text Document");
    setPageSize("a4");
    setFontChoice("helvetica");
    setFontSize(12);
    setLineHeight(18);
    setMargin(54);
    setStatus("Tool reset. Type or paste text to convert it into PDF.");
  }

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <FileText size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Text to PDF</h1>
              <p className="text-sm text-slate-500">Convert plain text into a clean PDF document.</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <Type size={16} />
                  Document title
                </span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  placeholder="Enter document title"
                />
              </label>

              <label className="mt-4 block">
                <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <AlignLeft size={16} />
                  Text content
                </span>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  className="min-h-[520px] w-full resize-y rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  placeholder="Paste text here..."
                />
              </label>

              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
                status.toLowerCase().includes("unable") || status.toLowerCase().includes("please")
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-violet-100 bg-violet-50 text-violet-700"
              }`}>
                {status}
              </div>
            </section>

            <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Settings2 size={17} className="text-violet-600" />
                <h2 className="text-base font-bold text-slate-900">PDF settings</h2>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Page size</span>
                  <select
                    value={pageSize}
                    onChange={(event) => setPageSize(event.target.value as PageSize)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Font</span>
                  <select
                    value={fontChoice}
                    onChange={(event) => setFontChoice(event.target.value as FontChoice)}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
                  >
                    <option value="helvetica">Helvetica</option>
                    <option value="times">Times</option>
                    <option value="courier">Courier</option>
                  </select>
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    Font size <span>{fontSize}px</span>
                  </span>
                  <input
                    type="range"
                    min={9}
                    max={22}
                    value={fontSize}
                    onChange={(event) => setFontSize(Number(event.target.value))}
                    className="mt-3 w-full"
                  />
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    Line height <span>{lineHeight}px</span>
                  </span>
                  <input
                    type="range"
                    min={14}
                    max={34}
                    value={lineHeight}
                    onChange={(event) => setLineHeight(Number(event.target.value))}
                    className="mt-3 w-full"
                  />
                </label>

                <label className="block">
                  <span className="flex justify-between text-xs font-bold uppercase tracking-[0.08em] text-slate-400">
                    Margin <span>{margin}px</span>
                  </span>
                  <input
                    type="range"
                    min={28}
                    max={90}
                    value={margin}
                    onChange={(event) => setMargin(Number(event.target.value))}
                    className="mt-3 w-full"
                  />
                </label>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                {estimatedLines} source line{estimatedLines === 1 ? "" : "s"} - {pageMeta.label} - Browser-side PDF creation
              </div>

              <div className="mt-5 grid gap-2">
                <button
                  type="button"
                  onClick={handleCreatePdf}
                  disabled={busy}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 text-sm font-bold text-white shadow-[0_12px_26px_rgba(101,80,232,0.22)] transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                  {busy ? "Creating PDF" : "Create PDF"}
                </button>

                <button
                  type="button"
                  onClick={resetTool}
                  disabled={busy}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RefreshCcw size={16} />
                  Reset
                </button>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}