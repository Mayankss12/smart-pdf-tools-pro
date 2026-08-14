import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminIdentity = {
  readonly userId: string;
  readonly email: string | null;
};

export type AdminAccessResult =
  | { readonly allowed: true; readonly identity: AdminIdentity }
  | {
      readonly allowed: false;
      readonly status: 401 | 403 | 503;
      readonly message: string;
    };

export async function requireAdminIdentity(): Promise<AdminAccessResult> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return {
      allowed: false,
      status: 503,
      message: "Authentication service is not configured.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      allowed: false,
      status: 401,
      message: "Sign in with an administrator account.",
    };
  }

  try {
    const adminClient = createAdminClient();
    const { data: profile, error } = await adminClient
      .from("profiles")
      .select("tier, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const tierExpired =
      profile?.tier_expires_at &&
      new Date(profile.tier_expires_at).getTime() <= Date.now();

    if (profile?.tier !== "admin" || tierExpired) {
      return {
        allowed: false,
        status: 403,
        message: "Administrator access is required.",
      };
    }

    return {
      allowed: true,
      identity: {
        userId: user.id,
        email: user.email ?? null,
      },
    };
  } catch {
    return {
      allowed: false,
      status: 503,
      message: "Administrator verification is unavailable.",
    };
  }
}
