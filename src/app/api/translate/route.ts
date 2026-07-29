import { NextResponse } from "next/server";

import { isSameSiteStateChangingRequest } from "@/lib/api-security";
import {
  ConversionIdentityError,
  getConversionApiIdentity,
} from "@/lib/conversions/api";
import { canUseToolByTier } from "@/lib/entitlements";
import {
  isTranslationProviderCapabilityConfigured,
  translateWithConfiguredProvider,
} from "@/lib/translation/provider";
import { consumeTranslationRateLimit } from "@/lib/translation/rate-limit";

const MAX_TEXT_LENGTH = 20_000;
const PROVIDER_TIMEOUT_MS = 20_000;

function readString(payload: object, key: string) {
  const value = Reflect.get(payload, key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!isSameSiteStateChangingRequest(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  let identity;
  try {
    identity = await getConversionApiIdentity();
  } catch (error) {
    if (error instanceof ConversionIdentityError) {
      return NextResponse.json(
        { error: "Translation access is temporarily unavailable." },
        { status: 503 },
      );
    }
    throw error;
  }
  if (!identity) {
    return NextResponse.json(
      { error: "Sign in to use translation." },
      { status: 401 },
    );
  }
  if (!canUseToolByTier({ tier: identity.tier, toolKey: "translate" })) {
    return NextResponse.json(
      { error: "Translation requires an eligible Pro or Admin plan." },
      { status: 403 },
    );
  }
  if (!isTranslationProviderCapabilityConfigured()) {
    return NextResponse.json(
      { error: "Translation is not configured." },
      { status: 503 },
    );
  }
  const rateLimit = await consumeTranslationRateLimit(identity.ownerId);
  if (rateLimit.unavailable) {
    return NextResponse.json(
      { error: "Translation access is temporarily unavailable." },
      { status: 503 },
    );
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many translation requests. Please retry in a minute." },
      { status: 429 },
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
            : "Translation provider failed safely.",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timeout);
    request.signal.removeEventListener("abort", abortProvider);
  }
}
