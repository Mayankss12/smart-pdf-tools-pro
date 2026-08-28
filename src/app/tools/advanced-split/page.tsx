import type { Metadata } from "next";
import { AdvancedSplitToolClient } from "@/components/AdvancedSplitToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Advanced Split PDF", description: "Split PDFs by approximate size, bookmarks, or matching page text." };
export default function Page() { requirePublicLaunchReadyTool("advanced-split"); return <AdvancedSplitToolClient />; }
