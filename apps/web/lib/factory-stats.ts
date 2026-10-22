import "server-only";
import { unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";

export function nextMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Production jobs of a month by production date; received jobs count at the kg actually received. */
export async function jobsInMonth(month: string, factoryId?: number) {
  let q = db()
    .from("production_jobs")
    .select("id, date, qty_kg, received_kg, status, factory_id, product_id, products(name)")
    .gte("date", `${month}-01`)
    .lt("date", `${nextMonth(month)}-01`);
  if (factoryId) q = q.eq("factory_id", factoryId);
  return unwrap(await q.order("date", { ascending: false }).order("product_id"));
}

export const jobKg = (j: { qty_kg: number; received_kg: number | null }) => j.received_kg ?? j.qty_kg;
