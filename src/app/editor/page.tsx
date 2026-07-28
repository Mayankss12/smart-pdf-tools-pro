"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

import {
  exportEditorPdfBytes,
  safeEditedName,
} from "../../lib/pdf-tools/editor-export-engine";
import { EditorCanvas } from "./components/EditorCanvas";
import { EditorLayerControls } from "./components/EditorLayerControls";
import { EditorLeftPanel } from "./components/EditorLeftPanel";
import { EditorStatusBar } from "./components/EditorStatusBar";
import {
  EditorSmartToolsPanel,
  type EditorFindHighlight,
  type EditorOcrPageResult,
} from "./components/EditorSmartToolsPanel";
import { EditorTopBar } from "./components/EditorTopBar";
import { useEditor } from "./hooks/useEditor";
import { useEditorKeyboard } from "./hooks/useEditorKeyboard";

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
  const setLeftPanelCollapsed = editor.setLeftPanelCollapsed;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const loadGenerationRef = useRef(0);

  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [statusMessage, setStatusMessage] = useState("Open a PDF to start editing.");
  const [loading, setLoading] = useState(false);
  const [ocrPages, setOcrPages] = useState<EditorOcrPageResult[]>([]);
  const [findHighlight, setFindHighlight] = useState<EditorFindHighlight | null>(null);

  useEditorKeyboard(editor);

  useEffect(() => {
    configurePdfJsWorker(pdfjsLib);

    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) {
      setLeftPanelCollapsed(true);
    }

    return () => {
      loadGenerationRef.current += 1;
      const documentToDestroy = pdfDocumentRef.current;
      pdfDocumentRef.current = null;
      void documentToDestroy?.destroy();
    };
  }, [setLeftPanelCollapsed]);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function loadPdfFile(file: File) {
    if (!isPdfFile(file)) {
      setStatusMessage("Please select a valid PDF file.");
      return;
    }

    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;
    let loadedDocument: PDFDocumentProxy | null = null;

    try {
      setLoading(true);
      setStatusMessage("Loading PDF...");

      configurePdfJsWorker(pdfjsLib);

      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      loadedDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      if (loadGenerationRef.current !== loadGeneration) {
        await loadedDocument.destroy();
        return;
      }

      const previousDocument = pdfDocumentRef.current;
      pdfDocumentRef.current = loadedDocument;
      setFileBytes(bytes);
      setOcrPages([]);
      setFindHighlight(null);
      editor.setFile(file);
      editor.setPdfDocument(loadedDocument);
      editor.setActivePage(1);
      editor.setActiveTool("select");
      void previousDocument?.destroy();

      setStatusMessage(`Ready: ${file.name}`);
    } catch (error) {
      if (loadGenerationRef.current !== loadGeneration) return;

      if (loadedDocument && pdfDocumentRef.current !== loadedDocument) {
        await loadedDocument.destroy();
      }
      setFileBytes(null);
      editor.resetEditor();
      setStatusMessage(error instanceof Error ? error.message : "Unable to load this PDF.");
    } finally {
      if (loadGenerationRef.current === loadGeneration) {
        setLoading(false);
      }
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
        ocrPages,
      });

      const blob = new Blob([new Uint8Array(editedBytes).buffer], {
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

      <EditorLayerControls editor={editor} />
      <EditorSmartToolsPanel
        editor={editor}
        ocrPages={ocrPages}
        onOcrPagesChange={setOcrPages}
        onFindHighlightChange={setFindHighlight}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftPanel editor={editor} onOpenFile={openFilePicker} />

        <EditorCanvas
          editor={editor}
          onOpenFile={openFilePicker}
          onFileDrop={loadPdfFile}
          findHighlight={findHighlight}
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
