import type { Metadata } from "next";

import { PdfFormCreatorClient } from "@/components/PdfFormCreatorClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export const metadata: Metadata = {
  title: "Create Fillable PDF Forms",
  description: "Add interactive text, checkbox, dropdown, and radio fields to PDFs in your browser.",
};

export default function PdfFormCreatorPage() {
  requirePublicLaunchReadyTool("form-creator");
  return <PdfFormCreatorClient />;
}
