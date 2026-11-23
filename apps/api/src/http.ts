import { zValidator } from "@hono/zod-validator";
import { createMiddleware } from "hono/factory";
import type { Context, ValidationTargets } from "hono";
import type { z } from "zod";
import { staffByAuthUser, type Staff, type StaffRole } from "@noodle/core/staff";
import { db } from "@noodle/core/db";
import { sessionClient } from "./session";

/**
 * The slice of R2Bucket the API uses. Spelled out rather than the workers global so the web app,
 * which imports AppType and has no workers runtime types, can typecheck this source too.
 */
export type Bucket = {
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream; httpEtag: string; httpMetadata?: { contentType?: string } } | null>;
};

/** Worker bindings, see wrangler.jsonc. */
export type ApiEnv = { Bindings: { FILES: Bucket } };

/**
 * Validation failures answer 400 with the first issue's (Vietnamese) message, like every other error body,
 * plus `fields`: each invalid field's first message, keyed by dotted path ("phone", "destination.address").
 */
export const valid = <T extends keyof ValidationTargets, S extends z.ZodType>(target: T, schema: S) =>
  zValidator(target, schema, (result, c) => {
    if (result.success) return;
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join(".")] ??= issue.message;
    return c.json({ error: result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ", fields }, 400);
  });

/** Mobile sends `Authorization: Bearer <supabase access token>`; the web app rides on the Supabase session cookies. */
export async function authUserId(c: Context): Promise<string | null> {
  const bearer = /^Bearer (.+)$/i.exec(c.req.header("authorization") ?? "")?.[1];
  const { data } = bearer ? await db().auth.getClaims(bearer) : await sessionClient(c).auth.getClaims();
  return data?.claims?.sub ?? null;
}

export const role = <R extends StaffRole>(...roles: R[]) =>
  createMiddleware<{ Variables: { staff: Staff & { role: R } } }>(async (c, next) => {
    const id = await authUserId(c);
    const staff = id ? await staffByAuthUser(id) : null;
    if (!staff) return c.json({ error: "Vui lòng đăng nhập" }, 401);
    if (!(roles as StaffRole[]).includes(staff.role)) return c.json({ error: "Bạn không có quyền thực hiện thao tác này" }, 403);
    c.set("staff", staff as Staff & { role: R });
    await next();
  });
