"use client";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { EditorCanvas } from "./components/EditorCanvas";
import { EditorLeftPanel } from "./components/EditorLeftPanel";
import { EditorStatusBar } from "./components/EditorStatusBar";
import { EditorTopBar } from "./components/EditorTopBar";
import { useEditor, type EditorObject } from "./hooks/useEditor";

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const fallback = { r: 17 / 255, g: 24 / 255, b: 39 / 255 };

  if (normalized.length !== 6) return fallback;

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  if ([r, g, b].some((value) => Number.isNaN(value))) return fallback;

  return { r, g, b };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function safeEditedName(fileName: string) {
  const cleanName = fileName.replace(/\.pdf$/i, "");
  return `PDFMantra-edited-${cleanName}.pdf`;
}

function drawEditorObject(page: any, object: EditorObject, font: any) {
  const pageHeight = page.getHeight();

  if (object.type === "text") {
    const color = hexToRgb(object.data.color || "#111827");
    const fontSize = object.data.fontSize || 16;

    page.drawText(object.data.text || "", {
      x: object.box.x,
      y: pageHeight - object.box.y - fontSize,
      size: fontSize,
      font,
      color: rgb(color.r, color.g, color.b),
    });

    return;
  }

  if (object.type === "highlight") {
    const color = hexToRgb(object.data.backgroundColor || "#fde047");

    page.drawRectangle({
      x: object.box.x,
      y: pageHeight - object.box.y - object.box.height,
      width: object.box.width,
      height: object.box.height,
      color: rgb(color.r, color.g, color.b),
      opacity: object.data.opacity ?? 0.45,
    });

    return;
  }

  if (object.type === "whiteout") {
    page.drawRectangle({
      x: object.box.x,
      y: pageHeight - object.box.y - object.box.height,
      width: object.box.width,
      height: object.box.height,
      color: rgb(1, 1, 1),
      opacity: 1,
    });
  }
}

export default function EditorPage() {
  const editor = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [statusMessage, setStatusMessage] = useState("Open a PDF to start editing.");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    configurePdfWorker();

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      editor.setLeftPanelCollapsed(true);
    }
    // Run only once on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function loadPdfFile(file: File) {
    if (loading) return;

    if (!isPdfFile(file)) {
      setStatusMessage("Please select a valid PDF file.");
      return;
    }

    try {
      setLoading(true);
      setStatusMessage("Loading PDF...");

      configurePdfWorker();

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      setFileBytes(bytes);
      editor.setFile(file);
      editor.setPdfDocument(pdfDocument);
      editor.setActivePage(1);
      editor.setActiveTool("select");
      editor.markSaved();

      setStatusMessage(`Ready: ${file.name}`);
    } catch (error) {
      setFileBytes(null);
      editor.resetEditor();
      setStatusMessage(error instanceof Error ? error.message : "Unable to load this PDF.");
    } finally {
      setLoading(false);
    }
  }

  async function exportEditedPdf() {
    if (!editor.file || !fileBytes) {
      setStatusMessage("Open a PDF before exporting.");
      return;
    }

    try {
      setLoading(true);
      editor.markSaving();
      setStatusMessage("Exporting edited PDF...");

      const pdfDoc = await PDFDocument.load(fileBytes);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();

      editor.objects.forEach((object) => {
        const page = pages[object.pageNumber - 1];
        if (!page) return;

        drawEditorObject(page, object, font);
      });

      const editedBytes = await pdfDoc.save();

      const blob = new Blob([editedBytes as unknown as BlobPart], {
        type: "application/pdf",
      });

      downloadBlob(blob, safeEditedName(editor.file.name));

      editor.markSaved();
      setStatusMessage("Edited PDF exported successfully.");
    } catch (error) {
      editor.markChanged(0);
      setStatusMessage(error instanceof Error ? error.message : "Unable to export edited PDF.");
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    setStatusMessage("Share will be connected in backend phase.");
  }

  function handleComingSoon(label: string) {
    setStatusMessage(`${label} tool is planned for the next editor phase.`);
  }

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-[#f5f7fb] text-slate-950">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void loadPdfFile(file);
          }

          event.currentTarget.value = "";
        }}
      />

      <EditorTopBar
        editor={editor}
        onOpenFile={openFilePicker}
        onExport={exportEditedPdf}
        onShare={handleShare}
        onUnavailableTool={handleComingSoon}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftPanel editor={editor} onOpenFile={openFilePicker} />

        <EditorCanvas
          editor={editor}
          onOpenFile={openFilePicker}
          onFileDrop={loadPdfFile}
        />
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-1.5 text-[11px] font-black text-slate-500">
        {loading ? "Please wait - " : ""}
        {statusMessage}
      </div>

      <EditorStatusBar editor={editor} />
    </div>
  );
}