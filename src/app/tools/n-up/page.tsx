import { Header } from "@/components/Header";
import { PhaseOnePdfToolClient } from "@/components/PhaseOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function NUpPage() {
  requirePublicLaunchReadyTool("n-up-pdf");
  return <><Header /><PhaseOnePdfToolClient mode="n-up" /></>;
}
