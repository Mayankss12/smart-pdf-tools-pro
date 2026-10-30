import { Header } from "@/components/Header";
import { PhaseOnePdfToolClient } from "@/components/PhaseOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function GrayscalePage() {
  requirePublicLaunchReadyTool("grayscale-pdf");
  return <><Header /><PhaseOnePdfToolClient mode="grayscale" /></>;
}
