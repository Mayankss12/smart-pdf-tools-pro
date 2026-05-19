export interface SupabasePublicBrowserConfig {
  readonly url: string;
  readonly publishableKey: string;
}

function cleanPublicValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function getSupabaseBrowserConfig(): SupabasePublicBrowserConfig | null {
  const url = cleanPublicValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey =
    cleanPublicValue(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ??
    cleanPublicValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !publishableKey) {
    return null;
  }

  return {
    url,
    publishableKey,
  };
}
