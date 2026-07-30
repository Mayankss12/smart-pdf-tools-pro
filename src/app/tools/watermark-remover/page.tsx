import { WatermarkRemoverClient } from "@/components/WatermarkRemoverClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";

export default function WatermarkRemoverPage() {
  requirePublicLaunchReadyTool("watermark-remover");
  return <WatermarkRemoverClient />;
}
