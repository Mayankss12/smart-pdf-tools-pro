import type { Metadata } from "next";
import { BatchWorkflowToolClient } from "@/components/BatchWorkflowToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Batch PDF & Workflow Automation", description: "Process multiple PDFs or chain local PDF operations in one workflow." };
export default function Page() { requirePublicLaunchReadyTool("batch-workflows"); return <BatchWorkflowToolClient />; }
