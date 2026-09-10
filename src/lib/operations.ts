const GIBIBYTE = 1024 ** 3;

export type OperationalSeverity = "warning" | "critical";

export type OperationalAlert = {
  fingerprint: string;
  severity: OperationalSeverity;
  category: "storage" | "workspace" | "processing" | "authentication" | "reliability";
  title: string;
  summary: string;
  value: number;
  threshold: number;
};

export type OperationalMetrics = {
  schemaConfigured: boolean;
  storageBytes: number;
  storageCapacityBytes: number;
  staleUploads: number;
  failedUploads24h: number;
  failedJobs24h: number;
  lockedOtpScopes: number;
  clientErrors24h: number;
};

export type OperationalThresholds = {
  storageWarningRatio: number;
  storageCriticalRatio: number;
  staleUploadMinutes: number;
  failedUploadWarning: number;
  failedJobWarning: number;
  lockedOtpWarning: number;
  clientErrorWarning: number;
};

function positiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function ratio(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : fallback;
}

export function getWorkspaceStorageCapacityBytes() {
  return Math.floor(
    positiveNumber(process.env.WORKSPACE_STORAGE_CAPACITY_BYTES, GIBIBYTE),
  );
}

export function getOperationalThresholds(): OperationalThresholds {
  const warning = ratio(process.env.OPERATIONS_STORAGE_WARNING_RATIO, 0.8);
  const critical = Math.max(
    warning,
    ratio(process.env.OPERATIONS_STORAGE_CRITICAL_RATIO, 0.95),
  );

  return {
    storageWarningRatio: warning,
    storageCriticalRatio: critical,
    staleUploadMinutes: Math.floor(
      positiveNumber(process.env.OPERATIONS_STALE_UPLOAD_MINUTES, 30),
    ),
    failedUploadWarning: Math.floor(
      positiveNumber(process.env.OPERATIONS_FAILED_UPLOAD_WARNING, 1),
    ),
    failedJobWarning: Math.floor(
      positiveNumber(process.env.OPERATIONS_FAILED_JOB_WARNING, 3),
    ),
    lockedOtpWarning: Math.floor(
      positiveNumber(process.env.OPERATIONS_LOCKED_OTP_WARNING, 5),
    ),
    clientErrorWarning: Math.floor(
      positiveNumber(process.env.OPERATIONS_CLIENT_ERROR_WARNING, 20),
    ),
  };
}

export function assertGlobalWorkspaceCapacity({
  storageBytes,
  incomingBytes,
  storageCapacityBytes,
  criticalRatio = getOperationalThresholds().storageCriticalRatio,
}: {
  storageBytes: number;
  incomingBytes: number;
  storageCapacityBytes: number;
  criticalRatio?: number;
}) {
  const safeLimit = Math.floor(storageCapacityBytes * criticalRatio);
  if (storageBytes + incomingBytes <= safeLimit) return null;

  return "Workspace storage is temporarily at capacity. Please try again after storage is expanded.";
}

export function evaluateOperationalAlerts(
  metrics: OperationalMetrics,
  thresholds = getOperationalThresholds(),
): OperationalAlert[] {
  const alerts: OperationalAlert[] = [];
  const storageRatio = metrics.storageCapacityBytes
    ? metrics.storageBytes / metrics.storageCapacityBytes
    : 1;

  if (!metrics.schemaConfigured) {
    alerts.push({
      fingerprint: "workspace-schema-unavailable",
      severity: "critical",
      category: "workspace",
      title: "Workspace production schema is unavailable",
      summary: "The operational schema or one of its protected tables could not be queried.",
      value: 1,
      threshold: 0,
    });
  }

  if (storageRatio >= thresholds.storageCriticalRatio) {
    alerts.push({
      fingerprint: "workspace-storage-critical",
      severity: "critical",
      category: "storage",
      title: "Workspace storage is near the configured ceiling",
      summary: "New uploads are protected by the aggregate storage circuit-breaker.",
      value: metrics.storageBytes,
      threshold: Math.floor(metrics.storageCapacityBytes * thresholds.storageCriticalRatio),
    });
  } else if (storageRatio >= thresholds.storageWarningRatio) {
    alerts.push({
      fingerprint: "workspace-storage-warning",
      severity: "warning",
      category: "storage",
      title: "Workspace storage expansion should be scheduled",
      summary: "Storage usage crossed the warning threshold.",
      value: metrics.storageBytes,
      threshold: Math.floor(metrics.storageCapacityBytes * thresholds.storageWarningRatio),
    });
  }

  if (metrics.staleUploads > 0) {
    alerts.push({
      fingerprint: "workspace-stale-uploads",
      severity: metrics.staleUploads >= 5 ? "critical" : "warning",
      category: "workspace",
      title: "Workspace uploads are stuck",
      summary: "One or more uploads have remained unfinished beyond the configured window.",
      value: metrics.staleUploads,
      threshold: 0,
    });
  }

  if (metrics.failedUploads24h >= thresholds.failedUploadWarning) {
    alerts.push({
      fingerprint: "workspace-failed-uploads",
      severity: metrics.failedUploads24h >= thresholds.failedUploadWarning * 5 ? "critical" : "warning",
      category: "workspace",
      title: "Workspace uploads failed in the last 24 hours",
      summary: "Review recent workspace events and storage availability.",
      value: metrics.failedUploads24h,
      threshold: thresholds.failedUploadWarning,
    });
  }

  if (metrics.failedJobs24h >= thresholds.failedJobWarning) {
    alerts.push({
      fingerprint: "processing-failed-jobs",
      severity: metrics.failedJobs24h >= thresholds.failedJobWarning * 2 ? "critical" : "warning",
      category: "processing",
      title: "Processing job failures are elevated",
      summary: "Review provider health and recent processing-job errors.",
      value: metrics.failedJobs24h,
      threshold: thresholds.failedJobWarning,
    });
  }

  if (metrics.lockedOtpScopes >= thresholds.lockedOtpWarning) {
    alerts.push({
      fingerprint: "authentication-otp-locks",
      severity: metrics.lockedOtpScopes >= thresholds.lockedOtpWarning * 2 ? "critical" : "warning",
      category: "authentication",
      title: "OTP lockouts are elevated",
      summary: "Review authentication traffic for abuse or a customer sign-in regression.",
      value: metrics.lockedOtpScopes,
      threshold: thresholds.lockedOtpWarning,
    });
  }

  if (metrics.clientErrors24h >= thresholds.clientErrorWarning) {
    alerts.push({
      fingerprint: "reliability-client-errors",
      severity: metrics.clientErrors24h >= thresholds.clientErrorWarning * 2 ? "critical" : "warning",
      category: "reliability",
      title: "Client errors are elevated",
      summary: "Review sanitized client telemetry and the affected routes.",
      value: metrics.clientErrors24h,
      threshold: thresholds.clientErrorWarning,
    });
  }

  return alerts;
}
