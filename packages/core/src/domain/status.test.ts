import { describe, expect, it } from "vitest";
import { canTransition, JOB_STATUSES, MANAGER_ORDER_MOVES, moveLabel, ORDER_STATUSES, type OrderStatus } from "./status";

describe("order transitions", () => {
  it.each([
    ["placed", "in_production"],
    ["placed", "cancelled"],
    ["in_production", "ready"],
    ["ready", "assigned"],
    ["assigned", "out_for_delivery"],
    ["out_for_delivery", "delivered"],
    ["out_for_delivery", "failed"],
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
    ["assigned", "delivered"],
    ["assigned", "failed"],
    ["ready", "out_for_delivery"],
    ["out_for_delivery", "cancelled"],
    ["out_for_delivery", "ready"],
    ["failed", "out_for_delivery"],
    ["delivered", "failed"],
    ["cancelled", "placed"],
  ] as const)("rejects %s -> %s", (from, to) => {
    expect(canTransition("orders", from, to)).toBe(false);
  });

  it("failed is only reachable from out_for_delivery", () => {
    const sources = ORDER_STATUSES.filter((from) => canTransition("orders", from, "failed"));
    expect(sources).toEqual(["out_for_delivery"]);
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
    expect(targets).not.toContain("out_for_delivery");
  });

  it("only take an order back from a driver before loading", () => {
    expect(MANAGER_ORDER_MOVES.assigned).toEqual(["ready"]);
    expect(MANAGER_ORDER_MOVES.out_for_delivery).toBeUndefined();
    expect(canTransition("orders", "out_for_delivery", "ready")).toBe(false);
  });

  it("send orders back to pending only from before dispatch (reopen day)", () => {
    expect(canTransition("orders", "in_production", "placed")).toBe(true);
    expect(canTransition("orders", "ready", "placed")).toBe(true);
    for (const from of ["assigned", "out_for_delivery", "delivered", "failed", "cancelled"] as const) expect(canTransition("orders", from, "placed")).toBe(false);
  });

  it("label the two ways back to ready differently", () => {
    expect(moveLabel("assigned", "ready")).toBe("Hủy phân công");
    expect(moveLabel("failed", "ready")).toBe("Giao lại");
    expect(moveLabel("placed", "cancelled")).toBe("Hủy");
  });
});
