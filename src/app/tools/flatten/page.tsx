import type { Metadata } from "next";
import { StageOnePdfToolClient } from "@/components/StageOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Flatten PDF Online", description: "Flatten PDF fields and annotations locally in your browser." };
export default function Page() { requirePublicLaunchReadyTool("flatten-pdf"); return <StageOnePdfToolClient mode="flatten" />; }
