import {
  NETWORK_EXPORT_ALLOWANCE,
  evaluateExportAllowance,
  type ExportAllowance,
  type ExportAllowanceState,
  type ExportAllowanceStatus,
} from "./export-limits";

// Server-side counting of clean exports per identity. One row per identity
// holds its current burst window and its current 24-hour window; each is reset
// in place when it ends.

export type UsageWindowIdentity = {
  readonly userId: string | null;
  readonly anonymousId: string | null;
};

export type UsageWindowRow = {
  readonly id: string;
  // Burst window.
  readonly window_started_at: string;
  readonly clean_exports_used: number;
  // 24-hour window.
  readonly day_window_started_at: string;
  readonly day_exports_used: number;
  readonly watermarked_exports_used: number;
  readonly blocked_exports_count: number;
};

export type UsageWindowValues = {
  readonly window_started_at: string;
  readonly clean_exports_used: number;
  readonly day_window_started_at: string;
  readonly day_exports_used: number;
  readonly watermarked_exports_used: number;
  readonly blocked_exports_count: number;
  readonly last_tool_key: string;
  readonly last_export_at: string;
};

export type UsageWindowStore = {
  read(identity: UsageWindowIdentity): Promise<UsageWindowRow | null>;
  // Null when another request created the row first.
  insert(
    identity: UsageWindowIdentity,
    values: UsageWindowValues,
  ): Promise<UsageWindowRow | null>;
  // Compare-and-set against the row as it was read. Null when it changed.
  update(
    row: UsageWindowRow,
    values: UsageWindowValues,
  ): Promise<UsageWindowRow | null>;
};

export type ExportKind = "clean" | "watermarked" | "blocked";

export type ConsumeExportResult = {
  readonly allowed: boolean;
  readonly exportKind: ExportKind;
  readonly status: ExportAllowanceStatus;
  readonly row: UsageWindowRow | null;
};

const MAX_ATTEMPTS = 5;

export function toAllowanceState(row: UsageWindowRow | null): ExportAllowanceState {
  return {
    burst: row
      ? { windowStartedAt: row.window_started_at, used: row.clean_exports_used }
      : null,
    daily: row
      ? { windowStartedAt: row.day_window_started_at, used: row.day_exports_used }
      : null,
  };
}

export async function consumeExport({
  store,
  identity,
  requestedKind,
  toolKey,
  allowance,
  now = Date.now(),
}: {
  readonly store: UsageWindowStore;
  readonly identity: UsageWindowIdentity;
  readonly requestedKind: ExportKind;
  readonly toolKey: string;
  readonly allowance: ExportAllowance;
  readonly now?: number;
}): Promise<ConsumeExportResult> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const row = await store.read(identity);
    const before = evaluateExportAllowance({
      now,
      state: toAllowanceState(row),
      allowance,
    });
    const exportKind: ExportKind =
      requestedKind === "clean" && !before.canExport ? "blocked" : requestedKind;
    const counts = exportKind === "clean";
    const nowIso = new Date(now).toISOString();

    // A window opens at its first counted export and is kept until it ends.
    const values: UsageWindowValues = {
      window_started_at:
        before.burst.windowStartedAt ??
        (counts ? nowIso : (row?.window_started_at ?? nowIso)),
      clean_exports_used: before.burst.used + (counts ? 1 : 0),
      day_window_started_at:
        before.daily.windowStartedAt ??
        (counts ? nowIso : (row?.day_window_started_at ?? nowIso)),
      day_exports_used: before.daily.used + (counts ? 1 : 0),
      watermarked_exports_used:
        (row?.watermarked_exports_used ?? 0) + (exportKind === "watermarked" ? 1 : 0),
      blocked_exports_count:
        (row?.blocked_exports_count ?? 0) + (exportKind === "blocked" ? 1 : 0),
      last_tool_key: toolKey,
      last_export_at: nowIso,
    };

    const written = row
      ? await store.update(row, values)
      : await store.insert(identity, values);

    if (!written) continue;

    return {
      allowed: exportKind !== "blocked",
      exportKind,
      status: evaluateExportAllowance({
        now,
        state: toAllowanceState(written),
        allowance,
      }),
      row: written,
    };
  }

  throw new Error("Usage window is busy. Please try again.");
}

export async function readExportAllowance({
  store,
  identity,
  allowance,
  now = Date.now(),
}: {
  readonly store: UsageWindowStore;
  readonly identity: UsageWindowIdentity;
  readonly allowance: ExportAllowance;
  readonly now?: number;
}) {
  const row = await store.read(identity);

  return {
    row,
    status: evaluateExportAllowance({
      now,
      state: toAllowanceState(row),
      allowance,
    }),
  };
}

// The shared ceiling for a network address, seen from one visitor's status.
function withNetworkBlock(
  guestStatus: ExportAllowanceStatus,
  networkStatus: ExportAllowanceStatus,
): ExportAllowanceStatus {
  return {
    ...guestStatus,
    canExport: false,
    blockedBy: "network",
    nextExportAt: networkStatus.nextExportAt,
  };
}

// A visitor without an account is held to their own allowance and, on top of
// it, to a ceiling shared by everyone on the same network address.
export async function readGuestExportAllowance({
  store,
  guest,
  network,
  allowance,
  now = Date.now(),
}: {
  readonly store: UsageWindowStore;
  readonly guest: UsageWindowIdentity;
  readonly network: UsageWindowIdentity | null;
  readonly allowance: ExportAllowance;
  readonly now?: number;
}) {
  const own = await readExportAllowance({ store, identity: guest, allowance, now });

  if (!network || !own.status.canExport) return own;

  const shared = await readExportAllowance({
    store,
    identity: network,
    allowance: NETWORK_EXPORT_ALLOWANCE,
    now,
  });

  return shared.status.canExport
    ? own
    : { row: own.row, status: withNetworkBlock(own.status, shared.status) };
}

export async function consumeGuestExport({
  store,
  guest,
  network,
  requestedKind,
  toolKey,
  allowance,
  now = Date.now(),
}: {
  readonly store: UsageWindowStore;
  readonly guest: UsageWindowIdentity;
  readonly network: UsageWindowIdentity | null;
  readonly requestedKind: ExportKind;
  readonly toolKey: string;
  readonly allowance: ExportAllowance;
  readonly now?: number;
}): Promise<ConsumeExportResult> {
  const own = await readExportAllowance({ store, identity: guest, allowance, now });

  // Only a clean export that the visitor's own allowance lets through is also
  // counted against the network. Anything else is settled on the visitor's row.
  if (!network || requestedKind !== "clean" || !own.status.canExport) {
    return consumeExport({
      store,
      identity: guest,
      requestedKind,
      toolKey,
      allowance,
      now,
    });
  }

  const shared = await consumeExport({
    store,
    identity: network,
    requestedKind: "clean",
    toolKey,
    allowance: NETWORK_EXPORT_ALLOWANCE,
    now,
  });

  if (!shared.allowed) {
    return {
      allowed: false,
      exportKind: "blocked",
      status: withNetworkBlock(own.status, shared.status),
      row: own.row,
    };
  }

  return consumeExport({
    store,
    identity: guest,
    requestedKind: "clean",
    toolKey,
    allowance,
    now,
  });
}
