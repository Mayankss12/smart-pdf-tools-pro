import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function PdfToWordPage() {
  requirePublicLaunchReadyTool("pdf-to-word");
  return <ConversionCapabilityShell conversionId="pdf-to-word" />;
}
