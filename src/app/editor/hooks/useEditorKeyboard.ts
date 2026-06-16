"use client";

import { useEffect, useRef } from "react";

import type { EditorController } from "./useEditor";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export function useEditorKeyboard(editor: EditorController) {
  const editorRef = useRef(editor);
  editorRef.current = editor;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const editor = editorRef.current;
      const mod = event.ctrlKey || event.metaKey;
      const typing = isTypingTarget(event.target);

      // Undo / Redo — global, even with no selection.
      if (mod && event.key.toLowerCase() === "z") {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) {
          editor.redo();
        } else {
          editor.undo();
        }
        return;
      }

      if (mod && event.key.toLowerCase() === "y") {
        if (typing) return;
        event.preventDefault();
        editor.redo();
        return;
      }

      const selectedId = editor.selectedObjectId;
      const selected = editor.selectedObject;

      if (!selectedId || !selected || typing) {
        return;
      }

      // Lock toggle stays available even when object is locked.
      if (mod && event.key.toLowerCase() === "l") {
        event.preventDefault();
        editor.toggleObjectLock(selectedId);
        return;
      }

      // Deselect stays available even when object is locked.
      if (event.key === "Escape") {
        event.preventDefault();
        editor.selectObject(null);
        return;
      }

      if (selected.locked) {
        return;
      }

      // Duplicate.
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        editor.duplicateObject(selectedId);
        return;
      }

      // Z-order: Ctrl+] forward, Ctrl+[ backward, +Shift = front/back.
      if (mod && event.key === "]") {
        event.preventDefault();
        if (event.shiftKey) {
          editor.bringToFront(selectedId);
        } else {
          editor.bringForward(selectedId);
        }
        return;
      }

      if (mod && event.key === "[") {
        event.preventDefault();
        if (event.shiftKey) {
          editor.sendToBack(selectedId);
        } else {
          editor.sendBackward(selectedId);
        }
        return;
      }

      // Delete.
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        editor.deleteObject(selectedId);
        return;
      }

      // Arrow nudge (Shift = larger step).
      const step = event.shiftKey ? 10 : 1;

      if (event.key === "ArrowUp") {
        event.preventDefault();
        editor.updateObjectBox(selectedId, { y: selected.box.y - step });
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        editor.updateObjectBox(selectedId, { y: selected.box.y + step });
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        editor.updateObjectBox(selectedId, { x: selected.box.x - step });
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        editor.updateObjectBox(selectedId, { x: selected.box.x + step });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
