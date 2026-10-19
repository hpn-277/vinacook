"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { STANDARD_PACKS } from "@/lib/domain/catalog";
import { parseForm } from "@/lib/form";
import { uploadProductImage } from "@/lib/product-images";

const productSchema = z.object({
  id: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  name: z.string().trim().min(1, "Nhập tên sản phẩm").max(100),
  price_per_kg: z.coerce.number().int("Giá phải là số nguyên").positive("Giá phải > 0"),
  description: z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(1000, "Mô tả tối đa 1000 ký tự").nullable()),
});

/** A factory proposes a product it makes; it stays hidden from customers until the manager approves it. */
export async function submitProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("factory");
    const { id, ...fields } = parseForm(productSchema, fd);
    // The picture is only ever an upload to R2; editing without picking a new file keeps the current one.
    const imageUrl = await uploadProductImage(fd.get("image_file"));
    const row = imageUrl ? { ...fields, image_url: imageUrl } : fields;
    const factoryId = me.factory_id!;
    if (id) {
      // Only its own products still under review or sent back; an approved product is the manager's to change.
      const updated = unwrap(
        await db()
          .from("products")
          .update({ ...row, status: "pending", reject_reason: null })
          .eq("id", id)
          .eq("factory_id", factoryId)
          .in("status", ["pending", "rejected"])
          .select("id"),
      );
      if (updated.length === 0) throw new DomainError("Sản phẩm đã được duyệt hoặc không thuộc xưởng của bạn");
      return "Đã gửi lại để quản lý duyệt";
    }
    const created = unwrap(
      await db()
        .from("products")
        .insert({ ...row, factory_id: factoryId, status: "pending", active: false, submitted_by: me.id })
        .select("id")
        .single(),
    );
    check(await db().from("product_packs").insert(STANDARD_PACKS.map((pk) => ({ ...pk, product_id: created.id }))));
    return "Đã gửi sản phẩm, chờ quản lý duyệt";
  });
}
