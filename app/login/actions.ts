"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/action";
import { ROLE_HOME } from "@/lib/auth";
import { db } from "@/lib/db";
import { authClient } from "@/lib/supabase/auth-client";

export async function login(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(fd.get("email") ?? "").trim(),
    password: String(fd.get("password") ?? ""),
  });
  if (error || !data.user) return { ok: false, error: "Sai email hoặc mật khẩu" };

  const { data: staff } = await db()
    .from("staff")
    .select("role")
    .eq("auth_user_id", data.user.id)
    .eq("active", true)
    .maybeSingle();
  if (!staff) {
    await supabase.auth.signOut();
    return { ok: false, error: "Tài khoản chưa được cấp quyền" };
  }
  redirect(ROLE_HOME[staff.role]);
}

export async function logout() {
  await (await authClient()).auth.signOut();
  redirect("/login");
}
