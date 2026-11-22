import { describe, expect, it } from "vitest";
import { packPrice, priceLines } from "./pricing";

const line = (packQty: number, kgPerUnit: number, pricePerKg: number) => ({ packQty, kgPerUnit, pricePerKg });

describe("priceLines", () => {
  it("prices each pack at its own đ/kg, whatever the order size", () => {
    const order = priceLines([line(2, 5, 32000), line(1, 30, 29000)]);
    expect(order.lines.map((l) => [l.qtyKg, l.pricePerKg, l.lineTotal])).toEqual([
      [10, 32000, 320_000],
      [30, 29000, 870_000],
    ]);
    expect(order.totalKg).toBe(40);
    expect(order.total).toBe(1_190_000);
  });

  it("a big order of small packs still pays the small-pack price", () => {
    expect(priceLines([line(40, 5, 32000)]).total).toBe(200 * 32000);
  });

  it("converts fractional packs to kg without float drift", () => {
    const order = priceLines([line(3, 0.1, 15000)]);
    expect(order.lines[0].qtyKg).toBe(0.3);
    expect(order.lines[0].lineTotal).toBe(4500);
  });

  it("an empty cart is free", () => {
    expect(priceLines([])).toEqual({ totalKg: 0, total: 0, lines: [] });
  });
});

describe("packPrice", () => {
  it("is kg per unit × per-kg price", () => {
    expect(packPrice(5, 32000)).toBe(160_000);
    expect(packPrice(50, 29000)).toBe(1_450_000);
    expect(packPrice(0.5, 31300)).toBe(15650);
  });
});
