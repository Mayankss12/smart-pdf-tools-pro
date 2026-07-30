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

export const HOMEPAGE_QUICK_ACTION_IDS = [
  "merge-pdf",
  "compress-pdf",
  "fill-sign",
  "pdf-to-searchable-pdf",
  "reorder-pages",
  "pdf-to-images",
] as const;

export type HomepageExplorerCategoryId =
  | "popular"
  | "edit-sign"
  | "organize"
  | "convert-from"
  | "convert-to"
  | "optimize"
  | "smart";

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

export function getHomepagePopularTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  return resolveHomepageTools(
    HOMEPAGE_POPULAR_TOOL_IDS,
    "HOMEPAGE_POPULAR_TOOL_IDS",
  ).filter((tool) =>
    isToolPubliclyLaunchReady(tool, capabilitySnapshot),
  );
}

export function getHomepageQuickActions(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  return resolveHomepageTools(
    HOMEPAGE_QUICK_ACTION_IDS,
    "HOMEPAGE_QUICK_ACTION_IDS",
  ).filter((tool) =>
    isToolPubliclyLaunchReady(tool, capabilitySnapshot),
  );
}

export function getHomepageExplorerTools(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  const seen = new Set<string>();
  return tools.filter((tool) => {
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
}

export function getHomepageConversionsFromPdf(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  return resolveHomepageConversions(
    HOMEPAGE_FROM_PDF_IDS,
    "HOMEPAGE_FROM_PDF_IDS",
  ).filter((conversion) =>
    isToolPubliclyLaunchReady(
      requireTool(conversion.id, "HOMEPAGE_FROM_PDF_IDS"),
      capabilitySnapshot,
    ),
  );
}

export function getHomepageConversionsToPdf(
  capabilitySnapshot: PublicLaunchCapabilitySnapshot,
) {
  return resolveHomepageConversions(
    HOMEPAGE_TO_PDF_IDS,
    "HOMEPAGE_TO_PDF_IDS",
  ).filter((conversion) =>
    isToolPubliclyLaunchReady(
      requireTool(conversion.id, "HOMEPAGE_TO_PDF_IDS"),
      capabilitySnapshot,
    ),
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
  resolveHomepageTools(
    HOMEPAGE_POPULAR_TOOL_IDS,
    "HOMEPAGE_POPULAR_TOOL_IDS",
  );
  resolveHomepageTools(
    HOMEPAGE_QUICK_ACTION_IDS,
    "HOMEPAGE_QUICK_ACTION_IDS",
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
