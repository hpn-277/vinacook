import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Hands a request to the Hono API worker (apps/api) over the API service binding, keeping it same-origin.
 * Request and Response are rebuilt because `next dev`'s binding proxy speaks miniflare's own fetch classes.
 */
export async function forwardToApi(req: Request): Promise<Response> {
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const res = await getCloudflareContext().env.API.fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: hasBody ? req.body : undefined,
    redirect: "manual",
    ...(hasBody && { duplex: "half" }),
  } as RequestInit);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: new Headers(res.headers) });
}
