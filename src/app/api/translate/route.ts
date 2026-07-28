import { NextResponse } from "next/server";

import {
  isTranslationProviderConfigured,
  translateWithConfiguredProvider,
} from "@/lib/translation/provider";

const MAX_TEXT_LENGTH = 20_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 12;
const PROVIDER_TIMEOUT_MS = 20_000;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimits = new Map<string, RateLimitEntry>();

function readString(payload: object, key: string) {
  const value = Reflect.get(payload, key);
  return typeof value === "string" ? value.trim() : "";
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function getClientKey(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "local"
  );
}

function isRateLimited(request: Request) {
  const now = Date.now();
  const key = getClientKey(request);
  const current = rateLimits.get(key);

  if (!current || current.resetAt <= now) {
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_REQUESTS;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  if (isRateLimited(request)) {
    return NextResponse.json(
      { error: "Too many translation requests. Please retry in a minute." },
      { status: 429 },
    );
  }

  if (!isTranslationProviderConfigured()) {
    return NextResponse.json(
      {
        error: "Translation backend configuration required.",
        requiredEnvironment: [
          "TRANSLATION_API_URL",
          "TRANSLATION_API_KEY",
        ],
      },
      { status: 503 },
    );
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = readString(payload, "text");
  const targetLanguage = readString(payload, "targetLanguage");
  const sourceLanguage = readString(payload, "sourceLanguage") || undefined;

  if (!text || !targetLanguage) {
    return NextResponse.json(
      { error: "text and targetLanguage are required." },
      { status: 400 },
    );
  }

  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: `Translation text must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.` },
      { status: 413 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  const abortProvider = () => controller.abort();
  request.signal.addEventListener("abort", abortProvider, { once: true });

  try {
    return NextResponse.json(
      await translateWithConfiguredProvider({
        text,
        sourceLanguage,
        targetLanguage,
      }, controller.signal),
    );
  } catch (error) {
    const timedOut =
      controller.signal.aborted && !request.signal.aborted;
    return NextResponse.json(
      {
        error:
          timedOut
            ? "Translation provider timed out."
            : error instanceof Error
            ? error.message
            : "Translation provider failed.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortProvider);
  }
}
