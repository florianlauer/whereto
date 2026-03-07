import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
}

/**
 * Admin Supabase client with service_role key.
 * Use for server-side operations that bypass RLS.
 */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Create a Supabase client scoped to a specific user's access token.
 * Used for per-user operations that respect RLS (Phase 2+).
 */
export function createSupabaseClient(supabaseAccessToken?: string) {
  return createClient<Database>(
    supabaseUrl!,
    process.env.SUPABASE_ANON_KEY ?? supabaseServiceRoleKey!,
    {
      global: {
        headers: supabaseAccessToken ? { Authorization: `Bearer ${supabaseAccessToken}` } : {},
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
