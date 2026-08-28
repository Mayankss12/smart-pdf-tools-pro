"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

import type { ClientTelemetryPayload } from "@/lib/telemetry";

function send(payload: ClientTelemetryPayload) {
  const body = JSON.stringify(payload);
  if (navigator.sendBeacon && navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }))) return;
  void fetch("/api/telemetry", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
}

export function ReliabilityTelemetry() {
  const pathname = usePathname() || "/";
  useReportWebVitals((metric) => {
    send({ eventType: "web-vital", route: pathname, metricName: metric.name, metricValue: metric.value, rating: metric.rating, metadata: { navigation_type: metric.navigationType ?? "unknown" } });
  });
  useEffect(() => {
    const onError = (event: ErrorEvent) => send({ eventType: "client-error", route: pathname, errorName: event.error?.name ?? "Error", errorMessage: event.message || "Unhandled client error" });
    const onRejection = (event: PromiseRejectionEvent) => { const reason = event.reason; send({ eventType: "unhandled-rejection", route: pathname, errorName: reason instanceof Error ? reason.name : "PromiseRejection", errorMessage: reason instanceof Error ? reason.message : "Unhandled promise rejection" }); };
    window.addEventListener("error", onError); window.addEventListener("unhandledrejection", onRejection);
    return () => { window.removeEventListener("error", onError); window.removeEventListener("unhandledrejection", onRejection); };
  }, [pathname]);
  return null;
}
