import { createHash } from "node:crypto";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_REQUESTS = 12;
const RATE_LIMIT_TIMEOUT_MS = 3_000;

type RateLimitConfig = {
  readonly url: string;
  readonly token: string;
};

function getRateLimitConfig(): RateLimitConfig | null {
  const url = (
    process.env.TRANSLATION_RATE_LIMIT_URL ??
    process.env.UPSTASH_REDIS_REST_URL
  )?.trim();
  const token = (
    process.env.TRANSLATION_RATE_LIMIT_TOKEN ??
    process.env.UPSTASH_REDIS_REST_TOKEN
  )?.trim();
  return url && token ? { url: url.replace(/\/+$/, ""), token } : null;
}

export function isTranslationRateLimitConfigured() {
  return Boolean(getRateLimitConfig());
}

function parseIncrementResult(payload: unknown) {
  if (!Array.isArray(payload)) return null;
  const first = payload[0];
  if (!first || typeof first !== "object") return null;
  const result = Reflect.get(first, "result");
  return typeof result === "number" && Number.isFinite(result)
    ? result
    : null;
}

export async function consumeTranslationRateLimit(ownerId: string) {
  const config = getRateLimitConfig();
  if (!config) {
    return { allowed: false, unavailable: true } as const;
  }

  const identityHash = createHash("sha256")
    .update(ownerId)
    .digest("hex")
    .slice(0, 32);
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1_000));
  const key = `pdfmantra:translate:${identityHash}:${bucket}`;

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, RATE_LIMIT_WINDOW_SECONDS + 5, "NX"],
      ]),
      signal: AbortSignal.timeout(RATE_LIMIT_TIMEOUT_MS),
      cache: "no-store",
    });
    if (!response.ok) {
      return { allowed: false, unavailable: true } as const;
    }
    const count = parseIncrementResult(await response.json());
    if (count === null) {
      return { allowed: false, unavailable: true } as const;
    }
    return {
      allowed: count <= RATE_LIMIT_REQUESTS,
      unavailable: false,
    } as const;
  } catch {
    return { allowed: false, unavailable: true } as const;
  }
}
