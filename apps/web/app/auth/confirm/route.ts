import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { authClient } from "@/lib/supabase/auth-client";

const LINK_TYPES: EmailOtpType[] = ["invite", "recovery"];

/** Invite and reset-password emails land here; a valid link opens a session and goes to choosing a password. */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (tokenHash && type && LINK_TYPES.includes(type)) {
    const { error } = await (await authClient()).auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect("/set-password");
  }
  redirect("/login?link=expired");
}
