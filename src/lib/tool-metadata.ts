import type { Metadata } from "next";

import { getToolById } from "@/lib/tools";

export function buildToolMetadata(toolId: string): Metadata {
  const tool = getToolById(toolId);
  if (!tool) {
    throw new Error(`Unknown tool metadata id: ${toolId}`);
  }

  return {
    title: tool.title,
    description: tool.description,
    alternates: {
      canonical: tool.href,
    },
    openGraph: {
      title: `${tool.title} | PDFMantra`,
      description: tool.description,
      url: tool.href,
      siteName: "PDFMantra",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${tool.title} | PDFMantra`,
      description: tool.description,
    },
  };
}
