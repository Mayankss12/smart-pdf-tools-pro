import { Header } from "@/components/Header";
import { PhaseOnePdfToolClient } from "@/components/PhaseOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function AlternateMixPage() {
  requirePublicLaunchReadyTool("alternate-mix");
  return <><Header /><PhaseOnePdfToolClient mode="alternate-mix" /></>;
}
