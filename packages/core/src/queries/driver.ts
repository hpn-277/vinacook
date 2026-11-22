import { unwrap } from "../action";
import { db } from "../db";
import { loadList } from "../domain/catalog";
import { orderKg } from "../driver-stats";
import { deliveryPhotoUrl } from "../files";
import { dayRange, today } from "../period";

const SELECT =
  "id, code, status, phone, address, district, note, total, payment_status, delivered_at, delivery_photo_path, customers(name), order_items(id, pack_name, pack_qty, qty_kg, products(name))";

const driverOrders = (driverId: number) => db().from("orders").select(SELECT).eq("driver_id", driverId).order("id", { referencedTable: "order_items" });

/** The driver's day: orders waiting to load, on the road, and delivered today, plus what goes on the truck. */
export async function driverBoard(driverId: number) {
  const day = dayRange(today());
  const [open, delivered] = await Promise.all([
    driverOrders(driverId).in("status", ["assigned", "out_for_delivery"]).order("district").order("id").then(unwrap),
    driverOrders(driverId).eq("status", "delivered").gte("delivered_at", day.from).lt("delivered_at", day.to).order("delivered_at", { ascending: false }).then(unwrap),
  ]);
  const shape = ({ delivery_photo_path, ...o }: (typeof open)[number]) => ({
    ...o,
    kg: orderKg(o),
    photo: delivery_photo_path ? deliveryPhotoUrl(delivery_photo_path) : null,
  });
  const waiting = open.filter((o) => o.status === "assigned").map(shape);
  const onTheRoad = open.filter((o) => o.status === "out_for_delivery").map(shape);
  const sumKg = (orders: { kg: number }[]) => orders.reduce((s, o) => s + o.kg, 0);
  return {
    waiting,
    onTheRoad,
    delivered: delivered.map(shape),
    toLoad: loadList(waiting.flatMap((o) => o.order_items)),
    kg: { waiting: sumKg(waiting), onTheRoad: sumKg(onTheRoad) },
  };
}

export type DriverBoard = Awaited<ReturnType<typeof driverBoard>>;
export type DriverOrder = DriverBoard["waiting"][number];
