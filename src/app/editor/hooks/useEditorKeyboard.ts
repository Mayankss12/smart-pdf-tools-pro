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
  stateRef.current = {
    editor,
    toolContext,
    onToolAction,
    onUnavailableTool,
  };

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
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

      if (event.key === "ArrowUp") {
        event.preventDefault();
        currentEditor.updateObjectBox(
          selectedId,
          resize
            ? { height: Math.max(1, selected.box.height - step) }
            : { y: selected.box.y - step },
        );
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        currentEditor.updateObjectBox(
          selectedId,
          resize
            ? { height: selected.box.height + step }
            : { y: selected.box.y + step },
        );
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        currentEditor.updateObjectBox(
          selectedId,
          resize
            ? { width: Math.max(1, selected.box.width - step) }
            : { x: selected.box.x - step },
        );
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        currentEditor.updateObjectBox(
          selectedId,
          resize
            ? { width: selected.box.width + step }
            : { x: selected.box.x + step },
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
