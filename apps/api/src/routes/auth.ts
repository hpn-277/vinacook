import { Hono } from "hono";
import { z } from "zod";
import { DomainError } from "@noodle/core/action";
import { ROLE_HOME, staffByAuthUser, type StaffRole } from "@noodle/core/staff";
import { Constants } from "@noodle/core/database.types";
import { db } from "@noodle/core/db";
import { role, valid } from "../http";
import { sessionClient } from "../session";

const ALL_ROLES = Constants.public.Enums.staff_role as unknown as StaffRole[];

const loginSchema = z.object({ email: z.string().trim(), password: z.string() });
const resetSchema = z.object({ email: z.email("Email không hợp lệ") });
const passwordSchema = z
  .object({ password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, "Hai mật khẩu không khớp");

/** Web sign-in sets the Supabase session cookies; mobile signs in with the Supabase SDK and calls GET /me. */
export const auth = new Hono()
  .post("/login", valid("json", loginSchema), async (c) => {
    const supabase = sessionClient(c);
    const { data, error } = await supabase.auth.signInWithPassword(c.req.valid("json"));
    if (error || !data.user) throw new DomainError("Sai email hoặc mật khẩu");
    const { data: staff } = await db().from("staff").select("role").eq("auth_user_id", data.user.id).eq("active", true).maybeSingle();
    if (!staff) {
      await supabase.auth.signOut();
      throw new DomainError("Tài khoản chưa được cấp quyền");
    }
    return c.json({ redirect: ROLE_HOME[staff.role] });
  })
  .post("/logout", async (c) => {
    await sessionClient(c).auth.signOut();
    return c.json({ redirect: "/login" });
  })
  /** Same answer whether or not the email has an account, so the form cannot be used to probe staff emails. */
  .post("/forgot-password", valid("json", resetSchema), async (c) => {
    const { error } = await sessionClient(c).auth.resetPasswordForEmail(c.req.valid("json").email.trim().toLowerCase());
    if (error) console.error("resetPasswordForEmail", error.code, error.message);
    return c.json({ message: "Nếu email này có tài khoản, link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư (cả mục Spam)." });
  })
  .post("/set-password", valid("json", passwordSchema), async (c) => {
    const supabase = sessionClient(c);
    const { error } = await supabase.auth.updateUser({ password: c.req.valid("json").password });
    if (error) throw new DomainError(error.code === "same_password" ? "Mật khẩu mới phải khác mật khẩu cũ" : "Không đặt được mật khẩu, vui lòng mở lại link trong email");
    const { data } = await supabase.auth.getClaims();
    const staff = data?.claims?.sub ? await staffByAuthUser(data.claims.sub) : null;
    if (!staff) {
      await supabase.auth.signOut();
      return c.json({ redirect: "/login?password=set" });
    }
    return c.json({ redirect: ROLE_HOME[staff.role] });
  })
  .get("/me", role(...ALL_ROLES), (c) => {
    const { id, name, role, phone, ref_code, factory_id } = c.get("staff");
    return c.json({ id, name, role, phone, ref_code, factory_id });
  });
