"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/backend/env";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();

  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.publishableKey);
}
