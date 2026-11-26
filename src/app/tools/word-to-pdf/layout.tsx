import type { Metadata } from "next";

import { buildToolMetadata } from "@/lib/tool-metadata";

// Text-only local conversion: keep the page usable but out of Google's index
// until a full rendering provider is available.
export const metadata: Metadata = {
  ...buildToolMetadata("docx-to-pdf"),
  robots: { index: false, follow: true },
};

export default function ToolRouteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
