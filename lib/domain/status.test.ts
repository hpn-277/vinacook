import { describe, expect, it } from "vitest";
import { canTransition, JOB_STATUSES, MANAGER_ORDER_MOVES, ORDER_STATUSES, type OrderStatus } from "./status";

describe("order transitions", () => {
  it.each([
    ["placed", "in_production"],
    ["placed", "cancelled"],
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
    ["placed", "ready"],
    ["placed", "delivered"],
    ["in_production", "cancelled"],
    ["in_production", "assigned"],
    ["ready", "delivered"],
    ["ready", "cancelled"],
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
  it("only producing -> received", () => {
    expect(canTransition("production_jobs", "producing", "received")).toBe(true);
    expect(canTransition("production_jobs", "received", "producing")).toBe(false);
  });

  it("received is terminal", () => {
    for (const to of JOB_STATUSES) expect(canTransition("production_jobs", "received", to)).toBe(false);
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
