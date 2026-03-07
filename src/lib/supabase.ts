import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}

/**
 * Client-side Supabase instance for browser usage.
 * Uses VITE_ prefixed env vars (public, safe for client).
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
