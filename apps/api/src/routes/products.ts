import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { defaultPackImage, STANDARD_PACKS } from "@noodle/core/domain/catalog";
import { parseForm } from "@noodle/core/form";
import { role, valid, type ApiEnv, type Bucket } from "../http";
import { uploadProductImage } from "../lib/product-images";

const checkbox = z.preprocess((v) => v === "on", z.boolean());
const productFields = z.object({
  name: z.string().trim().min(1, "Nhập tên sản phẩm"),
  price_per_kg: z.coerce.number().int("Giá phải là số nguyên").positive("Giá phải > 0"),
  factory_id: z.coerce.number({ message: "Chọn xưởng sản xuất" }).int().positive("Chọn xưởng sản xuất"),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(1000, "Mô tả tối đa 1000 ký tự").nullable(),
  ),
  active: checkbox,
});
const newPackSchema = z.object({
  new_name: z.string().trim().min(1, "Nhập tên quy cách").max(30),
  new_kg: z.coerce.number({ message: "Nhập số kg" }).positive("Số kg phải > 0").max(1000),
});
const productParam = valid("param", z.object({ id: z.coerce.number().int().positive() }));

/** Pictures are only uploads to R2; saving without picking a new file keeps the current one. */
async function productRow(bucket: Bucket, fd: FormData) {
  const fields = parseForm(productFields, fd);
  const imageUrl = await uploadProductImage(bucket, fd.get("image_file"));
  return imageUrl ? { ...fields, image_url: imageUrl } : fields;
}

/**
 * The manager's catalog. Create, update and packs take multipart/form-data (fields plus image files,
 * `std_<i>`/`active_<packId>`/`image_<packId>` per pack); the rest take JSON.
 */
export const products = new Hono<ApiEnv>()
  .use(role("manager"))
  .post("/", async (c) => {
    const fd = await c.req.formData();
    const row = await productRow(c.env.FILES, fd);
    const picked = STANDARD_PACKS.filter((_, i) => fd.get(`std_${i}`) === "on");
    if (picked.length === 0) throw new DomainError("Chọn ít nhất một quy cách");
    const created = unwrap(await db().from("products").insert({ ...row, status: "approved" }).select("id").single());
    check(await db().from("product_packs").insert(picked.map((pk) => ({ ...pk, product_id: created.id }))));
    return c.json({ message: "Đã thêm sản phẩm" });
  })
  .patch("/:id", productParam, async (c) => {
    const res = await db().from("products").update(await productRow(c.env.FILES, await c.req.formData())).eq("id", c.req.valid("param").id);
    if (res.error?.code === "23514") throw new DomainError("Duyệt sản phẩm trước khi bật bán");
    check(res);
    return c.json({ message: "Đã lưu" });
  })
  /**
   * Which packs a product is sold in (each product can differ, e.g. only "Thùng 15 kg"), their pictures, and an optional
   * new pack. Old orders keep their own pack snapshot, so this only changes what customers can pick from now on.
   */
  .post("/:id/packs", productParam, async (c) => {
    const productId = c.req.valid("param").id;
    const fd = await c.req.formData();
    const packs = unwrap(await db().from("product_packs").select("id").eq("product_id", productId));
    const added = String(fd.get("new_name") ?? "").trim() ? parseForm(newPackSchema, fd) : null;
    const onSale = packs.filter((pk) => fd.get(`active_${pk.id}`) === "on");
    if (onSale.length === 0 && !added) throw new DomainError("Sản phẩm phải có ít nhất một quy cách đang bán");
    for (const pk of packs) {
      const imageUrl = await uploadProductImage(c.env.FILES, fd.get(`image_${pk.id}`));
      check(await db().from("product_packs").update({ active: onSale.includes(pk), ...(imageUrl && { image_url: imageUrl }) }).eq("id", pk.id));
    }
    if (added) {
      check(
        await db()
          .from("product_packs")
          .upsert(
            { product_id: productId, name: added.new_name, kg_per_unit: added.new_kg, active: true, image_url: defaultPackImage(added.new_name) },
            { onConflict: "product_id,name,kg_per_unit" },
          ),
      );
    }
    return c.json({ message: "Đã lưu quy cách" });
  })
  /** Approving puts a factory's product on sale at the price shown (edit it in the table first if needed). */
  .post("/:id/approve", productParam, async (c) => {
    const done = unwrap(
      await db().from("products").update({ status: "approved", active: true, reject_reason: null }).eq("id", c.req.valid("param").id).eq("status", "pending").select("name"),
    );
    if (done.length === 0) throw new DomainError("Sản phẩm không còn chờ duyệt");
    return c.json({ message: `Đã duyệt ${done[0].name}, khách đã thấy sản phẩm` });
  })
  .post("/:id/reject", productParam, valid("json", z.object({ reason: z.string().trim().min(1, "Nhập lý do để xưởng sửa lại").max(500) })), async (c) => {
    const done = unwrap(
      await db()
        .from("products")
        .update({ status: "rejected", active: false, reject_reason: c.req.valid("json").reason })
        .eq("id", c.req.valid("param").id)
        .eq("status", "pending")
        .select("name"),
    );
    if (done.length === 0) throw new DomainError("Sản phẩm không còn chờ duyệt");
    return c.json({ message: `Đã trả ${done[0].name} về xưởng` });
  });

const pricingSchema = z.object({
  retail_markup_pct: z.number({ message: "% chênh lệch không hợp lệ" }).min(0, "% chênh lệch không hợp lệ").max(999),
  wholesale_min_kg: z.number({ message: "Số kg không hợp lệ" }).min(0, "Số kg không hợp lệ").max(100000),
  wholesale_min_total: z.number({ message: "Số tiền không hợp lệ" }).int("Số tiền phải là số nguyên").min(0, "Số tiền không hợp lệ"),
});

export const settings = new Hono().use(role("manager")).put("/pricing", valid("json", pricingSchema), async (c) => {
  check(await db().from("settings").update(c.req.valid("json")).eq("id", true));
  return c.json({ message: "Đã lưu cách tính giá; áp dụng cho đơn mới" });
});
