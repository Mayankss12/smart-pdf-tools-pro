import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function WordToPdfPage() {
  requirePublicLaunchReadyTool("docx-to-pdf");
  return <ConversionCapabilityShell conversionId="docx-to-pdf" />;
}
