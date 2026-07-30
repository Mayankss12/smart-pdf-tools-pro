import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function PowerPointToPdfPage() {
  requirePublicLaunchReadyTool("pptx-to-pdf");
  return <ConversionCapabilityShell conversionId="pptx-to-pdf" />;
}
