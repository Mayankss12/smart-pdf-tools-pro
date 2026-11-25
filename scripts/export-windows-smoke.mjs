import assert from "node:assert/strict";

import { PDFMANTRA_TIERS } from "../src/lib/entitlements.ts";
import { getExportDenialMessage } from "../src/lib/export-entitlement.ts";
import {
  ACCOUNT_EXPORT_ALLOWANCE,
  EXPORT_BURST,
  GUEST_EXPORT_ALLOWANCE,
  NETWORK_EXPORT_ALLOWANCE,
  evaluateExportAllowance,
  evaluateExportWindow,
  formatCooldown,
} from "../src/lib/export-limits.ts";
import {
  getNetworkIdentity,
  getRequestClientAddress,
  normalizeClientAddress,
} from "../src/lib/network-identity.ts";
import {
  consumeExport,
  consumeGuestExport,
  readGuestExportAllowance,
} from "../src/lib/usage-windows.ts";

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const START = Date.parse("2026-11-25T10:00:00.000Z");
const iso = (ms) => new Date(ms).toISOString();

// The agreed allowances.
assert.deepEqual(EXPORT_BURST, { limit: 5, windowHours: 5 });
assert.deepEqual(GUEST_EXPORT_ALLOWANCE.daily, { limit: 8, windowHours: 24 });
assert.deepEqual(ACCOUNT_EXPORT_ALLOWANCE.daily, { limit: 15, windowHours: 24 });
assert.deepEqual(GUEST_EXPORT_ALLOWANCE.burst, ACCOUNT_EXPORT_ALLOWANCE.burst, "same burst for both");
assert.deepEqual(NETWORK_EXPORT_ALLOWANCE.burst, { limit: 15, windowHours: 5 });
assert.deepEqual(NETWORK_EXPORT_ALLOWANCE.daily, { limit: 24, windowHours: 24 });
assert.equal(PDFMANTRA_TIERS.guest.cleanExportLimit, 8);
assert.equal(PDFMANTRA_TIERS.guest.exportWindowHours, 24);
assert.equal(PDFMANTRA_TIERS.free.cleanExportLimit, 15);
assert.equal(PDFMANTRA_TIERS.free.exportWindowHours, 24);
for (const tier of ["plus", "pro", "admin"]) {
  assert.equal(PDFMANTRA_TIERS[tier].exportWindowHours, 0, `${tier} has no window`);
}

// In-memory stand-in for usage_windows with the same compare-and-set contract
// as the Supabase store.
const GUARDED = [
  "window_started_at",
  "clean_exports_used",
  "day_window_started_at",
  "day_exports_used",
  "watermarked_exports_used",
  "blocked_exports_count",
];

function createMemoryStore({ failNextUpdates = 0, insertRaceRow = null } = {}) {
  const rows = new Map();
  let failures = failNextUpdates;
  let raceRow = insertRaceRow;
  let counter = 0;
  const key = (identity) => identity.userId ?? identity.anonymousId;

  return {
    rows,
    async read(identity) {
      const row = rows.get(key(identity));
      return row ? { ...row } : null;
    },
    async insert(identity, values) {
      if (raceRow) {
        rows.set(key(identity), { id: `race-${(counter += 1)}`, ...raceRow });
        raceRow = null;
        return null;
      }
      const row = { id: `row-${(counter += 1)}`, ...values };
      rows.set(key(identity), row);
      return { ...row };
    },
    async update(row, values) {
      const current = [...rows.entries()].find(([, value]) => value.id === row.id);
      if (!current) return null;
      const [identityKey, stored] = current;
      if (failures > 0) {
        failures -= 1;
        // Another request changed the row first.
        rows.set(identityKey, {
          ...stored,
          clean_exports_used: stored.clean_exports_used + 1,
          day_exports_used: stored.day_exports_used + 1,
        });
        return null;
      }
      if (!GUARDED.every((column) => stored[column] === row[column])) return null;
      const next = { ...stored, ...values };
      rows.set(identityKey, next);
      return { ...next };
    },
  };
}

const exportAt = (store, identity, allowance, now, requestedKind = "clean") =>
  consumeExport({ store, identity, requestedKind, toolKey: "merge", allowance, now });

const guestExportAt = (store, guest, network, now, requestedKind = "clean") =>
  consumeGuestExport({
    store,
    guest,
    network,
    requestedKind,
    toolKey: "merge",
    allowance: GUEST_EXPORT_ALLOWANCE,
    now,
  });

// Guest: 5 exports, a 5-hour break, then only 3 more fit in the 24-hour total of 8.
const guest = { userId: null, anonymousId: "anon_guest-1" };
const guestStore = createMemoryStore();
for (let index = 0; index < 5; index += 1) {
  const result = await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + index * MINUTE);
  assert.equal(result.allowed, true, `guest export ${index + 1} is allowed`);
  assert.equal(result.status.burst.remaining, 4 - index);
  assert.equal(result.status.daily.remaining, 7 - index);
}
const burstBlocked = await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 10 * MINUTE);
assert.equal(burstBlocked.allowed, false);
assert.equal(burstBlocked.exportKind, "blocked");
assert.equal(burstBlocked.status.blockedBy, "burst");
assert.equal(
  burstBlocked.status.nextExportAt,
  iso(START + 5 * HOUR),
  "the break ends 5 hours after the first export of the burst, not after the last",
);
assert.equal(guestStore.rows.get("anon_guest-1").clean_exports_used, 5, "a blocked attempt is not counted");
assert.equal(guestStore.rows.get("anon_guest-1").blocked_exports_count, 1);

assert.equal((await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 5 * HOUR - MINUTE)).allowed, false);
for (let index = 0; index < 3; index += 1) {
  const result = await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 5 * HOUR + index * MINUTE);
  assert.equal(result.allowed, true, `export ${6 + index} after the break is allowed`);
  assert.equal(result.status.burst.windowStartedAt, iso(START + 5 * HOUR), "a new burst opens after the break");
}
const dailyBlocked = await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 6 * HOUR);
assert.equal(dailyBlocked.allowed, false, "the 9th export is over the guest total of 8");
assert.equal(dailyBlocked.status.burst.remaining, 2, "the burst still has room; the 24-hour total is what blocks");
assert.equal(dailyBlocked.status.blockedBy, "daily");
assert.equal(dailyBlocked.status.nextExportAt, iso(START + 24 * HOUR));

assert.equal((await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 24 * HOUR - MINUTE)).allowed, false);
const nextDay = await exportAt(guestStore, guest, GUEST_EXPORT_ALLOWANCE, START + 24 * HOUR);
assert.equal(nextDay.allowed, true);
assert.equal(nextDay.status.daily.used, 1, "a new 24-hour window starts with the first export after it");
assert.equal(nextDay.status.daily.resetsAt, iso(START + 48 * HOUR));
assert.equal(guestStore.rows.get("anon_guest-1").blocked_exports_count, 4, "lifetime counters survive the reset");

// Account: same burst, 15 per 24 hours.
const account = { userId: "user-1", anonymousId: null };
const accountStore = createMemoryStore();
for (const burstStart of [0, 5, 10]) {
  for (let index = 0; index < 5; index += 1) {
    const result = await exportAt(
      accountStore,
      account,
      ACCOUNT_EXPORT_ALLOWANCE,
      START + burstStart * HOUR + index * MINUTE,
    );
    assert.equal(result.allowed, true, `account export ${burstStart + index + 1} (burst at ${burstStart}h)`);
  }
}
const accountBlocked = await exportAt(accountStore, account, ACCOUNT_EXPORT_ALLOWANCE, START + 11 * HOUR);
assert.equal(accountBlocked.allowed, false);
assert.equal(accountBlocked.status.blockedBy, "daily", "when both are used up the daily limit is reported");
assert.equal(
  accountBlocked.status.nextExportAt,
  iso(START + 24 * HOUR),
  "the next export waits for the later of the two limits",
);
assert.equal((await exportAt(accountStore, account, ACCOUNT_EXPORT_ALLOWANCE, START + 24 * HOUR)).allowed, true);

// An account is not blocked by the guest total of 8.
const accountNinth = createMemoryStore();
for (let index = 0; index < 5; index += 1) {
  await exportAt(accountNinth, account, ACCOUNT_EXPORT_ALLOWANCE, START + index * MINUTE);
}
for (let index = 0; index < 4; index += 1) {
  assert.equal((await exportAt(accountNinth, account, ACCOUNT_EXPORT_ALLOWANCE, START + 5 * HOUR + index * MINUTE)).allowed, true);
}

// An admin override of the daily total applies, and 0 turns exports off.
const overridden = { burst: EXPORT_BURST, daily: { limit: 5, windowHours: 24 } };
const overrideStore = createMemoryStore();
for (let index = 0; index < 5; index += 1) {
  await exportAt(overrideStore, account, overridden, START + index * MINUTE);
}
const bothUsed = await exportAt(overrideStore, account, overridden, START + 10 * MINUTE);
assert.equal(bothUsed.status.blockedBy, "daily");
assert.equal(bothUsed.status.nextExportAt, iso(START + 24 * HOUR));
const off = await exportAt(
  createMemoryStore(),
  { userId: "user-zero", anonymousId: null },
  { burst: EXPORT_BURST, daily: { limit: 0, windowHours: 24 } },
  START,
);
assert.equal(off.allowed, false);

// Identities do not share a window.
const otherGuest = await exportAt(guestStore, { userId: null, anonymousId: "anon_guest-2" }, GUEST_EXPORT_ALLOWANCE, START + 10 * MINUTE);
assert.equal(otherGuest.allowed, true);
assert.equal(otherGuest.status.daily.used, 1);

// Watermarked exports never use the allowance.
const watermarked = await exportAt(createMemoryStore(), guest, GUEST_EXPORT_ALLOWANCE, START, "watermarked");
assert.equal(watermarked.allowed, true);
assert.equal(watermarked.status.daily.used, 0);
assert.equal(watermarked.status.burst.used, 0);

// Parallel requests cannot slip past the limit: a lost compare-and-set is retried.
const racingStore = createMemoryStore({ failNextUpdates: 2 });
const racer = { userId: null, anonymousId: "anon_racer" };
await exportAt(racingStore, racer, GUEST_EXPORT_ALLOWANCE, START);
const raced = await exportAt(racingStore, racer, GUEST_EXPORT_ALLOWANCE, START + MINUTE);
assert.equal(raced.allowed, true);
assert.equal(racingStore.rows.get("anon_racer").clean_exports_used, 4, "two lost races each added one export, plus this one");
assert.equal(racingStore.rows.get("anon_racer").day_exports_used, 4);

const insertRace = createMemoryStore({
  insertRaceRow: {
    window_started_at: iso(START),
    clean_exports_used: 5,
    day_window_started_at: iso(START),
    day_exports_used: 5,
    watermarked_exports_used: 0,
    blocked_exports_count: 0,
    last_tool_key: "merge",
    last_export_at: iso(START),
  },
});
const lostInsert = await exportAt(insertRace, { userId: null, anonymousId: "anon_new" }, GUEST_EXPORT_ALLOWANCE, START + MINUTE);
assert.equal(lostInsert.allowed, false, "a request that lost the insert race sees the full window");

// Clearing browser data does not reset the allowance: everyone without an
// account behind one network address shares a ceiling of 3x one visitor.
const network = { userId: null, anonymousId: "ip_test-network" };
const sharedStore = createMemoryStore();
for (const name of ["a", "b", "c"]) {
  const visitor = { userId: null, anonymousId: `anon_visitor-${name}` };
  for (let index = 0; index < 5; index += 1) {
    const result = await guestExportAt(sharedStore, visitor, network, START + index * MINUTE);
    assert.equal(result.allowed, true, `visitor ${name} export ${index + 1}`);
  }
}
assert.equal(sharedStore.rows.get("ip_test-network").clean_exports_used, 15);
const fresh = { userId: null, anonymousId: "anon_visitor-d" };
const stopped = await guestExportAt(sharedStore, fresh, network, START + 10 * MINUTE);
assert.equal(stopped.allowed, false, "a brand new anonymous id on the same network is stopped");
assert.equal(stopped.exportKind, "blocked");
assert.equal(stopped.status.blockedBy, "network");
assert.equal(stopped.status.nextExportAt, iso(START + 5 * HOUR));
assert.equal(sharedStore.rows.get("anon_visitor-d"), undefined, "the new id is not charged for a refused export");
assert.equal(sharedStore.rows.get("ip_test-network").blocked_exports_count, 1);
assert.equal(
  (await readGuestExportAllowance({ store: sharedStore, guest: fresh, network, allowance: GUEST_EXPORT_ALLOWANCE, now: START + 10 * MINUTE })).status.blockedBy,
  "network",
  "the status shown to the visitor reflects the network ceiling too",
);
assert.equal(
  (await guestExportAt(sharedStore, fresh, network, START + 5 * HOUR)).allowed,
  true,
  "the network ceiling lifts when its break ends",
);

// A visitor's own limit is checked first and the network is not charged for a refusal.
const ownFirst = createMemoryStore();
const ownGuest = { userId: null, anonymousId: "anon_own" };
const ownNetwork = { userId: null, anonymousId: "ip_own-network" };
for (let index = 0; index < 5; index += 1) {
  await guestExportAt(ownFirst, ownGuest, ownNetwork, START + index * MINUTE);
}
const ownBlocked = await guestExportAt(ownFirst, ownGuest, ownNetwork, START + 10 * MINUTE);
assert.equal(ownBlocked.status.blockedBy, "burst");
assert.equal(ownFirst.rows.get("ip_own-network").clean_exports_used, 5, "a refused export is not counted against the network");

// Without a network identity only the visitor's own allowance applies.
const noNetwork = createMemoryStore();
for (let index = 0; index < 5; index += 1) {
  assert.equal((await guestExportAt(noNetwork, ownGuest, null, START + index * MINUTE)).allowed, true);
}
assert.equal((await guestExportAt(noNetwork, ownGuest, null, START + 6 * MINUTE)).allowed, false);

// Window maths.
const open = evaluateExportWindow({
  now: START + HOUR,
  state: { windowStartedAt: iso(START), used: 3 },
  limit: 5,
  windowHours: 5,
});
assert.equal(open.remaining, 2);
assert.equal(open.canExport, true);
const expired = evaluateExportWindow({
  now: START + 5 * HOUR,
  state: { windowStartedAt: iso(START), used: 5 },
  limit: 5,
  windowHours: 5,
});
assert.equal(expired.used, 0);
assert.equal(expired.resetsAt, null);
const fresher = evaluateExportAllowance({
  now: START,
  state: { burst: null, daily: null },
  allowance: GUEST_EXPORT_ALLOWANCE,
});
assert.equal(fresher.canExport, true);
assert.equal(fresher.blockedBy, null);
assert.equal(fresher.daily.remaining, 8);
assert.equal(fresher.burst.remaining, 5);

assert.equal(formatCooldown(iso(START + 135 * MINUTE), START), "2 h 15 min");
assert.equal(formatCooldown(iso(START + 45 * MINUTE), START), "45 min");
assert.equal(formatCooldown(iso(START + 2 * HOUR), START), "2 h");
assert.equal(formatCooldown(iso(START + 20_000), START), "1 min");
assert.equal(formatCooldown(iso(START - 1000), START), "under a minute");
assert.equal(formatCooldown(null, START), null);

// Network identity: a keyed hash, stable, and never the address itself.
const requestFrom = (headers) => new Request("https://pdfmantra.test/api", { headers });
assert.equal(normalizeClientAddress("203.0.113.9"), "203.0.113.9");
assert.equal(normalizeClientAddress("999.1.1.1"), null);
assert.equal(normalizeClientAddress("not an ip"), null);
assert.equal(normalizeClientAddress("::ffff:203.0.113.9"), "203.0.113.9");
assert.equal(
  normalizeClientAddress("2001:db8:abcd:12::1"),
  normalizeClientAddress("2001:db8:abcd:12:ffff:ffff:ffff:2"),
  "addresses inside one IPv6 /64 count as one network",
);
assert.notEqual(
  normalizeClientAddress("2001:db8:abcd:12::1"),
  normalizeClientAddress("2001:db8:abcd:13::1"),
);
assert.equal(getRequestClientAddress(requestFrom({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" })), "203.0.113.9");
assert.equal(
  getRequestClientAddress(requestFrom({ "x-forwarded-for": "garbage", "x-real-ip": "198.51.100.4" })),
  "198.51.100.4",
);
assert.equal(getRequestClientAddress(requestFrom({})), null);

const secret = "test-secret";
const idA = getNetworkIdentity(requestFrom({ "x-forwarded-for": "203.0.113.9" }), secret);
assert.match(idA, /^ip_[0-9a-f]{40}$/);
assert.equal(idA, getNetworkIdentity(requestFrom({ "x-forwarded-for": "203.0.113.9, 10.1.1.1" }), secret));
assert.notEqual(idA, getNetworkIdentity(requestFrom({ "x-forwarded-for": "203.0.113.10" }), secret));
assert.notEqual(idA, getNetworkIdentity(requestFrom({ "x-forwarded-for": "203.0.113.9" }), "other-secret"));
assert.ok(!idA.includes("203"), "the address is not recoverable from the id");
assert.equal(getNetworkIdentity(requestFrom({ "x-forwarded-for": "203.0.113.9" }), null), null, "no secret, no id");
assert.equal(getNetworkIdentity(requestFrom({}), secret), null, "no address, no id");

// What people read when they are blocked.
const base = {
  planLabel: "Free",
  allowed: false,
  exportKind: "blocked",
  tier: "free",
  identityType: "user",
  cleanExportLimit: 15,
  exportWindowHours: 24,
  cleanExportsUsed: 15,
  cleanExportsRemaining: 0,
  windowResetsAt: iso(START + 24 * HOUR),
  burstLimit: 5,
  burstWindowHours: 5,
  burstRemaining: 0,
  burstResetsAt: iso(START + 5 * HOUR),
  blockedBy: "burst",
  nextExportAt: iso(START + 5 * HOUR),
  watermarkedExportsUsed: 0,
  blockedExportsCount: 1,
  canExportClean: false,
  isUnlimited: false,
};
const guestBase = { ...base, identityType: "guest", tier: "guest", planLabel: "Guest", cleanExportLimit: 8 };

assert.equal(
  getExportDenialMessage({ ...guestBase, nextExportAt: iso(START + 135 * MINUTE) }, START),
  "You have used 5 exports in a row, so there is a 5-hour break. You can export again in 2 h 15 min. Sign up free to get 15 exports every 24 hours.",
);
assert.equal(
  getExportDenialMessage({ ...base, nextExportAt: iso(START + 3 * HOUR) }, START),
  "You have used 5 exports in a row, so there is a 5-hour break. You can export again in 3 h.",
);
assert.equal(
  getExportDenialMessage({ ...guestBase, blockedBy: "daily", nextExportAt: iso(START + 21 * HOUR) }, START),
  "You have used all 8 free exports for 24 hours. You can export again in 21 h. Sign up free to get 15 exports every 24 hours.",
);
assert.equal(
  getExportDenialMessage({ ...base, blockedBy: "daily", nextExportAt: iso(START + 10 * HOUR) }, START),
  "You have used all 15 exports for 24 hours. You can export again in 10 h.",
);
assert.equal(
  getExportDenialMessage({ ...guestBase, blockedBy: "network", nextExportAt: iso(START + HOUR) }, START),
  "Too many exports have been made from your network. Try again in 1 h, or sign in to keep going.",
);
assert.match(getExportDenialMessage({ ...base, cleanExportLimit: 0 }), /turned off/);
assert.equal(getExportDenialMessage({ ...base, error: "Unable to record usage right now." }), "Unable to record usage right now.");
assert.equal(getExportDenialMessage({ ...base, blockedBy: null, nextExportAt: null }), "Export limit reached. Try again later.");

console.log(
  JSON.stringify({
    guestAllowance: "5 per 5 hours, 8 per 24 hours",
    accountAllowance: "5 per 5 hours, 15 per 24 hours",
    breakEndsFromFirstExport: "passed",
    dailyTotalBlocksAfterBreak: "passed",
    laterOfTwoLimitsWins: "passed",
    blockedAttemptsNotCounted: "passed",
    identitiesIsolated: "passed",
    parallelRequestsRetried: "passed",
    networkCeilingStopsNewIds: "passed",
    networkIdentityHashed: "passed",
    denialMessages: "passed",
  }),
);
