"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { defaultPackImage, STANDARD_PACKS } from "@/lib/domain/catalog";
import { parseForm } from "@/lib/form";
import { uploadProductImage } from "@/lib/product-images";

const checkbox = z.preprocess((v) => v === "on", z.boolean());
const optionalId = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional());
const productSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Nhập tên sản phẩm"),
  price_per_kg: z.coerce.number().int("Giá phải là số nguyên").positive("Giá phải > 0"),
  factory_id: z.coerce.number({ message: "Chọn xưởng sản xuất" }).int().positive("Chọn xưởng sản xuất"),
  description: z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null),
    z.string().max(1000, "Mô tả tối đa 1000 ký tự").nullable(),
  ),
  active: checkbox,
});

export async function saveProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { id, ...fields } = parseForm(productSchema, fd);
    // Pictures are only uploads to R2; saving without picking a new file keeps the current one.
    const imageUrl = await uploadProductImage(fd.get("image_file"));
    const row = imageUrl ? { ...fields, image_url: imageUrl } : fields;
    if (id) {
      const res = await db().from("products").update(row).eq("id", id);
      if (res.error?.code === "23514") throw new DomainError("Duyệt sản phẩm trước khi bật bán");
      check(res);
      return "Đã lưu";
    }
    const picked = STANDARD_PACKS.filter((_, i) => fd.get(`std_${i}`) === "on");
    if (picked.length === 0) throw new DomainError("Chọn ít nhất một quy cách");
    const created = unwrap(await db().from("products").insert({ ...row, status: "approved" }).select("id").single());
    check(await db().from("product_packs").insert(picked.map((pk) => ({ ...pk, product_id: created.id }))));
    return "Đã thêm sản phẩm";
  });
}

const newPackSchema = z.object({
  new_name: z.string().trim().min(1, "Nhập tên quy cách").max(30),
  new_kg: z.coerce.number({ message: "Nhập số kg" }).positive("Số kg phải > 0").max(1000),
});

/**
 * Which packs a product is sold in (each product can differ, e.g. only "Thùng 15 kg"), their pictures, and an optional
 * new pack. Old orders keep their own pack snapshot, so this only changes what customers can pick from now on.
 */
export async function savePacks(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const productId = z.coerce.number().int().positive().parse(fd.get("product_id"));
    const packs = unwrap(await db().from("product_packs").select("id").eq("product_id", productId));
    const added = String(fd.get("new_name") ?? "").trim() ? parseForm(newPackSchema, fd) : null;
    const onSale = packs.filter((pk) => fd.get(`active_${pk.id}`) === "on");
    if (onSale.length === 0 && !added) throw new DomainError("Sản phẩm phải có ít nhất một quy cách đang bán");
    for (const pk of packs) {
      const imageUrl = await uploadProductImage(fd.get(`image_${pk.id}`));
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
    return "Đã lưu quy cách";
  });
}

const pricingSchema = z.object({
  retail_markup_pct: z.coerce.number().min(0, "% chênh lệch không hợp lệ").max(999),
  wholesale_min_kg: z.coerce.number().min(0, "Số kg không hợp lệ").max(100000),
  wholesale_min_total: z.coerce.number().int("Số tiền phải là số nguyên").min(0, "Số tiền không hợp lệ"),
});

export async function savePricing(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    check(await db().from("settings").update(parseForm(pricingSchema, fd)).eq("id", true));
    return "Đã lưu cách tính giá; áp dụng cho đơn mới";
  });
}

/** Approving puts a factory's product on sale at the price shown (edit it in the table first if needed). */
export async function approveProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const id = z.coerce.number().int().positive().parse(fd.get("id"));
    const done = unwrap(
      await db().from("products").update({ status: "approved", active: true, reject_reason: null }).eq("id", id).eq("status", "pending").select("name"),
    );
    if (done.length === 0) throw new DomainError("Sản phẩm không còn chờ duyệt");
    return `Đã duyệt ${done[0].name}, khách đã thấy sản phẩm`;
  });
}

const rejectSchema = z.object({ id: z.coerce.number().int().positive(), reason: z.string().trim().min(1, "Nhập lý do để xưởng sửa lại").max(500) });

export async function rejectProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { id, reason } = parseForm(rejectSchema, fd);
    const done = unwrap(
      await db().from("products").update({ status: "rejected", active: false, reject_reason: reason }).eq("id", id).eq("status", "pending").select("name"),
    );
    if (done.length === 0) throw new DomainError("Sản phẩm không còn chờ duyệt");
    return `Đã trả ${done[0].name} về xưởng`;
  });
}
