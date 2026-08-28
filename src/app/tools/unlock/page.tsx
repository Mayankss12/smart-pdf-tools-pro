import type { Metadata } from "next";

import { PdfSecurityToolClient } from "@/components/PdfSecurityToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export const metadata: Metadata = {
  title: "Unlock PDF & Remove a Known Password | PDFMantra",
  description:
    "Remove PDF password encryption locally when you know the password and are authorized to access the document.",
};

export default function UnlockPdfPage() {
  requirePublicLaunchReadyTool("unlock-pdf");
  return <PdfSecurityToolClient mode="unlock" />;
}
