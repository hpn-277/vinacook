import { Hono } from "hono";
import { FOLDER_ACCESS, type Folder } from "@noodle/core/files";
import { staffByAuthUser } from "@noodle/core/staff";
import { authUserId, type ApiEnv } from "../http";

/** Serves the R2 bucket at /files/<folder>/<path>: products/ is public, delivery/ needs a staff login. */
export const files = new Hono<ApiEnv>().get("/:folder/:path{.+}", async (c) => {
  const access = FOLDER_ACCESS[c.req.param("folder") as Folder];
  if (!access) return c.body(null, 404);
  if (access === "staff") {
    const id = await authUserId(c);
    if (!id || !(await staffByAuthUser(id))) return c.body(null, 404);
  }
  const object = await c.env.FILES.get(`${c.req.param("folder")}/${c.req.param("path")}`);
  if (!object) return c.body(null, 404);
  return c.body(object.body, 200, {
    "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream",
    ETag: object.httpEtag,
    // Keys are random UUIDs and never overwritten, so a cached copy never goes stale.
    "Cache-Control": access === "public" ? "public, max-age=31536000, immutable" : "private, max-age=3600",
  });
});
