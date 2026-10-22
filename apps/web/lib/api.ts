import { hc } from "hono/client";
import type { AppType } from "@noodle/api";

/**
 * Typed client for the Hono API (apps/api), same origin: app/api forwards to the API worker.
 * The base must be absolute because `$url()` builds a URL object; only client components call this.
 */
export const api = hc<AppType>(globalThis.location?.origin ?? "http://localhost").api.v1;
