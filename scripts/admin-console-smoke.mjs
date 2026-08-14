import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [overviewSource, usersSource, pageSource] = await Promise.all([
  readFile(
    new URL("../src/app/api/admin/overview/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/api/admin/users/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/app/admin/page.tsx", import.meta.url), "utf8"),
]);

for (const source of [overviewSource, usersSource]) {
  assert.match(source, /createSupabaseServerClient\(\)/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /createAdminClient\(\)/);
  assert.match(source, /tier.*!== "admin"/s);
  assert.doesNotMatch(source, /SUPABASE_SECRET_KEY/);
}

assert.match(overviewSource, /isSameOriginRequest\(request\)/);
assert.match(overviewSource, /getBackendCapabilityReport\(\)/);
assert.match(overviewSource, /getConversionAdminControls\(\)/);
assert.match(overviewSource, /from\("usage_daily"\)/);
assert.match(overviewSource, /from\("subscriptions"\)/);
assert.match(overviewSource, /from\("processing_jobs"\)/);
assert.match(overviewSource, /from\("tool_runs"\)/);

assert.match(usersSource, /isSameSiteStateChangingRequest\(request\)/);
assert.match(usersSource, /normalizeLimit\(body\.dailyExportLimit\)/);
assert.match(usersSource, /Your own administrator tier or expiry cannot be changed here/);
assert.match(usersSource, /getDailyCleanExportLimit\(tier\)/);
assert.match(usersSource, /beginAdminProfileAudit\(admin,/);
assert.match(usersSource, /completeAdminProfileAudit\(admin,/);
assert.match(usersSource, /Administrator audit log is unavailable\. No change was applied\./);
assert.doesNotMatch(usersSource, /PDFMantra admin profile update/);

assert.match(pageSource, /fetch\("\/api\/admin\/overview"/);
assert.match(pageSource, /fetch\("\/api\/admin\/users"/);
assert.match(pageSource, /method: "POST"/);
assert.match(pageSource, /Administrator control plane/);
assert.match(pageSource, /Users & entitlements/);
assert.match(pageSource, /Conversion control registry/);
assert.match(pageSource, /Your own admin tier is protected/);

console.log(
  JSON.stringify({
    adminServerAuthorization: "passed",
    adminSameOriginReadGuard: "passed",
    adminSameSiteMutationGuard: "passed",
    adminSelfLockoutProtection: "passed",
    adminEntitlementManagement: "passed",
    adminDurableAuditLogging: "passed",
    adminOperationsVisibility: "passed",
    adminConversionVisibility: "passed",
    adminSecretIsolation: "passed",
  }),
);
