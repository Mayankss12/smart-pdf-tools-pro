import type { Metadata } from "next";
import { PdfRedactToolClient } from "@/components/PdfRedactToolClient";
import { requirePublicLaunchReadyTool } from "@/lib/public-launch-guard";
export const metadata: Metadata = { title: "Permanently Redact PDF", description: "Permanently remove selected visual areas from a PDF locally in your browser." };
export default function Page() { requirePublicLaunchReadyTool("redact-pdf"); return <PdfRedactToolClient />; }
