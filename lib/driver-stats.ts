import "server-only";
import { unwrap } from "@/lib/action";
import { db } from "@/lib/db";
import { monthRange } from "@/lib/period";
import type { IsoDate } from "@/lib/domain/time";

export const DELIVERY_SELECT =
  "code, total, district, departed_at, delivered_at, delivery_photo_path, payment_status, driver_id, customers(name), order_items(qty_kg)";

/** Orders a driver completed in the month, by delivery time (the same clock commission uses). */
export async function deliveredInMonth(month: string, driverId?: number) {
  const { from, to } = monthRange(`${month}-01` as IsoDate);
  let q = db().from("orders").select(DELIVERY_SELECT).eq("status", "delivered").not("driver_id", "is", null).gte("delivered_at", from).lt("delivered_at", to);
  if (driverId) q = q.eq("driver_id", driverId);
  return unwrap(await q.order("delivered_at", { ascending: false }));
}

export const orderKg = (o: { order_items: { qty_kg: number }[] }) => o.order_items.reduce((s, i) => s + i.qty_kg, 0);
