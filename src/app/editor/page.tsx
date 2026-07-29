"use client";

import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { useEffect, useMemo, useRef, useState } from "react";

import { useEntitlement } from "@/hooks/useEntitlement";
import { trackEditorEvent } from "@/lib/editor/editor-analytics";
import {
  getDefaultEditorCapabilities,
  type EditorCapabilityResponse,
} from "@/lib/editor/editor-feature-control";
import {
  DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS,
  createEditorPageNumberObjects,
  type EditorPageNumberSettings,
} from "@/lib/editor/editor-page-numbering";
import {
  remapObjectsAfterPageInsertion,
  remapObjectsAfterPageReorder,
  remapObjectsAfterPageRotation,
  remapPageResults,
  shiftPageResultsAfterInsertion,
} from "@/lib/editor/editor-page-object-mapping";
import { rotateEditorOcrResult } from "@/lib/editor/editor-ocr-rotation";
import {
  getEditorToolDefinition,
  resolveEditorTool,
  type EditorToolbarItemId,
  type EditorToolContext,
} from "@/lib/editor/editor-tool-registry";
import { getEntitlementPlan } from "@/lib/entitlements";
import {
  addEditorBlankPage,
  reorderEditorPages,
  rotateEditorPage,
  type EditorBlankPageSize,
  type EditorPageInsertion,
  type EditorPageRotationDirection,
} from "@/lib/pdf-tools/editor-page-management";
import { configurePdfJsWorker } from "@/lib/pdfjs-worker";

import {
  exportEditorPdfBytes,
  safeEditedName,
} from "../../lib/pdf-tools/editor-export-engine";
import { EditorCanvas } from "./components/EditorCanvas";
import { EditorLayerControls } from "./components/EditorLayerControls";
import { EditorLeftPanel } from "./components/EditorLeftPanel";
import {
  EditorPageToolsDialog,
  type EditorPageDialogMode,
} from "./components/EditorPageToolsDialog";
import { EditorStatusBar } from "./components/EditorStatusBar";
import {
  EditorSmartToolsPanel,
  type EditorFindHighlight,
  type EditorOcrPageResult,
  type EditorSmartToolActivity,
} from "./components/EditorSmartToolsPanel";
import { EditorTopBar } from "./components/EditorTopBar";
import {
  useEditor,
  type EditorDocumentEditorState,
  type EditorObject,
} from "./hooks/useEditor";
import { useEditorKeyboard } from "./hooks/useEditorKeyboard";

const OPEN_IMAGE_PICKER_EVENT = "pdfmantra:editor-open-image-picker";
const OPEN_SIGNATURE_PICKER_EVENT = "pdfmantra:editor-open-signature-picker";
const OPEN_STAMP_PICKER_EVENT = "pdfmantra:editor-open-stamp-picker";

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

function getPickerEvent(toolId: EditorToolbarItemId) {
  if (toolId === "image") return OPEN_IMAGE_PICKER_EVENT;
  if (toolId === "signature") return OPEN_SIGNATURE_PICKER_EVENT;
  if (toolId === "stamp") return OPEN_STAMP_PICKER_EVENT;
  return null;
}

type EditorDocumentCheckpoint = {
  readonly bytes: Uint8Array;
  readonly editorState: EditorDocumentEditorState;
  readonly ocrPages: EditorOcrPageResult[];
  readonly findHighlights: EditorFindHighlight[];
  readonly pageNumberSettings: EditorPageNumberSettings;
  readonly pageNumberSetId: string | null;
};

export default function EditorPage() {
  const editor = useEditor();
  const entitlement = useEntitlement();
  const plan = getEntitlementPlan(entitlement.tier);
  const setLeftPanelCollapsed = editor.setLeftPanelCollapsed;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null);
  const loadGenerationRef = useRef(0);

  const [fileBytes, setFileBytes] = useState<Uint8Array | null>(null);
  const [statusMessage, setStatusMessage] = useState("Open a PDF to start editing.");
  const [loading, setLoading] = useState(false);
  const [ocrPages, setOcrPages] = useState<EditorOcrPageResult[]>([]);
  const [findHighlights, setFindHighlights] = useState<EditorFindHighlight[]>([]);
  const [pageDialogMode, setPageDialogMode] = useState<EditorPageDialogMode>(null);
  const [pageActionBusy, setPageActionBusy] = useState(false);
  const [pageNumberSettings, setPageNumberSettings] =
    useState<EditorPageNumberSettings>(DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS);
  const [pageNumberSetId, setPageNumberSetId] = useState<string | null>(null);
  const [documentIdentity, setDocumentIdentity] = useState(0);
  const [smartActivity, setSmartActivity] =
    useState<EditorSmartToolActivity | null>(null);
  const [capabilities, setCapabilities] = useState<EditorCapabilityResponse>(
    getDefaultEditorCapabilities,
  );

  const toolContext = useMemo<EditorToolContext>(
    () => ({
      hasDocument: Boolean(editor.pdfDocument),
      hasPage: Boolean(editor.pdfDocument && editor.totalPages > 0),
      pageCount: editor.totalPages,
      hasSelection: Boolean(editor.selectedObjectId),
      hasObject: Boolean(editor.selectedObject),
      selectedObjectLocked: Boolean(editor.selectedObject?.locked),
      canUndo: editor.canUndo,
      canRedo: editor.canRedo,
      backendCapabilities: capabilities.backendCapabilities,
      userTier: entitlement.tier,
      canUseCoreTools: plan.canUseCoreTools,
      canUseAdvancedTools: plan.canUseAdvancedTools,
      canUseBackendTools: plan.canUseBackendTools,
      featureControl: capabilities.featureControl,
    }),
    [
      capabilities,
      editor.canRedo,
      editor.canUndo,
      editor.pdfDocument,
      editor.selectedObject,
      editor.selectedObjectId,
      editor.totalPages,
      entitlement.tier,
      plan.canUseAdvancedTools,
      plan.canUseBackendTools,
      plan.canUseCoreTools,
    ],
  );

  useEditorKeyboard({
    editor,
    toolContext,
    onToolAction: handleToolAction,
    onUnavailableTool: handleUnavailableTool,
  });

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

  useEffect(() => {
    const controller = new AbortController();

    async function loadCapabilities() {
      try {
        const response = await fetch("/api/editor/capabilities", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== "object") return;

        const configured = Reflect.get(payload, "configured");
        const backendCapabilities = Reflect.get(payload, "backendCapabilities");
        const featureControl = Reflect.get(payload, "featureControl");
        if (
          typeof configured === "boolean" &&
          backendCapabilities &&
          typeof backendCapabilities === "object" &&
          typeof Reflect.get(backendCapabilities, "translation") === "boolean" &&
          featureControl &&
          typeof featureControl === "object"
        ) {
          setCapabilities({
            configured,
            backendCapabilities: {
              translation: Reflect.get(backendCapabilities, "translation") === true,
            },
            featureControl: {
              globalEditorEnabled:
                Reflect.get(featureControl, "globalEditorEnabled") !== false,
              maintenanceMode: Reflect.get(featureControl, "maintenanceMode") === true,
              flags:
                Reflect.get(featureControl, "flags") &&
                typeof Reflect.get(featureControl, "flags") === "object"
                  ? parseFeatureFlags(Reflect.get(featureControl, "flags"))
                  : {},
            },
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    void loadCapabilities();
    return () => controller.abort();
  }, []);

  function parseFeatureFlags(value: object) {
    const flags: Record<string, boolean> = {};
    for (const [key, flagValue] of Object.entries(value)) {
      if (typeof flagValue === "boolean") flags[key] = flagValue;
    }
    return flags;
  }

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  async function preparePdfDocument(bytes: Uint8Array) {
    const loadGeneration = loadGenerationRef.current + 1;
    loadGenerationRef.current = loadGeneration;
    const loadedDocument = await pdfjsLib.getDocument({
      data: new Uint8Array(bytes),
    }).promise;

    if (loadGenerationRef.current !== loadGeneration) {
      await loadedDocument.destroy();
      return null;
    }
    return loadedDocument;
  }

  function commitPdfDocument(
    loadedDocument: PDFDocumentProxy,
    bytes: Uint8Array,
    activePageNumber: number,
  ) {
    const previousDocument = pdfDocumentRef.current;
    pdfDocumentRef.current = loadedDocument;
    setFileBytes(bytes);
    editor.setPdfDocument(loadedDocument);
    editor.setActivePage(activePageNumber);
    void previousDocument?.destroy();
  }

  async function replacePdfDocument(bytes: Uint8Array, activePageNumber: number) {
    const loadedDocument = await preparePdfDocument(bytes);
    if (!loadedDocument) return;
    commitPdfDocument(loadedDocument, bytes, activePageNumber);
  }

  function createDocumentCheckpoint(
    bytes: Uint8Array,
    overrides?: {
      readonly objects?: EditorObject[];
      readonly selectedObjectId?: string | null;
      readonly activePageNumber?: number;
      readonly ocrPages?: EditorOcrPageResult[];
      readonly findHighlights?: EditorFindHighlight[];
      readonly pageNumberSettings?: EditorPageNumberSettings;
      readonly pageNumberSetId?: string | null;
      readonly saveState?: "saved" | "unsaved";
    },
  ): EditorDocumentCheckpoint {
    return {
      bytes,
      editorState: {
        objects: overrides?.objects ?? editor.objects,
        selectedObjectId:
          overrides?.selectedObjectId === undefined
            ? editor.selectedObjectId
            : overrides.selectedObjectId,
        activePageNumber:
          overrides?.activePageNumber ?? editor.activePageNumber,
        saveState:
          overrides?.saveState ??
          (editor.saveState === "saved" ? "saved" : "unsaved"),
        lastSavedAt: editor.lastSavedAt,
      },
      ocrPages: overrides?.ocrPages ?? [...ocrPages],
      findHighlights: overrides?.findHighlights ?? [...findHighlights],
      pageNumberSettings:
        overrides?.pageNumberSettings ?? pageNumberSettings,
      pageNumberSetId:
        overrides?.pageNumberSetId === undefined
          ? pageNumberSetId
          : overrides.pageNumberSetId,
    };
  }

  async function restoreDocumentCheckpoint(
    checkpoint: EditorDocumentCheckpoint,
  ) {
    const loadedDocument = await preparePdfDocument(checkpoint.bytes);
    if (!loadedDocument) {
      throw new Error("Document history restoration was superseded.");
    }
    commitPdfDocument(
      loadedDocument,
      checkpoint.bytes,
      checkpoint.editorState.activePageNumber,
    );
    editor.replaceDocumentEditorState(checkpoint.editorState);
    setOcrPages(checkpoint.ocrPages);
    setFindHighlights(checkpoint.findHighlights);
    setPageNumberSettings(checkpoint.pageNumberSettings);
    setPageNumberSetId(checkpoint.pageNumberSetId);
  }

  async function regenerateManagedPageNumbers(
    document: PDFDocumentProxy,
    objects: readonly EditorObject[],
    settings: EditorPageNumberSettings,
    setId: string | null,
  ) {
    if (!setId) return [...objects];
    const pageSizes = await Promise.all(
      Array.from({ length: document.numPages }, async (_, index) => {
        const pageNumber = index + 1;
        const page = await document.getPage(pageNumber);
        try {
          const viewport = page.getViewport({ scale: 1 });
          return { pageNumber, width: viewport.width, height: viewport.height };
        } finally {
          page.cleanup();
        }
      }),
    );
    return [
      ...objects.filter((object) => !object.data.pageNumberSetId),
      ...createEditorPageNumberObjects({ settings, pageSizes, setId }),
    ];
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
      setFindHighlights([]);
      setPageDialogMode(null);
      setPageNumberSettings(DEFAULT_EDITOR_PAGE_NUMBER_SETTINGS);
      setPageNumberSetId(null);
      setDocumentIdentity((identity) => identity + 1);
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
      setOcrPages([]);
      setFindHighlights([]);
      setPageNumberSetId(null);
      setDocumentIdentity((identity) => identity + 1);
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

    trackEditorEvent({
      type: "export_started",
      pageCount: editor.totalPages,
      objectCount: editor.objects.length,
    });

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
      trackEditorEvent({
        type: "export_completed",
        pageCount: editor.totalPages,
        objectCount: editor.objects.length,
      });
      setStatusMessage("Edited PDF exported successfully.");
    } catch (error) {
      editor.markChanged(0);
      trackEditorEvent({
        type: "export_failed",
        pageCount: editor.totalPages,
        objectCount: editor.objects.length,
      });
      setStatusMessage(error instanceof Error ? error.message : "Unable to export edited PDF.");
    } finally {
      setLoading(false);
    }
  }

  function handleShare() {
    setStatusMessage("Share requires a configured sharing backend.");
  }

  function handleUnavailableTool(message: string) {
    setStatusMessage(message);
  }

  function handleToolAction(toolId: EditorToolbarItemId) {
    const definition = getEditorToolDefinition(toolId);
    const resolved = resolveEditorTool(definition, toolContext);
    if (!resolved.enabled) {
      handleUnavailableTool(
        resolved.disabledReason ?? `${definition.label} is currently unavailable.`,
      );
      return;
    }

    if (definition.kind === "tool") {
      editor.setActiveTool(definition.id);
      const pickerEvent = getPickerEvent(toolId);
      if (pickerEvent) window.dispatchEvent(new Event(pickerEvent));
      setStatusMessage(`${definition.label} tool selected.`);
      return;
    }

    if (toolId === "undo") {
      void editor
        .undo()
        .then(() => setStatusMessage("Last editor action undone."))
        .catch((error: unknown) =>
          setStatusMessage(
            error instanceof Error ? error.message : "Unable to undo.",
          ),
        );
    } else if (toolId === "redo") {
      void editor
        .redo()
        .then(() => setStatusMessage("Editor action restored."))
        .catch((error: unknown) =>
          setStatusMessage(
            error instanceof Error ? error.message : "Unable to redo.",
          ),
        );
    } else if (toolId === "duplicate" && editor.selectedObjectId) {
      const duplicateId = editor.duplicateObject(editor.selectedObjectId);
      setStatusMessage(duplicateId ? "Object duplicated." : "Unable to duplicate object.");
    } else if (toolId === "delete" && editor.selectedObjectId) {
      editor.deleteObject(editor.selectedObjectId);
      setStatusMessage("Object deleted.");
    } else if (toolId === "add-page") {
      setPageDialogMode("add");
    } else if (toolId === "reorder-pages") {
      setPageDialogMode("reorder");
    } else if (toolId === "rotate-page") {
      setPageDialogMode("rotate");
    } else if (toolId === "page-numbers") {
      setPageDialogMode("numbers");
    }
  }

  async function handleAddPage(options: {
    readonly insertion: EditorPageInsertion;
    readonly size: EditorBlankPageSize;
  }) {
    if (!fileBytes) return;
    const before = createDocumentCheckpoint(fileBytes);
    setPageActionBusy(true);
    let preparedDocument: PDFDocumentProxy | null = null;
    try {
      const result = await addEditorBlankPage({
        fileBytes,
        currentPageNumber: editor.activePageNumber,
        insertion: options.insertion,
        size: options.size,
      });
      preparedDocument = await preparePdfDocument(result.bytes);
      if (!preparedDocument) {
        throw new Error("The page operation was superseded.");
      }
      const remappedObjects = remapObjectsAfterPageInsertion(
        editor.objects,
        result.activePageNumber,
      );
      const nextObjects = await regenerateManagedPageNumbers(
        preparedDocument,
        remappedObjects,
        pageNumberSettings,
        pageNumberSetId,
      );
      const nextOcrPages = shiftPageResultsAfterInsertion(
        ocrPages,
        result.activePageNumber,
      );
      const nextSelectedObjectId =
        editor.selectedObjectId &&
        nextObjects.some((object) => object.id === editor.selectedObjectId)
          ? editor.selectedObjectId
          : null;
      const after = createDocumentCheckpoint(result.bytes, {
        objects: nextObjects,
        selectedObjectId: nextSelectedObjectId,
        activePageNumber: result.activePageNumber,
        ocrPages: nextOcrPages,
        findHighlights: [],
        saveState: "unsaved",
      });
      commitPdfDocument(
        preparedDocument,
        result.bytes,
        result.activePageNumber,
      );
      preparedDocument = null;
      editor.replaceDocumentEditorState(after.editorState);
      setOcrPages(nextOcrPages);
      setFindHighlights([]);
      editor.recordDocumentTransaction({
        label: "add page",
        undo: () => restoreDocumentCheckpoint(before),
        redo: () => restoreDocumentCheckpoint(after),
      });
      trackEditorEvent({
        type: "page_added",
        pageNumber: result.activePageNumber,
        size: options.size,
      });
      setPageDialogMode(null);
      setStatusMessage(`Blank page ${result.activePageNumber} added.`);
    } catch (error) {
      if (preparedDocument) await preparedDocument.destroy();
      setStatusMessage(error instanceof Error ? error.message : "Unable to add a page.");
    } finally {
      setPageActionBusy(false);
    }
  }

  async function handleReorderPages(pageOrder: readonly number[]) {
    if (!fileBytes) return;
    const before = createDocumentCheckpoint(fileBytes);
    setPageActionBusy(true);
    let preparedDocument: PDFDocumentProxy | null = null;
    try {
      const result = await reorderEditorPages({
        fileBytes,
        pageOrder,
        activePageNumber: editor.activePageNumber,
      });
      preparedDocument = await preparePdfDocument(result.bytes);
      if (!preparedDocument) {
        throw new Error("The page operation was superseded.");
      }
      const remappedObjects = remapObjectsAfterPageReorder(
        editor.objects,
        pageOrder,
      );
      const nextObjects = await regenerateManagedPageNumbers(
        preparedDocument,
        remappedObjects,
        pageNumberSettings,
        pageNumberSetId,
      );
      const nextOcrPages = remapPageResults(ocrPages, pageOrder);
      const after = createDocumentCheckpoint(result.bytes, {
        objects: nextObjects,
        selectedObjectId: editor.selectedObjectId,
        activePageNumber: result.activePageNumber,
        ocrPages: nextOcrPages,
        findHighlights: [],
        saveState: "unsaved",
      });
      commitPdfDocument(
        preparedDocument,
        result.bytes,
        result.activePageNumber,
      );
      preparedDocument = null;
      editor.replaceDocumentEditorState(after.editorState);
      setOcrPages(nextOcrPages);
      setFindHighlights([]);
      editor.recordDocumentTransaction({
        label: "reorder pages",
        undo: () => restoreDocumentCheckpoint(before),
        redo: () => restoreDocumentCheckpoint(after),
      });
      trackEditorEvent({ type: "pages_reordered", pageCount: pageOrder.length });
      setPageDialogMode(null);
      setStatusMessage("Page order updated.");
    } catch (error) {
      if (preparedDocument) await preparedDocument.destroy();
      setStatusMessage(error instanceof Error ? error.message : "Unable to reorder pages.");
    } finally {
      setPageActionBusy(false);
    }
  }

  async function handleRotatePage(direction: EditorPageRotationDirection) {
    if (!fileBytes) return;
    const before = createDocumentCheckpoint(fileBytes);
    const pageNumber = editor.activePageNumber;
    setPageActionBusy(true);
    let preparedDocument: PDFDocumentProxy | null = null;
    try {
      const result = await rotateEditorPage({
        fileBytes,
        pageNumber,
        direction,
      });
      preparedDocument = await preparePdfDocument(result.bytes);
      if (!preparedDocument) {
        throw new Error("The page operation was superseded.");
      }
      const remappedObjects = remapObjectsAfterPageRotation({
          objects: editor.objects,
          pageNumber,
          oldViewportWidth: result.oldViewportWidth,
          oldViewportHeight: result.oldViewportHeight,
          direction,
        });
      const nextObjects = await regenerateManagedPageNumbers(
        preparedDocument,
        remappedObjects,
        pageNumberSettings,
        pageNumberSetId,
      );
      const nextOcrPages = ocrPages.map((item) =>
        item.pageNumber === pageNumber
          ? { ...item, result: rotateEditorOcrResult(item.result, direction) }
          : item,
      );
      const after = createDocumentCheckpoint(result.bytes, {
        objects: nextObjects,
        selectedObjectId: editor.selectedObjectId,
        activePageNumber: result.activePageNumber,
        ocrPages: nextOcrPages,
        findHighlights: [],
        saveState: "unsaved",
      });
      commitPdfDocument(
        preparedDocument,
        result.bytes,
        result.activePageNumber,
      );
      preparedDocument = null;
      editor.replaceDocumentEditorState(after.editorState);
      setOcrPages(nextOcrPages);
      setFindHighlights([]);
      editor.recordDocumentTransaction({
        label: "rotate page",
        undo: () => restoreDocumentCheckpoint(before),
        redo: () => restoreDocumentCheckpoint(after),
      });
      trackEditorEvent({ type: "page_rotated", pageNumber, direction });
      setPageDialogMode(null);
      setStatusMessage(
        `Page ${pageNumber} rotated${nextOcrPages.some((item) => item.pageNumber === pageNumber) ? " with OCR coordinates preserved" : ""}.`,
      );
    } catch (error) {
      if (preparedDocument) await preparedDocument.destroy();
      setStatusMessage(error instanceof Error ? error.message : "Unable to rotate this page.");
    } finally {
      setPageActionBusy(false);
    }
  }

  async function handleApplyPageNumbers(settings: EditorPageNumberSettings) {
    if (!editor.pdfDocument) return;
    setPageActionBusy(true);
    try {
      const pageSizes = await Promise.all(
        Array.from({ length: editor.totalPages }, async (_, index) => {
          const pageNumber = index + 1;
          const page = await editor.pdfDocument?.getPage(pageNumber);
          if (!page) throw new Error(`Unable to read page ${pageNumber}.`);
          const viewport = page.getViewport({ scale: 1 });
          page.cleanup();
          return { pageNumber, width: viewport.width, height: viewport.height };
        }),
      );
      const setId = `page-number-${Date.now()}`;
      const pageNumberObjects = createEditorPageNumberObjects({
        settings,
        pageSizes,
        setId,
      });
      const retainedObjects = editor.objects.filter(
        (object) => !object.data.pageNumberSetId,
      );
      editor.applyObjectBatch([...retainedObjects, ...pageNumberObjects]);
      setPageNumberSettings(settings);
      setPageNumberSetId(setId);
      setPageDialogMode(null);
      trackEditorEvent({
        type: "pages_numbered",
        pageCount: pageNumberObjects.length,
      });
      setStatusMessage(
        `Page numbering applied to ${pageNumberObjects.length} page${pageNumberObjects.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Unable to apply page numbers.",
      );
    } finally {
      setPageActionBusy(false);
    }
  }

  function handleRemovePageNumbers() {
    const retainedObjects = editor.objects.filter(
      (object) => !object.data.pageNumberSetId,
    );
    editor.applyObjectBatch(retainedObjects);
    setPageNumberSetId(null);
    setPageDialogMode(null);
    setStatusMessage("Page numbers removed.");
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
        toolContext={toolContext}
        busyToolId={smartActivity?.toolId ?? null}
        busyProgress={smartActivity?.progress ?? null}
        onOpenFile={openFilePicker}
        onExport={exportEditedPdf}
        onShare={handleShare}
        onToolAction={handleToolAction}
        onUnavailableTool={handleUnavailableTool}
      />

      <EditorLayerControls editor={editor} />
      <EditorSmartToolsPanel
        documentIdentity={documentIdentity}
        editor={editor}
        ocrPages={ocrPages}
        translationConfigured={capabilities.backendCapabilities.translation}
        onOcrPagesChange={setOcrPages}
        onFindHighlightChange={setFindHighlights}
        onActivityChange={setSmartActivity}
        onStatusChange={setStatusMessage}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <EditorLeftPanel editor={editor} onOpenFile={openFilePicker} />

        <EditorCanvas
          editor={editor}
          onOpenFile={openFilePicker}
          onFileDrop={loadPdfFile}
          findHighlights={findHighlights}
        />
      </div>

      <div
        className="border-t border-slate-200 bg-white px-4 py-1.5 text-[11px] font-black text-slate-600"
        role="status"
        aria-live="polite"
      >
        {loading ? "Please wait — " : ""}
        {statusMessage}
      </div>

      <EditorStatusBar editor={editor} />
      <EditorPageToolsDialog
        mode={pageDialogMode}
        pdfDocument={editor.pdfDocument}
        activePageNumber={editor.activePageNumber}
        pageCount={editor.totalPages}
        busy={pageActionBusy}
        pageNumberSettings={pageNumberSettings}
        hasPageNumbers={editor.objects.some((object) => Boolean(object.data.pageNumberSetId))}
        onClose={() => setPageDialogMode(null)}
        onAdd={handleAddPage}
        onReorder={handleReorderPages}
        onRotate={handleRotatePage}
        onApplyPageNumbers={handleApplyPageNumbers}
        onRemovePageNumbers={handleRemovePageNumbers}
      />
    </div>
  );
}
