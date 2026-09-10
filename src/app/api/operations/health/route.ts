import { NextResponse } from "next/server";

import { runOperationalHealthCheck } from "@/lib/operations/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function noStore(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return noStore({ ok: false, error: "Operations check is not configured." }, 503);
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return noStore({ ok: false, error: "Unauthorized." }, 401);
  }

  try {
    const report = await runOperationalHealthCheck(createAdminClient());
    return noStore({ ok: true, ...report }, report.alerts.some((alert) => alert.severity === "critical") ? 503 : 200);
  } catch (error) {
    console.error("Operational health check failed", error);
    return noStore({ ok: false, error: "Operational health check failed." }, 500);
  }
}
