import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function WebpageToPdfPage() {
  requirePublicLaunchReadyTool("webpage-to-pdf");
  return <ConversionCapabilityShell conversionId="webpage-to-pdf" />;
}
