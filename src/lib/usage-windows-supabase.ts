import { createAdminClient } from "@/lib/supabase/admin";

import type {
  UsageWindowIdentity,
  UsageWindowRow,
  UsageWindowStore,
  UsageWindowValues,
} from "./usage-windows";

const COLUMNS =
  "id, window_started_at, clean_exports_used, day_window_started_at, day_exports_used, watermarked_exports_used, blocked_exports_count";
const UNIQUE_VIOLATION = "23505";

type AdminClient = ReturnType<typeof createAdminClient>;

function identityFilter(identity: UsageWindowIdentity) {
  return identity.userId
    ? ({ column: "user_id", value: identity.userId } as const)
    : ({ column: "anonymous_id", value: identity.anonymousId } as const);
}

export function createSupabaseUsageWindowStore(
  adminClient: AdminClient = createAdminClient(),
): UsageWindowStore {
  return {
    async read(identity) {
      const filter = identityFilter(identity);
      const { data, error } = await adminClient
        .from("usage_windows")
        .select(COLUMNS)
        .eq(filter.column, filter.value as string)
        .maybeSingle();

      if (error) throw error;
      return (data as UsageWindowRow | null) ?? null;
    },

    async insert(identity, values: UsageWindowValues) {
      const { data, error } = await adminClient
        .from("usage_windows")
        .insert({
          user_id: identity.userId,
          anonymous_id: identity.userId ? null : identity.anonymousId,
          ...values,
        })
        .select(COLUMNS)
        .single();

      if (error) {
        if (error.code === UNIQUE_VIOLATION) return null;
        throw error;
      }

      return data as UsageWindowRow;
    },

    async update(row, values) {
      const { data, error } = await adminClient
        .from("usage_windows")
        .update(values)
        .eq("id", row.id)
        .eq("window_started_at", row.window_started_at)
        .eq("clean_exports_used", row.clean_exports_used)
        .eq("day_window_started_at", row.day_window_started_at)
        .eq("day_exports_used", row.day_exports_used)
        .eq("watermarked_exports_used", row.watermarked_exports_used)
        .eq("blocked_exports_count", row.blocked_exports_count)
        .select(COLUMNS)
        .maybeSingle();

      if (error) throw error;
      return (data as UsageWindowRow | null) ?? null;
    },
  };
}
