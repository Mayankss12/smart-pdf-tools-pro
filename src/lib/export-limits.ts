// Clean-export allowance. Two limits apply at the same time:
//
//   burst  - 5 exports, then a cooldown until 5 hours after the first of them.
//   daily  - a total for 24 hours: 8 for visitors without an account, 15 for
//            signed-in users.
//
// Both are counted in windows. A window opens at its first counted export and
// lasts `windowHours`; the next export after it ends opens a fresh one.
//
// Visitors without an account are also held to a ceiling per network address.
// Anyone can mint a fresh anonymous id by clearing site data, so the ceiling
// is what stops that from resetting the allowance. It is three times a single
// visitor's allowance so a shared connection (a family, an office) still works.

export type ExportWindowConfig = {
  readonly limit: number;
  readonly windowHours: number;
};

export type ExportAllowance = {
  readonly burst: ExportWindowConfig;
  readonly daily: ExportWindowConfig;
};

export const EXPORT_BURST: ExportWindowConfig = {
  limit: 5,
  windowHours: 5,
};

// Visitors without an account.
export const GUEST_EXPORT_ALLOWANCE: ExportAllowance = {
  burst: EXPORT_BURST,
  daily: { limit: 8, windowHours: 24 },
};

// Signed-in users on the free plan. Same burst, a bigger daily total.
export const ACCOUNT_EXPORT_ALLOWANCE: ExportAllowance = {
  burst: EXPORT_BURST,
  daily: { limit: 15, windowHours: 24 },
};

// Everyone without an account behind one network address, together.
export const NETWORK_EXPORT_ALLOWANCE: ExportAllowance = {
  burst: { limit: EXPORT_BURST.limit * 3, windowHours: EXPORT_BURST.windowHours },
  daily: { limit: GUEST_EXPORT_ALLOWANCE.daily.limit * 3, windowHours: 24 },
};

const HOUR_MS = 60 * 60 * 1000;

export type ExportWindowState = {
  readonly windowStartedAt: string | null;
  readonly used: number;
};

export type ExportWindowStatus = {
  readonly limit: number;
  readonly windowHours: number;
  readonly used: number;
  readonly remaining: number;
  readonly canExport: boolean;
  // ISO times of the open window. Null while no window is open.
  readonly windowStartedAt: string | null;
  readonly resetsAt: string | null;
};

export function evaluateExportWindow({
  now,
  state,
  limit,
  windowHours,
}: {
  readonly now: number;
  readonly state: ExportWindowState | null;
  readonly limit: number;
  readonly windowHours: number;
}): ExportWindowStatus {
  const startedAt = state?.windowStartedAt
    ? Date.parse(state.windowStartedAt)
    : Number.NaN;
  const endsAt = startedAt + windowHours * HOUR_MS;
  const windowOpen = Number.isFinite(startedAt) && endsAt > now;
  const used = windowOpen ? Math.max(0, state?.used ?? 0) : 0;
  const remaining = Math.max(0, limit - used);

  return {
    limit,
    windowHours,
    used,
    remaining,
    canExport: remaining > 0,
    windowStartedAt: windowOpen ? new Date(startedAt).toISOString() : null,
    resetsAt: windowOpen ? new Date(endsAt).toISOString() : null,
  };
}

export type ExportAllowanceState = {
  readonly burst: ExportWindowState | null;
  readonly daily: ExportWindowState | null;
};

export type ExportBlockReason = "burst" | "daily" | "network";

export type ExportAllowanceStatus = {
  readonly burst: ExportWindowStatus;
  readonly daily: ExportWindowStatus;
  readonly canExport: boolean;
  // Which limit is stopping the export. When both are used up, the daily one,
  // because that is the limit an account raises.
  readonly blockedBy: ExportBlockReason | null;
  // ISO time the next export is possible: the later end of the limits in the way.
  readonly nextExportAt: string | null;
};

export function evaluateExportAllowance({
  now,
  state,
  allowance,
}: {
  readonly now: number;
  readonly state: ExportAllowanceState;
  readonly allowance: ExportAllowance;
}): ExportAllowanceStatus {
  const burst = evaluateExportWindow({ now, state: state.burst, ...allowance.burst });
  const daily = evaluateExportWindow({ now, state: state.daily, ...allowance.daily });
  const canExport = burst.canExport && daily.canExport;

  const blockers = [burst, daily].filter(
    (window) => !window.canExport && window.resetsAt,
  );
  const nextExportAt = canExport
    ? null
    : blockers.reduce<string | null>(
        (latest, window) =>
          !latest || Date.parse(window.resetsAt as string) > Date.parse(latest)
            ? (window.resetsAt as string)
            : latest,
        null,
      );

  return {
    burst,
    daily,
    canExport,
    blockedBy: canExport ? null : !daily.canExport ? "daily" : "burst",
    nextExportAt,
  };
}

// "2 h 15 min", "45 min" or "under a minute".
export function formatCooldown(resetsAt: string | null | undefined, now: number) {
  const endsAt = resetsAt ? Date.parse(resetsAt) : Number.NaN;
  if (!Number.isFinite(endsAt)) return null;

  const minutes = Math.ceil((endsAt - now) / 60_000);
  if (minutes <= 0) return "under a minute";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}
