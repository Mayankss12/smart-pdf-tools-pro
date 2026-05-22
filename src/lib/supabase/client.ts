"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseBrowserConfig } from "@/lib/backend/public-env";

export function createClient() {
  const config = getSupabaseBrowserConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}
