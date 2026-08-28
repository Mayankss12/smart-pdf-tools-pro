import type { Metadata } from "next";

import { PdfaToolClient } from "@/components/PdfaToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export const metadata: Metadata = {
  title: "PDF/A Preflight and Archival Preparation",
  description: "Inspect PDF/A readiness risks and prepare a safer archival copy locally without false certification claims.",
};

export default function PdfaPage() {
  requirePublicLaunchReadyTool("pdfa-preflight");
  return <PdfaToolClient />;
}
