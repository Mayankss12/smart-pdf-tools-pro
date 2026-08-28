import type { Metadata } from "next";

import { PdfSecurityToolClient } from "@/components/PdfSecurityToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export const metadata: Metadata = {
  title: "Protect PDF with AES-256 Encryption",
  description:
    "Password protect a PDF locally in your browser with verified AES-256 encryption and document permissions.",
};

export default function ProtectPdfPage() {
  requirePublicLaunchReadyTool("protect-pdf");
  return <PdfSecurityToolClient mode="protect" />;
}
