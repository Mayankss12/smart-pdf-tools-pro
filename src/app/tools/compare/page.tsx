import { PdfCompareToolClient } from "@/components/PdfCompareToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function ComparePdfPage() {
  requirePublicLaunchReadyTool("compare-pdf");
  return <PdfCompareToolClient />;
}
