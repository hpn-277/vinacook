"use server";

import { z } from "zod";
import { check, DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseForm, phone } from "@/lib/form";

const checkbox = z.preprocess((v) => v === "on", z.boolean());
const optionalId = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional());
const optionalText = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().nullable());

const productSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Nhập tên sản phẩm"),
  price_per_kg: z.coerce.number().int("Giá phải là số nguyên").positive("Giá phải > 0"),
  image_url: optionalText,
  active: checkbox,
});

export async function saveProduct(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { id, ...row } = parseForm(productSchema, fd);
    check(id ? await db().from("products").update(row).eq("id", id) : await db().from("products").insert(row));
    return "Đã lưu";
  });
}

const factorySchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1, "Nhập tên xưởng"),
  address: optionalText,
  phone: optionalText,
  capacity_kg_per_day: z.coerce.number().min(0),
  active: checkbox,
});

export async function saveFactory(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { id, ...row } = parseForm(factorySchema, fd);
    check(id ? await db().from("factories").update(row).eq("id", id) : await db().from("factories").insert(row));
    return "Đã lưu";
  });
}

const newStaffSchema = z
  .object({
    email: z.email("Email không hợp lệ").or(z.string().regex(/^[^\s@]+@[^\s@]+$/, "Email không hợp lệ")),
    password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
    role: z.enum(["manager", "sale", "factory", "driver"]),
    name: z.string().trim().min(1, "Nhập tên"),
    phone: phone.or(z.literal("")).transform((v) => v || null),
    ref_code: optionalText,
    commission_pct: z.preprocess((v) => (v === "" ? null : v), z.coerce.number().min(0).max(100).nullable()),
    factory_id: optionalId,
  })
  .transform((s) => ({
    ...s,
    ref_code: s.role === "sale" ? s.ref_code?.toUpperCase() ?? null : null,
    commission_pct: s.role === "sale" ? s.commission_pct ?? 0 : null,
    factory_id: s.role === "factory" ? s.factory_id ?? null : null,
  }));

export async function createStaff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { email, password, ...row } = parseForm(newStaffSchema, fd);
    if (row.role === "factory" && !row.factory_id) throw new DomainError("Chọn xưởng cho tài khoản xưởng");
    if (row.role === "sale" && !row.ref_code) throw new DomainError("Nhập mã giới thiệu cho NVKD");
    const { data, error } = await db().auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw new DomainError(`Không tạo được tài khoản: ${error?.message ?? ""}`);
    const insert = await db().from("staff").insert({ ...row, auth_user_id: data.user.id });
    if (insert.error) {
      await db().auth.admin.deleteUser(data.user.id);
      throw new DomainError(`Không tạo được nhân viên: ${insert.error.message}`);
    }
    return "Đã tạo nhân viên";
  });
}

const updateStaffSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1),
  commission_pct: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0).max(100).nullable()),
  active: checkbox,
});

export async function updateStaff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const { id, ...row } = parseForm(updateStaffSchema, fd);
    if (id === me.id && !row.active) throw new DomainError("Không thể tự khóa tài khoản của mình");
    const target = await db().from("staff").select("role").eq("id", id).single();
    const patch = target.data?.role === "sale" ? row : { name: row.name, active: row.active };
    check(await db().from("staff").update(patch).eq("id", id));
    return "Đã lưu";
  });
}

export async function saveCutoff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const cutoff = z.string().regex(/^\d{2}:\d{2}$/, "Giờ chốt không hợp lệ").parse(fd.get("cutoff_time"));
    check(await db().from("settings").update({ cutoff_time: cutoff }).eq("id", true));
    return "Đã lưu giờ chốt";
  });
}
