import { NextResponse } from "next/server";

import {
  isTranslationProviderConfigured,
  translateWithConfiguredProvider,
} from "@/lib/translation/provider";

function readString(payload: object, key: string) {
  const value = Reflect.get(payload, key);
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
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

  try {
    return NextResponse.json(
      await translateWithConfiguredProvider({
        text,
        sourceLanguage,
        targetLanguage,
      }),
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Translation provider failed.",
      },
      { status: 502 },
    );
  }
}
