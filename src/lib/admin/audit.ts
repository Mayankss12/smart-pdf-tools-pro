import type { SupabaseClient } from "@supabase/supabase-js";

export const ADMIN_PROFILE_UPDATE_TOOL_KEY = "admin.profile.update";

export type AdminAuditStart = {
  readonly actorUserId: string;
  readonly targetUserId: string;
  readonly requestedChanges: Record<string, string | number | null>;
  readonly before: Record<string, string | number | null>;
};

export type AdminAuditCompletion = {
  readonly auditId: string;
  readonly startedAtMs: number;
  readonly status: "completed" | "failed";
  readonly after?: Record<string, string | number | null>;
  readonly errorCode?: string;
};

export async function beginAdminProfileAudit(
  admin: SupabaseClient,
  input: AdminAuditStart,
) {
  const startedAtMs = Date.now();
  const { data, error } = await admin
    .from("tool_runs")
    .insert({
      owner_id: input.actorUserId,
      tool_key: ADMIN_PROFILE_UPDATE_TOOL_KEY,
      execution_mode: "backend",
      status: "started",
      input_summary: {
        action: "profile_entitlement_update",
        actor_user_id: input.actorUserId,
        target_user_id: input.targetUserId,
        requested_changes: input.requestedChanges,
        before: input.before,
      },
      result_summary: {},
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    throw new Error("ADMIN_AUDIT_START_FAILED");
  }

  return {
    auditId: String(data.id),
    startedAtMs,
  };
}

export async function completeAdminProfileAudit(
  admin: SupabaseClient,
  completion: AdminAuditCompletion,
) {
  const durationMs = Math.max(0, Date.now() - completion.startedAtMs);
  const resultSummary =
    completion.status === "completed"
      ? {
          outcome: "completed",
          after: completion.after ?? {},
        }
      : {
          outcome: "failed",
          error_code: completion.errorCode ?? "ADMIN_PROFILE_UPDATE_FAILED",
        };

  const { error } = await admin
    .from("tool_runs")
    .update({
      status: completion.status,
      result_summary: resultSummary,
      duration_ms: durationMs,
    })
    .eq("id", completion.auditId);

  if (error) {
    console.error("Administrator audit finalization failed", {
      auditId: completion.auditId,
      status: completion.status,
    });
  }
}
