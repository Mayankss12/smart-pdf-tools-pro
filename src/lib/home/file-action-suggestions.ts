import { getToolById, type Tool } from "@/lib/tools";

export type RecognizedHomepageFileKind =
  | "pdf"
  | "image"
  | "text"
  | "office"
  | "heic";

export type HomepageFileRecognition = {
  readonly kind: RecognizedHomepageFileKind;
  readonly label: string;
  readonly toolIds: readonly string[];
};

const FILE_RECOMMENDATIONS: Readonly<
  Record<string, HomepageFileRecognition>
> = {
  pdf: {
    kind: "pdf",
    label: "PDF document",
    toolIds: [
      "pdf-editor",
      "compress-pdf",
      "merge-pdf",
      "fill-sign",
      "pdf-to-searchable-pdf",
      "pdf-to-images",
    ],
  },
  jpg: {
    kind: "image",
    label: "JPG image",
    toolIds: ["jpg-to-pdf", "images-to-pdf"],
  },
  jpeg: {
    kind: "image",
    label: "JPEG image",
    toolIds: ["jpg-to-pdf", "images-to-pdf"],
  },
  png: {
    kind: "image",
    label: "PNG image",
    toolIds: ["png-to-pdf", "images-to-pdf"],
  },
  webp: {
    kind: "image",
    label: "WebP image",
    toolIds: ["webp-to-pdf", "images-to-pdf"],
  },
  txt: {
    kind: "text",
    label: "Text document",
    toolIds: ["txt-to-pdf"],
  },
  csv: {
    kind: "text",
    label: "CSV document",
    toolIds: ["csv-to-pdf"],
  },
  md: {
    kind: "text",
    label: "Markdown document",
    toolIds: ["markdown-to-pdf"],
  },
  markdown: {
    kind: "text",
    label: "Markdown document",
    toolIds: ["markdown-to-pdf"],
  },
  html: {
    kind: "text",
    label: "HTML document",
    toolIds: ["html-to-pdf"],
  },
  htm: {
    kind: "text",
    label: "HTML document",
    toolIds: ["html-to-pdf"],
  },
  docx: {
    kind: "office",
    label: "Word document",
    toolIds: ["docx-to-pdf"],
  },
  xlsx: {
    kind: "office",
    label: "Excel workbook",
    toolIds: ["xlsx-to-pdf"],
  },
  pptx: {
    kind: "office",
    label: "PowerPoint presentation",
    toolIds: ["pptx-to-pdf"],
  },
  heic: {
    kind: "heic",
    label: "HEIC image",
    toolIds: ["heic-to-pdf"],
  },
  heif: {
    kind: "heic",
    label: "HEIF image",
    toolIds: ["heic-to-pdf"],
  },
};

export const HOMEPAGE_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.txt,.csv,.md,.markdown,.html,.htm,.docx,.xlsx,.pptx,.heic,.heif";
export const HOMEPAGE_FILE_MAX_BYTES = 55 * 1024 * 1024;

export function recognizeHomepageFile(
  file: Pick<File, "name" | "size">,
): HomepageFileRecognition | null {
  if (file.size <= 0 || file.size > HOMEPAGE_FILE_MAX_BYTES) return null;
  const extension = file.name.toLowerCase().split(".").at(-1);
  if (!extension) return null;
  return FILE_RECOMMENDATIONS[extension] ?? null;
}

export function getFileActionSuggestions(
  recognition: HomepageFileRecognition,
): Tool[] {
  return recognition.toolIds.map((id) => {
    const tool = getToolById(id);
    if (!tool) {
      throw new Error(
        `[homepage] Unknown file-action canonical tool ID "${id}".`,
      );
    }
    return tool;
  });
}

