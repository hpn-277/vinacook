"use server";

import { z } from "zod";
import { run, type ActionResult } from "@/lib/action";
import { parseForm } from "@/lib/form";
import { authClient } from "@/lib/supabase/auth-client";

const schema = z.object({ email: z.email("Email không hợp lệ") });

/** Same answer whether or not the email has an account, so the form cannot be used to probe staff emails. */
export async function requestReset(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const { email } = parseForm(schema, fd);
    const { error } = await (await authClient()).auth.resetPasswordForEmail(email.trim().toLowerCase());
    if (error) console.error("resetPasswordForEmail", error.code, error.message);
    return "Nếu email này có tài khoản, link đặt lại mật khẩu đã được gửi. Kiểm tra hộp thư (cả mục Spam).";
  });
}
