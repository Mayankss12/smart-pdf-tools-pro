import { NextResponse } from "next/server";

import { createNoStoreHeaders, isSameSiteStateChangingRequest } from "@/lib/api-security";
import { createAdminClient } from "@/lib/supabase/admin";
import { sanitizeTelemetryPayload } from "@/lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const buckets = new Map<string, { count: number; expiresAt: number }>();

function allowed(request: Request) {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [bucketKey, bucketValue] of buckets) {
      if (bucketValue.expiresAt < now) buckets.delete(bucketKey);
    }
  }
  const key = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim().slice(0, 64);
  const bucket = buckets.get(key);
  if (!bucket || bucket.expiresAt < now) { buckets.set(key, { count: 1, expiresAt: now + 60_000 }); return true; }
  bucket.count += 1;
  return bucket.count <= 60;
}

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) return NextResponse.json({ ok: false }, { status: 403, headers: createNoStoreHeaders(request) });
  if (!allowed(request)) return NextResponse.json({ ok: false }, { status: 429, headers: createNoStoreHeaders(request) });
  if (Number(request.headers.get("content-length") ?? 0) > 8_192) return NextResponse.json({ ok: false }, { status: 413, headers: createNoStoreHeaders(request) });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ ok: false }, { status: 400, headers: createNoStoreHeaders(request) }); }
  const payload = sanitizeTelemetryPayload(body);
  if (!payload) return NextResponse.json({ ok: false }, { status: 400, headers: createNoStoreHeaders(request) });

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("client_telemetry").insert({
      event_type: payload.eventType,
      route: payload.route,
      metric_name: payload.metricName ?? null,
      metric_value: payload.metricValue ?? null,
      rating: payload.rating ?? null,
      error_name: payload.errorName ?? null,
      error_message: payload.errorMessage ?? null,
      error_digest: payload.errorDigest ?? null,
      metadata: payload.metadata ?? {},
    });
    if (error) throw error;
  } catch (error) {
    console.error("PDFMantra telemetry persistence unavailable", { eventType: payload.eventType, route: payload.route, error: error instanceof Error ? error.message : "unknown" });
  }
  return NextResponse.json({ ok: true }, { status: 202, headers: createNoStoreHeaders(request) });
}
