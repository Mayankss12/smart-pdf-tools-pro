import { createHmac } from "node:crypto";

import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_SECONDS = 10 * 60;
const GENERIC_VERIFICATION_ERROR = "Verification failed. Please try again.";
const LOCKED_ERROR = "Too many attempts. Please wait a few minutes before trying again.";

type AttemptScope = "identifier" | "ip";

type AttemptKey = {
  scope: AttemptScope;
  keyHash: string;
};

type AttemptLimitRow = {
  scope: AttemptScope;
  key_hash: string;
  failed_attempts: number;
  locked_until: string | null;
};

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

function getAttemptHashSecret() {
  return (
    process.env.OTP_ATTEMPT_HASH_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    null
  );
}

function getSafeRedirectPath(value: unknown): string {
  const rawValue = typeof value === "string" ? value.trim() : "";

  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return "/dashboard";
  }

  const blockedPrefixes = ["/login", "/signup", "/logout", "/auth"];

  if (
    blockedPrefixes.some(
      (prefix) => rawValue === prefix || rawValue.startsWith(`${prefix}/`),
    )
  ) {
    return "/dashboard";
  }

  return rawValue;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: message,
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedIp = forwardedFor?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();

  return (forwardedIp || realIp || cloudflareIp || "unknown").slice(0, 96);
}

function hashAttemptKey(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function buildAttemptKeys(secret: string, email: string, request: NextRequest): AttemptKey[] {
  const normalizedEmail = email.trim().toLowerCase();
  const clientIp = getClientIp(request);

  return [
    {
      scope: "identifier",
      keyHash: hashAttemptKey(secret, `identifier:${normalizedEmail}`),
    },
    {
      scope: "ip",
      keyHash: hashAttemptKey(secret, `ip:${clientIp}`),
    },
  ];
}

function isFutureLock(row: Pick<AttemptLimitRow, "locked_until">) {
  return Boolean(row.locked_until && new Date(row.locked_until).getTime() > Date.now());
}

async function hasActiveLock(admin: ReturnType<typeof createAdminClient>, keys: AttemptKey[]) {
  const nowIso = new Date().toISOString();
  const hashes = keys.map((key) => key.keyHash);

  const { data, error } = await admin
    .from("otp_attempt_limits")
    .select("scope,key_hash,failed_attempts,locked_until")
    .in("key_hash", hashes)
    .gt("locked_until", nowIso)
    .limit(1);

  if (error) {
    throw error;
  }

  return Boolean(data?.length);
}

async function recordFailedAttempt(admin: ReturnType<typeof createAdminClient>, key: AttemptKey) {
  const { data, error } = await admin.rpc("record_otp_failed_attempt", {
    p_scope: key.scope,
    p_key_hash: key.keyHash,
    p_max_failed_attempts: MAX_FAILED_ATTEMPTS,
    p_lock_seconds: LOCK_SECONDS,
  });

  if (error) {
    throw error;
  }

  const rows = Array.isArray(data) ? (data as AttemptLimitRow[]) : [];
  return rows.some(isFutureLock);
}

async function recordFailedAttempts(admin: ReturnType<typeof createAdminClient>, keys: AttemptKey[]) {
  const results = await Promise.all(keys.map((key) => recordFailedAttempt(admin, key)));
  return results.some(Boolean);
}

async function clearAttempts(admin: ReturnType<typeof createAdminClient>, keys: AttemptKey[]) {
  const hashes = keys.map((key) => key.keyHash);
  const { error } = await admin.rpc("clear_otp_attempts", {
    p_key_hashes: hashes,
  });

  if (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const config = getSupabaseConfig();
  const attemptHashSecret = getAttemptHashSecret();

  if (!config || !attemptHashSecret) {
    return jsonError("Authentication service is not configured yet.", 500);
  }

  let body: {
    email?: unknown;
    token?: unknown;
    redirectTo?: unknown;
  };

  try {
    body = await request.json();
  } catch {
    return jsonError(GENERIC_VERIFICATION_ERROR, 400);
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const redirectTo = getSafeRedirectPath(body.redirectTo);

  if (!email || !email.includes("@") || !/^\d{6}$/.test(token)) {
    return jsonError(GENERIC_VERIFICATION_ERROR, 400);
  }

  const attemptKeys = buildAttemptKeys(attemptHashSecret, email, request);

  let admin: ReturnType<typeof createAdminClient>;

  try {
    admin = createAdminClient();
  } catch {
    return jsonError("Authentication service is not configured yet.", 500);
  }

  try {
    if (await hasActiveLock(admin, attemptKeys)) {
      return jsonError(LOCKED_ERROR, 429);
    }
  } catch {
    return jsonError(GENERIC_VERIFICATION_ERROR, 500);
  }

  const response = NextResponse.json(
    {
      success: true,
      redirectTo,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });

    if (error) {
      const locked = await recordFailedAttempts(admin, attemptKeys);
      return jsonError(locked ? LOCKED_ERROR : GENERIC_VERIFICATION_ERROR, locked ? 429 : 400);
    }

    if (!data.session || !data.user) {
      const locked = await recordFailedAttempts(admin, attemptKeys);
      return jsonError(locked ? LOCKED_ERROR : GENERIC_VERIFICATION_ERROR, locked ? 429 : 400);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const locked = await recordFailedAttempts(admin, attemptKeys);
      return jsonError(locked ? LOCKED_ERROR : GENERIC_VERIFICATION_ERROR, locked ? 429 : 400);
    }

    await clearAttempts(admin, attemptKeys);

    return response;
  } catch {
    return jsonError(GENERIC_VERIFICATION_ERROR, 500);
  }
}
