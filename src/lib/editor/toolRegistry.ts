import type { LucideIcon } from "lucide-react";
import {
  Download,
  Eraser,
  Highlighter,
  ImagePlus,
  MousePointer2,
  Move,
  PenLine,
  Redo2,
  Shapes,
  Sparkles,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";

import type {
  EditorCommandDefinition,
  EditorCommandGroupId,
  EditorCommandId,
  EditorRibbonActionId,
  EditorRibbonToolId,
} from "./types";

/* -------------------------------------------------------------------------- */
/* Registry-specific types                                                     */
/* -------------------------------------------------------------------------- */

export type EditorCommandRegistryItem = EditorCommandDefinition & {
  icon: LucideIcon;
  searchTerms: readonly string[];
  emphasis?: "default" | "primary" | "success";
};

export type EditorCommandGroupDefinition = {
  id: EditorCommandGroupId;
  label: string;
  description: string;
  order: number;
};

/* -------------------------------------------------------------------------- */
/* Ribbon groups                                                               */
/* -------------------------------------------------------------------------- */

export const EDITOR_COMMAND_GROUPS = [
  {
    id: "selection",
    label: "Select",
    description: "Choose, inspect, and directly manipulate document content.",
    order: 10,
  },
  {
    id: "insert",
    label: "Insert",
    description: "Add text, images, and new content layers.",
    order: 20,
  },
  {
    id: "annotate",
    label: "Markup",
    description: "Highlight, mask, and annotate content.",
    order: 30,
  },
  {
    id: "sign",
    label: "Sign",
    description: "Authorize documents with signature workflows.",
    order: 40,
  },
  {
    id: "history",
    label: "History",
    description: "Undo or redo editing operations.",
    order: 50,
  },
  {
    id: "export",
    label: "Output",
    description: "Download the edited PDF.",
    order: 60,
  },
] as const satisfies readonly EditorCommandGroupDefinition[];

/* -------------------------------------------------------------------------- */
/* Main editor command registry                                                */
/* -------------------------------------------------------------------------- */

export const EDITOR_COMMAND_REGISTRY = [
  {
    id: "select",
    label: "Select",
    shortLabel: "Select",
    description: "Select real PDF text and inspect the document safely.",
    tooltip: "Select text and inspect PDF content",
    kind: "tool",
    group: "selection",
    status: "ready",
    availability: "document-loaded",
    icon: MousePointer2,
    shortcut: {
      key: "S",
      label: "S",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 10,
    },
    searchTerms: ["select", "cursor", "copy text", "inspect text"],
  },
  {
    id: "object",
    label: "Edit Object",
    shortLabel: "Object",
    description: "Move, resize, duplicate, or remove visual editor objects.",
    tooltip: "Edit visual objects and overlay layers",
    kind: "tool",
    group: "selection",
    status: "ready",
    availability: "document-loaded",
    icon: Move,
    shortcut: {
      key: "V",
      label: "V",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 20,
    },
    searchTerms: [
      "object",
      "move",
      "resize",
      "duplicate",
      "edit layer",
      "select layer",
    ],
  },
  {
    id: "edit",
    label: "Replace Text",
    shortLabel: "Replace",
    description:
      "Prepare visual text replacement workflows over existing PDF text.",
    tooltip: "Replace or visually revise existing PDF text",
    kind: "tool",
    group: "selection",
    status: "beta",
    availability: "document-loaded",
    icon: Wand2,
    shortcut: {
      key: "E",
      label: "E",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "sheet",
      priority: 30,
    },
    searchTerms: [
      "replace text",
      "edit text",
      "rewrite text",
      "modify text",
      "visual replacement",
    ],
  },
  {
    id: "text",
    label: "Text",
    shortLabel: "Text",
    description: "Insert a new editable text box onto the active PDF page.",
    tooltip: "Add a text box",
    kind: "tool",
    group: "insert",
    status: "ready",
    availability: "document-loaded",
    icon: Type,
    shortcut: {
      key: "T",
      label: "T",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 40,
    },
    searchTerms: ["text", "textbox", "add text", "type", "label"],
  },
  {
    id: "image",
    label: "Image",
    shortLabel: "Image",
    description: "Upload and place logos, stamps, or supporting images.",
    tooltip: "Add an image",
    kind: "tool",
    group: "insert",
    status: "ready",
    availability: "document-loaded",
    icon: ImagePlus,
    shortcut: {
      key: "I",
      label: "I",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "sheet",
      priority: 50,
    },
    searchTerms: ["image", "photo", "logo", "stamp", "upload image"],
  },
  {
    id: "highlight",
    label: "Highlight",
    shortLabel: "Highlight",
    description: "Mark important PDF content with a clean highlighter flow.",
    tooltip: "Highlight content",
    kind: "tool",
    group: "annotate",
    status: "beta",
    availability: "document-loaded",
    icon: Highlighter,
    shortcut: {
      key: "H",
      label: "H",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 60,
    },
    searchTerms: ["highlight", "marker", "yellow pen", "mark text"],
  },
  {
    id: "whiteout",
    label: "Whiteout",
    shortLabel: "Whiteout",
    description:
      "Future-ready masking tool for covering visible page content cleanly.",
    tooltip: "Whiteout content — coming soon",
    kind: "tool",
    group: "annotate",
    status: "coming-soon",
    availability: "future-ready",
    icon: Eraser,
    presentation: {
      desktop: "ribbon",
      mobile: "sheet",
      priority: 70,
    },
    searchTerms: ["whiteout", "cover", "mask", "hide text", "erase visible"],
  },
  {
    id: "annotate",
    label: "Annotate",
    shortLabel: "Annotate",
    description:
      "Future-ready comments and review notes for document collaboration.",
    tooltip: "Annotations and comments — coming soon",
    kind: "menu",
    group: "annotate",
    status: "coming-soon",
    availability: "future-ready",
    icon: Sparkles,
    presentation: {
      desktop: "ribbon",
      mobile: "sheet",
      priority: 80,
    },
    searchTerms: ["annotate", "comments", "review", "notes", "markup"],
  },
  {
    id: "shapes",
    label: "Shapes",
    shortLabel: "Shapes",
    description:
      "Future-ready arrows, rectangles, circles, and drawing primitives.",
    tooltip: "Add shapes — coming soon",
    kind: "menu",
    group: "annotate",
    status: "coming-soon",
    availability: "future-ready",
    icon: Shapes,
    presentation: {
      desktop: "ribbon",
      mobile: "sheet",
      priority: 90,
    },
    searchTerms: ["shape", "arrow", "rectangle", "circle", "line", "draw"],
  },
  {
    id: "signature",
    label: "Sign",
    shortLabel: "Sign",
    description: "Add typed or uploaded signature workflows to the PDF.",
    tooltip: "Sign the PDF",
    kind: "menu",
    group: "sign",
    status: "beta",
    availability: "document-loaded",
    icon: PenLine,
    shortcut: {
      key: "G",
      label: "G",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 100,
    },
    searchTerms: ["sign", "signature", "approve", "initials", "autograph"],
  },
  {
    id: "undo",
    label: "Undo",
    shortLabel: "Undo",
    description: "Reverse the most recent editor action.",
    tooltip: "Undo",
    kind: "action",
    group: "history",
    status: "ready",
    availability: "document-loaded",
    icon: Undo2,
    shortcut: {
      key: "Z",
      label: "Ctrl/Cmd + Z",
      modifier: "meta",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "hidden",
      priority: 110,
    },
    searchTerms: ["undo", "revert", "back"],
  },
  {
    id: "redo",
    label: "Redo",
    shortLabel: "Redo",
    description: "Restore the most recently undone editor action.",
    tooltip: "Redo",
    kind: "action",
    group: "history",
    status: "ready",
    availability: "document-loaded",
    icon: Redo2,
    shortcut: {
      key: "Z",
      label: "Ctrl/Cmd + Shift + Z",
      modifier: "meta-shift",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "hidden",
      priority: 120,
    },
    searchTerms: ["redo", "restore", "forward"],
  },
  {
    id: "export",
    label: "Export PDF",
    shortLabel: "Export",
    description: "Download the edited PDF with applied visual changes.",
    tooltip: "Export edited PDF",
    kind: "action",
    group: "export",
    status: "ready",
    availability: "document-loaded",
    icon: Download,
    emphasis: "success",
    shortcut: {
      key: "E",
      label: "Ctrl/Cmd + Shift + E",
      modifier: "meta-shift",
      preventDefault: true,
    },
    presentation: {
      desktop: "ribbon",
      mobile: "dock",
      priority: 130,
    },
    searchTerms: ["export", "download", "save pdf", "finish"],
  },
] as const satisfies readonly EditorCommandRegistryItem[];

/* -------------------------------------------------------------------------- */
/* Registry helpers                                                            */
/* -------------------------------------------------------------------------- */

export const DEFAULT_EDITOR_RIBBON_TOOL: EditorRibbonToolId = "select";

export const EDITOR_RIBBON_TOOL_IDS = EDITOR_COMMAND_REGISTRY.filter(
  (command): command is EditorCommandRegistryItem & { id: EditorRibbonToolId } =>
    command.kind === "tool" || command.kind === "menu",
)
  .map((command) => command.id)
  .filter(
    (id): id is EditorRibbonToolId =>
      id !== "undo" && id !== "redo" && id !== "export",
  );

export const EDITOR_RIBBON_ACTION_IDS = EDITOR_COMMAND_REGISTRY.filter(
  (command): command is EditorCommandRegistryItem & { id: EditorRibbonActionId } =>
    command.kind === "action",
)
  .map((command) => command.id)
  .filter(
    (id): id is EditorRibbonActionId =>
      id === "undo" || id === "redo" || id === "export",
  );

export function getEditorCommandById(
  id: EditorCommandId,
): EditorCommandRegistryItem | undefined {
  return EDITOR_COMMAND_REGISTRY.find((command) => command.id === id);
}

export function getEditorCommandsByGroup(
  groupId: EditorCommandGroupId,
): EditorCommandRegistryItem[] {
  return EDITOR_COMMAND_REGISTRY.filter(
    (command) => command.group === groupId,
  ).sort((a, b) => a.presentation.priority - b.presentation.priority);
}

export function getEditorDesktopRibbonCommands(): EditorCommandRegistryItem[] {
  return EDITOR_COMMAND_REGISTRY.filter(
    (command) => command.presentation.desktop === "ribbon",
  ).sort((a, b) => a.presentation.priority - b.presentation.priority);
}

export function getEditorMobileDockCommands(): EditorCommandRegistryItem[] {
  return EDITOR_COMMAND_REGISTRY.filter(
    (command) => command.presentation.mobile === "dock",
  ).sort((a, b) => a.presentation.priority - b.presentation.priority);
}

export function getEditorMobileSheetCommands(): EditorCommandRegistryItem[] {
  return EDITOR_COMMAND_REGISTRY.filter(
    (command) => command.presentation.mobile === "sheet",
  ).sort((a, b) => a.presentation.priority - b.presentation.priority);
}

export function isEditorToolCommand(
  id: EditorCommandId,
): id is EditorRibbonToolId {
  return EDITOR_RIBBON_TOOL_IDS.includes(id as EditorRibbonToolId);
}

export function isEditorActionCommand(
  id: EditorCommandId,
): id is EditorRibbonActionId {
  return EDITOR_RIBBON_ACTION_IDS.includes(id as EditorRibbonActionId);
}
