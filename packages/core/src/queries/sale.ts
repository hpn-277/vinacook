import { unwrap } from "../action";
import { db } from "../db";
import { localDate, parseIsoDate, type IsoDate } from "../domain/time";
import { getSettings, loadCatalog, pricingTerms } from "../orders";
import { monthRange, today } from "../period";

/** `?month=YYYY-MM`, falling back to the current month. */
export const monthParam = (raw: unknown): string => (typeof raw === "string" && parseIsoDate(`${raw}-01`)?.slice(0, 7)) || today().slice(0, 7);

/** The sale's orders not yet delivered or cancelled, newest first. */
export async function saleActiveOrders(saleId: number) {
  return unwrap(
    await db()
      .from("orders")
      .select("id, code, production_date, status, total, price_tier, departed_at, customers(name, phone), driver:staff!orders_driver_id_fkey(name, phone), order_items(id, pack_name, pack_qty, qty_kg, products(name))")
      .eq("sale_id", saleId)
      .not("status", "in", "(delivered,cancelled)")
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "order_items" }),
  );
}

export type SaleActiveOrder = Awaited<ReturnType<typeof saleActiveOrders>>[number];

/** A salesperson's month: delivered orders by delivery day, commission, and their customers. Shared by the manager and the sale. */
export async function saleMonthReport(sale: { id: number; commission_pct: number | null }, month: string) {
  const pct = Number(sale.commission_pct ?? 0);
  const { from, to } = monthRange(`${month}-01` as IsoDate);
  const cut = (vnd: number) => Math.round((vnd * pct) / 100);

  const [delivered, customers] = await Promise.all([
    db()
      .from("orders")
      .select("code, total, delivered_at, production_date, customer_id, customers(name, phone)")
      .eq("sale_id", sale.id)
      .eq("status", "delivered")
      .gte("delivered_at", from)
      .lt("delivered_at", to)
      .order("delivered_at", { ascending: false })
      .then(unwrap),
    db()
      .from("customers")
      .select("id, name, phone, default_district, orders(code, status, total, production_date, delivered_at)")
      .eq("sale_id", sale.id)
      .order("name")
      .then(unwrap),
  ]);

  const sales = delivered.reduce((s, o) => s + o.total, 0);
  const days = new Map<string, { date: string; sales: number; commission: number; orders: { code: string; customer: string | null; total: number; commission: number }[] }>();
  for (const o of delivered) {
    const date = localDate(new Date(o.delivered_at!));
    const day = days.get(date) ?? { date, sales: 0, commission: 0, orders: [] };
    day.sales += o.total;
    day.orders.push({ code: o.code, customer: o.customers?.name ?? null, total: o.total, commission: cut(o.total) });
    days.set(date, day);
  }
  for (const day of days.values()) day.commission = cut(day.sales);

  const customerRows = customers
    .map((c) => {
      const live = c.orders.filter((o) => o.status !== "cancelled");
      const monthDelivered = c.orders.filter((o) => o.status === "delivered" && o.delivered_at! >= from && o.delivered_at! < to);
      const dates = live.map((o) => o.production_date).sort();
      return {
        id: c.id,
        name: c.name,
        phone: c.phone,
        district: c.default_district,
        monthOrders: monthDelivered.length,
        monthSales: monthDelivered.reduce((s, o) => s + o.total, 0),
        lifetimeOrders: live.length,
        last: dates.at(-1) ?? null,
        isNew: dates[0]?.startsWith(month) ?? false,
      };
    })
    .sort((a, b) => b.monthSales - a.monthSales || a.name.localeCompare(b.name, "vi"));

  return {
    month,
    pct,
    orders: delivered.length,
    sales,
    commission: cut(sales),
    days: [...days.values()],
    customers: customerRows,
    newCustomers: customerRows.filter((c) => c.isNew).length,
  };
}

export type SaleMonth = Awaited<ReturnType<typeof saleMonthReport>>;

/** "Khách hàng của tôi": newest first, with live (not cancelled) order count and value. */
export async function saleCustomers(saleId: number) {
  const rows = unwrap(
    await db()
      .from("customers")
      .select("id, name, phone, default_address, default_district, orders(total, status)")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: false }),
  );
  return rows.map(({ orders, ...c }) => {
    const live = orders.filter((o) => o.status !== "cancelled");
    return { ...c, orders: live.length, total: live.reduce((s, o) => s + o.total, 0) };
  });
}

export const normalizePhone = (raw: unknown) => (typeof raw === "string" ? raw.replace(/[\s.-]/g, "") : "");

/** A phone's existing customer, and whether it is credited to a sale other than `meId`. */
export async function customerLookup(phone: string, meId: number) {
  if (!phone) return null;
  const { data } = await db().from("customers").select("name, phone, default_address, default_district, sale_id, staff(name)").eq("phone", phone).maybeSingle();
  if (!data) return { found: null, ownedByOther: false, ownerName: null };
  return {
    found: { name: data.name, phone: data.phone, default_address: data.default_address, default_district: data.default_district },
    ownedByOther: data.sale_id != null && data.sale_id !== meId,
    ownerName: data.staff?.name ?? null,
  };
}

export type CustomerLookup = Awaited<ReturnType<typeof customerLookup>>;

/** What the staff order form needs: the catalog on sale and today's pricing terms. */
export async function orderForm() {
  const [catalog, settings] = await Promise.all([loadCatalog(), getSettings()]);
  return { catalog, terms: pricingTerms(settings) };
}
