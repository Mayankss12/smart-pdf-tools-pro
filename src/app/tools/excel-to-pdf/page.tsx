import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function ExcelToPdfPage() {
  requirePublicLaunchReadyTool("xlsx-to-pdf");
  return <ConversionCapabilityShell conversionId="xlsx-to-pdf" />;
}
