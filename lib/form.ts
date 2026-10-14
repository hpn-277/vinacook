import "server-only";
import { z } from "zod";
import { DomainError } from "@/lib/action";
import { DISTRICTS } from "@/lib/domain/districts";

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): z.infer<S> {
  const result = schema.safeParse(Object.fromEntries(fd));
  if (!result.success) throw new DomainError(result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  return result.data;
}

export const id = z.coerce.number().int().positive();
export const phone = z
  .string()
  .transform((s) => s.replace(/[\s.-]/g, ""))
  .pipe(z.string().regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ"));
export const district = z.enum(DISTRICTS, { message: "Chọn quận/huyện" });
export const kg = z.coerce.number().min(0, "Số kg không hợp lệ").max(100000);

/** Collects inputs named `<prefix><id>` (e.g. qty_3=12.5) into [{id, qty}] with qty > 0 unless keepZero. */
export function collectNumbers(fd: FormData, prefix: string, keepZero = false): { id: number; value: number }[] {
  const out: { id: number; value: number }[] = [];
  for (const [key, raw] of fd.entries()) {
    if (!key.startsWith(prefix) || typeof raw !== "string" || raw.trim() === "") continue;
    const idPart = Number(key.slice(prefix.length));
    const value = Number(raw);
    if (!Number.isInteger(idPart) || !Number.isFinite(value) || value < 0) throw new DomainError("Số kg không hợp lệ");
    if (value > 0 || keepZero) out.push({ id: idPart, value });
  }
  return out;
}
