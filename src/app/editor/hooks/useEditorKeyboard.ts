"use client";

import { useEffect, useRef } from "react";

import {
  EDITOR_TOOL_DEFINITIONS,
  matchesEditorShortcut,
  resolveEditorTool,
  type EditorToolbarItemId,
  type EditorToolContext,
} from "@/lib/editor/editor-tool-registry";

import type { EditorController } from "./useEditor";

type KeyboardPageBounds = {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
};

type KeyboardObjectBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampKeyboardBox(
  box: KeyboardObjectBox,
  bounds: KeyboardPageBounds | null,
): KeyboardObjectBox {
  const maxWidth = bounds ? Math.max(1, bounds.width) : Number.POSITIVE_INFINITY;
  const maxHeight = bounds ? Math.max(1, bounds.height) : Number.POSITIVE_INFINITY;
  const width = Math.max(1, Math.min(box.width, maxWidth));
  const height = Math.max(1, Math.min(box.height, maxHeight));
  const maxX = bounds ? Math.max(0, bounds.width - width) : Number.POSITIVE_INFINITY;
  const maxY = bounds ? Math.max(0, bounds.height - height) : Number.POSITIVE_INFINITY;

  return {
    x: clamp(box.x, 0, maxX),
    y: clamp(box.y, 0, maxY),
    width,
    height,
  };
}

export function useEditorKeyboard({
  editor,
  toolContext,
  onToolAction,
  onUnavailableTool,
}: {
  readonly editor: EditorController;
  readonly toolContext: EditorToolContext;
  readonly onToolAction: (toolId: EditorToolbarItemId) => void;
  readonly onUnavailableTool: (message: string) => void;
}) {
  const stateRef = useRef({
    editor,
    toolContext,
    onToolAction,
    onUnavailableTool,
  });
  const pageBoundsRef = useRef<KeyboardPageBounds | null>(null);
  stateRef.current = {
    editor,
    toolContext,
    onToolAction,
    onUnavailableTool,
  };

  useEffect(() => {
    const document = editor.pdfDocument;
    const pageNumber = editor.activePageNumber;
    let cancelled = false;

    pageBoundsRef.current = null;
    if (!document) return;

    void document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1 });
        pageBoundsRef.current = {
          pageNumber,
          width: viewport.width,
          height: viewport.height,
        };
      })
      .catch(() => {
        if (!cancelled) pageBoundsRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [editor.activePageNumber, editor.pdfDocument]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;

      const state = stateRef.current;
      const currentEditor = state.editor;
      const typing = isTypingTarget(event.target);

      if (event.key === "Escape") {
        if (typing) return;
        event.preventDefault();
        currentEditor.setActiveTool("select");
        currentEditor.selectObject(null);
        return;
      }

      if (!typing) {
        const shortcutTool = EDITOR_TOOL_DEFINITIONS.find(
          (definition) =>
            definition.shortcut &&
            matchesEditorShortcut(event, definition.shortcut),
        );

        if (shortcutTool) {
          event.preventDefault();
          const resolved = resolveEditorTool(shortcutTool, state.toolContext);

          if (resolved.enabled) {
            state.onToolAction(shortcutTool.id);
          } else {
            state.onUnavailableTool(
              resolved.disabledReason ??
                `${shortcutTool.label} is currently unavailable.`,
            );
          }
          return;
        }
      }

      const selectedId = currentEditor.selectedObjectId;
      const selected = currentEditor.selectedObject;
      const commandPressed = event.ctrlKey || event.metaKey;

      if (!selectedId || !selected || typing) return;

      if (commandPressed && event.key.toLowerCase() === "l") {
        event.preventDefault();
        currentEditor.toggleObjectLock(selectedId);
        return;
      }

      if (selected.locked) return;

      if (commandPressed && event.key === "]") {
        event.preventDefault();
        if (event.shiftKey) {
          currentEditor.bringToFront(selectedId);
        } else {
          currentEditor.bringForward(selectedId);
        }
        return;
      }

      if (commandPressed && event.key === "[") {
        event.preventDefault();
        if (event.shiftKey) {
          currentEditor.sendToBack(selectedId);
        } else {
          currentEditor.sendBackward(selectedId);
        }
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const resize = event.altKey;
      const cachedBounds = pageBoundsRef.current;
      const bounds =
        cachedBounds?.pageNumber === selected.pageNumber ? cachedBounds : null;

      function updateBox(nextBox: KeyboardObjectBox) {
        currentEditor.updateObjectBox(
          selectedId,
          clampKeyboardBox(nextBox, bounds),
        );
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        updateBox(
          resize
            ? { ...selected.box, height: selected.box.height - step }
            : { ...selected.box, y: selected.box.y - step },
        );
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        updateBox(
          resize
            ? { ...selected.box, height: selected.box.height + step }
            : { ...selected.box, y: selected.box.y + step },
        );
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        updateBox(
          resize
            ? { ...selected.box, width: selected.box.width - step }
            : { ...selected.box, x: selected.box.x - step },
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        updateBox(
          resize
            ? { ...selected.box, width: selected.box.width + step }
            : { ...selected.box, x: selected.box.x + step },
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
