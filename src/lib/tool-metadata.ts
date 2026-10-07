import type { Metadata } from "next";

import { getToolById } from "@/lib/tools";

type ToolSeoDetail = {
  readonly title: string;
  readonly description: string;
};

const TOOL_SEO_DETAILS: Readonly<Record<string, ToolSeoDetail>> = {
  "pdf-editor": {
    title: "Edit PDF Online - Add Text, Images & Signatures",
    description:
      "Edit PDF files online by adding text, images, highlights, whiteout and signatures, then export the finished document from PDFMantra.",
  },
  "merge-pdf": {
    title: "Merge PDF Online - Combine PDF Files in Order",
    description:
      "Combine multiple PDF files into one document, arrange them in the order you need and download a single merged PDF online.",
  },
  "split-pdf": {
    title: "Split PDF Online - Separate Pages and Ranges",
    description:
      "Split a PDF into selected page ranges, preview the pages and download one or multiple output files in a ZIP when needed.",
  },
  "compress-pdf": {
    title: "Compress PDF Online - Reduce PDF File Size",
    description:
      "Reduce PDF file size with structural or scan compression. Compare the trade-offs before downloading a smaller PDF for email or upload.",
  },
  "fill-sign": {
    title: "Fill & Sign PDF Online - Add Text and Signatures",
    description:
      "Fill and sign a PDF online with typed text, saved signatures, uploaded signature images and page-specific placement controls.",
  },
  "pdf-to-word": {
    title: "PDF to Word Converter - Create Editable DOCX",
    description:
      "Convert native or scanned PDF text into an editable Word DOCX, with OCR support and honest guidance for complex layouts and tables.",
  },
  "pdf-to-images": {
    title: "PDF to JPG, PNG or WebP Converter",
    description:
      "Convert selected PDF pages to high-quality JPG, PNG or WebP images, choose resolution and download individual images or a ZIP.",
  },
  "images-to-pdf": {
    title: "Images to PDF Converter - JPG, PNG & WebP",
    description:
      "Combine JPG, PNG and WebP images into one ordered PDF, with page-size, margin, orientation and image-quality controls.",
  },
  "jpg-to-pdf": {
    title: "JPG to PDF Converter - Combine Images Online",
    description:
      "Turn one or more JPG images into an ordered PDF and control page size, orientation, margins and image quality before download.",
  },
  "pdf-to-searchable-pdf": {
    title: "OCR PDF Online - Make Scanned PDFs Searchable",
    description:
      "Add an invisible OCR text layer to scanned PDF pages while preserving their original appearance, then search and select recognized text.",
  },
  "compare-pdf": {
    title: "Compare PDF Files - Find Text and Visual Changes",
    description:
      "Compare two PDF versions page by page to review text and visual differences before approving, sharing or archiving a document.",
  },
  "form-creator": {
    title: "Create Fillable PDF Forms Online",
    description:
      "Add real interactive text fields, checkboxes, radio buttons and dropdowns to a PDF, position them by page and export a fillable form.",
  },
  "reorder-pages": {
    title: "Reorder PDF Pages Online",
    description:
      "Rearrange PDF pages visually, move pages into the correct sequence and export a reordered document without rebuilding its content.",
  },
  "rotate-pdf": {
    title: "Rotate PDF Pages Online",
    description:
      "Fix sideways PDF pages by rotating selected pages or the full document, preview the result and export the corrected PDF.",
  },
  "protect-pdf": {
    title: "Password Protect PDF with AES-256 Encryption",
    description:
      "Password protect a PDF with AES-256 encryption, set document permissions and download an encrypted copy processed in your browser.",
  },
};

export function buildToolMetadata(toolId: string): Metadata {
  const tool = getToolById(toolId);
  if (!tool) {
    throw new Error(`Unknown tool metadata id: ${toolId}`);
  }

  const seo = TOOL_SEO_DETAILS[toolId] ?? {
    title: tool.title,
    description: tool.description,
  };

  return {
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: tool.href,
    },
    openGraph: {
      title: `${seo.title} | PDFMantra`,
      description: seo.description,
      url: tool.href,
      siteName: "PDFMantra",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${seo.title} | PDFMantra`,
      description: seo.description,
    },
  };
}
