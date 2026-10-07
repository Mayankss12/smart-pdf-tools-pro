import { PdfSecurityToolClient } from "@/components/PdfSecurityToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function ProtectPdfPage() {
  requirePublicLaunchReadyTool("protect-pdf");
  return <PdfSecurityToolClient mode="protect" />;
}
