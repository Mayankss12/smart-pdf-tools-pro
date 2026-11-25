import type {
  ExportAllowanceStatus,
  ExportBlockReason,
} from "./export-limits";

// What the API tells the browser about a visitor's export allowance. The
// cleanExport* fields describe the 24-hour total; the burst* fields describe
// the 5-exports-then-cooldown limit.
export type ExportStatusFields = {
  cleanExportLimit: number;
  exportWindowHours: number;
  cleanExportsUsed: number;
  cleanExportsRemaining: number;
  // ISO time the 24-hour window ends; null while none is open.
  windowResetsAt: string | null;
  burstLimit: number;
  burstWindowHours: number;
  burstRemaining: number;
  burstResetsAt: string | null;
  // When blocked: which limit is in the way and when the next export is possible.
  blockedBy: ExportBlockReason | null;
  nextExportAt: string | null;
  canExportClean: boolean;
};

export function toExportStatusFields(
  status: ExportAllowanceStatus,
): ExportStatusFields {
  return {
    cleanExportLimit: status.daily.limit,
    exportWindowHours: status.daily.windowHours,
    cleanExportsUsed: status.daily.used,
    cleanExportsRemaining: status.daily.remaining,
    windowResetsAt: status.daily.resetsAt,
    burstLimit: status.burst.limit,
    burstWindowHours: status.burst.windowHours,
    burstRemaining: status.burst.remaining,
    burstResetsAt: status.burst.resetsAt,
    blockedBy: status.blockedBy,
    nextExportAt: status.nextExportAt,
    canExportClean: status.canExport,
  };
}

// Paid tiers have no windows. The numbers only keep the shape the same.
export function unlimitedExportStatusFields(limit: number): ExportStatusFields {
  return {
    cleanExportLimit: limit,
    exportWindowHours: 0,
    cleanExportsUsed: 0,
    cleanExportsRemaining: limit,
    windowResetsAt: null,
    burstLimit: limit,
    burstWindowHours: 0,
    burstRemaining: limit,
    burstResetsAt: null,
    blockedBy: null,
    nextExportAt: null,
    canExportClean: true,
  };
}
