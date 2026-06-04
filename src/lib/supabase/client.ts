"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseBrowserConfig } from "@/lib/backend/public-env";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient(config.url, config.publishableKey);
  }

  return browserClient;
}

export function createSupabaseBrowserClient() {
  return createClient();
}
