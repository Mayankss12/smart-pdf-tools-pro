export const OTP_LENGTH = 6;

export const GENERIC_VERIFICATION_ERROR = "Verification failed. Please try again.";
export const INCORRECT_OTP_ERROR =
  "The verification code is incorrect. Please check the code and try again.";
export const EXPIRED_OTP_ERROR =
  "This verification code has expired. Request a new code and try again.";
export const LOCKED_OTP_ERROR =
  "Too many attempts. Please wait a few minutes before trying again.";

export type OtpErrorLike = {
  code?: string;
  message?: string;
  status?: number;
};

export type OtpFlowUser = {
  id: string;
  email?: string | null;
};

export type OtpProviderResult = {
  session: unknown | null;
  user: OtpFlowUser | null;
  error: OtpErrorLike | null;
};

export type OtpProvider = {
  verify(input: { email: string; token: string }): Promise<OtpProviderResult>;
};

export type OtpAttemptGuard = {
  hasActiveLock(): Promise<boolean>;
  recordFailure(): Promise<boolean>;
  clear(): Promise<void>;
};

export type OtpFlowFailureReason =
  | "invalid-input"
  | "locked"
  | "incorrect"
  | "expired"
  | "provider"
  | "session";

export type OtpFlowResult =
  | {
      ok: true;
      email: string;
      session: unknown;
      user: OtpFlowUser;
    }
  | {
      ok: false;
      status: number;
      error: string;
      reason: OtpFlowFailureReason;
    };

export function normalizeAuthEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeOtpToken(value: string) {
  return value.replace(/\s+/g, "");
}

export function isValidOtpToken(value: string) {
  return /^\d{6}$/.test(value);
}

export function getSafeAuthRedirectPath(value: unknown): string {
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

function getErrorText(error: OtpErrorLike) {
  return `${error.code ?? ""} ${error.message ?? ""}`.trim().toLowerCase();
}

export function classifyOtpProviderError(error: OtpErrorLike): OtpFlowResult {
  const text = getErrorText(error);
  const code = error.code?.toLowerCase() ?? "";

  if (
    error.status === 429 ||
    code.includes("rate_limit") ||
    text.includes("too many requests") ||
    text.includes("rate limit")
  ) {
    return {
      ok: false,
      status: 429,
      error: LOCKED_OTP_ERROR,
      reason: "locked",
    };
  }

  if (code === "otp_expired" || code.includes("expired")) {
    return {
      ok: false,
      status: 400,
      error: EXPIRED_OTP_ERROR,
      reason: "expired",
    };
  }

  if (
    code.includes("invalid") ||
    text.includes("invalid otp") ||
    text.includes("invalid token") ||
    text.includes("incorrect")
  ) {
    return {
      ok: false,
      status: 400,
      error: INCORRECT_OTP_ERROR,
      reason: "incorrect",
    };
  }

  return {
    ok: false,
    status: error.status && error.status >= 500 ? 500 : 400,
    error: GENERIC_VERIFICATION_ERROR,
    reason: "provider",
  };
}

async function recordFailureBestEffort(guard: OtpAttemptGuard | null) {
  if (!guard) return false;

  try {
    return await guard.recordFailure();
  } catch {
    return false;
  }
}

async function clearAttemptsBestEffort(guard: OtpAttemptGuard | null) {
  if (!guard) return;

  try {
    await guard.clear();
  } catch {
    // Supabase has already established the authenticated session. Do not consume
    // a valid one-time code and then discard that session because an auxiliary
    // attempt-limit store is temporarily unavailable.
  }
}

export async function verifyOtpSessionFlow(
  input: { email: string; token: string },
  dependencies: {
    provider: OtpProvider;
    attemptGuard?: OtpAttemptGuard | null;
  },
): Promise<OtpFlowResult> {
  const email = normalizeAuthEmail(input.email);
  const token = normalizeOtpToken(input.token);

  if (!email || !email.includes("@") || !isValidOtpToken(token)) {
    return {
      ok: false,
      status: 400,
      error: GENERIC_VERIFICATION_ERROR,
      reason: "invalid-input",
    };
  }

  let attemptGuard = dependencies.attemptGuard ?? null;

  if (attemptGuard) {
    try {
      if (await attemptGuard.hasActiveLock()) {
        return {
          ok: false,
          status: 429,
          error: LOCKED_OTP_ERROR,
          reason: "locked",
        };
      }
    } catch {
      // The application-level limiter is defense in depth. Supabase Auth still
      // validates, expires, consumes, and rate-limits OTP verification requests.
      // A missing/stale auxiliary table must not reject every otherwise-valid OTP.
      attemptGuard = null;
    }
  }

  let verification: OtpProviderResult;

  try {
    verification = await dependencies.provider.verify({ email, token });
  } catch {
    return {
      ok: false,
      status: 500,
      error: GENERIC_VERIFICATION_ERROR,
      reason: "provider",
    };
  }

  if (verification.error) {
    const locked = await recordFailureBestEffort(attemptGuard);

    if (locked) {
      return {
        ok: false,
        status: 429,
        error: LOCKED_OTP_ERROR,
        reason: "locked",
      };
    }

    return classifyOtpProviderError(verification.error);
  }

  if (!verification.session || !verification.user) {
    const locked = await recordFailureBestEffort(attemptGuard);

    if (locked) {
      return {
        ok: false,
        status: 429,
        error: LOCKED_OTP_ERROR,
        reason: "locked",
      };
    }

    return {
      ok: false,
      status: 400,
      error: GENERIC_VERIFICATION_ERROR,
      reason: "session",
    };
  }

  const verifiedEmail = normalizeAuthEmail(verification.user.email ?? "");

  if (!verifiedEmail || verifiedEmail !== email) {
    const locked = await recordFailureBestEffort(attemptGuard);

    if (locked) {
      return {
        ok: false,
        status: 429,
        error: LOCKED_OTP_ERROR,
        reason: "locked",
      };
    }

    return {
      ok: false,
      status: 400,
      error: GENERIC_VERIFICATION_ERROR,
      reason: "session",
    };
  }

  await clearAttemptsBestEffort(attemptGuard);

  return {
    ok: true,
    email,
    session: verification.session,
    user: verification.user,
  };
}
