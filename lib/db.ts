import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { env } from "@/lib/env";

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];

/** Secret-key client: bypasses RLS, so every caller must pass requireRole() (or be a public customer flow) first. */
export function db() {
  return createClient<Database>(env.supabaseUrl(), env.secretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
