"use client";

import { useEffect } from "react";

import { resolveEditorShortcut } from "@/lib/editor/keyboard-shortcuts";
import type { EditorCommandId } from "@/lib/editor/types";

type UseEditorRibbonShortcutsOptions = {
  enabled?: boolean;
  onCommand: (commandId: EditorCommandId) => void;
};

export function useEditorRibbonShortcuts({
  enabled = true,
  onCommand,
}: UseEditorRibbonShortcutsOptions) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const shortcutMatch = resolveEditorShortcut(event);

      if (!shortcutMatch) {
        return;
      }

      if (shortcutMatch.preventDefault) {
        event.preventDefault();
      }

      onCommand(shortcutMatch.commandId);
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onCommand]);
}
