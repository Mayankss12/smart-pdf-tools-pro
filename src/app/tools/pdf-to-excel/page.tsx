import { ConversionCapabilityShell } from "@/components/ConversionCapabilityShell";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function PdfToExcelPage() {
  requirePublicLaunchReadyTool("pdf-to-excel");
  return <ConversionCapabilityShell conversionId="pdf-to-excel" />;
}
