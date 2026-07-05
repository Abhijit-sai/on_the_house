import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/types/database";

export function createSupabaseBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Supabase public environment variables are not configured.");
  }

  return createClient<Database>(supabaseUrl, anonKey);
}
