import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@noodle/core/env";

/** Session-only client: used for sign-in/out and reading the JWT. Never for data. */
export async function authClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl(), env.publishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}
