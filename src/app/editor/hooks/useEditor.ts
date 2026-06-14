"use client";

import { useState } from "react";

export type PdfDocumentLike = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<any>;
};

export type EditorLeftPanelTab = "pages";

export type EditorController = {
  file: File | null;
  fileMeta: { name: string; size: number } | null;
  pdfDocument: PdfDocumentLike | null;
  activePageNumber: number;
  totalPages: number;
  zoom: number;
  leftPanelTab: EditorLeftPanelTab;
  leftPanelCollapsed: boolean;
  unsavedChanges: number;
  lastSavedAt: Date | null;
  saveState: "saved" | "unsaved" | "saving";
  setFile: (file: File | null) => void;
  setPdfDocument: (document: PdfDocumentLike | null) => void;
  setActivePage: (page: number) => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  setLeftPanelTab: (tab: EditorLeftPanelTab) => void;
  toggleLeftPanel: () => void;
  setLeftPanelCollapsed: (value: boolean) => void;
  markSaved: () => void;
  resetEditor: () => void;
};

export function useEditor(): EditorController {
  const [file, setFileState] = useState<File | null>(null);
  const [pdfDocument, setPdfDocumentState] = useState<PdfDocumentLike | null>(null);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [zoom, setZoomState] = useState(1);
  const [leftPanelTab, setLeftPanelTab] = useState<EditorLeftPanelTab>("pages");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  function clampZoom(value: number) {
    return Math.max(0.25, Math.min(4, Number(value.toFixed(2))));
  }

  return {
    file,
    fileMeta: file ? { name: file.name, size: file.size } : null,
    pdfDocument,
    activePageNumber,
    totalPages: pdfDocument?.numPages ?? 0,
    zoom,
    leftPanelTab,
    leftPanelCollapsed,
    unsavedChanges: 0,
    lastSavedAt,
    saveState: "saved",

    setFile: setFileState,
    setPdfDocument: setPdfDocumentState,

    setActivePage: (page) => {
      const maxPage = pdfDocument?.numPages ?? 1;
      setActivePageNumber(Math.max(1, Math.min(maxPage, page)));
    },

    setZoom: (value) => setZoomState(clampZoom(value)),
    zoomIn: () => setZoomState((value) => clampZoom(value + 0.1)),
    zoomOut: () => setZoomState((value) => clampZoom(value - 0.1)),

    setLeftPanelTab,
    toggleLeftPanel: () => setLeftPanelCollapsed((value) => !value),
    setLeftPanelCollapsed,

    markSaved: () => setLastSavedAt(new Date()),

    resetEditor: () => {
      setFileState(null);
      setPdfDocumentState(null);
      setActivePageNumber(1);
      setZoomState(1);
      setLeftPanelTab("pages");
      setLeftPanelCollapsed(false);
      setLastSavedAt(null);
    },
  };
}