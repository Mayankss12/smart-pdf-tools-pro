import {
  CONVERSION_REGISTRY,
  getConversionById,
  type ConversionDefinition,
} from "@/lib/conversions/registry";
import {
  getToolById,
  tools,
  type Tool,
} from "@/lib/tools";

export const HOMEPAGE_POPULAR_TOOL_IDS = [
  "pdf-editor",
  "merge-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-searchable-pdf",
  "jpg-to-pdf",
  "pdf-to-images",
  "pdf-to-word",
] as const;

export const HOMEPAGE_FROM_PDF_IDS = [
  "pdf-to-text",
  "pdf-to-html",
  "pdf-to-jpg",
  "pdf-to-png",
  "pdf-to-webp",
  "pdf-to-images",
  "pdf-to-searchable-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-powerpoint",
] as const;

export const HOMEPAGE_TO_PDF_IDS = [
  "images-to-pdf",
  "jpg-to-pdf",
  "png-to-pdf",
  "webp-to-pdf",
  "txt-to-pdf",
  "markdown-to-pdf",
  "html-to-pdf",
  "csv-to-pdf",
  "docx-to-pdf",
  "xlsx-to-pdf",
  "pptx-to-pdf",
  "heic-to-pdf",
  "webpage-to-pdf",
] as const;

export const HOMEPAGE_QUICK_ACTION_IDS = [
  "merge-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-searchable-pdf",
  "reorder-pages",
  "pdf-to-images",
] as const;

export const HOMEPAGE_WORKFLOWS = [
  {
    id: "prepare",
    title: "Prepare a document",
    description: "Build a polished, share-ready PDF.",
    toolIds: ["merge-pdf", "reorder-pages", "page-numbers", "compress-pdf"],
  },
  {
    id: "review",
    title: "Review and approve",
    description: "Make changes, mark decisions, and collect a signature.",
    toolIds: ["pdf-editor", "highlight-pdf", "fill-sign"],
  },
  {
    id: "digitize",
    title: "Digitize and convert",
    description: "Turn scanned pages into useful, searchable content.",
    toolIds: ["pdf-to-searchable-pdf", "pdf-editor", "pdf-to-text", "pdf-to-images"],
  },
] as const;

export type HomepageExplorerCategoryId =
  | "popular"
  | "edit-sign"
  | "organize"
  | "convert-from"
  | "convert-to"
  | "optimize"
  | "smart"
  | "security";

export const HOMEPAGE_EXPLORER_CATEGORIES: readonly {
  readonly id: HomepageExplorerCategoryId;
  readonly label: string;
}[] = [
  { id: "popular", label: "Popular" },
  { id: "edit-sign", label: "Edit & Sign" },
  { id: "organize", label: "Organize" },
  { id: "convert-from", label: "Convert from PDF" },
  { id: "convert-to", label: "Convert to PDF" },
  { id: "optimize", label: "Optimize" },
  { id: "smart", label: "OCR & Smart Tools" },
  { id: "security", label: "Security" },
];

export const HOMEPAGE_FAQS = [
  {
    question: "Is PDFMantra free?",
    answer:
      "PDFMantra includes browser-based tools you can start without a paid provider. Some advanced or provider-processed workflows can require an account, an eligible plan, and configured backend capacity.",
  },
  {
    question: "Are files uploaded to a server?",
    answer:
      "Browser-labelled tools process supported work locally in your browser. Tools labelled Secure Provider send files only after you choose that workflow and may require authentication. PDFMantra does not claim that every tool is browser-only.",
  },
  {
    question: "Which tools work in the browser?",
    answer:
      "The PDF Editor, page organization, compression, supported image conversion, structured text conversion, and client OCR workflows are browser-based where their tool card shows the Browser badge.",
  },
  {
    question: "Can scanned PDFs be searched?",
    answer:
      "Yes. The searchable PDF workflow can run OCR in the browser and add a search layer while preserving the original page appearance. Accuracy depends on scan quality and language selection.",
  },
  {
    question: "Does PDF to Word currently support OCR?",
    answer:
      "Not without a verified document-processing provider. PDF to Word stays visibly disabled when that provider is unavailable, and PDFMantra does not claim verified OCR, editability, or layout preservation in that state.",
  },
  {
    question: "What happens when a tool requires backend processing?",
    answer:
      "The tool is clearly labelled Secure Provider or Backend required. It remains disabled when its configured provider capability is unavailable, and authenticated access or plan limits can apply when it is enabled.",
  },
] as const;

export function getHomepageFaqStructuredData() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOMEPAGE_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

function requireTool(id: string, collectionName: string): Tool {
  const tool = getToolById(id);
  if (!tool) {
    throw new Error(
      `[homepage] Unknown canonical tool ID "${id}" in ${collectionName}.`,
    );
  }
  return tool;
}

function requireConversion(
  id: string,
  collectionName: string,
): ConversionDefinition {
  const conversion = getConversionById(id);
  if (!conversion) {
    throw new Error(
      `[homepage] Unknown canonical conversion ID "${id}" in ${collectionName}.`,
    );
  }
  return conversion;
}

export function resolveHomepageTools(
  ids: readonly string[],
  collectionName: string,
): Tool[] {
  const seen = new Set<string>();
  return ids.map((id) => {
    if (seen.has(id)) {
      throw new Error(
        `[homepage] Duplicate canonical tool ID "${id}" in ${collectionName}.`,
      );
    }
    seen.add(id);
    return requireTool(id, collectionName);
  });
}

export function resolveHomepageConversions(
  ids: readonly string[],
  collectionName: string,
): ConversionDefinition[] {
  const seen = new Set<string>();
  return ids.map((id) => {
    if (seen.has(id)) {
      throw new Error(
        `[homepage] Duplicate conversion ID "${id}" in ${collectionName}.`,
      );
    }
    seen.add(id);
    return requireConversion(id, collectionName);
  });
}

export function getHomepagePopularTools() {
  return resolveHomepageTools(
    HOMEPAGE_POPULAR_TOOL_IDS,
    "HOMEPAGE_POPULAR_TOOL_IDS",
  );
}

export function getHomepageQuickActions() {
  return resolveHomepageTools(
    HOMEPAGE_QUICK_ACTION_IDS,
    "HOMEPAGE_QUICK_ACTION_IDS",
  );
}

export function getHomepageExplorerTools() {
  const seen = new Set<string>();
  return tools.filter((tool) => {
    if (!tool.visibility.searchable || seen.has(tool.id)) return false;
    seen.add(tool.id);
    return true;
  });
}

export function getHomepageWorkflowTools(toolIds: readonly string[]) {
  return resolveHomepageTools(toolIds, "HOMEPAGE_WORKFLOWS");
}

export function getHomepageConversionsFromPdf() {
  return resolveHomepageConversions(
    HOMEPAGE_FROM_PDF_IDS,
    "HOMEPAGE_FROM_PDF_IDS",
  );
}

export function getHomepageConversionsToPdf() {
  return resolveHomepageConversions(
    HOMEPAGE_TO_PDF_IDS,
    "HOMEPAGE_TO_PDF_IDS",
  );
}

export function isToolInHomepageCategory(
  tool: Tool,
  category: HomepageExplorerCategoryId,
) {
  if (category === "popular") {
    return HOMEPAGE_POPULAR_TOOL_IDS.some((id) => id === tool.id);
  }
  if (category === "edit-sign") return tool.category === "edit";
  if (category === "organize") return tool.category === "organize";
  if (category === "optimize") return tool.category === "optimize";
  if (category === "security") return tool.category === "security";

  const conversion = getConversionById(tool.id);
  if (category === "convert-from") {
    return conversion?.sourceFormat === "pdf";
  }
  if (category === "convert-to") {
    return conversion?.destinationFormat === "pdf";
  }
  return (
    tool.id === "pdf-to-searchable-pdf" ||
    tool.id === "pdf-to-text" ||
    tool.id === "pdf-to-html" ||
    tool.id === "pdf-editor"
  );
}

export function assertHomepageCuratedIds() {
  getHomepagePopularTools();
  getHomepageQuickActions();
  getHomepageConversionsFromPdf();
  getHomepageConversionsToPdf();
  for (const workflow of HOMEPAGE_WORKFLOWS) {
    getHomepageWorkflowTools(workflow.toolIds);
  }
}
