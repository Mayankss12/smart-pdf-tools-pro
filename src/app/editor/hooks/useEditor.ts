"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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

export type EditorTextStyle = {
  readonly fontWeight?: "normal" | "bold";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
  readonly color?: string;
};

export type EditorTextRun = EditorTextStyle & {
  readonly id: string;
  readonly text: string;
};

export type EditorObjectData = {
  readonly text?: string;
  readonly textRuns?: readonly EditorTextRun[];
  readonly fontSize?: number;
  readonly fontWeight?: "normal" | "bold";
  readonly fontStyle?: "normal" | "italic";
  readonly textDecoration?: "none" | "underline";
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

  readonly canUndo: boolean;
  readonly canRedo: boolean;

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
  readonly duplicateObject: (id: string) => string | null;
  readonly updateObject: (id: string, updates: Partial<Omit<EditorObject, "id">>) => void;
  readonly updateObjectData: (id: string, data: Partial<EditorObjectData>) => void;
  readonly updateObjectBox: (id: string, box: Partial<EditorObjectBox>) => void;
  readonly deleteObject: (id: string) => void;
  readonly selectObject: (id: string | null) => void;
  readonly clearObjectsForPage: (pageNumber: number) => void;

  readonly undo: () => void;
  readonly redo: () => void;

  readonly markChanged: (count?: number) => void;
  readonly markSaving: () => void;
  readonly markSaved: () => void;
  readonly resetEditor: () => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.1;
const HISTORY_LIMIT = 100;
const BOX_COALESCE_MS = 600;

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

function cloneObjectData(data: EditorObjectData): EditorObjectData {
  return {
    ...data,
    textRuns: data.textRuns?.map((run) => ({
      ...run,
      id: createId(),
    })),
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

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Always-fresh mirror of objects for synchronous history snapshots.
  const objectsRef = useRef<EditorObject[]>(objects);
  objectsRef.current = objects;

  // Snapshot-based history stacks (kept in refs to avoid render churn).
  const undoStackRef = useRef<EditorObject[][]>([]);
  const redoStackRef = useRef<EditorObject[][]>([]);
  const lastHistoryRef = useRef<{ reason: string; objectId: string | null; time: number } | null>(
    null,
  );

  const totalPages = pdfDocument?.numPages ?? 0;

  const activePageObjects = useMemo(
    () => objects.filter((object) => object.pageNumber === activePageNumber),
    [activePageNumber, objects],
  );

  const selectedObject = useMemo(
    () => objects.find((object) => object.id === selectedObjectId) ?? null,
    [objects, selectedObjectId],
  );

  const syncHistoryFlags = useCallback(() => {
    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(redoStackRef.current.length > 0);
  }, []);

  // Capture the pre-mutation snapshot. Rapid same-object box edits (drag/resize)
  // coalesce into one history entry so a single Undo reverts the whole gesture.
  const recordHistory = useCallback(
    (reason: string, objectId: string | null = null) => {
      const now = Date.now();
      const last = lastHistoryRef.current;

      if (
        reason === "box" &&
        last &&
        last.reason === "box" &&
        last.objectId === objectId &&
        now - last.time < BOX_COALESCE_MS
      ) {
        lastHistoryRef.current = { reason, objectId, time: now };
        return;
      }

      undoStackRef.current.push(objectsRef.current);
      if (undoStackRef.current.length > HISTORY_LIMIT) {
        undoStackRef.current.shift();
      }
      redoStackRef.current = [];
      lastHistoryRef.current = { reason, objectId, time: now };
      syncHistoryFlags();
    },
    [syncHistoryFlags],
  );

  const clearHistory = useCallback(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    lastHistoryRef.current = null;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

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

  const setFile = useCallback(
    (nextFile: File | null) => {
      setFileState(nextFile);
      setFileMeta(nextFile ? createFileMeta(nextFile) : null);
      setActivePageNumber(1);
      setUnsavedChanges(0);
      setLastSavedAt(null);
      setSaveState("saved");
      setActiveToolState("select");
      setObjects([]);
      setSelectedObjectId(null);
      clearHistory();

      if (!nextFile) {
        setPdfDocumentState(null);
      }
    },
    [clearHistory],
  );

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
      recordHistory("add");

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
    [markChanged, recordHistory],
  );

  const duplicateObject = useCallback(
    (id: string) => {
      const source = objectsRef.current.find((object) => object.id === id);

      if (!source) {
        return null;
      }

      recordHistory("duplicate");

      const duplicatedId = createId();
      const duplicate: EditorObject = {
        ...source,
        id: duplicatedId,
        box: {
          ...source.box,
          x: source.box.x + 18,
          y: source.box.y + 18,
        },
        data: cloneObjectData(source.data),
      };

      setObjects((current) => {
        const sourceIndex = current.findIndex((object) => object.id === id);

        if (sourceIndex < 0) {
          return [...current, duplicate];
        }

        const nextObjects = [...current];
        nextObjects.splice(sourceIndex + 1, 0, duplicate);
        return nextObjects;
      });

      setSelectedObjectId(duplicatedId);
      setActiveToolState("select");
      markChanged();
      return duplicatedId;
    },
    [markChanged, recordHistory],
  );

  const updateObject = useCallback(
    (id: string, updates: Partial<Omit<EditorObject, "id">>) => {
      recordHistory("update");

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
    [markChanged, recordHistory],
  );

  const updateObjectData = useCallback(
    (id: string, data: Partial<EditorObjectData>) => {
      recordHistory("data", id);

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
    [markChanged, recordHistory],
  );

  const updateObjectBox = useCallback(
    (id: string, box: Partial<EditorObjectBox>) => {
      recordHistory("box", id);

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
    [markChanged, recordHistory],
  );

  const deleteObject = useCallback(
    (id: string) => {
      recordHistory("delete");

      setObjects((current) => current.filter((object) => object.id !== id));
      setSelectedObjectId((current) => (current === id ? null : current));
      markChanged();
    },
    [markChanged, recordHistory],
  );

  const selectObject = useCallback((id: string | null) => {
    setSelectedObjectId(id);
  }, []);

  const clearObjectsForPage = useCallback(
    (pageNumber: number) => {
      recordHistory("clear");

      setObjects((current) => current.filter((object) => object.pageNumber !== pageNumber));
      setSelectedObjectId(null);
      markChanged();
    },
    [markChanged, recordHistory],
  );

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      return;
    }

    const previous = undoStackRef.current.pop() as EditorObject[];
    redoStackRef.current.push(objectsRef.current);

    setObjects(previous);
    setSelectedObjectId(null);
    setUnsavedChanges((current) => Math.max(1, current));
    setSaveState("unsaved");

    lastHistoryRef.current = null;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      return;
    }

    const next = redoStackRef.current.pop() as EditorObject[];
    undoStackRef.current.push(objectsRef.current);

    setObjects(next);
    setSelectedObjectId(null);
    setUnsavedChanges((current) => Math.max(1, current));
    setSaveState("unsaved");

    lastHistoryRef.current = null;
    syncHistoryFlags();
  }, [syncHistoryFlags]);

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
    clearHistory();
  }, [clearHistory]);

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

    canUndo,
    canRedo,

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
    duplicateObject,
    updateObject,
    updateObjectData,
    updateObjectBox,
    deleteObject,
    selectObject,
    clearObjectsForPage,

    undo,
    redo,

    markChanged,
    markSaving,
    markSaved,
    resetEditor,
  };
}
