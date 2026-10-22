import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { ROLE_HOME, staffByAuthUser, type Staff, type StaffRole } from "@noodle/core/staff";
import { authClient } from "@/lib/supabase/auth-client";

export const currentStaff = cache(async (): Promise<Staff | null> => {
  const { data } = await (await authClient()).auth.getClaims();
  const authUserId = data?.claims?.sub;
  return authUserId ? staffByAuthUser(authUserId) : null;
});

export async function requireRole<R extends StaffRole>(...roles: R[]): Promise<Staff & { role: R }> {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  if (!(roles as StaffRole[]).includes(staff.role)) redirect(ROLE_HOME[staff.role]);
  return staff as Staff & { role: R };
}
