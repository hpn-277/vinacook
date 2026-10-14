import { describe, expect, it } from "vitest";
import { canTransition, JOB_STATUSES, MANAGER_ORDER_MOVES, ORDER_STATUSES, type OrderStatus } from "./status";

describe("order transitions", () => {
  it.each([
    ["placed", "approved"],
    ["placed", "cancelled"],
    ["approved", "in_production"],
    ["approved", "cancelled"],
    ["in_production", "ready"],
    ["ready", "assigned"],
    ["assigned", "delivered"],
    ["assigned", "failed"],
    ["failed", "ready"],
    ["failed", "cancelled"],
  ] as const)("allows %s -> %s", (from, to) => {
    expect(canTransition("orders", from, to)).toBe(true);
  });

  it.each([
    ["placed", "in_production"],
    ["placed", "delivered"],
    ["approved", "ready"],
    ["in_production", "cancelled"],
    ["ready", "delivered"],
    ["assigned", "cancelled"],
    ["delivered", "failed"],
    ["cancelled", "placed"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(canTransition("orders", from, to)).toBe(false);
  });

  it("delivered and cancelled are terminal", () => {
    for (const to of ORDER_STATUSES) {
      expect(canTransition("orders", "delivered", to)).toBe(false);
      expect(canTransition("orders", "cancelled", to)).toBe(false);
    }
  });
});

describe("job transitions", () => {
  it("follows assigned -> accepted -> shipped -> received", () => {
    expect(canTransition("production_jobs", "assigned", "accepted")).toBe(true);
    expect(canTransition("production_jobs", "accepted", "shipped")).toBe(true);
    expect(canTransition("production_jobs", "shipped", "received")).toBe(true);
  });

  it("only an assigned job can be rejected", () => {
    const rejectable = JOB_STATUSES.filter((s) => canTransition("production_jobs", s, "rejected"));
    expect(rejectable).toEqual(["assigned"]);
  });

  it("cannot skip shipping", () => {
    expect(canTransition("production_jobs", "accepted", "received")).toBe(false);
    expect(canTransition("production_jobs", "assigned", "shipped")).toBe(false);
  });

  it("rejected and received are terminal", () => {
    for (const to of JOB_STATUSES) {
      expect(canTransition("production_jobs", "rejected", to)).toBe(false);
      expect(canTransition("production_jobs", "received", to)).toBe(false);
    }
  });
});

describe("manager order moves", () => {
  it("are all legal transitions", () => {
    for (const [from, tos] of Object.entries(MANAGER_ORDER_MOVES)) {
      for (const to of tos ?? []) expect(canTransition("orders", from as OrderStatus, to)).toBe(true);
    }
  });

  it("never let a manager skip production or delivery", () => {
    const targets = Object.values(MANAGER_ORDER_MOVES).flat();
    expect(targets).not.toContain("in_production");
    expect(targets).not.toContain("delivered");
    expect(targets).not.toContain("assigned");
  });
});
