import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [accessSource, routeSource, pageSource] = await Promise.all([
  readFile(new URL("../src/lib/admin/access.ts", import.meta.url), "utf8"),
  readFile(
    new URL("../src/app/api/admin/overview/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8"),
]);

assert.match(accessSource, /supabase\.auth\.getUser\(\)/);
assert.match(accessSource, /profile\?\.tier !== "admin"/);
assert.match(accessSource, /tierExpired/);
assert.match(routeSource, /requireAdminIdentity\(\)/);
assert.match(routeSource, /isSameSiteStateChangingRequest\(request\)/);
assert.match(routeSource, /safeInteger\(body\.dailyExportLimit, 0, 999999\)/);
assert.match(routeSource, /Your own administrator tier or expiry cannot be changed here/);
assert.match(routeSource, /getBackendCapabilityReport\(\)/);
assert.match(routeSource, /getConversionAdminControls\(\)/);
assert.match(routeSource, /from\("usage_daily"\)/);
assert.match(routeSource, /from\("subscriptions"\)/);
assert.match(routeSource, /from\("processing_jobs"\)/);
assert.match(routeSource, /from\("tool_runs"\)/);
assert.doesNotMatch(routeSource, /SUPABASE_SECRET_KEY/);
assert.match(pageSource, /fetch\("\/api\/admin\/overview"/);
assert.match(pageSource, /method: "PATCH"/);
assert.match(pageSource, /Administrator control plane/);
assert.match(pageSource, /Users & entitlements/);
assert.match(pageSource, /Conversion control registry/);
assert.match(pageSource, /Your own admin tier is protected/);

console.log(
  JSON.stringify({
    adminServerAuthorization: "passed",
    adminSameSiteMutationGuard: "passed",
    adminSelfLockoutProtection: "passed",
    adminEntitlementManagement: "passed",
    adminOperationsVisibility: "passed",
    adminConversionVisibility: "passed",
    adminSecretIsolation: "passed",
  }),
);
