"use client";

import { useCallback, useMemo, useState } from "react";

import type { EditorTool } from "./useActiveTool";

export type PdfDocumentLike = {
  readonly numPages: number;
  readonly getPage: (pageNumber: number) => Promise<any>;
};

export type EditorLeftPanelTab = "pages";

export type EditorSaveState = "saved" | "unsaved" | "saving";

export type EditorObjectType =
  | "text"
  | "highlight"
  | "image"
  | "signature"
  | "whiteout"
  | "note"
  | "stamp"
  | "draw"
  | "shape";

export type EditorObjectBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type EditorObjectData = {
  readonly text?: string;
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "bold";
  readonly fontStyle?: "normal" | "italic";
  readonly color?: string;
  readonly backgroundColor?: string;
  readonly opacity?: number;
  readonly imageDataUrl?: string;
  readonly note?: string;
  readonly stampLabel?: string;
  readonly shapeType?: "rectangle" | "ellipse" | "line" | "arrow";
};

export type EditorObject = {
  readonly id: string;
  readonly type: EditorObjectType;
  readonly pageNumber: number;
  readonly box: EditorObjectBox;
  readonly data: EditorObjectData;
  readonly locked?: boolean;
};

export type EditorFileMeta = {
  readonly name: string;
  readonly size: number;
  readonly type: string;
  readonly lastModified: number;
};

export type EditorController = {
  readonly file: File | null;
  readonly fileMeta: EditorFileMeta | null;
  readonly pdfDocument: PdfDocumentLike | null;
  readonly activePageNumber: number;
  readonly totalPages: number;
  readonly zoom: number;
  readonly leftPanelTab: EditorLeftPanelTab;
  readonly leftPanelCollapsed: boolean;
  readonly unsavedChanges: number;
  readonly lastSavedAt: Date | null;
  readonly saveState: EditorSaveState;

  readonly activeTool: EditorTool;
  readonly objects: EditorObject[];
  readonly selectedObjectId: string | null;
  readonly activePageObjects: EditorObject[];
  readonly selectedObject: EditorObject | null;

  readonly setFile: (file: File | null) => void;
  readonly setPdfDocument: (document: PdfDocumentLike | null) => void;
  readonly setActivePage: (page: number) => void;
  readonly setZoom: (zoom: number) => void;
  readonly zoomIn: () => void;
  readonly zoomOut: () => void;

  readonly setLeftPanelTab: (tab: EditorLeftPanelTab) => void;
  readonly toggleLeftPanel: () => void;
  readonly setLeftPanelCollapsed: (value: boolean) => void;

  readonly setActiveTool: (tool: EditorTool) => void;
  readonly addObject: (object: Omit<EditorObject, "id"> & { readonly id?: string }) => string;
  readonly updateObject: (id: string, updates: Partial<Omit<EditorObject, "id">>) => void;
  readonly updateObjectData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly updateObjectBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly deleteObject: (id: string) => void;
  readonly selectObject: (id: string | null) => void;
  readonly clearObjectsForPage: (pageNumber: number) => void;

  readonly markChanged: (count?: number) => void;
  readonly markSaving: () => void;
  readonly markSaved: () => void;
  readonly resetEditor: () => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeZoom(value: number) {
  return Number(clamp(value, MIN_ZOOM, MAX_ZOOM).toFixed(2));
}

function createFileMeta(file: File): EditorFileMeta {
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
  };
}

export function useEditor(): EditorController {
  const [file, setFileState] = useState<File | null>(null);
  const [fileMeta, setFileMeta] = useState<EditorFileMeta | null>(null);
  const [pdfDocument, setPdfDocumentState] = useState<PdfDocumentLike | null>(null);
  const [activePageNumber, setActivePageNumber] = useState(1);
  const [zoom, setZoomState] = useState(1);
  const [leftPanelTab, setLeftPanelTab] = useState<EditorLeftPanelTab>("pages");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<EditorSaveState>("saved");

  const [activeTool, setActiveToolState] = useState<EditorTool>("select");
  const [objects, setObjects] = useState<EditorObject[]>([]);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);

  const totalPages = pdfDocument?.numPages ?? 0;

  const activePageObjects = useMemo(
    () => objects.filter((object) => object.pageNumber === activePageNumber),
    [activePageNumber, objects],
  );

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  const markChanged = useCallback((count = 1) => {
    setUnsavedChanges((current) => Math.max(0, current + count));
    setSaveState("unsaved");
  }, []);

  const markSaving = useCallback(() => {
    setSaveState("saving");
  }, []);

  const markSaved = useCallback(() => {
    setUnsavedChanges(0);
    setLastSavedAt(new Date());
    setSaveState("saved");
  }, []);

  const setFile = useCallback((nextFile: File | null) => {
    setFileState(nextFile);
    setFileMeta(nextFile ? createFileMeta(nextFile) : null);
    setActivePageNumber(1);
    setUnsavedChanges(0);
    setLastSavedAt(null);
    setSaveState("saved");
    setActiveToolState("select");
    setObjects([]);
    setSelectedObjectId(null);

    if (!nextFile) {
      setPdfDocumentState(null);
    }
  }, []);

  const setPdfDocument = useCallback((document: PdfDocumentLike | null) => {
    setPdfDocumentState(document);
    setActivePageNumber(1);
  }, []);

  const setActivePage = useCallback(
    (page: number) => {
      const safeTotal = Math.max(1, totalPages || 1);
      setActivePageNumber(clamp(Math.round(page), 1, safeTotal));
      setSelectedObjectId(null);
    },
    [totalPages],
  );

  const setZoom = useCallback((value: number) => {
    setZoomState(normalizeZoom(value));
  }, []);

  const zoomIn = useCallback(() => {
    setZoomState((current) => normalizeZoom(current + ZOOM_STEP));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomState((current) => normalizeZoom(current - ZOOM_STEP));
  }, []);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelCollapsed((current) => !current);
  }, []);

  const setActiveTool = useCallback((tool: EditorTool) => {
    setActiveToolState(tool);

    if (tool !== "select") {
      setSelectedObjectId(null);
    }
  }, []);

  const addObject = useCallback(
    (object: Omit<EditorObject, "id"> & { readonly id?: string }) => {
      const id = object.id || createId();

      const nextObject: EditorObject = {
        id,
        type: object.type,
        pageNumber: object.pageNumber,
        box: object.box,
        data: object.data,
        locked: object.locked,
      };

      setObjects((current) => [...current, nextObject]);
      setSelectedObjectId(id);
      markChanged();

      return id;
    },
    [markChanged],
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<Omit<EditorObject, "id">>) => {
      setObjects((current) =>
        current.map((object) =>
          object.id === id
            ? {
                ...object,
                ...updates,
                box: updates.box ? { ...object.box, ...updates.box } : object.box,
                data: updates.data ? { ...object.data, ...updates.data } : object.data,
              }
            : object,
        ),
      );

      markChanged();
    },
    [markChanged],
  );

  const updateObjectData = useCallback(
    (id: string, data: Partial<EditorObjectData>) => {
      setObjects((current) =>
        current.map((object) =>
          object.id === id
            ? {
                ...object,
                data: {
                  ...object.data,
                  ...data,
                },
              }
            : object,
        ),
      );

      markChanged();
    },
    [markChanged],
  );

  const updateObjectBox = useCallback(
    (id: string, box: Partial<EditorObjectBox>) => {
      setObjects((current) =>
        current.map((object) =>
          object.id === id
            ? {
                ...object,
                box: {
                  ...object.box,
                  ...box,
                },
              }
            : object,
        ),
      );

      markChanged();
    },
    [markChanged],
  );

  const deleteObject = useCallback(
    (id: string) => {
      setObjects((current) => current.filter((object) => object.id !== id));
      setSelectedObjectId((current) => (current === id ? null : current));
      markChanged();
    },
    [markChanged],
  );

  const selectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
  }, []);

  const clearObjectsForPage = useCallback(
    (pageNumber: number) => {
      setObjects((current) => current.filter((object) => object.pageNumber !== pageNumber));
      setSelectedObjectId(null);
      markChanged();
    },
    [markChanged],
  );

  const resetEditor = useCallback(() => {
    setFileState(null);
    setFileMeta(null);
    setPdfDocumentState(null);
    setActivePageNumber(1);
    setZoomState(1);
    setLeftPanelTab("pages");
    setLeftPanelCollapsed(false);
    setUnsavedChanges(0);
    setLastSavedAt(null);
    setSaveState("saved");
    setActiveToolState("select");
    setObjects([]);
    setSelectedObjectId(null);
  }, []);

  return {
    file,
    fileMeta,
    pdfDocument,
    activePageNumber,
    totalPages,
    zoom,
    leftPanelTab,
    leftPanelCollapsed,
    unsavedChanges,
    lastSavedAt,
    saveState,

    activeTool,
    objects,
    selectedObjectId,
    activePageObjects,
    selectedObject,

    setFile,
    setPdfDocument,
    setActivePage,
    setZoom,
    zoomIn,
    zoomOut,

    setLeftPanelTab,
    toggleLeftPanel,
    setLeftPanelCollapsed,

    setActiveTool,
    addObject,
    updateObject,
    updateObjectData,
    updateObjectBox,
    deleteObject,
    selectObject,
    clearObjectsForPage,

    markChanged,
    markSaving,
    markSaved,
    resetEditor,
  };
}