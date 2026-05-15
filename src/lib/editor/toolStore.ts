"use client";

import { create } from "zustand";

import {
  DEFAULT_EDITOR_RIBBON_TOOL,
  isEditorToolCommand,
} from "./toolRegistry";
import type {
  EditorCommandId,
  EditorRibbonToolId,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Activation source                                                           */
/* -------------------------------------------------------------------------- */

export type EditorToolActivationSource =
  | "system"
  | "ribbon"
  | "shortcut"
  | "mobile-dock"
  | "mobile-sheet";

/* -------------------------------------------------------------------------- */
/* Store contract                                                              */
/* -------------------------------------------------------------------------- */

export type EditorToolStore = {
  activeTool: EditorRibbonToolId;
  previousTool: EditorRibbonToolId | null;
  lastActivationSource: EditorToolActivationSource;
  lastChangedAt: number | null;

  setActiveTool: (
    tool: EditorRibbonToolId,
    source?: EditorToolActivationSource,
  ) => void;

  setActiveToolFromCommand: (
    commandId: EditorCommandId,
    source?: EditorToolActivationSource,
  ) => boolean;

  restorePreviousTool: (
    source?: EditorToolActivationSource,
  ) => boolean;

  resetActiveTool: (
    source?: EditorToolActivationSource,
  ) => void;

  isToolActive: (tool: EditorRibbonToolId) => boolean;
};

/* -------------------------------------------------------------------------- */
/* Store                                                                       */
/* -------------------------------------------------------------------------- */

export const useEditorToolStore = create<EditorToolStore>((set, get) => ({
  activeTool: DEFAULT_EDITOR_RIBBON_TOOL,
  previousTool: null,
  lastActivationSource: "system",
  lastChangedAt: null,

  setActiveTool: (tool, source = "ribbon") => {
    const currentTool = get().activeTool;

    if (currentTool === tool) {
      return;
    }

    set({
      activeTool: tool,
      previousTool: currentTool,
      lastActivationSource: source,
      lastChangedAt: Date.now(),
    });
  },

  setActiveToolFromCommand: (commandId, source = "ribbon") => {
    if (!isEditorToolCommand(commandId)) {
      return false;
    }

    get().setActiveTool(commandId, source);
    return true;
  },

  restorePreviousTool: (source = "system") => {
    const { activeTool, previousTool } = get();

    if (!previousTool || previousTool === activeTool) {
      return false;
    }

    set({
      activeTool: previousTool,
      previousTool: activeTool,
      lastActivationSource: source,
      lastChangedAt: Date.now(),
    });

    return true;
  },

  resetActiveTool: (source = "system") => {
    const currentTool = get().activeTool;

    if (currentTool === DEFAULT_EDITOR_RIBBON_TOOL) {
      return;
    }

    set({
      activeTool: DEFAULT_EDITOR_RIBBON_TOOL,
      previousTool: currentTool,
      lastActivationSource: source,
      lastChangedAt: Date.now(),
    });
  },

  isToolActive: (tool) => get().activeTool === tool,
}));

/* -------------------------------------------------------------------------- */
/* Selectors                                                                   */
/* -------------------------------------------------------------------------- */

export const selectActiveEditorTool = (state: EditorToolStore) =>
  state.activeTool;

export const selectPreviousEditorTool = (state: EditorToolStore) =>
  state.previousTool;

export const selectLastEditorToolSource = (state: EditorToolStore) =>
  state.lastActivationSource;

export const selectLastEditorToolChangeAt = (state: EditorToolStore) =>
  state.lastChangedAt;
