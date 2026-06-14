"use client";

import * as pdfjsLib from "pdfjs-dist";
import { useEffect, useRef, useState } from "react";

import { EditorCanvas } from "./components/EditorCanvas";
import { EditorLeftPanel } from "./components/EditorLeftPanel";
import { EditorStatusBar } from "./components/EditorStatusBar";
import { EditorTopBar } from "./components/EditorTopBar";
import { useEditor } from "./hooks/useEditor";

type EditorNoticeType = "info" | "success" | "warning" | "error";

type EditorNotice = {
  readonly type: EditorNoticeType;
  readonly message: string;
};

function configurePdfWorker() {
  if (typeof window === "undefined") return;

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function getNoticeClass(type: EditorNoticeType) {
  if (type === "success") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (type === "warning") return "border-amber-200 bg-amber-50 text-amber-800";
  if (type === "error") return "border-red-200 bg-red-50 text-red-700";

  return "border-violet-200 bg-violet-50 text-violet-800";
}

export default function EditorPage() {
  const editor = useEditor();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<EditorNotice>({
    type: "info",
    message: "Upload a PDF to start editing.",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    configurePdfWorker();

    const shouldCollapseLeftPanel =
      typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;

    if (shouldCollapseLeftPanel) {
      editor.setLeftPanelCollapsed(true);
    }
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function loadPdfFile(file: File) {
    if (loading) return;

    if (!isPdfFile(file)) {
      setNotice({
        type: "error",
        message: "Please select a valid PDF file.",
      });
      return;
    }

    setLoading(true);
    setNotice({
      type: "info",
      message: "Loading PDF document...",
    });

    try {
      configurePdfWorker();

      const buffer = await file.arrayBuffer();
      const pdfDocument = await pdfjsLib.getDocument({
        data: new Uint8Array(buffer),
      }).promise;

      editor.setFile(file);
      editor.setPdfDocument(pdfDocument);
      editor.setActivePage(1);
      editor.markSaved();

      setNotice({
        type: "success",
        message: `Loaded ${file.name} with ${pdfDocument.numPages} page${pdfDocument.numPages === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      editor.resetEditor();

      setNotice({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to load this PDF. Please try another file.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(file?: File) {
    if (!file) return;
    loadPdfFile(file);
  }

  function handleExport() {
    if (!editor.file) {
      setNotice({
        type: "warning",
        message: "Open a PDF before exporting.",
      });
      return;
    }

    setNotice({
      type: "info",
      message: "Export engine will connect after editing tools are added.",
    });
  }

  function handleShare() {
    if (!editor.file) {
      setNotice({
        type: "warning",
        message: "Open a PDF before sharing.",
      });
      return;
    }

    setNotice({
      type: "info",
      message: "Share workflow is reserved for backend phase.",
    });
  }

  function handleMenuAction(action: string) {
    if (action === "file:new") {
      editor.resetEditor();
      setNotice({
        type: "success",
        message: "Editor reset. Upload a PDF to start a new session.",
      });
      return;
    }

    setNotice({
      type: "info",
      message: `${action.replace(":", " / ")} is planned for upcoming editor phases.`,
    });
  }

  return (
    <div className="flex h-screen min-h-screen flex-col overflow-hidden bg-slate-100 text-slate-950">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(event) => {
          handleFileChange(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />

      <EditorTopBar
        editor={editor}
        onOpenFile={openFilePicker}
        onExport={handleExport}
        onShare={handleShare}
        onMenuAction={handleMenuAction}
      />

      {notice.message ? (
        <div className="absolute left-1/2 top-[72px] z-50 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2">
          <div className={`rounded-2xl border px-4 py-3 text-sm font-bold shadow-lg ${getNoticeClass(notice.type)}`}>
            {loading ? "Please wait - " : ""}
            {notice.message}
          </div>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftPanel editor={editor} onOpenFile={openFilePicker} />

        <EditorCanvas
          editor={editor}
          onOpenFile={openFilePicker}
          onFileDrop={loadPdfFile}
        />
      </div>

      <EditorStatusBar editor={editor} />
    </div>
  );
}