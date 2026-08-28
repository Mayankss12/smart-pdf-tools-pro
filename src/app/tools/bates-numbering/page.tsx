import type { Metadata } from "next";
import { StageOnePdfToolClient } from "@/components/StageOnePdfToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Bates Numbering for PDF", description: "Apply configurable Bates numbers to PDF pages locally." };
export default function Page() { requirePublicLaunchReadyTool("bates-numbering"); return <StageOnePdfToolClient mode="bates" />; }
