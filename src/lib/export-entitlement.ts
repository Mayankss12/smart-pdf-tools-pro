import type {
  RecordExportResult,
} from "@/hooks/useEntitlement";

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

export function getExportDenialMessage(result: RecordExportResult) {
  if (result.error) return result.error;

  if (result.identityType === "guest") {
    return "Guest clean export limit reached for today. Sign in to get 5 clean exports/day.";
  }

  return `${result.planLabel} clean export limit reached for today.`;
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
