export class DomainError extends Error {}

export type PgError = { message: string; code?: string };

/** supabase-js hands back errors as plain objects; Hono only routes thrown Error instances to onError. */
export class PgFailure extends Error {
  constructor(readonly code: string | undefined, message: string) {
    super(message);
  }
}
export const pgFailure = (e: PgError) => new PgFailure(e.code, e.message);

export function unwrap<T>(res: { data: T; error: PgError | null }): NonNullable<T> {
  if (res.error) throw pgFailure(res.error);
  if (res.data == null) throw new Error("Expected data, got null");
  return res.data as NonNullable<T>;
}

export function check(res: { error: PgError | null }): void {
  if (res.error) throw pgFailure(res.error);
}
