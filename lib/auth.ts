import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { authClient } from "@/lib/supabase/auth-client";
import { db, type Enums, type Tables } from "@/lib/db";

export type StaffRole = Enums<"staff_role">;
export type Staff = Tables<"staff">;

export const ROLE_HOME: Record<StaffRole, string> = {
  manager: "/admin",
  sale: "/sale",
  factory: "/factory",
  driver: "/driver",
};

export const currentStaff = cache(async (): Promise<Staff | null> => {
  const { data } = await (await authClient()).auth.getClaims();
  const authUserId = data?.claims?.sub;
  if (!authUserId) return null;
  const { data: staff } = await db()
    .from("staff")
    .select("*")
    .eq("auth_user_id", authUserId)
    .eq("active", true)
    .maybeSingle();
  return staff;
});

export async function requireRole(...roles: StaffRole[]): Promise<Staff> {
  const staff = await currentStaff();
  if (!staff) redirect("/login");
  if (!roles.includes(staff.role)) redirect(ROLE_HOME[staff.role]);
  return staff;
}
