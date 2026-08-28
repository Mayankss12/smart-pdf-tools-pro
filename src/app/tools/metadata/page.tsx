import type { Metadata } from "next";
import { StageOnePdfToolClient } from "@/components/StageOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Edit PDF Metadata", description: "Inspect, update, or remove PDF document metadata locally." };
export default function Page() { requirePublicLaunchReadyTool("pdf-metadata"); return <StageOnePdfToolClient mode="metadata" />; }
