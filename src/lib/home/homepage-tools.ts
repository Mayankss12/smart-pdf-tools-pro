import {
  getConversionById,
  type ConversionDefinition,
} from "@/lib/conversions/registry";
import {
  getToolById,
  tools,
  type Tool,
} from "@/lib/tools";
import {
  isToolPubliclyLaunchReady,
  type PublicLaunchCapabilitySnapshot,
} from "@/lib/public-launch";

export const HOMEPAGE_POPULAR_TOOL_IDS = [
  "pdf-editor",
  "merge-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-searchable-pdf",
  "jpg-to-pdf",
  "pdf-to-images",
  "split-pdf",
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

export const HOMEPAGE_TOOL_GRID_ORDER_IDS = [
  "pdf-editor",
  "merge-pdf",
  "split-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-images",
  "images-to-pdf",
  "pdf-to-searchable-pdf",
  "reorder-pages",
  "rotate-pdf",
  "delete-pages",
  "extract-pages",
  "page-numbers",
  "watermark-pdf",
  "sign-pdf",
  "annotate-pdf",
  "highlight-pdf",
  "pdf-to-text",
  "pdf-to-html",
  "pdf-to-jpg",
  "pdf-to-png",
  "pdf-to-webp",
  "jpg-to-pdf",
  "png-to-pdf",
  "webp-to-pdf",
  "txt-to-pdf",
  "markdown-to-pdf",
  "html-to-pdf",
  "csv-to-pdf",
] as const;

export type HomepageToolGridCategoryId =
  | "all"
  | "edit-sign"
  | "organize"
  | "convert-from"
  | "convert-to"
  | "optimize-ocr"
  | "security";

const HOMEPAGE_TOOL_GRID_CATEGORIES: readonly {
  readonly id: HomepageToolGridCategoryId;
  readonly label: string;
}[] = [
  { id: "all", label: "All tools" },
  { id: "edit-sign", label: "Edit & Sign" },
  { id: "organize", label: "Organize" },
  { id: "convert-from", label: "Convert from PDF" },
  { id: "convert-to", label: "Convert to PDF" },
  { id: "optimize-ocr", label: "Optimize & OCR" },
  { id: "security", label: "Security" },
];

export const HOMEPAGE_FAQS = [
  {
    question: "Can I edit a PDF online?",
    answer:
      "Yes. Open the PDF Editor to add text, images, highlights, notes, whiteout, and visual signatures, then export your updated PDF.",
  },
  {
    question: "Is PDFMantra free to use?",
    answer:
      "The PDF tools shown on this site can be opened and used without installing software. If a usage limit applies, it is shown before you export.",
  },
  {
    question: "Are my PDF files private?",
    answer:
      "Supported tools process documents locally in your browser. Your files remain on your device while you use those tools.",
  },
  {
    question: "Can I fill and sign PDF forms?",
    answer:
      "You can add text and place a typed, drawn, or uploaded visual signature on a PDF. This is a visual document workflow, not a cryptographic digital signature.",
  },
  {
    question: "Can scanned PDFs be made searchable?",
    answer:
      "Yes. The OCR tool can add a searchable text layer while preserving the original page image. Accuracy depends on scan quality, language, and handwriting clarity.",
  },
  {
    question: "Does PDFMantra work on mobile devices?",
    answer:
      "Yes. The site and its focused tools are designed for phones and tablets, although complex document editing is usually more comfortable on a larger screen.",
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

export function getHomepageToolGridTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  const seen = new Set<string>();
  const launchReadyTools = tools.filter((tool) => {
    if (
      !tool.visibility.searchable ||
      seen.has(tool.id) ||
      !isToolPubliclyLaunchReady(tool, capabilitySnapshot)
    ) {
      return false;
    }
    seen.add(tool.id);
    return true;
  });
  const launchReadyById = new Map(
    launchReadyTools.map((tool) => [tool.id, tool]),
  );
  const orderedTools = resolveHomepageTools(
    HOMEPAGE_TOOL_GRID_ORDER_IDS,
    "HOMEPAGE_TOOL_GRID_ORDER_IDS",
  ).flatMap((tool) => {
    const launchReadyTool = launchReadyById.get(tool.id);
    return launchReadyTool ? [launchReadyTool] : [];
  });
  const orderedIds = new Set(orderedTools.map((tool) => tool.id));

  return [
    ...orderedTools,
    ...launchReadyTools.filter((tool) => !orderedIds.has(tool.id)),
  ];
}

export function getHomepageToolGridCategories(toolsInGrid: readonly Tool[]) {
  const hasPublicSecurityTool = toolsInGrid.some(
    (tool) => tool.category === "security",
  );

  return HOMEPAGE_TOOL_GRID_CATEGORIES.filter(
    (category) => category.id !== "security" || hasPublicSecurityTool,
  );
}

export function matchesHomepageToolQuery(tool: Tool, query: string) {
  const normalize = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const corpus = [
    tool.title,
    tool.shortTitle,
    tool.description,
    tool.menuDescription,
    ...tool.search.aliases,
    ...tool.search.keywords,
    ...tool.search.useCases,
  ]
    .filter(Boolean)
    .map((value) => normalize(String(value)))
    .join(" ");

  return normalizedQuery
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => corpus.includes(token));
}

export function isToolInHomepageGridCategory(
  tool: Tool,
  category: HomepageToolGridCategoryId,
) {
  if (category === "all") return true;
  if (category === "edit-sign") return tool.category === "edit";
  if (category === "organize") return tool.category === "organize";
  if (category === "optimize-ocr") return tool.category === "optimize";
  if (category === "security") return tool.category === "security";
  const conversion = getConversionById(tool.id);
  if (category === "convert-from") {
    return conversion?.sourceFormat === "pdf";
  }
  if (category === "convert-to") {
    return conversion?.destinationFormat === "pdf";
  }
  return false;
}

export function assertHomepageCuratedIds() {
  resolveHomepageTools(
    HOMEPAGE_POPULAR_TOOL_IDS,
    "HOMEPAGE_POPULAR_TOOL_IDS",
  );
  resolveHomepageTools(
    HOMEPAGE_TOOL_GRID_ORDER_IDS,
    "HOMEPAGE_TOOL_GRID_ORDER_IDS",
  );
  resolveHomepageConversions(
    HOMEPAGE_FROM_PDF_IDS,
    "HOMEPAGE_FROM_PDF_IDS",
  );
  resolveHomepageConversions(
    HOMEPAGE_TO_PDF_IDS,
    "HOMEPAGE_TO_PDF_IDS",
  );
}
