import { unwrap } from "../action";
import { db } from "../db";
import type { JobStatus, ProductStatus } from "../domain/status";
import { addDays, parseIsoDate } from "../domain/time";
import { jobKg, jobsInMonth } from "../factory-stats";
import { today } from "../period";

/** `status` null: a draft row (demand before the manager closes the day), not yet a job. */
export type FactoryDayRow = { key: string; product: string; kg: number; status: JobStatus | null };
export type FactoryDay = { date: string; label: string; closed: boolean; rows: FactoryDayRow[] };

/** Today and tomorrow: the factory's own jobs once a day is closed, the whole day's demand by product before that. */
export async function factoryDays(factoryId: number): Promise<FactoryDay[]> {
  const date = today();
  const days = [
    { date, label: "Hôm nay" },
    { date: addDays(date, 1), label: "Ngày mai" },
  ];
  const dates = days.map((d) => d.date);
  const [jobs, closedDays, draftItems] = await Promise.all([
    db().from("production_jobs").select("id, date, qty_kg, status, products(name)").eq("factory_id", factoryId).in("date", dates).order("product_id").order("id").then(unwrap),
    db().from("production_days").select("date").eq("status", "closed").in("date", dates).then(unwrap),
    db().from("order_items").select("qty_kg, product_id, products(name), orders!inner(production_date, status)").in("orders.production_date", dates).eq("orders.status", "placed").then(unwrap),
  ]);
  const closed = new Set(closedDays.map((d) => d.date));

  function draftRows(day: string): FactoryDayRow[] {
    const byProduct = new Map<number, FactoryDayRow>();
    for (const i of draftItems.filter((i) => i.orders.production_date === day)) {
      const row = byProduct.get(i.product_id) ?? { key: String(i.product_id), product: i.products?.name ?? "?", kg: 0, status: null };
      row.kg += i.qty_kg;
      byProduct.set(i.product_id, row);
    }
    return [...byProduct.values()].sort((a, b) => a.product.localeCompare(b.product, "vi"));
  }

  return days.map((d) => {
    const isClosed = closed.has(d.date);
    return {
      ...d,
      closed: isClosed,
      rows: isClosed
        ? jobs.filter((j) => j.date === d.date).map((j) => ({ key: String(j.id), product: j.products?.name ?? "?", kg: j.qty_kg, status: j.status }))
        : draftRows(d.date),
    };
  });
}

/** `month` is "YYYY-MM" from the client; anything else falls back to the current month. */
export async function factoryMonth(factoryId: number, month?: string) {
  const m = (month && parseIsoDate(`${month}-01`)?.slice(0, 7)) || today().slice(0, 7);
  const jobs = await jobsInMonth(m, factoryId);

  const produced = jobs.filter((j) => j.status === "received");
  const producedKg = produced.reduce((s, j) => s + jobKg(j), 0);
  const inProgressKg = jobs.filter((j) => j.status === "producing").reduce((s, j) => s + j.qty_kg, 0);

  const byProduct = new Map<string, number>();
  for (const j of produced) byProduct.set(j.products?.name ?? "?", (byProduct.get(j.products?.name ?? "?") ?? 0) + jobKg(j));

  const days = [...new Set(jobs.map((j) => j.date))].map((date) => {
    const dayJobs = jobs.filter((j) => j.date === date);
    return {
      date,
      pending: dayJobs.some((j) => j.status === "producing"),
      jobs: dayJobs.map((j) => ({ product: j.products?.name ?? "?", kg: jobKg(j) })),
      kg: dayJobs.reduce((s, j) => s + jobKg(j), 0),
    };
  });

  return {
    month: m,
    producedKg,
    producedCount: produced.length,
    inProgressKg,
    products: [...byProduct].sort((a, b) => b[1] - a[1]).map(([name, kg]) => ({ name, kg })),
    days,
  };
}

export type FactoryProduct = {
  id: number;
  name: string;
  price_per_kg: number;
  description: string | null;
  image_url: string | null;
  status: ProductStatus;
  reject_reason: string | null;
  active: boolean;
};

export async function factoryProducts(factoryId: number): Promise<FactoryProduct[]> {
  return unwrap(
    await db()
      .from("products")
      .select("id, name, price_per_kg, description, image_url, status, reject_reason, active")
      .eq("factory_id", factoryId)
      .order("id", { ascending: false }),
  );
}
