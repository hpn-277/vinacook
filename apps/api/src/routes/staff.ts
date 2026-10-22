import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { Constants } from "@noodle/core/database.types";
import { db } from "@noodle/core/db";
import { id, phone } from "@noodle/core/form";
import { role, valid } from "../http";

const roleFields = {
  role: z.enum(Constants.public.Enums.staff_role),
  name: z.string().trim().min(1, "Nhập tên"),
  phone: phone.nullable(),
  commission_pct: z.number().min(0).max(100).nullable(),
  factory_id: id.nullable(),
};

/** Role-specific columns follow the role, matching the staff table's checks: only a sale has a commission, only a factory account a factory. */
function byRole<T extends { role: string; commission_pct: number | null; factory_id: number | null }>(s: T) {
  if (s.role === "factory" && !s.factory_id) throw new DomainError("Chọn xưởng cho tài khoản xưởng");
  return { ...s, commission_pct: s.role === "sale" ? s.commission_pct ?? 0 : null, factory_id: s.role === "factory" ? s.factory_id : null };
}

const newStaffSchema = z.object({ email: z.email("Email không hợp lệ").or(z.string().regex(/^[^\s@]+@[^\s@]+$/, "Email không hợp lệ")), ...roleFields });
const updateStaffSchema = z.object({ active: z.boolean(), ...roleFields });
const staffParam = valid("param", z.object({ id }));

/** A sale keeps its code or draws the next one from the database sequence (never reused); anyone else has none. */
async function refCodeFor(role: string, current: string | null): Promise<string | null> {
  if (role !== "sale") return null;
  return current ?? unwrap(await db().rpc("next_ref_code"));
}

export const staff = new Hono()
  .use(role("manager"))
  /** The new staff member gets an email with a link to choose their own password (supabase/templates/invite.html). */
  .post("/", valid("json", newStaffSchema), async (c) => {
    const { email, ...fields } = c.req.valid("json");
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
    return c.json({ message: `Đã tạo nhân viên${refCode ? ` (mã giới thiệu ${refCode})` : ""} và gửi email đặt mật khẩu tới ${email}` });
  })
  .patch("/:id", staffParam, valid("json", updateStaffSchema), async (c) => {
    const me = c.get("staff");
    const { id: staffId } = c.req.valid("param");
    const row = byRole(c.req.valid("json"));
    const target = unwrap(await db().from("staff").select("role, ref_code").eq("id", staffId).single());
    if (target.role === "manager" && staffId !== me.id) throw new DomainError("Không thể sửa tài khoản quản lý khác");
    if (staffId === me.id && !row.active) throw new DomainError("Không thể tự khóa tài khoản của mình");
    if (staffId === me.id && row.role !== target.role) throw new DomainError("Không thể tự đổi vai trò của mình");
    if (target.role === "driver" && row.role !== "driver") {
      const { count } = await db().from("orders").select("id", { count: "exact", head: true }).eq("driver_id", staffId).in("status", ["assigned", "out_for_delivery"]);
      if (count) throw new DomainError(`Tài xế còn ${count} đơn chưa giao xong; hủy phân công hoặc giao xong trước khi đổi vai trò`);
    }
    const refCode = await refCodeFor(row.role, target.ref_code);
    check(await db().from("staff").update({ ...row, ref_code: refCode }).eq("id", staffId));
    return c.json({ message: refCode && refCode !== target.ref_code ? `Đã lưu, mã giới thiệu mới ${refCode}` : "Đã lưu" });
  })
  /** For staff who lost or never used their invite: emails a fresh link to choose a password. */
  .post("/:id/password-link", staffParam, async (c) => {
    const { auth_user_id } = unwrap(await db().from("staff").select("auth_user_id").eq("id", c.req.valid("param").id).single());
    const { data } = await db().auth.admin.getUserById(auth_user_id);
    const email = data.user?.email;
    if (!email) throw new DomainError("Tài khoản không có email");
    const { error } = await db().auth.resetPasswordForEmail(email);
    if (error) throw new DomainError(`Không gửi được email: ${error.message}`);
    return c.json({ message: `Đã gửi link đặt mật khẩu tới ${email}` });
  });
