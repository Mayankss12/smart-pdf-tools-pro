export type EditorToolStatus = "working" | "backend-required";

export type EditorToolDefinition = {
  readonly id: string;
  readonly status: EditorToolStatus;
  readonly shortcut: string | null;
  readonly placement: "canvas" | "picker" | "panel" | "selection";
  readonly exportObjectType:
    | "text"
    | "highlight"
    | "whiteout"
    | "image"
    | "signature"
    | "shape"
    | "draw"
    | "stamp"
    | "note"
    | null;
};

export const EDITOR_TOOL_DEFINITIONS = [
  {
    id: "select",
    status: "working",
    shortcut: "V",
    placement: "selection",
    exportObjectType: null,
  },
  {
    id: "object",
    status: "working",
    shortcut: null,
    placement: "selection",
    exportObjectType: null,
  },
  {
    id: "text",
    status: "working",
    shortcut: "T",
    placement: "canvas",
    exportObjectType: "text",
  },
  {
    id: "highlight",
    status: "working",
    shortcut: "H",
    placement: "canvas",
    exportObjectType: "highlight",
  },
  {
    id: "whiteout",
    status: "working",
    shortcut: "W",
    placement: "canvas",
    exportObjectType: "whiteout",
  },
  {
    id: "image",
    status: "working",
    shortcut: null,
    placement: "picker",
    exportObjectType: "image",
  },
  {
    id: "signature",
    status: "working",
    shortcut: null,
    placement: "picker",
    exportObjectType: "signature",
  },
  {
    id: "shape",
    status: "working",
    shortcut: "R",
    placement: "canvas",
    exportObjectType: "shape",
  },
  {
    id: "draw",
    status: "working",
    shortcut: "D",
    placement: "canvas",
    exportObjectType: "draw",
  },
  {
    id: "stamp",
    status: "working",
    shortcut: "M",
    placement: "picker",
    exportObjectType: "stamp",
  },
  {
    id: "note",
    status: "working",
    shortcut: "N",
    placement: "canvas",
    exportObjectType: "note",
  },
  {
    id: "ocr",
    status: "working",
    shortcut: "O",
    placement: "panel",
    exportObjectType: null,
  },
  {
    id: "find",
    status: "working",
    shortcut: "Ctrl+F",
    placement: "panel",
    exportObjectType: null,
  },
  {
    id: "translate",
    status: "backend-required",
    shortcut: null,
    placement: "panel",
    exportObjectType: null,
  },
] as const satisfies readonly EditorToolDefinition[];

export type EditorToolId = (typeof EDITOR_TOOL_DEFINITIONS)[number]["id"];

export function getEditorToolDefinition(
  id: EditorToolId,
): (typeof EDITOR_TOOL_DEFINITIONS)[number] {
  return EDITOR_TOOL_DEFINITIONS.find((tool) => tool.id === id) ??
    EDITOR_TOOL_DEFINITIONS[0];
}

export function getEditorToolForSingleKey(key: string): EditorToolId | null {
  const normalizedKey = key.toLowerCase();
  const match = EDITOR_TOOL_DEFINITIONS.find(
    (tool) =>
      tool.status === "working" &&
      tool.shortcut?.length === 1 &&
      tool.shortcut.toLowerCase() === normalizedKey,
  );

  return match?.id ?? null;
}
