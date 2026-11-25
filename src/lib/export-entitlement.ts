import type {
  RecordExportResult,
} from "@/hooks/useEntitlement";
import {
  ACCOUNT_EXPORT_ALLOWANCE,
  formatCooldown,
} from "@/lib/export-limits";

const ACCOUNT_DAILY_LIMIT = ACCOUNT_EXPORT_ALLOWANCE.daily.limit;
const ACCOUNT_DAILY_HOURS = ACCOUNT_EXPORT_ALLOWANCE.daily.windowHours;

export type ExportRecorder = (input: {
  readonly toolKey: string;
  readonly exportKind: "clean";
}) => Promise<RecordExportResult>;

export type PreparedExportResult<T> =
  | {
      readonly allowed: true;
      readonly output: T;
      readonly entitlement: RecordExportResult;
      readonly message: null;
    }
  | {
      readonly allowed: false;
      readonly output: null;
      readonly entitlement: RecordExportResult | null;
      readonly message: string;
    };

export function getExportDenialMessage(
  result: RecordExportResult,
  now: number = Date.now(),
) {
  if (result.error) return result.error;

  if (result.cleanExportLimit <= 0) {
    return "Exports are turned off for this account. Contact support if this looks wrong.";
  }

  const wait = formatCooldown(
    result.nextExportAt ?? result.burstResetsAt ?? result.windowResetsAt,
    now,
  );
  const guest = result.identityType === "guest";
  const signUp = guest
    ? ` Sign up free to get ${ACCOUNT_DAILY_LIMIT} exports every ${ACCOUNT_DAILY_HOURS} hours.`
    : "";

  if (result.blockedBy === "network") {
    return `Too many exports have been made from your network. ${wait ? `Try again in ${wait}` : "Try again later"}${guest ? ", or sign in to keep going" : ""}.`;
  }

  if (result.blockedBy === "daily") {
    const label = guest ? "free exports" : "exports";
    return `You have used all ${result.cleanExportLimit} ${label} for ${result.exportWindowHours} hours. ${wait ? `You can export again in ${wait}.` : "Try again later."}${signUp}`;
  }

  if (result.blockedBy === "burst") {
    return `You have used ${result.burstLimit} exports in a row, so there is a ${result.burstWindowHours}-hour break. ${wait ? `You can export again in ${wait}.` : "Try again later."}${signUp}`;
  }

  return "Export limit reached. Try again later.";
}

export async function prepareEntitledExport<T>({
  prepare,
  recordExport,
  toolKey,
}: {
  readonly prepare: () => Promise<T>;
  readonly recordExport: ExportRecorder;
  readonly toolKey: string;
}): Promise<PreparedExportResult<T>> {
  const output = await prepare();
  const entitlement = await recordExport({
    toolKey,
    exportKind: "clean",
  });

  if (!entitlement.allowed) {
    return {
      allowed: false,
      output: null,
      entitlement,
      message: getExportDenialMessage(entitlement),
    };
  }

  return {
    allowed: true,
    output,
    entitlement,
    message: null,
  };
}
