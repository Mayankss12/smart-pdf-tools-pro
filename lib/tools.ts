import {
  FileText,
  PenLine,
  Highlighter,
  Image,
  Combine,
  Scissors,
  RotateCw,
  Trash2,
  Copy,
  ArrowUpDown,
  FileImage,
  Hash,
  Droplets,
  FileArchive,
  Brain,
  Wand2,
  ShieldCheck,
  ShieldOff,
  Eye,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolStatus = "working" | "beta" | "coming-soon";

export interface Tool {
  id: string;
  title: string;
  description: string;
  category: ToolCategory;
  href: string;
  icon: LucideIcon;
  status: ToolStatus;
  isClientOnly: boolean;
  maxFiles?: number;
}

export type ToolCategory =
  | "edit"
  | "organize"
  | "convert"
  | "security"
  | "optimize";

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  edit: "Edit & Annotate",
  organize: "Organize Pages",
  convert: "Convert",
  security: "Security",
  optimize: "Optimize",
};

export const tools: Tool[] = [
  // ── Edit & Annotate ──────────────────────────────────────────
  {
    id: "pdf-editor",
    title: "PDF Editor",
    description:
      "Add text, images, highlights, whiteout, and signatures. Export the final PDF.",
    category: "edit",
    href: "/editor",
    icon: FileText,
    status: "beta",
    isClientOnly: true,
  },
  {
    id: "sign-pdf",
    title: "Sign PDF",
    description:
      "Draw, type, or upload a signature and place it on any PDF page.",
    category: "edit",
    href: "/editor",
    icon: PenLine,
    status: "beta",
    isClientOnly: true,
  },
  {
    id: "highlight-pdf",
    title: "Highlight PDF",
    description: "Apply marker-style highlights to selected text in your PDF.",
    category: "edit",
    href: "/editor",
    icon: Highlighter,
    status: "beta",
    isClientOnly: true,
  },
  {
    id: "watermark-pdf",
    title: "Add Watermark",
    description: "Stamp text or image watermarks on every PDF page.",
    category: "edit",
    href: "/tools/watermark",
    icon: Droplets,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "page-numbers",
    title: "Add Page Numbers",
    description: "Insert page numbers with custom position and style.",
    category: "edit",
    href: "/tools/page-numbers",
    icon: Hash,
    status: "coming-soon",
    isClientOnly: true,
  },

  // ── Organize Pages ────────────────────────────────────────────
  {
    id: "merge-pdf",
    title: "Merge PDF",
    description: "Combine multiple PDF files into one document instantly.",
    category: "organize",
    href: "/tools/merge",
    icon: Combine,
    status: "coming-soon",
    isClientOnly: true,
    maxFiles: 20,
  },
  {
    id: "split-pdf",
    title: "Split PDF",
    description: "Extract pages or split a PDF into multiple files by range.",
    category: "organize",
    href: "/tools/split",
    icon: Scissors,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "rotate-pdf",
    title: "Rotate PDF",
    description: "Rotate individual pages or the entire document.",
    category: "organize",
    href: "/tools/rotate",
    icon: RotateCw,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "delete-pages",
    title: "Delete Pages",
    description: "Remove unwanted pages from your PDF visually.",
    category: "organize",
    href: "/tools/delete-pages",
    icon: Trash2,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "extract-pages",
    title: "Extract Pages",
    description: "Pull out specific pages into a new PDF document.",
    category: "organize",
    href: "/tools/extract",
    icon: Copy,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "reorder-pages",
    title: "Reorder Pages",
    description: "Drag and drop to rearrange PDF pages in any order.",
    category: "organize",
    href: "/tools/reorder",
    icon: ArrowUpDown,
    status: "coming-soon",
    isClientOnly: true,
  },

  // ── Convert ───────────────────────────────────────────────────
  {
    id: "images-to-pdf",
    title: "Images to PDF",
    description: "Convert JPG, PNG, or WebP images into a single PDF.",
    category: "convert",
    href: "/tools/images-to-pdf",
    icon: FileImage,
    status: "coming-soon",
    isClientOnly: true,
    maxFiles: 30,
  },
  {
    id: "pdf-to-images",
    title: "PDF to Images",
    description: "Export each PDF page as a high-quality JPG or PNG image.",
    category: "convert",
    href: "/tools/pdf-to-images",
    icon: Image,
    status: "coming-soon",
    isClientOnly: true,
  },
  {
    id: "pdf-to-word",
    title: "PDF to Word",
    description: "Convert PDFs into editable Word documents.",
    category: "convert",
    href: "/tools/pdf-to-word",
    icon: Wand2,
    status: "coming-soon",
    isClientOnly: false,
  },
  {
    id: "ocr-pdf",
    title: "OCR PDF",
    description: "Make scanned PDFs searchable and selectable with OCR.",
    category: "convert",
    href: "/tools/ocr",
    icon: Brain,
    status: "coming-soon",
    isClientOnly: false,
  },

  // ── Security ──────────────────────────────────────────────────
  {
    id: "protect-pdf",
    title: "Protect PDF",
    description: "Add a password to prevent unauthorized access.",
    category: "security",
    href: "/tools/protect",
    icon: ShieldCheck,
    status: "coming-soon",
    isClientOnly: false,
  },
  {
    id: "unlock-pdf",
    title: "Unlock PDF",
    description: "Remove password protection from PDFs you own.",
    category: "security",
    href: "/tools/unlock",
    icon: ShieldOff,
    status: "coming-soon",
    isClientOnly: false,
  },
  {
    id: "redact-pdf",
    title: "Redact PDF",
    description: "Permanently black out sensitive text and images.",
    category: "security",
    href: "/tools/redact",
    icon: Eye,
    status: "coming-soon",
    isClientOnly: false,
  },

  // ── Optimize ──────────────────────────────────────────────────
  {
    id: "compress-pdf",
    title: "Compress PDF",
    description: "Reduce file size while preserving visual quality.",
    category: "optimize",
    href: "/tools/compress",
    icon: FileArchive,
    status: "coming-soon",
    isClientOnly: false,
  },
  {
    id: "organize-pdf",
    title: "Organize PDF",
    description: "Visually manage, rotate, and arrange all pages.",
    category: "organize",
    href: "/tools/organize",
    icon: Layers,
    status: "coming-soon",
    isClientOnly: true,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getToolsByStatus(status: ToolStatus): Tool[] {
  return tools.filter((t) => t.status === status);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}

export function getWorkingTools(): Tool[] {
  return tools.filter((t) => t.status === "working" || t.status === "beta");
}

export function getComingSoonTools(): Tool[] {
  return tools.filter((t) => t.status === "coming-soon");
}

export const STATUS_CONFIG: Record
  ToolStatus,
  { label: string; className: string }
> = {
  working: {
    label: "Live",
    className:
      "rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700",
  },
  beta: {
    label: "Beta",
    className:
      "rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700",
  },
  "coming-soon": {
    label: "Coming Soon",
    className:
      "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500",
  },
};
