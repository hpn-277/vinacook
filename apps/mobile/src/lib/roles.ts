import type { StaffRole } from "@noodle/core/staff";

/** The roles the mobile app serves; managers and finance use the web app. */
export const MOBILE_HOME: Partial<Record<StaffRole, "/sale" | "/driver" | "/factory">> = {
  sale: "/sale",
  driver: "/driver",
  factory: "/factory",
};
