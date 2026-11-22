import { hc } from "hono/client";
import type { AppType } from "@noodle/api";
import { API_URL } from "@/lib/config";
import { accessToken, signOut } from "@/lib/session";

/** fetch with the staff member's Bearer token; a 401 signs out. */
async function authedFetch(input: RequestInfo | URL, init?: RequestInit) {
  const token = await accessToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401) signOut();
  return res;
}

/** Typed client for the Hono API. */
export const api = hc<AppType>(API_URL, { fetch: authedFetch }).api.v1;

/** RN file part for FormData: React Native uploads a local file from its uri. */
export const filePart = (uri: string, name: string) => ({ uri, name, type: "image/jpeg" }) as unknown as Blob;

/** Multipart write (photos, product images): the typed client cannot send RN file parts. */
export const upload = (url: URL, method: "POST" | "PATCH", body: FormData) => authedFetch(url.toString(), { method, body });

/** Absolute URL for a /files/... path stored in the database (product images, delivery photos). */
export const fileUri = (path: string) => (path.startsWith("http") ? path : `${API_URL}${path}`);

export class ApiError extends Error {}

type Body<R> = R extends { json(): Promise<infer T> } ? T : never;

/** Unwraps an API response: the JSON body, or an ApiError carrying the API's Vietnamese message (so `{ error }` bodies never reach the caller). */
export async function json<R extends { ok: boolean; json(): Promise<unknown> }>(res: Promise<R>): Promise<Exclude<Body<R>, { error: string }>> {
  let r;
  try {
    r = await res;
  } catch {
    throw new ApiError("Không kết nối được máy chủ, vui lòng thử lại");
  }
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError((body as { error?: string }).error ?? "Có lỗi xảy ra, vui lòng thử lại");
  return body as Exclude<Body<R>, { error: string }>;
}
