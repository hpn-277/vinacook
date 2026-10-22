import { z } from "zod";
import { DomainError } from "./action";
import { DISTRICTS } from "./domain/districts";

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
