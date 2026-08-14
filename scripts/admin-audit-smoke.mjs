import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  ADMIN_PROFILE_UPDATE_TOOL_KEY,
  beginAdminProfileAudit,
  completeAdminProfileAudit,
} from "../src/lib/admin/audit.ts";

function createFakeAdmin({ failInsert = false } = {}) {
  const calls = [];
  const admin = {
    calls,
    from(table) {
      return {
        insert(payload) {
          calls.push({ operation: "insert", table, payload });
          return {
            select() {
              return {
                async single() {
                  return failInsert
                    ? { data: null, error: new Error("insert failed") }
                    : { data: { id: "audit-123" }, error: null };
                },
              };
            },
          };
        },
        update(payload) {
          calls.push({ operation: "update", table, payload });
          return {
            async eq(column, value) {
              calls.push({ operation: "eq", table, column, value });
              return { error: null };
            },
          };
        },
      };
    },
  };

  return admin;
}

const admin = createFakeAdmin();
const started = await beginAdminProfileAudit(admin, {
  actorUserId: "actor-1",
  targetUserId: "target-1",
  requestedChanges: {
    tier: "pro",
    daily_export_limit: 999999,
  },
  before: {
    tier: "free",
    tier_expires_at: null,
    daily_export_limit: 5,
  },
});

assert.equal(started.auditId, "audit-123");
const insert = admin.calls.find((call) => call.operation === "insert");
assert.ok(insert);
assert.equal(insert.table, "tool_runs");
assert.equal(insert.payload.tool_key, ADMIN_PROFILE_UPDATE_TOOL_KEY);
assert.equal(insert.payload.execution_mode, "backend");
assert.equal(insert.payload.status, "started");
assert.equal(insert.payload.owner_id, "actor-1");
assert.equal(insert.payload.input_summary.target_user_id, "target-1");
assert.equal(insert.payload.input_summary.requested_changes.tier, "pro");
assert.equal(insert.payload.input_summary.before.tier, "free");
assert.doesNotMatch(JSON.stringify(insert.payload), /SUPABASE_SECRET_KEY|password|otp/i);

await completeAdminProfileAudit(admin, {
  ...started,
  status: "completed",
  after: {
    tier: "pro",
    tier_expires_at: null,
    daily_export_limit: 999999,
  },
});

const update = admin.calls.find((call) => call.operation === "update");
assert.ok(update);
assert.equal(update.table, "tool_runs");
assert.equal(update.payload.status, "completed");
assert.equal(update.payload.result_summary.outcome, "completed");
assert.equal(update.payload.result_summary.after.tier, "pro");
assert.ok(Number.isInteger(update.payload.duration_ms));

const failedAdmin = createFakeAdmin({ failInsert: true });
await assert.rejects(
  () =>
    beginAdminProfileAudit(failedAdmin, {
      actorUserId: "actor-1",
      targetUserId: "target-1",
      requestedChanges: { tier: "pro" },
      before: { tier: "free" },
    }),
  /ADMIN_AUDIT_START_FAILED/,
);

const [usersRoute, auditRoute, auditPage, auditPolicyMigration] = await Promise.all([
  readFile(
    new URL("../src/app/api/admin/users/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(
    new URL("../src/app/api/admin/audit/route.ts", import.meta.url),
    "utf8",
  ),
  readFile(new URL("../src/app/admin/audit/page.tsx", import.meta.url), "utf8"),
  readFile(
    new URL(
      "../supabase/migrations/0005_admin_audit_immutability.sql",
      import.meta.url,
    ),
    "utf8",
  ),
]);

assert.match(usersRoute, /beginAdminProfileAudit\(admin,/);
assert.match(usersRoute, /Administrator audit log is unavailable\. No change was applied\./);
assert.match(usersRoute, /completeAdminProfileAudit\(admin,/);
assert.match(usersRoute, /status: "failed"/);
assert.match(usersRoute, /sameNullableDate/);
assert.match(usersRoute, /Object\.keys\(updates\)\.length === 0/);
const auditStartIndex = usersRoute.indexOf("auditContext = await beginAdminProfileAudit");
const mutationIndex = usersRoute.indexOf(".update(updates)");
assert.ok(
  auditStartIndex >= 0 && mutationIndex >= 0 && auditStartIndex < mutationIndex,
  "Audit record must be created before the profile update is executed.",
);
assert.match(auditRoute, /adminProfile\?\.tier !== "admin"/);
assert.match(auditRoute, /\.eq\("tool_key", ADMIN_PROFILE_UPDATE_TOOL_KEY\)/);
assert.match(auditRoute, /input_summary,result_summary/);
assert.match(auditPage, /Administrator audit trail/);
assert.match(auditPage, /Mutations fail closed when the audit record cannot be created/);
assert.match(auditPage, /Requested changes/);
assert.match(auditPage, /Before/);
assert.match(auditPage, /After \/ failure/);

assert.match(
  auditPolicyMigration,
  /drop policy if exists "tool_runs_owner_write" on public\.tool_runs/,
);
for (const operation of ["insert", "update", "delete"]) {
  assert.match(
    auditPolicyMigration,
    new RegExp(`create policy "tool_runs_owner_${operation}"[\\s\\S]*?tool_key <> 'admin\\.profile\\.update'`),
  );
}
assert.doesNotMatch(
  auditPolicyMigration,
  /create policy "tool_runs_owner_(?:insert|update|delete)"[\s\S]*?tool_key = 'admin\.profile\.update'/,
);

console.log(
  JSON.stringify({
    durableAdminAuditStart: "passed",
    failClosedAdminMutation: "passed",
    adminAuditCompletion: "passed",
    adminAuditFailureFinalization: "passed",
    actorTargetChangeCapture: "passed",
    adminAuditSecretIsolation: "passed",
    adminAuditReadAuthorization: "passed",
    adminAuditWorkspace: "passed",
    noOpAdminMutationProtection: "passed",
    adminAuditClientInsertBlocked: "passed",
    adminAuditClientUpdateBlocked: "passed",
    adminAuditClientDeleteBlocked: "passed",
  }),
);
