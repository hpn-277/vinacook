import { unwrap } from "../action";
import { db } from "../db";
import type { PriceTier } from "../domain/pricing";
import type { OrderStatus } from "../domain/status";
import { deliveryPhotoUrl } from "../files";

export type OrderViewer = { role: "admin" | "manager" } | { role: "sale"; saleId: number };

export type OrderDetailOrder = {
  id: number;
  code: string;
  status: OrderStatus;
  payment_status: "paid" | "unpaid";
  total: number;
  price_tier: PriceTier;
  phone: string;
  address: string;
  district: string;
  note: string | null;
  fail_reason: string | null;
  return_reason: string | null;
  returner: { name: string } | null;
  departed_at: string | null;
  production_date: string;
  created_at: string;
  customers: { name: string } | null;
  sale: { name: string } | null;
  driver: { id: number; name: string } | null;
  order_items: { id: number; pack_name: string; pack_qty: number; qty_kg: number; price_per_kg: number; line_total: number; products: { name: string } | null }[];
  created_by: "customer" | "sale" | "manager";
  delivered_at: string | null;
  delivery_photo_path: string | null;
  retail_markup_pct: number;
  wholesale_min_kg: number;
  wholesale_min_total: number;
  creator: { name: string } | null;
  driver_contact: { phone: string | null } | null;
  customer: {
    id: number;
    name: string;
    phone: string;
    default_address: string | null;
    default_district: string | null;
    created_at: string;
    owner: { name: string; ref_code: string | null; commission_pct: number | null } | null;
  } | null;
  items: {
    id: number;
    pack_name: string;
    pack_qty: number;
    qty_kg: number;
    price_per_kg: number;
    wholesale_price_per_kg: number;
    line_total: number;
    product_id: number;
    products: { name: string } | null;
  }[];
};

// The head mirrors apps/web/components/AdminOrderCard's ADMIN_ORDER_SELECT, which the manager's order actions read.
const DETAIL_SELECT = `id, code, status, payment_status, total, price_tier, phone, address, district, note, fail_reason, return_reason, returner:staff!orders_returned_by_fkey(name), departed_at, production_date, created_at, customers(name), sale:staff!orders_sale_id_fkey(name), driver:staff!orders_driver_id_fkey(id, name), order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, line_total, products(name)),
  created_by, delivered_at, delivery_photo_path, retail_markup_pct, wholesale_min_kg, wholesale_min_total,
  creator:staff!orders_created_by_staff_id_fkey(name),
  driver_contact:staff!orders_driver_id_fkey(phone),
  customer:customers(id, name, phone, default_address, default_district, created_at, owner:staff(name, ref_code, commission_pct)),
  items:order_items(id, pack_name, pack_qty, qty_kg, price_per_kg, wholesale_price_per_kg, line_total, product_id, products(name))`;

const dateTime = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short" });
const when = (iso: string | null | undefined) => (iso ? dateTime.format(new Date(iso)) : null);

const CREATED_BY = { customer: "Khách tự đặt", sale: "NVKD tạo", manager: "Quản lý tạo" } as const;

export type TimelineStep = { label: string; at: string | null; note: string; done?: boolean };

/**
 * Everything the order page shows, or null when the viewer may not see it: a sale sees only orders credited to them,
 * and only that customer's orders credited to them. Factory jobs are returned to the manager only.
 */
export async function orderDetail(code: string, viewer: OrderViewer) {
  let query = db().from("orders").select(DETAIL_SELECT).eq("code", code);
  if (viewer.role === "sale") query = query.eq("sale_id", viewer.saleId);
  const { data } = await query.order("id", { referencedTable: "order_items" }).maybeSingle();
  if (!data) return null;
  const order = data as unknown as OrderDetailOrder;

  const productIds = [...new Set(order.items.map((i) => i.product_id))];
  let historyQuery = order.customer ? db().from("orders").select("code, production_date, status, total, payment_status").eq("customer_id", order.customer.id) : null;
  if (historyQuery && viewer.role === "sale") historyQuery = historyQuery.eq("sale_id", viewer.saleId);
  const [day, jobs, history] = await Promise.all([
    db().from("production_days").select("status, closed_at").eq("date", order.production_date).maybeSingle(),
    db()
      .from("production_jobs")
      .select("id, qty_kg, received_kg, status, updated_at, products(name), factories(name)")
      .eq("date", order.production_date)
      .in("product_id", productIds)
      .order("id")
      .then(unwrap),
    historyQuery ? historyQuery.order("production_date", { ascending: false }).limit(10).then(unwrap) : Promise.resolve([]),
  ]);

  const owner = order.customer?.owner;
  const received = jobs.filter((j) => j.status === "received").map((j) => j.updated_at);
  const timeline: TimelineStep[] = [
    { label: "Đặt hàng", at: when(order.created_at), note: CREATED_BY[order.created_by] + (order.creator ? ` (${order.creator.name})` : "") },
    { label: "Chốt sản xuất", at: when(day.data?.closed_at), note: day.data?.status === "closed" ? "Đã gửi lệnh cho xưởng" : "Ngày chưa chốt" },
    {
      label: "Nhận hàng từ xưởng",
      at: received.length ? when(received.sort().at(-1)) : null,
      note: jobs.length ? `${received.length}/${jobs.length} lệnh đã nhận` : "Chưa có lệnh",
    },
    { label: "Giao cho tài xế", at: null, done: !!order.driver, note: order.driver ? order.driver.name : "Chưa phân công" },
    {
      label: "Hàng đã lên xe",
      at: when(order.departed_at),
      note: order.departed_at ? "Xe đã rời kho" : order.status === "assigned" ? "Chờ tài xế xác nhận" : "",
    },
    {
      label: "Giao thành công",
      at: when(order.delivered_at),
      note: order.status === "failed" ? `Thất bại: ${order.fail_reason}` : order.status === "cancelled" ? "Đơn đã hủy" : "",
    },
  ];

  return {
    order,
    creatorLabel: CREATED_BY[order.created_by] + (order.creator ? ` · ${order.creator.name}` : ""),
    customerSince: order.customer ? dateOnly.format(new Date(order.customer.created_at)) : null,
    photo: order.delivery_photo_path ? deliveryPhotoUrl(order.delivery_photo_path) : null,
    kg: order.items.reduce((s, i) => s + i.qty_kg, 0),
    atWholesale: order.items.reduce((s, i) => s + Math.round(i.qty_kg * i.wholesale_price_per_kg), 0),
    commission: order.sale && owner?.commission_pct != null && order.status === "delivered" ? Math.round((order.total * owner.commission_pct) / 100) : null,
    timeline,
    jobs: viewer.role === "sale" ? [] : jobs,
    history,
  };
}

export type OrderDetailData = NonNullable<Awaited<ReturnType<typeof orderDetail>>>;
