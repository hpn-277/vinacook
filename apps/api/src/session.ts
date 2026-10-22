import { createServerClient } from "@supabase/ssr";
import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { env } from "@noodle/core/env";

/** Cookie-backed Supabase auth client for the web app's session: sign-in/out and reading the JWT. Never for data. */
export function sessionClient(c: Context) {
  return createServerClient(env.supabaseUrl(), env.publishableKey(), {
    cookies: {
      getAll: () => Object.entries(getCookie(c)).map(([name, value]) => ({ name, value })),
      setAll(cookiesToSet, headers) {
        for (const { name, value, options } of cookiesToSet) setCookie(c, name, value, { ...options, sameSite: options.sameSite === true ? "strict" : options.sameSite || undefined });
        for (const [key, value] of Object.entries(headers ?? {})) c.header(key, value);
      },
    },
  });
}
