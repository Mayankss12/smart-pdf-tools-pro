import { PdfFormCreatorClient } from "@/components/PdfFormCreatorClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function PdfFormCreatorPage() {
  requirePublicLaunchReadyTool("form-creator");
  return <PdfFormCreatorClient />;
}
