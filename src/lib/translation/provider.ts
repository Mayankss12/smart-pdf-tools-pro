export type TranslationProviderRequest = {
  readonly text: string;
  readonly sourceLanguage?: string;
  readonly targetLanguage: string;
};

export type TranslationProviderResult = {
  readonly translatedText: string;
  readonly provider: string;
};

type TranslationProviderConfig = {
  readonly endpoint: string;
  readonly apiKey: string;
};

function getTranslationProviderConfig(): TranslationProviderConfig | null {
  const endpoint = process.env.TRANSLATION_API_URL?.trim();
  const apiKey = process.env.TRANSLATION_API_KEY?.trim();

  if (!endpoint || !apiKey) return null;

  return { endpoint, apiKey };
}

export function isTranslationProviderConfigured() {
  return Boolean(getTranslationProviderConfig());
}

export function isTranslationProviderCapabilityConfigured() {
  return (
    isTranslationProviderConfigured() &&
    Boolean(
      (
        process.env.TRANSLATION_RATE_LIMIT_URL ??
        process.env.UPSTASH_REDIS_REST_URL
      )?.trim(),
    ) &&
    Boolean(
      (
        process.env.TRANSLATION_RATE_LIMIT_TOKEN ??
        process.env.UPSTASH_REDIS_REST_TOKEN
      )?.trim(),
    )
  );
}

function readTranslatedText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const translatedText = Reflect.get(payload, "translatedText");
  return typeof translatedText === "string" && translatedText.trim()
    ? translatedText
    : null;
}

export async function translateWithConfiguredProvider(
  request: TranslationProviderRequest,
  signal?: AbortSignal,
): Promise<TranslationProviderResult> {
  const config = getTranslationProviderConfig();

  if (!config) {
    throw new Error("Translation backend configuration is required.");
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Translation provider returned HTTP ${response.status}.`);
  }

  const translatedText = readTranslatedText(await response.json());

  if (!translatedText) {
    throw new Error("Translation provider returned an invalid response.");
  }

  return {
    translatedText,
    provider: new URL(config.endpoint).hostname,
  };
}
