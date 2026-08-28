export type ClientTelemetryPayload = {
  readonly eventType: "web-vital" | "client-error" | "unhandled-rejection";
  readonly route: string;
  readonly metricName?: string;
  readonly metricValue?: number;
  readonly rating?: "good" | "needs-improvement" | "poor";
  readonly errorName?: string;
  readonly errorMessage?: string;
  readonly errorDigest?: string;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
};

const ALLOWED_METRICS = new Set(["CLS", "FCP", "FID", "INP", "LCP", "TTFB"]);
const SENSITIVE_PATTERN = /(?:https?:\/\/[^\s]+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|password|bearer\s+[\w.-]+)/giu;

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(SENSITIVE_PATTERN, "[redacted]").replace(/[\u0000-\u001f]/g, " ").trim();
  return clean ? clean.slice(0, maxLength) : undefined;
}

export function sanitizeTelemetryPayload(input: unknown): ClientTelemetryPayload | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (value.eventType !== "web-vital" && value.eventType !== "client-error" && value.eventType !== "unhandled-rejection") return null;
  const rawRoute = typeof value.route === "string" ? value.route : "/";
  const route = rawRoute.startsWith("/") && !rawRoute.includes("?") && !rawRoute.includes("#") ? rawRoute.slice(0, 180) : "/";
  const metricName = cleanText(value.metricName, 16);
  if (value.eventType === "web-vital" && (!metricName || !ALLOWED_METRICS.has(metricName))) return null;
  const metricValue = typeof value.metricValue === "number" && Number.isFinite(value.metricValue) && value.metricValue >= 0 ? value.metricValue : undefined;
  if (value.eventType === "web-vital" && metricValue === undefined) return null;
  const rating = value.rating === "good" || value.rating === "needs-improvement" || value.rating === "poor" ? value.rating : undefined;
  const rawMetadata = value.metadata && typeof value.metadata === "object" ? value.metadata as Record<string, unknown> : {};
  const metadata: Record<string, string | number | boolean | null> = {};
  Object.entries(rawMetadata).slice(0, 8).forEach(([key, item]) => {
    if (!/^[a-z][a-z0-9_]{0,31}$/i.test(key)) return;
    if (typeof item === "string") metadata[key] = cleanText(item, 120) ?? "";
    else if (typeof item === "number" && Number.isFinite(item)) metadata[key] = item;
    else if (typeof item === "boolean") metadata[key] = item;
    else if (item === null) metadata[key] = null;
  });
  return {
    eventType: value.eventType,
    route,
    metricName,
    metricValue,
    rating,
    errorName: cleanText(value.errorName, 80),
    errorMessage: cleanText(value.errorMessage, 300),
    errorDigest: cleanText(value.errorDigest, 100),
    metadata,
  };
}
