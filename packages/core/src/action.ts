export class DomainError extends Error {}

export type PgError = { message: string; code?: string };
export const isPgError = (e: unknown): e is PgError => typeof e === "object" && e !== null && "message" in e && "code" in e;

export function unwrap<T>(res: { data: T; error: PgError | null }): NonNullable<T> {
  if (res.error) throw res.error;
  if (res.data == null) throw new Error("Expected data, got null");
  return res.data as NonNullable<T>;
}

export function check(res: { error: PgError | null }): void {
  if (res.error) throw res.error;
}
