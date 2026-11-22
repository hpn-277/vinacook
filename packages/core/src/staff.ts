import { db, type Enums, type Tables } from "./db";

export type StaffRole = Enums<"staff_role">;
export type Staff = Tables<"staff">;

export const ROLE_HOME: Record<StaffRole, string> = {
  admin: "/admin/orders",
  manager: "/admin/orders",
  sale: "/sale",
  factory: "/factory",
  driver: "/driver",
};

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Quản trị",
  manager: "Quản lý",
  sale: "NVKD",
  factory: "Xưởng",
  driver: "Tài xế",
};

export async function staffByAuthUser(authUserId: string): Promise<Staff | null> {
  const { data } = await db().from("staff").select("*").eq("auth_user_id", authUserId).eq("active", true).maybeSingle();
  return data;
}
