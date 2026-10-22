import { describe, expect, it } from "vitest";
import { ageTone, debtAge, groupDebts, paymentTotals } from "./debt";
import type { IsoDate } from "./time";

const today = "2026-10-15" as IsoDate;

describe("debtAge", () => {
  it("counts from the local delivery date, not the UTC one", () => {
    // 2026-10-07T18:00Z is 01:00 on Oct 8 in Ho Chi Minh City.
    expect(debtAge({ production_date: "2026-10-01", delivered_at: "2026-10-07T18:00:00Z" }, today)).toBe(7);
  });

  it("falls back to the production date while undelivered", () => {
    expect(debtAge({ production_date: "2026-10-05", delivered_at: null }, today)).toBe(10);
  });

  it("is never negative for orders produced in the future", () => {
    expect(debtAge({ production_date: "2026-10-16", delivered_at: null }, today)).toBe(0);
  });
});

describe("ageTone", () => {
  it.each([
    [0, "ok"],
    [7, "ok"],
    [8, "overdue"],
    [14, "overdue"],
    [15, "late"],
  ] as const)("%i days is %s", (days, tone) => {
    expect(ageTone(days)).toBe(tone);
  });
});

describe("groupDebts", () => {
  const o = (id: number, customer_id: number, total: number, production_date: string) => ({ id, customer_id, total, production_date, delivered_at: null });

  it("groups by customer with totals, oldest debt first", () => {
    const groups = groupDebts([o(1, 10, 100, "2026-10-14"), o(2, 20, 50, "2026-10-01"), o(3, 10, 200, "2026-10-10")], today);
    expect(groups.map((g) => [g.customerId, g.total, g.oldest, g.orders.map((x) => x.id)])).toEqual([
      [20, 50, 14, [2]],
      [10, 300, 5, [3, 1]],
    ]);
  });

  it("breaks equal ages by the larger debt", () => {
    const groups = groupDebts([o(1, 10, 100, "2026-10-10"), o(2, 20, 900, "2026-10-10")], today);
    expect(groups.map((g) => g.customerId)).toEqual([20, 10]);
  });
});

describe("paymentTotals", () => {
  it("separates money taken in from undone payments", () => {
    expect(
      paymentTotals([
        { action: "paid", amount: 300 },
        { action: "paid", amount: 200 },
        { action: "unpaid", amount: 200 },
      ]),
    ).toEqual({ received: 500, reversed: 200, net: 300 });
  });
});
