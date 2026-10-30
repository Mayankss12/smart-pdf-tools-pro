import { Header } from "@/components/Header";
import { PhaseOnePdfToolClient } from "@/components/PhaseOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function ResizePage() {
  requirePublicLaunchReadyTool("resize-pdf");
  return <><Header /><PhaseOnePdfToolClient mode="resize" /></>;
}
