import "server-only";
import { refresh } from "next/cache";
import { unstable_rethrow } from "next/navigation";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string } | null;

export class DomainError extends Error {}

type PgError = { message: string; code?: string };
const isPgError = (e: unknown): e is PgError => typeof e === "object" && e !== null && "message" in e && "code" in e;

/** Wraps a server action body: domain/DB errors become a form message, success refreshes the page. */
export async function run(body: () => Promise<string | void>): Promise<ActionResult> {
  try {
    const message = await body();
    refresh();
    return { ok: true, message: message ?? undefined };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof DomainError) return { ok: false, error: e.message };
    // P0001 = RAISE EXCEPTION from our SQL functions; their text is user-facing Vietnamese.
    if (isPgError(e) && e.code === "P0001") return { ok: false, error: e.message };
    console.error(e);
    return { ok: false, error: "Có lỗi xảy ra, vui lòng thử lại" };
  }
}

export function unwrap<T>(res: { data: T; error: PgError | null }): NonNullable<T> {
  if (res.error) throw res.error;
  if (res.data == null) throw new Error("Expected data, got null");
  return res.data as NonNullable<T>;
}

export function check(res: { error: PgError | null }): void {
  if (res.error) throw res.error;
}
