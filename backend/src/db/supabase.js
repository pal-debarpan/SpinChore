import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin({ supabaseUrl, supabaseServiceRoleKey }) {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Supabase URL and service role key are required");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
