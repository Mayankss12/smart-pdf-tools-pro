"use client";

import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import {
  exportEditorPdfBytes,
  safeEditedName,
} from "../../lib/pdf-tools/editor-export-engine";
import { EditorCanvas } from "./components/EditorCanvas";
import { EditorLeftPanel } from "./components/EditorLeftPanel";
import { EditorStatusBar } from "./components/EditorStatusBar";
import { EditorTopBar } from "./components/EditorTopBar";
import { useEditor } from "./hooks/useEditor";

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
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

      const editedBytes = await exportEditorPdfBytes({
        fileBytes,
        objects: editor.objects,
      });

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

  function handleUnavailableTool(label: string) {
    setStatusMessage(`${label} is locked in this private editor build.`);
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
        onUnavailableTool={handleUnavailableTool}
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
