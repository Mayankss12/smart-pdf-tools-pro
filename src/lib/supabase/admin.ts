import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const privateKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !privateKey) {
    throw new Error("Supabase admin configuration is missing.");
  }

  return createClient(supabaseUrl, privateKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
