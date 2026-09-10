import type { SupabaseClient } from "@supabase/supabase-js";

import {
  evaluateOperationalAlerts,
  getOperationalThresholds,
  getWorkspaceStorageCapacityBytes,
  type OperationalAlert,
  type OperationalMetrics,
} from "@/lib/operations";

type AdminClient = SupabaseClient;

export type OperationalHealthReport = {
  generatedAt: string;
  metrics: OperationalMetrics;
  alerts: OperationalAlert[];
};

function countOrZero(result: { count: number | null; error: unknown }) {
  return result.error ? 0 : result.count ?? 0;
}

export async function getGlobalWorkspaceStorageUsage(admin: AdminClient) {
  const rpc = await admin.rpc("workspace_storage_usage_bytes");
  if (!rpc.error && rpc.data !== null) return Number(rpc.data ?? 0);

  const fallback = await admin
    .from("document_versions")
    .select("size_bytes")
    .neq("upload_status", "failed")
    .range(0, 24_999);
  if (fallback.error) throw fallback.error;
  return (fallback.data ?? []).reduce(
    (total, row) => total + Number(row.size_bytes ?? 0),
    0,
  );
}

export async function collectOperationalHealth(
  admin: AdminClient,
): Promise<OperationalHealthReport> {
  const thresholds = getOperationalThresholds();
  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const staleBefore = new Date(
    now.getTime() - thresholds.staleUploadMinutes * 60 * 1000,
  ).toISOString();

  const [
    storage,
    staleUploads,
    failedUploads,
    failedJobs,
    lockedOtp,
    clientErrors,
  ] = await Promise.all([
    getGlobalWorkspaceStorageUsage(admin).then(
      (value) => ({ value, error: null }),
      (error: unknown) => ({ value: 0, error }),
    ),
    admin
      .from("document_versions")
      .select("id", { count: "exact", head: true })
      .eq("upload_status", "uploading")
      .lt("created_at", staleBefore),
    admin
      .from("workspace_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "upload_failed")
      .gte("created_at", since24h),
    admin
      .from("processing_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", since24h),
    admin
      .from("otp_attempt_limits")
      .select("key_hash", { count: "exact", head: true })
      .gt("locked_until", now.toISOString()),
    admin
      .from("client_telemetry")
      .select("id", { count: "exact", head: true })
      .neq("event_type", "web-vital")
      .gte("created_at", since24h),
  ]);

  const schemaConfigured =
    !storage.error &&
    !staleUploads.error &&
    !failedUploads.error &&
    !failedJobs.error &&
    !lockedOtp.error &&
    !clientErrors.error;
  const metrics: OperationalMetrics = {
    schemaConfigured,
    storageBytes: storage.value,
    storageCapacityBytes: getWorkspaceStorageCapacityBytes(),
    staleUploads: countOrZero(staleUploads),
    failedUploads24h: countOrZero(failedUploads),
    failedJobs24h: countOrZero(failedJobs),
    lockedOtpScopes: countOrZero(lockedOtp),
    clientErrors24h: countOrZero(clientErrors),
  };

  return {
    generatedAt: now.toISOString(),
    metrics,
    alerts: evaluateOperationalAlerts(metrics, thresholds),
  };
}

async function sendAlertWebhook(alerts: OperationalAlert[], generatedAt: string) {
  const destination = process.env.OPERATIONS_ALERT_WEBHOOK_URL?.trim();
  if (!destination || !alerts.length) return;

  let url: URL;
  try {
    url = new URL(destination);
  } catch {
    console.error("Operations alert webhook URL is invalid");
    return;
  }
  if (url.protocol !== "https:") {
    console.error("Operations alert webhook must use HTTPS");
    return;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      service: "PDFMantra",
      generatedAt,
      alerts: alerts.map(({ fingerprint, severity, category, title, summary, value, threshold }) => ({
        fingerprint,
        severity,
        category,
        title,
        summary,
        value,
        threshold,
      })),
    }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Operations webhook returned ${response.status}.`);
}

export async function persistOperationalHealth(
  admin: AdminClient,
  report: OperationalHealthReport,
) {
  const existing = await admin
    .from("operational_alerts")
    .select("id,fingerprint,severity,status,occurrences")
    .eq("status", "active");
  if (existing.error) throw existing.error;

  const existingByFingerprint = new Map(
    (existing.data ?? []).map((row) => [row.fingerprint, row]),
  );
  const notifications: OperationalAlert[] = [];

  for (const alert of report.alerts) {
    const current = existingByFingerprint.get(alert.fingerprint);
    const payload = {
      fingerprint: alert.fingerprint,
      severity: alert.severity,
      category: alert.category,
      status: "active",
      title: alert.title,
      summary: alert.summary,
      value: alert.value,
      threshold: alert.threshold,
      details: {},
      first_seen_at: current ? undefined : report.generatedAt,
      last_seen_at: report.generatedAt,
      resolved_at: null,
      occurrences: Number(current?.occurrences ?? 0) + 1,
      updated_at: report.generatedAt,
    };
    const write = current
      ? await admin.from("operational_alerts").update(payload).eq("id", current.id)
      : await admin.from("operational_alerts").insert(payload);
    if (write.error) throw write.error;
    if (!current || current.severity !== alert.severity) notifications.push(alert);
  }

  const currentFingerprints = new Set(report.alerts.map((alert) => alert.fingerprint));
  const resolvedIds = (existing.data ?? [])
    .filter((row) => !currentFingerprints.has(row.fingerprint))
    .map((row) => row.id);
  if (resolvedIds.length) {
    const resolved = await admin
      .from("operational_alerts")
      .update({
        status: "resolved",
        resolved_at: report.generatedAt,
        updated_at: report.generatedAt,
      })
      .in("id", resolvedIds);
    if (resolved.error) throw resolved.error;
  }

  try {
    await sendAlertWebhook(notifications, report.generatedAt);
  } catch (error) {
    console.error("Operations alert webhook failed", error);
  }
}

export async function runOperationalHealthCheck(admin: AdminClient) {
  const report = await collectOperationalHealth(admin);
  await persistOperationalHealth(admin, report);
  return report;
}
