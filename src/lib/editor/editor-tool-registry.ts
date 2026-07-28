import {
  ArrowUpDown,
  Brain,
  Copy,
  FilePlus2,
  Hash,
  Highlighter,
  Image as ImageIcon,
  Languages,
  MousePointer2,
  PenLine,
  Pencil,
  Redo2,
  RotateCw,
  Search,
  Square,
  Stamp,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import type { UserTier } from "@/lib/entitlements";

export type EditorToolGroup = "add" | "markup" | "smart" | "pages" | "actions";
export type EditorToolAvailability =
  | "available"
  | "requires-document"
  | "requires-page"
  | "requires-selection"
  | "requires-object"
  | "requires-backend"
  | "requires-plan"
  | "coming-soon";
export type EditorBackendCapability = "translation";
export type EditorExportSupport = "none" | "object" | "document" | "search-layer";
export type EditorPlacementMode =
  | "canvas"
  | "picker"
  | "panel"
  | "selection"
  | "document"
  | "action";
export type EditorToolKind = "tool" | "action";
export type EditorPlanRequirement = "core" | "advanced" | "backend";

export type EditorToolDefinition = {
  readonly id: string;
  readonly label: string;
  readonly group: EditorToolGroup;
  readonly kind: EditorToolKind;
  readonly shortcut: string | null;
  readonly icon: LucideIcon;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
  readonly availability: EditorToolAvailability;
  readonly backendCapability: EditorBackendCapability | null;
  readonly exportSupport: EditorExportSupport;
  readonly placementMode: EditorPlacementMode;
  readonly adminFeatureFlag: string;
  readonly analyticsEvent: string;
  readonly planRequirement: EditorPlanRequirement;
};

export const EDITOR_TOOL_DEFINITIONS = [
  {
    id: "select",
    label: "Select",
    group: "add",
    kind: "tool",
    shortcut: "V",
    icon: MousePointer2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "selection",
    adminFeatureFlag: "editor.tool.select",
    analyticsEvent: "editor_tool_select",
    planRequirement: "core",
  },
  {
    id: "text",
    label: "Text",
    group: "add",
    kind: "tool",
    shortcut: "T",
    icon: Type,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.text",
    analyticsEvent: "editor_tool_text",
    planRequirement: "core",
  },
  {
    id: "image",
    label: "Image",
    group: "add",
    kind: "tool",
    shortcut: "I",
    icon: ImageIcon,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "picker",
    adminFeatureFlag: "editor.tool.image",
    analyticsEvent: "editor_tool_image",
    planRequirement: "core",
  },
  {
    id: "signature",
    label: "Sign",
    group: "add",
    kind: "tool",
    shortcut: "G",
    icon: PenLine,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "picker",
    adminFeatureFlag: "editor.tool.signature",
    analyticsEvent: "editor_tool_signature",
    planRequirement: "core",
  },
  {
    id: "shape",
    label: "Shape",
    group: "add",
    kind: "tool",
    shortcut: "R",
    icon: Square,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.shape",
    analyticsEvent: "editor_tool_shape",
    planRequirement: "core",
  },
  {
    id: "draw",
    label: "Draw",
    group: "add",
    kind: "tool",
    shortcut: "D",
    icon: Pencil,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.draw",
    analyticsEvent: "editor_tool_draw",
    planRequirement: "core",
  },
  {
    id: "highlight",
    label: "Highlight",
    group: "markup",
    kind: "tool",
    shortcut: "H",
    icon: Highlighter,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.highlight",
    analyticsEvent: "editor_tool_highlight",
    planRequirement: "core",
  },
  {
    id: "object",
    label: "Object",
    group: "markup",
    kind: "tool",
    shortcut: "B",
    icon: MousePointer2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "selection",
    adminFeatureFlag: "editor.tool.object",
    analyticsEvent: "editor_tool_object",
    planRequirement: "core",
  },
  {
    id: "note",
    label: "Note",
    group: "markup",
    kind: "tool",
    shortcut: "N",
    icon: StickyNote,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.note",
    analyticsEvent: "editor_tool_note",
    planRequirement: "core",
  },
  {
    id: "whiteout",
    label: "Whiteout",
    group: "markup",
    kind: "tool",
    shortcut: "W",
    icon: Square,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "canvas",
    adminFeatureFlag: "editor.tool.whiteout",
    analyticsEvent: "editor_tool_whiteout",
    planRequirement: "core",
  },
  {
    id: "stamp",
    label: "Stamp",
    group: "markup",
    kind: "tool",
    shortcut: "M",
    icon: Stamp,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "picker",
    adminFeatureFlag: "editor.tool.stamp",
    analyticsEvent: "editor_tool_stamp",
    planRequirement: "core",
  },
  {
    id: "ocr",
    label: "OCR",
    group: "smart",
    kind: "tool",
    shortcut: "O",
    icon: Brain,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "search-layer",
    placementMode: "panel",
    adminFeatureFlag: "editor.tool.ocr",
    analyticsEvent: "editor_tool_ocr",
    planRequirement: "core",
  },
  {
    id: "find",
    label: "Find",
    group: "smart",
    kind: "tool",
    shortcut: "Ctrl+F",
    icon: Search,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "panel",
    adminFeatureFlag: "editor.tool.find",
    analyticsEvent: "editor_tool_find",
    planRequirement: "core",
  },
  {
    id: "translate",
    label: "Translate",
    group: "smart",
    kind: "tool",
    shortcut: "L",
    icon: Languages,
    visible: true,
    enabled: true,
    disabledReason: "Backend configuration required.",
    availability: "requires-backend",
    backendCapability: "translation",
    exportSupport: "object",
    placementMode: "panel",
    adminFeatureFlag: "editor.tool.translate",
    analyticsEvent: "editor_tool_translate",
    planRequirement: "core",
  },
  {
    id: "add-page",
    label: "Add",
    group: "pages",
    kind: "action",
    shortcut: "A",
    icon: FilePlus2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "document",
    placementMode: "document",
    adminFeatureFlag: "editor.page.add",
    analyticsEvent: "editor_page_add",
    planRequirement: "core",
  },
  {
    id: "reorder-pages",
    label: "Reorder",
    group: "pages",
    kind: "action",
    shortcut: "Shift+R",
    icon: ArrowUpDown,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "document",
    placementMode: "document",
    adminFeatureFlag: "editor.page.reorder",
    analyticsEvent: "editor_page_reorder",
    planRequirement: "core",
  },
  {
    id: "rotate-page",
    label: "Rotate",
    group: "pages",
    kind: "action",
    shortcut: "Ctrl+R",
    icon: RotateCw,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-page",
    backendCapability: null,
    exportSupport: "document",
    placementMode: "document",
    adminFeatureFlag: "editor.page.rotate",
    analyticsEvent: "editor_page_rotate",
    planRequirement: "core",
  },
  {
    id: "page-numbers",
    label: "Number",
    group: "pages",
    kind: "action",
    shortcut: "P",
    icon: Hash,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-document",
    backendCapability: null,
    exportSupport: "object",
    placementMode: "document",
    adminFeatureFlag: "editor.page.number",
    analyticsEvent: "editor_page_number",
    planRequirement: "core",
  },
  {
    id: "undo",
    label: "Undo",
    group: "actions",
    kind: "action",
    shortcut: "Ctrl+Z",
    icon: Undo2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "available",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "action",
    adminFeatureFlag: "editor.action.undo",
    analyticsEvent: "editor_action_undo",
    planRequirement: "core",
  },
  {
    id: "redo",
    label: "Redo",
    group: "actions",
    kind: "action",
    shortcut: "Ctrl+Y",
    icon: Redo2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "available",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "action",
    adminFeatureFlag: "editor.action.redo",
    analyticsEvent: "editor_action_redo",
    planRequirement: "core",
  },
  {
    id: "duplicate",
    label: "Duplicate",
    group: "actions",
    kind: "action",
    shortcut: "Ctrl+D",
    icon: Copy,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-object",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "action",
    adminFeatureFlag: "editor.action.duplicate",
    analyticsEvent: "editor_action_duplicate",
    planRequirement: "core",
  },
  {
    id: "delete",
    label: "Delete",
    group: "actions",
    kind: "action",
    shortcut: "Delete",
    icon: Trash2,
    visible: true,
    enabled: true,
    disabledReason: null,
    availability: "requires-object",
    backendCapability: null,
    exportSupport: "none",
    placementMode: "action",
    adminFeatureFlag: "editor.action.delete",
    analyticsEvent: "editor_action_delete",
    planRequirement: "core",
  },
] as const satisfies readonly EditorToolDefinition[];

type EditorDefinition = (typeof EDITOR_TOOL_DEFINITIONS)[number];
export type EditorToolbarItemId = EditorDefinition["id"];
export type EditorToolId = Extract<EditorDefinition, { kind: "tool" }>["id"];
export type EditorActionId = Extract<EditorDefinition, { kind: "action" }>["id"];

export const EDITOR_TOOL_GROUPS: readonly {
  readonly id: EditorToolGroup;
  readonly label: string;
}[] = [
  { id: "add", label: "Add" },
  { id: "markup", label: "Markup" },
  { id: "smart", label: "Smart" },
  { id: "pages", label: "Pages" },
  { id: "actions", label: "Actions" },
];

export type EditorFeatureControl = {
  readonly globalEditorEnabled: boolean;
  readonly maintenanceMode: boolean;
  readonly flags: Readonly<Record<string, boolean>>;
};

export type EditorToolContext = {
  readonly hasDocument: boolean;
  readonly hasPage: boolean;
  readonly pageCount: number;
  readonly hasSelection: boolean;
  readonly hasObject: boolean;
  readonly selectedObjectLocked: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly backendCapabilities: Readonly<Record<EditorBackendCapability, boolean>>;
  readonly userTier: UserTier;
  readonly canUseCoreTools: boolean;
  readonly canUseAdvancedTools: boolean;
  readonly canUseBackendTools: boolean;
  readonly featureControl: EditorFeatureControl;
};

export type ResolvedEditorTool = {
  readonly definition: EditorDefinition;
  readonly visible: boolean;
  readonly enabled: boolean;
  readonly disabledReason: string | null;
};

function getPlanDisabledReason(
  definition: EditorToolDefinition,
  context: EditorToolContext,
) {
  if (definition.planRequirement === "backend" && !context.canUseBackendTools) {
    return `${definition.label} requires a backend-enabled plan.`;
  }
  if (definition.planRequirement === "advanced" && !context.canUseAdvancedTools) {
    return `${definition.label} requires an advanced plan.`;
  }
  if (definition.planRequirement === "core" && !context.canUseCoreTools) {
    return `${definition.label} is unavailable on the current plan.`;
  }
  return null;
}

export function resolveEditorTool(
  definition: EditorDefinition,
  context: EditorToolContext,
): ResolvedEditorTool {
  const configuredDefinition: EditorToolDefinition = definition;
  const availability: EditorToolAvailability = configuredDefinition.availability;
  const flagEnabled =
    context.featureControl.flags[configuredDefinition.adminFeatureFlag] ?? true;
  const visible = configuredDefinition.visible;
  let disabledReason: string | null = null;

  if (!context.featureControl.globalEditorEnabled) {
    disabledReason = "The editor is disabled by administration.";
  } else if (context.featureControl.maintenanceMode) {
    disabledReason = "The editor is temporarily in maintenance mode.";
  } else if (!flagEnabled) {
    disabledReason = `${configuredDefinition.label} is disabled by administration.`;
  } else if (!configuredDefinition.enabled) {
    disabledReason = configuredDefinition.disabledReason ?? `${configuredDefinition.label} is disabled.`;
  } else if (availability === "coming-soon") {
    disabledReason = configuredDefinition.disabledReason ?? `${configuredDefinition.label} is coming soon.`;
  } else if (
    availability === "requires-document" &&
    !context.hasDocument
  ) {
    disabledReason = "Open a PDF to use this tool.";
  } else if (availability === "requires-page" && !context.hasPage) {
    disabledReason = "Open a PDF with an active page to use this tool.";
  } else if (
    availability === "requires-selection" &&
    !context.hasSelection
  ) {
    disabledReason = "Select content to use this tool.";
  } else if (availability === "requires-object" && !context.hasObject) {
    disabledReason = "Select an editor object to use this action.";
  } else if (
    availability === "requires-backend" &&
    (!configuredDefinition.backendCapability ||
      !context.backendCapabilities[configuredDefinition.backendCapability])
  ) {
    disabledReason = configuredDefinition.disabledReason ?? "Backend configuration required.";
  } else if (availability === "requires-plan") {
    disabledReason = getPlanDisabledReason(configuredDefinition, context);
  }

  if (!disabledReason && definition.id === "reorder-pages" && context.pageCount < 2) {
    disabledReason = context.hasDocument
      ? "Reorder requires a document with at least two pages."
      : "Open a PDF to reorder pages.";
  }
  if (!disabledReason && definition.id === "undo" && !context.canUndo) {
    disabledReason = "There is nothing to undo.";
  }
  if (!disabledReason && definition.id === "redo" && !context.canRedo) {
    disabledReason = "There is nothing to redo.";
  }
  if (
    !disabledReason &&
    (definition.id === "duplicate" || definition.id === "delete") &&
    context.selectedObjectLocked
  ) {
    disabledReason = "Unlock the selected object to use this action.";
  }

  if (!disabledReason) {
    disabledReason = getPlanDisabledReason(configuredDefinition, context);
  }

  return {
    definition,
    visible,
    enabled: !disabledReason,
    disabledReason,
  };
}

export function getEditorToolDefinition(id: EditorToolbarItemId): EditorDefinition {
  return (
    EDITOR_TOOL_DEFINITIONS.find((tool) => tool.id === id) ??
    EDITOR_TOOL_DEFINITIONS[0]
  );
}

function normalizeShortcutPart(value: string) {
  return value.trim().toLowerCase();
}

export function matchesEditorShortcut(
  event: KeyboardEvent,
  shortcut: string,
) {
  const parts = shortcut.split("+").map(normalizeShortcutPart);
  const key = parts.at(-1);
  const needsCommand = parts.includes("ctrl") || parts.includes("cmd");
  const needsShift = parts.includes("shift");

  if (!key) return false;
  if ((event.ctrlKey || event.metaKey) !== needsCommand) return false;
  if (event.shiftKey !== needsShift) return false;
  if (event.altKey) return false;

  const eventKey = event.key.toLowerCase();
  return eventKey === key || (key === "delete" && eventKey === "backspace");
}
