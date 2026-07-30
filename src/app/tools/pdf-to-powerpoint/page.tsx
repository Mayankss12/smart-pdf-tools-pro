import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function PdfToPowerPointPage() {
  requirePublicLaunchReadyTool("pdf-to-powerpoint");
  return <ConversionCapabilityShell conversionId="pdf-to-powerpoint" />;
}
