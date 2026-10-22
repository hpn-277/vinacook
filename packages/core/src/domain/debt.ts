import { localDate, type IsoDate } from "./time";

export const OVERDUE_DAYS = 7;
export const LATE_DAYS = 14;

export type AgeTone = "ok" | "overdue" | "late";

/** Days the money has been owed: since delivery, or since the production date while the order is not delivered yet. */
export function debtAge(order: { production_date: string; delivered_at: string | null }, today: IsoDate): number {
  const since = order.delivered_at ? localDate(new Date(order.delivered_at)) : order.production_date;
  return Math.max(0, Math.round((Date.parse(today) - Date.parse(since)) / 86_400_000));
}

export function ageTone(days: number): AgeTone {
  return days > LATE_DAYS ? "late" : days > OVERDUE_DAYS ? "overdue" : "ok";
}

export type DebtGroup<O> = { customerId: number; orders: (O & { age: number })[]; total: number; oldest: number };

/** One group per customer, oldest debt first; orders inside a group oldest first. */
export function groupDebts<O extends { customer_id: number; total: number; production_date: string; delivered_at: string | null }>(
  orders: O[],
  today: IsoDate,
): DebtGroup<O>[] {
  const aged = orders.map((o) => ({ ...o, age: debtAge(o, today) }));
  return [...Map.groupBy(aged, (o) => o.customer_id)]
    .map(([customerId, os]) => ({
      customerId,
      orders: os.toSorted((a, b) => b.age - a.age),
      total: os.reduce((s, o) => s + o.total, 0),
      oldest: Math.max(...os.map((o) => o.age)),
    }))
    .sort((a, b) => b.oldest - a.oldest || b.total - a.total);
}

/** Money taken in and money handed back (undone payments) across a list of payment events. */
export function paymentTotals(events: { action: "paid" | "unpaid"; amount: number }[]) {
  const received = events.filter((e) => e.action === "paid").reduce((s, e) => s + e.amount, 0);
  const reversed = events.filter((e) => e.action === "unpaid").reduce((s, e) => s + e.amount, 0);
  return { received, reversed, net: received - reversed };
}

export const PAYMENT_ACTION_LABEL = { paid: "Đã thu", unpaid: "Bỏ đánh dấu" } as const;
export const NO_SETTLE_RIGHTS = "Kế toán không có quyền gạch nợ";
