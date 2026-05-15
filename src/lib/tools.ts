import {
  ArrowUpDown,
  Brain,
  Combine,
  Copy,
  Droplets,
  Eye,
  FileArchive,
  FileImage,
  FileText,
  Hash,
  Highlighter,
  Image,
  Layers,
  PenLine,
  RotateCw,
  Scissors,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Wand2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * PDFMantra Tool Registry
 * ------------------------------------------------------------
 * This file is intentionally more than a static card array.
 *
 * It acts as the product intelligence layer for:
 * - Tools Mega Menu
 * - Tool search
 * - Homepage discovery blocks
 * - Tools dashboard filtering
 * - Future backend/client capability messaging
 * - Popular / featured tool curation
 *
 * Keep tool truth centralized here.
 */

export type ToolStatus = "working" | "beta" | "coming-soon";

export type ToolCategory =
  | "edit"
  | "organize"
  | "convert"
  | "optimize"
  | "security";

export type ToolProcessingMode = "browser" | "backend" | "hybrid";

export type ToolExperience =
  | "workspace"
  | "quick-action"
  | "guided-processing";

export type ToolLaunchTier =
  | "available-now"
  | "next-product-wave"
  | "backend-roadmap";

export interface ToolCategoryMeta {
  id: ToolCategory;
  label: string;
  menuLabel: string;
  description: string;
  shortDescription: string;
  sortOrder: number;
  searchAliases: readonly string[];
}

export interface ToolSearchMeta {
  aliases: readonly string[];
  keywords: readonly string[];
  useCases: readonly string[];
  resultPriority: number;
}

export interface ToolVisibility {
  showInToolsPage: boolean;
  showInMegaMenu: boolean;
  showOnHomepage: boolean;
  searchable: boolean;
}

export interface ToolCapabilityMeta {
  processingMode: ToolProcessingMode;
  experience: ToolExperience;
  launchTier: ToolLaunchTier;
  needsBackendProcessing: boolean;
  supportsMultipleFiles?: boolean;
  recommendedEntry?: "editor" | "tool-page";
}

export interface Tool {
  id: string;
  title: string;
  shortTitle?: string;
  description: string;
  menuDescription: string;
  category: ToolCategory;
  href: string;
  icon: LucideIcon;
  status: ToolStatus;

  /**
   * Kept for backward compatibility with existing UI/code.
   * Prefer `capabilities.processingMode` for new work.
   */
  isClientOnly: boolean;

  maxFiles?: number;
  popular?: boolean;
  featured?: boolean;
  newTool?: boolean;

  search: ToolSearchMeta;
  visibility: ToolVisibility;
  capabilities: ToolCapabilityMeta;
}

export interface ToolSearchOptions {
  category?: ToolCategory;
  includeComingSoon?: boolean;
  limit?: number;
}

export interface ToolSearchResult {
  tool: Tool;
  score: number;
  matchedBy: ToolSearchMatchKind[];
}

export type ToolSearchMatchKind =
  | "exact-title"
  | "title"
  | "alias"
  | "keyword"
  | "use-case"
  | "description"
  | "category";

export interface ToolMenuGroup {
  category: ToolCategory;
  label: string;
  description: string;
  tools: Tool[];
}

export const TOOL_CATEGORIES: readonly ToolCategoryMeta[] = [
  {
    id: "edit",
    label: "Edit & Annotate",
    menuLabel: "Edit & Sign",
    description:
      "Make visual changes, add content, annotate, and sign documents inside the PDFMantra workspace.",
    shortDescription: "Edit, annotate, highlight, and sign PDFs.",
    sortOrder: 1,
    searchAliases: [
      "edit",
      "annotate",
      "write",
      "mark",
      "signature",
      "fill",
    ],
  },
  {
    id: "organize",
    label: "Organize Pages",
    menuLabel: "Organize",
    description:
      "Restructure PDFs by merging, splitting, extracting, reordering, and managing pages visually.",
    shortDescription: "Merge, split, rotate, extract, and reorder pages.",
    sortOrder: 2,
    searchAliases: [
      "organize",
      "pages",
      "merge",
      "split",
      "combine",
      "rearrange",
    ],
  },
  {
    id: "convert",
    label: "Convert",
    menuLabel: "Convert",
    description:
      "Move between PDF and other useful document or image formats with clear conversion flows.",
    shortDescription: "Convert PDFs, images, and editable formats.",
    sortOrder: 3,
    searchAliases: [
      "convert",
      "export",
      "word",
      "image",
      "jpg",
      "png",
    ],
  },
  {
    id: "optimize",
    label: "Optimize & OCR",
    menuLabel: "Optimize & OCR",
    description:
      "Reduce file size, improve PDF usability, and make scanned content searchable with backend-grade processing.",
    shortDescription: "Compress, optimize, and make scans searchable.",
    sortOrder: 4,
    searchAliases: [
      "compress",
      "reduce size",
      "optimize",
      "ocr",
      "scan",
      "searchable",
    ],
  },
  {
    id: "security",
    label: "Security",
    menuLabel: "Security",
    description:
      "Protect, unlock, and permanently remove sensitive information through secure PDF workflows.",
    shortDescription: "Protect, unlock, and redact PDFs.",
    sortOrder: 5,
    searchAliases: [
      "security",
      "password",
      "protect",
      "unlock",
      "redact",
      "private",
    ],
  },
] as const;

export const TOOL_CATEGORY_ORDER: readonly ToolCategory[] =
  TOOL_CATEGORIES.map((category) => category.id);

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edit: "Edit & Annotate",
  organize: "Organize Pages",
  convert: "Convert",
  optimize: "Optimize & OCR",
  security: "Security",
};

export const CATEGORY_MENU_LABELS: Record<ToolCategory, string> = {
  edit: "Edit & Sign",
  organize: "Organize",
  convert: "Convert",
  optimize: "Optimize & OCR",
  security: "Security",
};

export const STATUS_CONFIG: Record<
  ToolStatus,
  {
    label: string;
    className: string;
    rank: number;
  }
> = {
  working: {
    label: "Live",
    className:
      "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
    rank: 1,
  },
  beta: {
    label: "Beta",
    className:
      "rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700",
    rank: 2,
  },
  "coming-soon": {
    label: "Coming Soon",
    className:
      "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500",
    rank: 3,
  },
};

export const tools: Tool[] = [
  {
    id: "pdf-editor",
    title: "PDF Editor",
    shortTitle: "Editor",
    description:
      "Add text, images, highlights, whiteout, and signatures. Export the final PDF.",
    menuDescription:
      "Edit visually with text, highlights, images, signatures, and export.",
    category: "edit",
    href: "/editor",
    icon: FileText,
    status: "beta",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "edit pdf",
        "pdf editing",
        "change pdf",
        "modify pdf",
        "write on pdf",
        "annotate pdf",
        "pdf workspace",
      ],
      keywords: [
        "text",
        "image",
        "highlight",
        "whiteout",
        "signature",
        "overlay",
        "annotation",
      ],
      useCases: [
        "add text to pdf",
        "edit a pdf online",
        "place content on a pdf",
      ],
      resultPriority: 120,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "workspace",
      launchTier: "available-now",
      needsBackendProcessing: false,
      recommendedEntry: "editor",
    },
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description:
      "Draw, type, or upload a signature and place it on any PDF page.",
    menuDescription:
      "Place typed, drawn, or uploaded signatures inside your PDF.",
    category: "edit",
    href: "/editor",
    icon: PenLine,
    status: "beta",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "signature",
        "add signature",
        "esign pdf",
        "sign document",
        "sign pdf online",
      ],
      keywords: [
        "draw signature",
        "typed signature",
        "upload signature",
        "sign image",
      ],
      useCases: [
        "sign a document",
        "put my signature on pdf",
        "add handwritten signature",
      ],
      resultPriority: 105,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "workspace",
      launchTier: "available-now",
      needsBackendProcessing: false,
      recommendedEntry: "editor",
    },
  },
  {
    id: "highlight-pdf",
    title: "Highlight PDF",
    description: "Apply marker-style highlights to selected text in your PDF.",
    menuDescription:
      "Mark important text with clean textbook-style highlighting.",
    category: "edit",
    href: "/editor",
    icon: Highlighter,
    status: "beta",
    isClientOnly: true,
    popular: true,
    featured: false,
    search: {
      aliases: [
        "highlight",
        "mark text",
        "annotate text",
        "pdf highlighter",
        "marker",
      ],
      keywords: [
        "text selection",
        "highlight color",
        "marker style",
        "annotation",
      ],
      useCases: [
        "highlight text in pdf",
        "mark important sentences",
        "review pdf",
      ],
      resultPriority: 98,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "workspace",
      launchTier: "available-now",
      needsBackendProcessing: false,
      recommendedEntry: "editor",
    },
  },
  {
    id: "watermark-pdf",
    title: "Add Watermark",
    description: "Stamp text or image watermarks on every PDF page.",
    menuDescription:
      "Apply branded text or image watermarks across your document.",
    category: "edit",
    href: "/tools/watermark",
    icon: Droplets,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "watermark pdf",
        "stamp pdf",
        "logo watermark",
        "confidential mark",
      ],
      keywords: ["overlay", "text watermark", "image watermark", "stamp"],
      useCases: [
        "brand a pdf",
        "add confidential text",
        "place logo on pdf",
      ],
      resultPriority: 76,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "quick-action",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "page-numbers",
    title: "Add Page Numbers",
    description: "Insert page numbers with custom position and style.",
    menuDescription:
      "Number pages automatically with clean placement options.",
    category: "edit",
    href: "/tools/page-numbers",
    icon: Hash,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "page numbers",
        "number pages",
        "paginate pdf",
        "pdf pagination",
      ],
      keywords: ["header", "footer", "page count", "numbering"],
      useCases: [
        "add numbering to pdf",
        "paginate document",
        "label pdf pages",
      ],
      resultPriority: 70,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "quick-action",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document instantly.",
    menuDescription:
      "Join multiple PDFs into one clear, ordered output file.",
    category: "organize",
    href: "/tools/merge",
    icon: Combine,
    status: "coming-soon",
    isClientOnly: true,
    maxFiles: 20,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "combine pdf",
        "join pdf",
        "append pdf",
        "merge documents",
        "put pdfs together",
      ],
      keywords: [
        "multiple files",
        "combine",
        "join",
        "order files",
        "stack files",
      ],
      useCases: [
        "merge pdf files",
        "combine invoices into one pdf",
        "join several documents",
      ],
      resultPriority: 115,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      supportsMultipleFiles: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Extract pages or split a PDF into multiple files by range.",
    menuDescription:
      "Break large PDFs into page ranges or smaller documents.",
    category: "organize",
    href: "/tools/split",
    icon: Scissors,
    status: "coming-soon",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "divide pdf",
        "separate pdf",
        "split pages",
        "break pdf",
      ],
      keywords: ["page range", "extract range", "separate document"],
      useCases: [
        "split one pdf into several files",
        "remove part of a pdf",
        "export selected page ranges",
      ],
      resultPriority: 108,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate individual pages or the entire document.",
    menuDescription:
      "Fix sideways pages with page-level or full-document rotation.",
    category: "organize",
    href: "/tools/rotate",
    icon: RotateCw,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "turn pages",
        "rotate pages",
        "fix pdf orientation",
        "sideways pdf",
      ],
      keywords: ["90 degrees", "landscape", "portrait", "orientation"],
      useCases: [
        "rotate scanned pdf",
        "fix turned page",
        "change page direction",
      ],
      resultPriority: 80,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "quick-action",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "delete-pages",
    title: "Delete Pages",
    description: "Remove unwanted pages from your PDF visually.",
    menuDescription:
      "Remove unnecessary pages with a visual page manager.",
    category: "organize",
    href: "/tools/delete-pages",
    icon: Trash2,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "remove pages",
        "delete pdf page",
        "drop pages",
        "erase pages",
      ],
      keywords: ["page cleanup", "remove sheet", "discard pages"],
      useCases: [
        "delete pages from pdf",
        "remove blank pages",
        "drop unwanted pages",
      ],
      resultPriority: 78,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "extract-pages",
    title: "Extract Pages",
    description: "Pull out specific pages into a new PDF document.",
    menuDescription:
      "Export only the pages you need into a fresh PDF.",
    category: "organize",
    href: "/tools/extract",
    icon: Copy,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "pull pages",
        "save selected pages",
        "extract pdf pages",
        "copy pages",
      ],
      keywords: ["selected pages", "export pages", "page extraction"],
      useCases: [
        "extract a few pages",
        "save one section as pdf",
        "pull specific pages",
      ],
      resultPriority: 82,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "reorder-pages",
    title: "Reorder Pages",
    description: "Drag and drop to rearrange PDF pages in any order.",
    menuDescription:
      "Rearrange page order visually before exporting.",
    category: "organize",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "rearrange pages",
        "move pages",
        "change page order",
        "sort pdf pages",
      ],
      keywords: ["drag and drop", "page order", "sequence"],
      useCases: [
        "reorder pdf pages",
        "move page 5 to front",
        "arrange scanned pages",
      ],
      resultPriority: 84,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "organize-pdf",
    title: "Organize PDF",
    description: "Visually manage, rotate, and arrange all pages.",
    menuDescription:
      "Open a page workspace for broader PDF organization tasks.",
    category: "organize",
    href: "/tools/organize",
    icon: Layers,
    status: "coming-soon",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "page organizer",
        "organize pdf",
        "manage pdf pages",
        "arrange pages",
      ],
      keywords: [
        "thumbnail workspace",
        "page canvas",
        "rotate",
        "reorder",
        "delete",
      ],
      useCases: [
        "manage all pages visually",
        "organize scanned file",
        "clean up pdf page order",
      ],
      resultPriority: 102,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "workspace",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "images-to-pdf",
    title: "Images to PDF",
    description: "Convert JPG, PNG, or WebP images into a single PDF.",
    menuDescription:
      "Turn multiple images into one ordered PDF document.",
    category: "convert",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    status: "coming-soon",
    isClientOnly: true,
    maxFiles: 30,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "jpg to pdf",
        "png to pdf",
        "photo to pdf",
        "image converter",
        "pictures to pdf",
      ],
      keywords: ["webp", "multiple images", "image bundle", "photo pages"],
      useCases: [
        "make pdf from photos",
        "convert screenshots to pdf",
        "combine images as pdf",
      ],
      resultPriority: 108,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      supportsMultipleFiles: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "pdf-to-images",
    title: "PDF to Images",
    description: "Export each PDF page as a high-quality JPG or PNG image.",
    menuDescription:
      "Render PDF pages into downloadable JPG or PNG images.",
    category: "convert",
    href: "/tools/pdf-to-images",
    icon: Image,
    status: "coming-soon",
    isClientOnly: true,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "pdf to jpg",
        "pdf to png",
        "pdf pages as images",
        "convert pdf to photo",
      ],
      keywords: ["render pages", "export image", "download page image"],
      useCases: [
        "save each pdf page as image",
        "turn pdf into png",
        "extract page previews",
      ],
      resultPriority: 92,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "browser",
      experience: "guided-processing",
      launchTier: "next-product-wave",
      needsBackendProcessing: false,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDFs into editable Word documents.",
    menuDescription:
      "Create editable Word documents from PDF content.",
    category: "convert",
    href: "/tools/pdf-to-word",
    icon: Wand2,
    status: "coming-soon",
    isClientOnly: false,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "pdf to doc",
        "pdf to docx",
        "convert pdf to word",
        "editable word file",
      ],
      keywords: ["document conversion", "docx", "editable document"],
      useCases: [
        "turn pdf into editable document",
        "copy pdf into word",
        "convert document for editing",
      ],
      resultPriority: 112,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while preserving visual quality.",
    menuDescription:
      "Shrink PDF size through reliable backend-grade optimization.",
    category: "optimize",
    href: "/tools/compress",
    icon: FileArchive,
    status: "coming-soon",
    isClientOnly: false,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "reduce pdf size",
        "shrink pdf",
        "make pdf smaller",
        "compress file",
        "lower pdf mb",
      ],
      keywords: ["file size", "optimization", "smaller download", "quality"],
      useCases: [
        "reduce pdf mb",
        "send smaller pdf by email",
        "optimize document size",
      ],
      resultPriority: 116,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description: "Make scanned PDFs searchable and selectable with OCR.",
    menuDescription:
      "Recognize scanned text so it can be searched and selected.",
    category: "optimize",
    href: "/tools/ocr",
    icon: Brain,
    status: "coming-soon",
    isClientOnly: false,
    popular: true,
    featured: true,
    search: {
      aliases: [
        "scan text",
        "make pdf searchable",
        "ocr scan",
        "read scanned pdf",
        "recognize text",
      ],
      keywords: [
        "searchable pdf",
        "selectable text",
        "scanned document",
        "text recognition",
      ],
      useCases: [
        "convert scan to searchable pdf",
        "select text from scanned file",
        "read image-based pdf",
      ],
      resultPriority: 114,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: true,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Add a password to prevent unauthorized access.",
    menuDescription:
      "Secure a PDF with password protection and safer sharing.",
    category: "security",
    href: "/tools/protect",
    icon: ShieldCheck,
    status: "coming-soon",
    isClientOnly: false,
    popular: true,
    featured: false,
    search: {
      aliases: [
        "password pdf",
        "lock pdf",
        "secure pdf",
        "encrypt pdf",
      ],
      keywords: ["protection", "document security", "password access"],
      useCases: [
        "password protect a pdf",
        "lock confidential file",
        "secure document before sharing",
      ],
      resultPriority: 101,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove password protection from PDFs you own.",
    menuDescription:
      "Open permitted password-protected PDFs you are allowed to access.",
    category: "security",
    href: "/tools/unlock",
    icon: ShieldOff,
    status: "coming-soon",
    isClientOnly: false,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "remove pdf password",
        "unlock protected pdf",
        "open locked pdf",
      ],
      keywords: ["password removal", "authorized access", "decrypt"],
      useCases: [
        "unlock my own pdf",
        "remove protection from document I own",
        "open an accessible protected pdf",
      ],
      resultPriority: 88,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
  {
    id: "redact-pdf",
    title: "Redact PDF",
    description: "Permanently black out sensitive text and images.",
    menuDescription:
      "Remove sensitive content permanently through true redaction workflows.",
    category: "security",
    href: "/tools/redact",
    icon: Eye,
    status: "coming-soon",
    isClientOnly: false,
    popular: false,
    featured: false,
    search: {
      aliases: [
        "hide private text",
        "remove sensitive data",
        "blackout pdf",
        "redaction",
      ],
      keywords: ["privacy", "permanent removal", "sensitive information"],
      useCases: [
        "redact personal data",
        "hide confidential text permanently",
        "sanitize pdf before sharing",
      ],
      resultPriority: 90,
    },
    visibility: {
      showInToolsPage: true,
      showInMegaMenu: true,
      showOnHomepage: false,
      searchable: true,
    },
    capabilities: {
      processingMode: "backend",
      experience: "guided-processing",
      launchTier: "backend-roadmap",
      needsBackendProcessing: true,
      recommendedEntry: "tool-page",
    },
  },
];

// -----------------------------------------------------------------------------
// Internal Normalization & Search Intelligence
// -----------------------------------------------------------------------------

function normalizeSearchValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s+/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSearchTokens(value: string): string[] {
  const normalized = normalizeSearchValue(value);

  if (!normalized) {
    return [];
  }

  return normalized
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function getCategoryMeta(category: ToolCategory): ToolCategoryMeta {
  return (
    TOOL_CATEGORIES.find((item) => item.id === category) ??
    TOOL_CATEGORIES[0]
  );
}

function getToolSearchCorpus(tool: Tool): {
  title: string;
  description: string;
  menuDescription: string;
  category: string;
  aliases: string[];
  keywords: string[];
  useCases: string[];
} {
  const categoryMeta = getCategoryMeta(tool.category);

  return {
    title: normalizeSearchValue(tool.title),
    description: normalizeSearchValue(tool.description),
    menuDescription: normalizeSearchValue(tool.menuDescription),
    category: normalizeSearchValue(
      [
        categoryMeta.label,
        categoryMeta.menuLabel,
        categoryMeta.description,
        categoryMeta.shortDescription,
        ...categoryMeta.searchAliases,
      ].join(" "),
    ),
    aliases: tool.search.aliases.map(normalizeSearchValue),
    keywords: tool.search.keywords.map(normalizeSearchValue),
    useCases: tool.search.useCases.map(normalizeSearchValue),
  };
}

function addMatchKind(
  matches: ToolSearchMatchKind[],
  match: ToolSearchMatchKind,
): void {
  if (!matches.includes(match)) {
    matches.push(match);
  }
}

function scoreSingleToolQuery(
  tool: Tool,
  rawQuery: string,
): ToolSearchResult {
  const query = normalizeSearchValue(rawQuery);
  const tokens = splitSearchTokens(rawQuery);
  const corpus = getToolSearchCorpus(tool);
  const matchedBy: ToolSearchMatchKind[] = [];

  if (!query) {
    return {
      tool,
      score: tool.search.resultPriority,
      matchedBy,
    };
  }

  let score = 0;

  if (corpus.title === query) {
    score += 220;
    addMatchKind(matchedBy, "exact-title");
  } else if (corpus.title.startsWith(query)) {
    score += 150;
    addMatchKind(matchedBy, "title");
  } else if (corpus.title.includes(query)) {
    score += 110;
    addMatchKind(matchedBy, "title");
  }

  for (const alias of corpus.aliases) {
    if (alias === query) {
      score += 170;
      addMatchKind(matchedBy, "alias");
    } else if (alias.includes(query) || query.includes(alias)) {
      score += 110;
      addMatchKind(matchedBy, "alias");
    }
  }

  for (const useCase of corpus.useCases) {
    if (useCase.includes(query) || query.includes(useCase)) {
      score += 95;
      addMatchKind(matchedBy, "use-case");
    }
  }

  if (corpus.description.includes(query)) {
    score += 58;
    addMatchKind(matchedBy, "description");
  }

  if (corpus.menuDescription.includes(query)) {
    score += 48;
    addMatchKind(matchedBy, "description");
  }

  if (corpus.category.includes(query)) {
    score += 42;
    addMatchKind(matchedBy, "category");
  }

  for (const token of tokens) {
    if (token.length < 2) {
      continue;
    }

    if (corpus.title.includes(token)) {
      score += 28;
      addMatchKind(matchedBy, "title");
    }

    if (corpus.keywords.some((keyword) => keyword.includes(token))) {
      score += 24;
      addMatchKind(matchedBy, "keyword");
    }

    if (corpus.aliases.some((alias) => alias.includes(token))) {
      score += 22;
      addMatchKind(matchedBy, "alias");
    }

    if (corpus.useCases.some((useCase) => useCase.includes(token))) {
      score += 18;
      addMatchKind(matchedBy, "use-case");
    }

    if (corpus.category.includes(token)) {
      score += 12;
      addMatchKind(matchedBy, "category");
    }

    if (
      corpus.description.includes(token) ||
      corpus.menuDescription.includes(token)
    ) {
      score += 10;
      addMatchKind(matchedBy, "description");
    }
  }

  score += tool.search.resultPriority;

  if (tool.popular) {
    score += 16;
  }

  if (tool.featured) {
    score += 10;
  }

  if (tool.status === "working") {
    score += 12;
  }

  if (tool.status === "beta") {
    score += 8;
  }

  return {
    tool,
    score,
    matchedBy: uniqueValues(matchedBy),
  };
}

// -----------------------------------------------------------------------------
// Public Registry Helpers
// -----------------------------------------------------------------------------

export function getToolById(id: string): Tool | undefined {
  return tools.find((tool) => tool.id === id);
}

export function getToolByHref(href: string): Tool | undefined {
  return tools.find((tool) => tool.href === href);
}

export function getToolsByStatus(status: ToolStatus): Tool[] {
  return tools.filter((tool) => tool.status === status);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools
    .filter((tool) => tool.category === category)
    .sort(sortToolsForDiscovery);
}

export function getWorkingTools(): Tool[] {
  return tools
    .filter(
      (tool) => tool.status === "working" || tool.status === "beta",
    )
    .sort(sortToolsForDiscovery);
}

export function getComingSoonTools(): Tool[] {
  return tools
    .filter((tool) => tool.status === "coming-soon")
    .sort(sortToolsForDiscovery);
}

export function getPopularTools(limit?: number): Tool[] {
  const matches = tools
    .filter((tool) => tool.popular)
    .sort(sortToolsForDiscovery);

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getFeaturedTools(limit?: number): Tool[] {
  const matches = tools
    .filter((tool) => tool.featured)
    .sort(sortToolsForDiscovery);

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getHomepageTools(limit?: number): Tool[] {
  const matches = tools
    .filter((tool) => tool.visibility.showOnHomepage)
    .sort(sortToolsForDiscovery);

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getMegaMenuTools(limit?: number): Tool[] {
  const matches = tools
    .filter((tool) => tool.visibility.showInMegaMenu)
    .sort(sortToolsForDiscovery);

  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getToolMenuGroups(): ToolMenuGroup[] {
  return TOOL_CATEGORIES.map((category) => ({
    category: category.id,
    label: category.menuLabel,
    description: category.shortDescription,
    tools: getToolsByCategory(category.id).filter(
      (tool) => tool.visibility.showInMegaMenu,
    ),
  })).filter((group) => group.tools.length > 0);
}

export function getToolsNeedingBackend(): Tool[] {
  return tools
    .filter((tool) => tool.capabilities.needsBackendProcessing)
    .sort(sortToolsForDiscovery);
}

export function getBrowserFirstTools(): Tool[] {
  return tools
    .filter(
      (tool) =>
        tool.capabilities.processingMode === "browser" ||
        tool.capabilities.processingMode === "hybrid",
    )
    .sort(sortToolsForDiscovery);
}

export function getToolsByProcessingMode(
  processingMode: ToolProcessingMode,
): Tool[] {
  return tools
    .filter((tool) => tool.capabilities.processingMode === processingMode)
    .sort(sortToolsForDiscovery);
}

export function searchTools(
  query: string,
  options: ToolSearchOptions = {},
): ToolSearchResult[] {
  const includeComingSoon = options.includeComingSoon ?? true;

  const results = tools
    .filter((tool) => tool.visibility.searchable)
    .filter((tool) =>
      options.category ? tool.category === options.category : true,
    )
    .filter((tool) =>
      includeComingSoon ? true : tool.status !== "coming-soon",
    )
    .map((tool) => scoreSingleToolQuery(tool, query))
    .filter((result) => {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return true;
      }

      return result.score > toolMinimumSearchScore(trimmedQuery);
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return sortToolsForDiscovery(a.tool, b.tool);
    });

  return typeof options.limit === "number"
    ? results.slice(0, options.limit)
    : results;
}

export function getSuggestedToolsForQuery(
  query: string,
  limit = 6,
): Tool[] {
  return searchTools(query, { limit }).map((result) => result.tool);
}

export function sortToolsForDiscovery(a: Tool, b: Tool): number {
  const statusDifference =
    STATUS_CONFIG[a.status].rank - STATUS_CONFIG[b.status].rank;

  if (statusDifference !== 0) {
    return statusDifference;
  }

  const priorityDifference = b.search.resultPriority - a.search.resultPriority;

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  if (Boolean(b.featured) !== Boolean(a.featured)) {
    return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  }

  if (Boolean(b.popular) !== Boolean(a.popular)) {
    return Number(Boolean(b.popular)) - Number(Boolean(a.popular));
  }

  return a.title.localeCompare(b.title);
}

function toolMinimumSearchScore(query: string): number {
  const tokenCount = splitSearchTokens(query).length;

  if (tokenCount <= 1) {
    return 85;
  }

  if (tokenCount === 2) {
    return 95;
  }

  return 105;
}
