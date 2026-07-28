import { NextResponse } from "next/server";

import { createNoStoreHeaders } from "@/lib/api-security";
import { normalizeTier, type UserTier } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class ConversionIdentityError extends Error {
  constructor() {
    super("Conversion identity services are unavailable.");
    this.name = "ConversionIdentityError";
  }
}

export async function getConversionApiIdentity(): Promise<{
  readonly ownerId: string;
  readonly tier: UserTier;
} | null> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createAdminClient();
    const { data: profile, error } = await admin
      .from("profiles")
      .select("tier, tier_expires_at")
      .eq("id", user.id)
      .maybeSingle();
    if (error) throw error;
    const expired =
      typeof profile?.tier_expires_at === "string" &&
      new Date(profile.tier_expires_at).getTime() <= Date.now();
    return {
      ownerId: user.id,
      tier: normalizeTier(expired ? "free" : profile?.tier),
    };
  } catch {
    throw new ConversionIdentityError();
  }
}

export async function getConversionApiOwner() {
  return (await getConversionApiIdentity())?.ownerId ?? null;
}

export function conversionApiError(
  request: Request,
  status: number,
  code: string,
  message: string,
) {
  return NextResponse.json(
    { ok: false, code, message },
    {
      status,
      headers: createNoStoreHeaders(request),
    },
  );
}

export function getProviderError(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      code: "PROVIDER_ERROR",
      message: "The conversion provider failed safely.",
    };
  }
  const [possibleCode] = error.message.split(":");
  const code = /^[A-Z][A-Z0-9_]+$/.test(possibleCode)
    ? possibleCode
    : "PROVIDER_ERROR";
  return {
    code,
    message:
      code === "PROVIDER_RATE_LIMIT"
        ? "The conversion service is busy. Try again later."
        : "The conversion service could not complete this request.",
  };
}
