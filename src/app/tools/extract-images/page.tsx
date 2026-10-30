import { Header } from "@/components/Header";
import { PhaseOnePdfToolClient } from "@/components/PhaseOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function ExtractImagesPage() {
  requirePublicLaunchReadyTool("extract-images");
  return <><Header /><PhaseOnePdfToolClient mode="extract-images" /></>;
}
