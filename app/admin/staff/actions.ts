"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { Constants } from "@/lib/database.types";
import { db } from "@/lib/db";
import { id, parseForm, phone } from "@/lib/form";

const checkbox = z.preprocess((v) => v === "on", z.boolean());
const optionalId = z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional());

const roleFields = {
  role: z.enum(Constants.public.Enums.staff_role),
  name: z.string().trim().min(1, "Nhập tên"),
  phone: phone.or(z.literal("")).transform((v) => v || null),
  commission_pct: z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().min(0).max(100).nullable()),
  factory_id: optionalId,
};

/** Role-specific columns follow the role, matching the staff table's checks: only a sale has a commission, only a factory account a factory. */
function byRole<T extends { role: string; commission_pct: number | null; factory_id?: number }>(s: T) {
  if (s.role === "factory" && !s.factory_id) throw new DomainError("Chọn xưởng cho tài khoản xưởng");
  return { ...s, commission_pct: s.role === "sale" ? s.commission_pct ?? 0 : null, factory_id: s.role === "factory" ? s.factory_id! : null };
}

const newStaffSchema = z.object({ email: z.email("Email không hợp lệ").or(z.string().regex(/^[^\s@]+@[^\s@]+$/, "Email không hợp lệ")), ...roleFields });
const updateStaffSchema = z.object({ id, active: checkbox, ...roleFields });

/** A sale keeps its code or draws the next one from the database sequence (never reused); anyone else has none. */
async function refCodeFor(role: string, current: string | null): Promise<string | null> {
  if (role !== "sale") return null;
  return current ?? unwrap(await db().rpc("next_ref_code"));
}

/** The new staff member gets an email with a link to choose their own password (supabase/templates/invite.html). */
export async function createStaff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { email, ...fields } = parseForm(newStaffSchema, fd);
    const row = byRole(fields);
    const { data, error } = await db().auth.admin.inviteUserByEmail(email.trim().toLowerCase());
    if (error?.code === "email_exists") throw new DomainError("Email này đã có tài khoản");
    if (error || !data.user) throw new DomainError(`Không tạo được tài khoản: ${error?.message ?? ""}`);
    const authUserId = data.user.id;
    const refCode = await refCodeFor(row.role, null);
    const { error: insertError } = await db().from("staff").insert({ ...row, ref_code: refCode, auth_user_id: authUserId });
    if (insertError) {
      await db().auth.admin.deleteUser(authUserId);
      throw new DomainError(`Không tạo được nhân viên: ${insertError.message}`);
    }
    return `Đã tạo nhân viên${refCode ? ` (mã giới thiệu ${refCode})` : ""} và gửi email đặt mật khẩu tới ${email}`;
  });
}

export async function updateStaff(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const { id, ...fields } = parseForm(updateStaffSchema, fd);
    const row = byRole(fields);
    const target = unwrap(await db().from("staff").select("role, ref_code").eq("id", id).single());
    if (target.role === "manager" && id !== me.id) throw new DomainError("Không thể sửa tài khoản quản lý khác");
    if (id === me.id && !row.active) throw new DomainError("Không thể tự khóa tài khoản của mình");
    if (id === me.id && row.role !== target.role) throw new DomainError("Không thể tự đổi vai trò của mình");
    if (target.role === "driver" && row.role !== "driver") {
      const { count } = await db().from("orders").select("id", { count: "exact", head: true }).eq("driver_id", id).in("status", ["assigned", "out_for_delivery"]);
      if (count) throw new DomainError(`Tài xế còn ${count} đơn chưa giao xong; hủy phân công hoặc giao xong trước khi đổi vai trò`);
    }
    const refCode = await refCodeFor(row.role, target.ref_code);
    check(await db().from("staff").update({ ...row, ref_code: refCode }).eq("id", id));
    return refCode && refCode !== target.ref_code ? `Đã lưu, mã giới thiệu mới ${refCode}` : "Đã lưu";
  });
}

/** For staff who lost or never used their invite: emails a fresh link to choose a password. */
export async function sendPasswordLink(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const staffId = id.parse(fd.get("id"));
    const { auth_user_id } = unwrap(await db().from("staff").select("auth_user_id").eq("id", staffId).single());
    const { data } = await db().auth.admin.getUserById(auth_user_id);
    const email = data.user?.email;
    if (!email) throw new DomainError("Tài khoản không có email");
    const { error } = await db().auth.resetPasswordForEmail(email);
    if (error) throw new DomainError(`Không gửi được email: ${error.message}`);
    return `Đã gửi link đặt mật khẩu tới ${email}`;
  });
}
