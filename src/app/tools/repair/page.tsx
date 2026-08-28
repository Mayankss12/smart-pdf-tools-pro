import type { Metadata } from "next";
import { StageOnePdfToolClient } from "@/components/StageOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Repair PDF Online", description: "Repair recoverable PDF structure locally in your browser." };
export default function Page() { requirePublicLaunchReadyTool("repair-pdf"); return <StageOnePdfToolClient mode="repair" />; }
