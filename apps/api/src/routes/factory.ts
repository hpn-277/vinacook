import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { STANDARD_PACKS } from "@noodle/core/domain/catalog";
import { id } from "@noodle/core/form";
import { role, valid, type ApiEnv, type Bucket } from "../http";
import { uploadProductImage } from "../lib/product-images";

/** multipart/form-data: the fields plus an optional `image_file`. */
const productForm = z.object({
  name: z.string().trim().min(1, "Nhập tên sản phẩm").max(100),
  price_per_kg: z.coerce.number().int("Giá phải là số nguyên").positive("Giá phải > 0"),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(1000, "Mô tả tối đa 1000 ký tự").nullable()),
  image_file: z.instanceof(File).or(z.literal("")).optional(),
});

/** The picture is only ever an upload to R2; editing without picking a new file keeps the current one. */
async function productRow(bucket: Bucket, { image_file, ...fields }: z.infer<typeof productForm>) {
  const imageUrl = await uploadProductImage(bucket, image_file ?? null);
  return imageUrl ? { ...fields, image_url: imageUrl } : fields;
}

/** A factory proposes products it makes; they stay hidden from customers until the manager approves them. */
export const factory = new Hono<ApiEnv>()
  .use(role("factory"))
  .post("/products", valid("form", productForm), async (c) => {
    const me = c.get("staff");
    const created = unwrap(
      await db()
        .from("products")
        .insert({ ...(await productRow(c.env.FILES, c.req.valid("form"))), factory_id: me.factory_id!, status: "pending", active: false, submitted_by: me.id })
        .select("id")
        .single(),
    );
    check(await db().from("product_packs").insert(STANDARD_PACKS.map((pk) => ({ ...pk, product_id: created.id }))));
    return c.json({ message: "Đã gửi sản phẩm, chờ quản lý duyệt" });
  })
  /** Only its own products still under review or sent back; an approved product is the manager's to change. */
  .patch("/products/:id", valid("param", z.object({ id })), valid("form", productForm), async (c) => {
    const updated = unwrap(
      await db()
        .from("products")
        .update({ ...(await productRow(c.env.FILES, c.req.valid("form"))), status: "pending", reject_reason: null })
        .eq("id", c.req.valid("param").id)
        .eq("factory_id", c.get("staff").factory_id!)
        .in("status", ["pending", "rejected"])
        .select("id"),
    );
    if (updated.length === 0) throw new DomainError("Sản phẩm đã được duyệt hoặc không thuộc xưởng của bạn");
    return c.json({ message: "Đã gửi lại để quản lý duyệt" });
  });
