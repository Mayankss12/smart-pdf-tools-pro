import type { ConversionId } from "./registry";

export type ConversionAnalyticsEventName =
  | "upload_selected"
  | "validation_rejected"
  | "conversion_started"
  | "conversion_cancelled"
  | "conversion_completed"
  | "conversion_failed"
  | "download_completed";

export interface ConversionAnalyticsEvent {
  readonly name: ConversionAnalyticsEventName;
  readonly conversionId: ConversionId;
  readonly processingMode: "client" | "server" | "provider";
  readonly fileCount?: number;
  readonly sizeBucket?: "under-1mb" | "1-10mb" | "10-50mb" | "over-50mb";
  readonly failureCode?: string;
}

export function isSafeConversionAnalyticsEvent(
  event: ConversionAnalyticsEvent,
) {
  return (
    !("fileName" in event) &&
    !("content" in event) &&
    !("documentText" in event)
  );
}
