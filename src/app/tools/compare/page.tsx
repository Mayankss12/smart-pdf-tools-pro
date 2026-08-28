import type { Metadata } from "next";

import { PdfCompareToolClient } from "@/components/PdfCompareToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export const metadata: Metadata = {
  title: "Compare PDFs Online",
  description: "Compare two PDF versions page by page with private browser-side visual and text analysis.",
};

export default function ComparePdfPage() {
  requirePublicLaunchReadyTool("compare-pdf");
  return <PdfCompareToolClient />;
}
