import type { Metadata } from "next";
import { StageOnePdfToolClient } from "@/components/StageOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Crop PDF Pages", description: "Crop PDF page margins without reducing text or image quality." };
export default function Page() { requirePublicLaunchReadyTool("crop-pdf"); return <StageOnePdfToolClient mode="crop" />; }
