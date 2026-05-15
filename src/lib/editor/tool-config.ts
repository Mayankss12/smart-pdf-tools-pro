import {
  Download,
  Eraser,
  FileSignature,
  Highlighter,
  ImageIcon,
  MousePointer2,
  PenLine,
  RotateCcw,
  Signature,
  Trash2,
  Type,
} from "lucide-react";

import type { ActiveTool } from "./types";

export type EditorToolAction =
  | ActiveTool
  | "delete"
  | "clear-page"
  | "reset"
  | "export";

export type EditorToolbarItem = {
  id: EditorToolAction;
  label: string;
  description: string;
  group: "edit" | "insert" | "manage" | "export";
  tone?: "default" | "primary" | "warning" | "danger" | "success";
  icon: typeof MousePointer2;
};

export const editorToolbarItems: EditorToolbarItem[] = [
  {
    id: "edit",
    label: "Edit",
    description: "Hover text to preview, click text to edit.",
    group: "edit",
    tone: "default",
    icon: MousePointer2,
  },
  {
    id: "text",
    label: "Text",
    description: "Draw a custom text box on the PDF.",
    group: "edit",
    tone: "primary",
    icon: Type,
  },
  {
    id: "highlight",
    label: "Highlight",
    description: "Select PDF text and highlight it like a marker.",
    group: "edit",
    tone: "warning",
    icon: Highlighter,
  },
  {
    id: "image",
    label: "Image",
    description: "Add an image layer to the PDF.",
    group: "insert",
    tone: "primary",
    icon: ImageIcon,
  },
  {
    id: "signature",
    label: "Sign",
    description: "Add a typed signature.",
    group: "insert",
    tone: "primary",
    icon: PenLine,
  },
  {
    id: "signature-image",
    label: "Sign Image",
    description: "Upload and place a signature image.",
    group: "insert",
    tone: "primary",
    icon: Signature,
  },
  {
    id: "form-text",
    label: "Form Text",
    description: "Add a fillable-style text field.",
    group: "insert",
    tone: "default",
    icon: FileSignature,
  },
  {
    id: "delete",
    label: "Delete",
    description: "Delete selected layer.",
    group: "manage",
    tone: "danger",
    icon: Trash2,
  },
  {
    id: "clear-page",
    label: "Clear Page",
    description: "Remove all layers from the current page.",
    group: "manage",
    tone: "default",
    icon: Eraser,
  },
  {
    id: "reset",
    label: "Reset",
    description: "Reset editor and remove current PDF.",
    group: "manage",
    tone: "default",
    icon: RotateCcw,
  },
  {
    id: "export",
    label: "Export",
    description: "Download the edited PDF.",
    group: "export",
    tone: "success",
    icon: Download,
  },
];

export function getToolStatus(tool: ActiveTool) {
  if (tool === "edit") {
    return "Edit mode active. Hover text to preview, click text to edit it.";
  }

  if (tool === "text") {
    return "Text tool active. Drag on the PDF page to draw a text box.";
  }

  if (tool === "highlight") {
    return "Highlight mode active. Select PDF text to highlight it.";
  }

  if (tool === "image") {
    return "Image tool active. Upload an image and place it on the PDF.";
  }

  if (tool === "signature") {
    return "Signature tool active. Add a typed signature.";
  }

  if (tool === "signature-image") {
    return "Signature image tool active. Upload your signature image.";
  }

  if (tool === "form-text") {
    return "Form text tool active. Drag to add a text field.";
  }

  if (tool === "form-checkbox") {
    return "Checkbox tool active. Drag to add a checkbox.";
  }

  if (tool === "form-date") {
    return "Date tool active. Drag to add a date field.";
  }

  return "Editor ready.";
}
