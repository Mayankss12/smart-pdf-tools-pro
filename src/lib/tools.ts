import {
  ArrowUpDown,
  Brain,
  Combine,
  Copy,
  Crown,
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

export type ToolStatus = "working" | "beta" | "coming-soon";
export type ToolCategory = "edit" | "organize" | "convert" | "optimize" | "security";
export type ToolProcessingMode = "browser" | "backend" | "hybrid";
export type ToolExperience = "workspace" | "quick-action" | "guided-processing";
export type ToolLaunchTier = "available-now" | "next-product-wave" | "backend-roadmap";

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

export type ToolSearchMatchKind =
  | "exact-title"
  | "title"
  | "alias"
  | "keyword"
  | "use-case"
  | "description"
  | "category";

export interface ToolSearchResult {
  tool: Tool;
  score: number;
  matchedBy: ToolSearchMatchKind[];
}

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
    description: "Make visual changes, add content, annotate, and sign documents inside the PDFMantra workspace.",
    shortDescription: "Edit, annotate, highlight, watermark, number, and sign PDFs.",
    sortOrder: 1,
    searchAliases: ["edit", "annotate", "write", "mark", "signature", "watermark", "page numbers"],
  },
  {
    id: "organize",
    label: "Organize Pages",
    menuLabel: "Organize",
    description: "Merge, split, delete, extract, rotate, reorder, and organize PDF pages.",
    shortDescription: "Merge, split, rotate, extract, delete, and reorder pages.",
    sortOrder: 2,
    searchAliases: ["organize", "pages", "merge", "split", "combine", "delete", "extract", "rotate", "rearrange", "reorder"],
  },
  {
    id: "convert",
    label: "Convert",
    menuLabel: "Convert",
    description: "Move between PDF and useful document or image formats.",
    shortDescription: "Convert PDFs, images, and editable formats.",
    sortOrder: 3,
    searchAliases: ["convert", "export", "word", "image", "jpg", "png", "webp"],
  },
  {
    id: "optimize",
    label: "Optimize & OCR",
    menuLabel: "Optimize & OCR",
    description: "Reduce file size, improve usability, and make scanned content searchable.",
    shortDescription: "Compress, optimize, and make scans searchable.",
    sortOrder: 4,
    searchAliases: ["compress", "reduce size", "optimize", "ocr", "scan", "searchable"],
  },
  {
    id: "security",
    label: "Security",
    menuLabel: "Security",
    description: "Protect, unlock, remove permitted marks, and redact sensitive PDF content.",
    shortDescription: "Protect, unlock, remove marks, and redact PDFs.",
    sortOrder: 5,
    searchAliases: ["security", "password", "protect", "unlock", "redact", "remove watermark"],
  },
] as const;

export const TOOL_CATEGORY_ORDER: readonly ToolCategory[] = TOOL_CATEGORIES.map((category) => category.id);

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

export const STATUS_CONFIG: Record<ToolStatus, { label: string; className: string; rank: number }> = {
  working: {
    label: "Live",
    className: "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
    rank: 1,
  },
  beta: {
    label: "Pro",
    className: "rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700",
    rank: 2,
  },
  "coming-soon": {
    label: "Coming Soon",
    className: "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500",
    rank: 3,
  },
};

const everywhere: ToolVisibility = {
  showInToolsPage: true,
  showInMegaMenu: true,
  showOnHomepage: true,
  searchable: true,
};

const directoryOnly: ToolVisibility = {
  showInToolsPage: true,
  showInMegaMenu: true,
  showOnHomepage: false,
  searchable: true,
};

function browserTool(experience: ToolExperience, recommendedEntry: "editor" | "tool-page" = "tool-page", supportsMultipleFiles = false): ToolCapabilityMeta {
  return {
    processingMode: "browser",
    experience,
    launchTier: "available-now",
    needsBackendProcessing: false,
    supportsMultipleFiles: supportsMultipleFiles || undefined,
    recommendedEntry,
  };
}

function backendWorkflow(experience: ToolExperience): ToolCapabilityMeta {
  return {
    processingMode: "backend",
    experience,
    launchTier: "backend-roadmap",
    needsBackendProcessing: true,
    recommendedEntry: "tool-page",
  };
}

function searchMeta(aliases: string[], keywords: string[], useCases: string[], resultPriority: number): ToolSearchMeta {
  return { aliases, keywords, useCases, resultPriority };
}

export const tools: Tool[] = [
  {
    id: "pdf-editor",
    title: "PDF Editor",
    shortTitle: "Editor",
    description: "Add text, images, highlights, whiteout, and signatures. Export the final PDF.",
    menuDescription: "Edit visually with text, highlights, images, signatures, and export.",
    category: "edit",
    href: "/editor",
    icon: FileText,
    status: "working",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: searchMeta(["edit pdf", "pdf editing", "change pdf", "write on pdf", "annotate pdf"], ["text", "image", "highlight", "whiteout", "signature"], ["add text to pdf", "edit a pdf online", "place content on a pdf"], 120),
    visibility: everywhere,
    capabilities: browserTool("workspace"),
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description: "Draw, type, or upload a signature and place it on any PDF page.",
    menuDescription: "Place typed, drawn, or uploaded signatures inside your PDF.",
    category: "edit",
    href: "/editor",
    icon: PenLine,
    status: "working",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: searchMeta(["signature", "add signature", "esign pdf", "sign document"], ["draw signature", "typed signature", "upload signature"], ["sign a document", "put my signature on pdf"], 105),
    visibility: everywhere,
    capabilities: browserTool("workspace", "editor"),
  },
  {
    id: "fill-sign",
    title: "Fill & Sign PDF",
    description: "Add text or image signatures, place on any page, resize, and export.",
    menuDescription: "Place typed or image signatures on any PDF page and export.",
    category: "edit",
    href: "/tools/fill-sign",
    icon: PenLine,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["fill sign pdf", "sign pdf", "add signature"], ["signature", "text sign", "image sign"], ["sign a pdf document", "add signature to pdf"], 100),
    visibility: directoryOnly,
    capabilities: browserTool("workspace"),
  },
  {
    id: "annotate-pdf",
    title: "Annotate PDF",
    description: "Draw, mark, add arrows, notes, and shapes directly on PDF pages.",
    menuDescription: "Pen, marker, shapes, arrows and notes on your PDF.",
    category: "edit",
    href: "/tools/annotate-pdf",
    icon: PenLine,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["annotate pdf", "draw on pdf", "mark pdf"], ["pen", "marker", "arrow", "shapes", "notes"], ["draw on a pdf", "add annotations", "mark up document"], 95),
    visibility: directoryOnly,
    capabilities: browserTool("workspace"),
  },
  {
    id: "highlight-pdf",
    title: "Highlight PDF",
    description: "Apply marker-style highlights to selected text in your PDF.",
    menuDescription: "Mark important text with clean textbook-style highlighting.",
    category: "edit",
    href: "/tools/highlight-pdf",
    icon: Highlighter,
    status: "working",
    isClientOnly: true,
    popular: true,
    search: searchMeta(["highlight", "mark text", "pdf highlighter"], ["text selection", "highlight color", "annotation"], ["highlight text in pdf", "mark important sentences"], 98),
    visibility: everywhere,
    capabilities: browserTool("workspace"),
  },
  {
    id: "watermark-pdf",
    title: "Add Watermark",
    description: "Stamp text watermarks on every PDF page.",
    menuDescription: "Apply branded text watermarks across your document.",
    category: "edit",
    href: "/tools/watermark",
    icon: Droplets,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["watermark pdf", "stamp pdf", "confidential mark"], ["overlay", "text watermark", "stamp"], ["brand a pdf", "add confidential text"], 96),
    visibility: directoryOnly,
    capabilities: browserTool("quick-action"),
  },
  {
    id: "page-numbers",
    title: "Add Page Numbers",
    description: "Insert page numbers with custom position and style.",
    menuDescription: "Number pages automatically with clean placement options.",
    category: "edit",
    href: "/tools/page-numbers",
    icon: Hash,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["page numbers", "number pages", "paginate pdf"], ["header", "footer", "page count", "numbering"], ["add numbering to pdf", "paginate document"], 90),
    visibility: directoryOnly,
    capabilities: browserTool("quick-action"),
  },
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document instantly.",
    menuDescription: "Join multiple PDFs into one clear, ordered output file.",
    category: "organize",
    href: "/tools/merge",
    icon: Combine,
    status: "working",
    isClientOnly: true,
    maxFiles: 20,
    popular: true,
    featured: true,
    search: searchMeta(["combine pdf", "join pdf", "append pdf", "merge documents"], ["multiple files", "combine", "join", "order files"], ["merge pdf files", "combine invoices into one pdf"], 115),
    visibility: everywhere,
    capabilities: browserTool("guided-processing", "tool-page", true),
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Split a PDF into page groups with ZIP output for multiple files.",
    menuDescription: "Break PDFs into page ranges and package multiple outputs as one ZIP.",
    category: "organize",
    href: "/tools/split",
    icon: Scissors,
    status: "working",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: searchMeta(["divide pdf", "separate pdf", "split pages", "break pdf"], ["page range", "extract range", "separate document", "zip"], ["split one pdf into several files", "export selected page ranges", "download split files as zip"], 108),
    visibility: everywhere,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate individual pages or the entire document.",
    menuDescription: "Fix sideways pages with page-level or full-document rotation.",
    category: "organize",
    href: "/tools/rotate",
    icon: RotateCw,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["turn pages", "rotate pages", "fix pdf orientation"], ["90 degrees", "landscape", "portrait", "orientation"], ["rotate scanned pdf", "fix turned page"], 94),
    visibility: directoryOnly,
    capabilities: browserTool("quick-action"),
  },
  {
    id: "delete-pages",
    title: "Delete Pages",
    description: "Remove unwanted pages from your PDF visually.",
    menuDescription: "Remove unnecessary pages with a visual page manager.",
    category: "organize",
    href: "/tools/delete-pages",
    icon: Trash2,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["remove pages", "delete pdf page", "drop pages", "erase pages"], ["page cleanup", "remove sheet", "discard pages"], ["delete pages from pdf", "remove blank pages", "drop unwanted pages"], 92),
    visibility: directoryOnly,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "extract-pages",
    title: "Extract Pages",
    description: "Pull out specific pages into a new PDF document.",
    menuDescription: "Export only the pages you need into a fresh PDF.",
    category: "organize",
    href: "/tools/extract",
    icon: Copy,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["pull pages", "save selected pages", "extract pdf pages"], ["selected pages", "export pages", "page extraction"], ["extract a few pages", "save one section as pdf"], 95),
    visibility: directoryOnly,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "reorder-pages",
    title: "Reorder Pages",
    description: "Move pages up or down and export a reordered PDF.",
    menuDescription: "Rearrange page order visually before exporting.",
    category: "organize",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["rearrange pages", "move pages", "change page order", "reorder pdf"], ["page order", "sequence", "reverse pages"], ["reorder pdf pages", "move page 5 to front", "arrange scanned pages"], 97),
    visibility: directoryOnly,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "organize-pdf",
    title: "Organize PDF",
    description: "Open a workspace that links all page organization tools.",
    menuDescription: "Access merge, split, delete, extract, reorder, and rotate tools from one page.",
    category: "organize",
    href: "/tools/organize",
    icon: Layers,
    status: "working",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: searchMeta(["page organizer", "organize pdf", "manage pdf pages"], ["thumbnail workspace", "page tools", "rotate", "reorder", "delete", "extract"], ["manage all pages visually", "organize scanned file", "choose page tool"], 102),
    visibility: everywhere,
    capabilities: browserTool("workspace"),
  },
  {
    id: "images-to-pdf",
    title: "Images to PDF",
    description: "Convert JPG, PNG, or WebP images into a single PDF.",
    menuDescription: "Turn multiple images into one ordered PDF document.",
    category: "convert",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    status: "working",
    isClientOnly: true,
    maxFiles: 80,
    popular: true,
    featured: true,
    search: searchMeta(["jpg to pdf", "png to pdf", "photo to pdf", "image converter"], ["webp", "multiple images", "image bundle"], ["make pdf from photos", "convert screenshots to pdf"], 108),
    visibility: everywhere,
    capabilities: browserTool("guided-processing", "tool-page", true),
  },
  {
    id: "pdf-to-images",
    title: "PDF to Images",
    description: "Export each PDF page as a high-quality JPG or PNG image.",
    menuDescription: "Render PDF pages into downloadable JPG or PNG images.",
    category: "convert",
    href: "/tools/pdf-to-images",
    icon: Image,
    status: "working",
    isClientOnly: true,
    search: searchMeta(["pdf to jpg", "pdf to png", "pdf pages as images"], ["render pages", "export image", "download page image"], ["save each pdf page as image", "turn pdf into png"], 92),
    visibility: directoryOnly,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Backend workflow shell for editable document output.",
    menuDescription: "Prepared backend workflow for PDF to Word processing.",
    category: "convert",
    href: "/tools/pdf-to-word",
    icon: Wand2,
    status: "beta",
    isClientOnly: false,
    popular: true,
    featured: true,
    search: searchMeta(["pdf to doc", "pdf to docx", "convert pdf to word"], ["document workflow", "docx", "editable document", "backend"], ["prepare pdf for word workflow", "convert document through backend"], 112),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size by optimizing PDF structure in the browser.",
    menuDescription: "Shrink PDF size with PDFMantra browser-side optimization.",
    category: "optimize",
    href: "/tools/compress",
    icon: FileArchive,
    status: "working",
    isClientOnly: true,
    popular: true,
    featured: true,
    search: searchMeta(["reduce pdf size", "shrink pdf", "make pdf smaller", "compress file"], ["file size", "optimization", "smaller download"], ["reduce pdf mb", "send smaller pdf by email"], 116),
    visibility: everywhere,
    capabilities: browserTool("guided-processing"),
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description: "Backend workflow shell for searchable scanned PDFs.",
    menuDescription: "Prepared OCR workflow for scanned document processing.",
    category: "optimize",
    href: "/tools/ocr",
    icon: Brain,
    status: "beta",
    isClientOnly: false,
    popular: true,
    featured: true,
    search: searchMeta(["scan text", "make pdf searchable", "ocr scan"], ["searchable pdf", "selectable text", "scanned document", "backend"], ["prepare searchable pdf workflow", "read image-based pdf"], 114),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Backend workflow shell for password-protected PDF output.",
    menuDescription: "Prepared security workflow for PDF password protection.",
    category: "security",
    href: "/tools/protect",
    icon: ShieldCheck,
    status: "beta",
    isClientOnly: false,
    popular: true,
    search: searchMeta(["password pdf", "lock pdf", "secure pdf"], ["protection", "document security", "password access", "backend"], ["password protect a pdf", "secure document before sharing"], 101),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Backend workflow shell for authorized PDF unlocking.",
    menuDescription: "Prepared authorized workflow for password-known PDFs.",
    category: "security",
    href: "/tools/unlock",
    icon: ShieldOff,
    status: "beta",
    isClientOnly: false,
    search: searchMeta(["remove pdf password", "unlock protected pdf"], ["password removal", "authorized access", "backend"], ["unlock my own pdf", "remove protection from document I own"], 88),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
  {
    id: "watermark-remover",
    title: "Watermark Remover",
    description: "Prepare authorized PDF cleanup for backend-grade watermark and object removal.",
    menuDescription: "Remove permitted watermarks through a gated Pro workflow.",
    category: "security",
    href: "/tools/watermark-remover",
    icon: Crown,
    status: "beta",
    isClientOnly: false,
    featured: true,
    newTool: true,
    search: searchMeta(["remove watermark", "watermark remover", "delete watermark"], ["pro", "authorized cleanup", "stamp removal", "backend"], ["remove watermark from my pdf", "clean up authorized document"], 103),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
  {
    id: "redact-pdf",
    title: "Redact PDF",
    description: "Backend workflow shell for permanent content redaction.",
    menuDescription: "Prepared privacy workflow for true PDF redaction.",
    category: "security",
    href: "/tools/redact",
    icon: Eye,
    status: "beta",
    isClientOnly: false,
    search: searchMeta(["hide private text", "remove sensitive data", "blackout pdf", "redact pdf"], ["privacy", "permanent removal", "sensitive information", "backend"], ["redact personal data", "hide confidential text permanently"], 90),
    visibility: directoryOnly,
    capabilities: backendWorkflow("guided-processing"),
  },
];

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
  return normalized ? normalized.split(" ").map((token) => token.trim()).filter(Boolean) : [];
}

function uniqueValues<T>(values: readonly T[]): T[] {
  return Array.from(new Set(values));
}

function getCategoryMeta(category: ToolCategory): ToolCategoryMeta {
  return TOOL_CATEGORIES.find((item) => item.id === category) ?? TOOL_CATEGORIES[0];
}

function getToolSearchCorpus(tool: Tool) {
  const categoryMeta = getCategoryMeta(tool.category);
  return {
    title: normalizeSearchValue(tool.title),
    description: normalizeSearchValue(tool.description),
    menuDescription: normalizeSearchValue(tool.menuDescription),
    category: normalizeSearchValue([categoryMeta.label, categoryMeta.menuLabel, categoryMeta.description, categoryMeta.shortDescription, ...categoryMeta.searchAliases].join(" ")),
    aliases: tool.search.aliases.map(normalizeSearchValue),
    keywords: tool.search.keywords.map(normalizeSearchValue),
    useCases: tool.search.useCases.map(normalizeSearchValue),
  };
}

function addMatchKind(matches: ToolSearchMatchKind[], match: ToolSearchMatchKind): void {
  if (!matches.includes(match)) matches.push(match);
}

function scoreSingleToolQuery(tool: Tool, rawQuery: string): ToolSearchResult {
  const query = normalizeSearchValue(rawQuery);
  const tokens = splitSearchTokens(rawQuery);
  const corpus = getToolSearchCorpus(tool);
  const matchedBy: ToolSearchMatchKind[] = [];
  if (!query) return { tool, score: tool.search.resultPriority, matchedBy };

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
    if (token.length < 2) continue;
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
    if (corpus.description.includes(token) || corpus.menuDescription.includes(token)) {
      score += 10;
      addMatchKind(matchedBy, "description");
    }
  }

  score += tool.search.resultPriority;
  if (tool.popular) score += 16;
  if (tool.featured) score += 10;
  if (tool.status === "working") score += 12;
  if (tool.status === "beta") score += 8;
  return { tool, score, matchedBy: uniqueValues(matchedBy) };
}

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
  return tools.filter((tool) => tool.category === category).sort(sortToolsForDiscovery);
}

export function getWorkingTools(): Tool[] {
  return tools.filter((tool) => tool.status === "working").sort(sortToolsForDiscovery);
}

export function getComingSoonTools(): Tool[] {
  return tools.filter((tool) => tool.status === "coming-soon").sort(sortToolsForDiscovery);
}

export function getPopularTools(limit?: number): Tool[] {
  const matches = tools.filter((tool) => tool.popular).sort(sortToolsForDiscovery);
  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getFeaturedTools(limit?: number): Tool[] {
  const matches = tools.filter((tool) => tool.featured).sort(sortToolsForDiscovery);
  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getHomepageTools(limit?: number): Tool[] {
  const matches = tools.filter((tool) => tool.visibility.showOnHomepage).sort(sortToolsForDiscovery);
  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getMegaMenuTools(limit?: number): Tool[] {
  const matches = tools.filter((tool) => tool.visibility.showInMegaMenu).sort(sortToolsForDiscovery);
  return typeof limit === "number" ? matches.slice(0, limit) : matches;
}

export function getToolMenuGroups(): ToolMenuGroup[] {
  return TOOL_CATEGORIES.map((category) => ({
    category: category.id,
    label: category.menuLabel,
    description: category.shortDescription,
    tools: getToolsByCategory(category.id).filter((tool) => tool.visibility.showInMegaMenu),
  })).filter((group) => group.tools.length > 0);
}

export function getToolsNeedingBackend(): Tool[] {
  return tools.filter((tool) => tool.capabilities.needsBackendProcessing).sort(sortToolsForDiscovery);
}

export function getBrowserFirstTools(): Tool[] {
  return tools.filter((tool) => tool.capabilities.processingMode === "browser" || tool.capabilities.processingMode === "hybrid").sort(sortToolsForDiscovery);
}

export function getToolsByProcessingMode(processingMode: ToolProcessingMode): Tool[] {
  return tools.filter((tool) => tool.capabilities.processingMode === processingMode).sort(sortToolsForDiscovery);
}

export function searchTools(query: string, options: ToolSearchOptions = {}): ToolSearchResult[] {
  const includeComingSoon = options.includeComingSoon ?? true;
  const results = tools
    .filter((tool) => tool.visibility.searchable)
    .filter((tool) => (options.category ? tool.category === options.category : true))
    .filter((tool) => (includeComingSoon ? true : tool.status !== "coming-soon"))
    .map((tool) => scoreSingleToolQuery(tool, query))
    .filter((result) => {
      const trimmedQuery = query.trim();
      return trimmedQuery ? result.score > toolMinimumSearchScore(trimmedQuery) : true;
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return sortToolsForDiscovery(a.tool, b.tool);
    });
  return typeof options.limit === "number" ? results.slice(0, limitToPositiveInteger(options.limit)) : results;
}

export function getSuggestedToolsForQuery(query: string, limit = 6): Tool[] {
  return searchTools(query, { limit }).map((result) => result.tool);
}

export function sortToolsForDiscovery(a: Tool, b: Tool): number {
  const statusDifference = STATUS_CONFIG[a.status].rank - STATUS_CONFIG[b.status].rank;
  if (statusDifference !== 0) return statusDifference;
  const categoryDifference = getCategoryMeta(a.category).sortOrder - getCategoryMeta(b.category).sortOrder;
  if (categoryDifference !== 0) return categoryDifference;
  const priorityDifference = b.search.resultPriority - a.search.resultPriority;
  if (priorityDifference !== 0) return priorityDifference;
  if (Boolean(b.featured) !== Boolean(a.featured)) return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (Boolean(b.popular) !== Boolean(a.popular)) return Number(Boolean(b.popular)) - Number(Boolean(a.popular));
  return a.title.localeCompare(b.title);
}

function limitToPositiveInteger(limit: number): number {
  return Math.max(0, Math.floor(limit));
}

function toolMinimumSearchScore(query: string): number {
  const tokenCount = splitSearchTokens(query).length;
  if (tokenCount <= 1) return 85;
  if (tokenCount === 2) return 95;
  return 105;
}
