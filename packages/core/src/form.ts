import { z } from "zod";
import { DomainError } from "./action";
import { COUNTRIES, destinationError, type Destination } from "./domain/destination";

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData): z.infer<S> {
  const result = schema.safeParse(Object.fromEntries(fd));
  if (!result.success) throw new DomainError(result.error.issues[0]?.message ?? "Dữ liệu không hợp lệ");
  return result.data;
}

export const id = z.coerce.number().int().positive();
/** VN or AU numbers, stored in local form: "+61 414 578 383" -> "0414578383", "+84 912…" -> "0912…". */
export const phone = z
  .string()
  .transform((s) => s.replace(/[\s.()-]/g, "").replace(/^\+(61|84)/, "0"))
  .pipe(z.string().regex(/^0\d{9,10}$/, "Số điện thoại không hợp lệ"));

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((s) => s || null);

/** Where the order goes; see destinationError for the per-country rules. */
export const destination = z
  .object({
    country: z.enum(COUNTRIES, { message: "Chọn quốc gia" }),
    region: z.string().trim().max(100),
    district: z.string().trim().max(100),
    postcode: optText(10),
    address: z.string().trim().max(500),
    company: optText(200),
  })
  .transform((d): Destination => ({ ...d, postcode: d.country === "AU" ? d.postcode : null }))
  .superRefine((d, ctx) => {
    const error = destinationError(d);
    if (error) ctx.addIssue({ code: "custom", message: error });
  });
export const kg = z.coerce.number().min(0, "Số kg không hợp lệ").max(100000);
