import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function HeicToPdfPage() {
  requirePublicLaunchReadyTool("heic-to-pdf");
  return <ConversionCapabilityShell conversionId="heic-to-pdf" />;
}
