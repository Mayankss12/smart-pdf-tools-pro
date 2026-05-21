import { NextResponse } from "next/server";
import { getBackendCapabilityReport } from "@/lib/backend/capabilities";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = getBackendCapabilityReport();

  return NextResponse.json({
    ok: true,
    service: "pdfmantra-backend-foundation",
    configured: report.configured,
    checks: {
      supabasePublicConfigured: report.supabasePublicConfigured,
      supabaseAdminConfigured: report.supabaseAdminConfigured,
      processingApiConfigured: report.processingApiConfigured,
    },
    storageBuckets: report.storageBuckets,
    capabilities: report.capabilities,
  });
}
