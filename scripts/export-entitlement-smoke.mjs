import assert from "node:assert/strict";

import { prepareEntitledExport } from "../src/lib/export-entitlement.ts";

function entitlement(overrides = {}) {
  return {
    identityType: "guest",
    tier: "guest",
    dailyCleanExportLimit: 1,
    cleanExportsUsed: 0,
    cleanExportsRemaining: 1,
    watermarkedExportsUsed: 0,
    blockedExportsCount: 0,
    canExportClean: true,
    isUnlimited: false,
    planLabel: "Guest",
    allowed: true,
    exportKind: "clean",
    ...overrides,
  };
}

let allowedCalls = 0;
const allowed = await prepareEntitledExport({
  toolKey: "fill-sign",
  prepare: async () => "prepared-output",
  recordExport: async ({ toolKey, exportKind }) => {
    allowedCalls += 1;
    assert.equal(toolKey, "fill-sign");
    assert.equal(exportKind, "clean");
    return entitlement();
  },
});
assert.equal(allowed.allowed, true);
assert.equal(allowed.output, "prepared-output");
assert.equal(allowedCalls, 1);

let deniedCalls = 0;
const denied = await prepareEntitledExport({
  toolKey: "annotate",
  prepare: async () => "discarded-output",
  recordExport: async () => {
    deniedCalls += 1;
    return entitlement({
      allowed: false,
      cleanExportsUsed: 1,
      cleanExportsRemaining: 0,
      canExportClean: false,
      exportKind: "blocked",
    });
  },
});
assert.equal(denied.allowed, false);
assert.equal(denied.output, null);
assert.match(denied.message, /limit reached/i);
assert.equal(deniedCalls, 1);

let failedCalls = 0;
await assert.rejects(
  prepareEntitledExport({
    toolKey: "highlight",
    prepare: async () => {
      throw new Error("export failed");
    },
    recordExport: async () => {
      failedCalls += 1;
      return entitlement();
    },
  }),
  /export failed/,
);
assert.equal(failedCalls, 0);

console.log(
  JSON.stringify({
    allowedExport: "passed",
    deniedExport: "passed",
    failedExportNotCounted: "passed",
  }),
);
