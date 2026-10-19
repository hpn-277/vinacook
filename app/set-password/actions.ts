"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DomainError, run, type ActionResult } from "@/lib/action";
import { currentStaff, ROLE_HOME } from "@/lib/auth";
import { parseForm } from "@/lib/form";
import { authClient } from "@/lib/supabase/auth-client";

const schema = z
  .object({ password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"), confirm: z.string() })
  .refine((v) => v.password === v.confirm, "Hai mật khẩu không khớp");

export async function setPassword(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const result = await run(async () => {
    const { password } = parseForm(schema, fd);
    const { error } = await (await authClient()).auth.updateUser({ password });
    if (error) throw new DomainError(error.code === "same_password" ? "Mật khẩu mới phải khác mật khẩu cũ" : "Không đặt được mật khẩu, vui lòng mở lại link trong email");
  });
  if (!result?.ok) return result;
  const staff = await currentStaff();
  if (!staff) {
    await (await authClient()).auth.signOut();
    redirect("/login?password=set");
  }
  redirect(ROLE_HOME[staff.role]);
}
