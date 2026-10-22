import { describe, expect, it } from "vitest";
import { packPrice, priceLines, retailPerKg, tierFor, type PricingTerms } from "./pricing";

const terms: PricingTerms = { retailMarkupPct: 25, wholesaleMinKg: 50, wholesaleMinTotal: 2_000_000 };
const line = (packQty: number, kgPerUnit: number, wholesalePerKg = 25000) => ({ packQty, kgPerUnit, wholesalePerKg });

describe("retailPerKg", () => {
  it.each([
    [25000, 25, 31300],
    [15000, 25, 18800],
    [24000, 25, 30000],
    [22000, 25, 27500],
    [18000, 12.5, 20300],
    [18000, 0, 18000],
    [10049, 1, 10100],
    [10000, 0.49, 10000],
  ])("%iđ + %s%% = %iđ", (wholesale, pct, retail) => {
    expect(retailPerKg(wholesale, pct)).toBe(retail);
  });
});

describe("tierFor", () => {
  it("exactly the minimum kg is wholesale", () => {
    expect(tierFor([line(1, 25), line(5, 1), line(2, 10, 15000)], terms)).toBe("si");
  });

  it("just under the minimum kg is retail", () => {
    expect(tierFor([line(49.99, 1, 1000)], terms)).toBe("le");
  });

  it("a retail total of exactly the money threshold is wholesale even under the kg threshold", () => {
    expect(tierFor([line(16, 1, 100000)], terms)).toBe("si");
    expect(tierFor([line(15, 1, 100000)], terms)).toBe("le");
  });

  it("the money threshold is measured at retail prices, not wholesale", () => {
    // 16 kg × 80.000 wholesale = 1.280.000; at retail 100.000 = 1.600.000; neither reaches 2.000.000.
    expect(tierFor([line(16, 1, 80000)], terms)).toBe("le");
    // 20 kg × 80.000 = 1.600.000 wholesale, but 20 × 100.000 = 2.000.000 retail.
    expect(tierFor([line(20, 1, 80000)], terms)).toBe("si");
  });
});

describe("priceLines", () => {
  it("prices mixed packs of one product at wholesale for the whole order", () => {
    const order = priceLines([line(2, 25), line(3, 1)], terms);
    expect(order.tier).toBe("si");
    expect(order.totalKg).toBe(53);
    expect(order.lines.map((l) => [l.qtyKg, l.pricePerKg, l.lineTotal])).toEqual([
      [50, 25000, 1_250_000],
      [3, 25000, 75000],
    ]);
    expect(order.total).toBe(1_325_000);
    expect(order.toWholesale).toBeNull();
  });

  it("prices a small order at retail and reports the gap to wholesale", () => {
    const order = priceLines([line(1, 10), line(5, 1)], terms);
    expect(order.tier).toBe("le");
    expect(order.lines.map((l) => l.pricePerKg)).toEqual([31300, 31300]);
    expect(order.total).toBe(15 * 31300);
    expect(order.toWholesale).toEqual({ kg: 35, vnd: 2_000_000 - 15 * 31300 });
  });

  it("applies the order tier to every product, not per line", () => {
    const order = priceLines([line(2, 25), line(1, 1, 15000)], terms);
    expect(order.lines.map((l) => l.pricePerKg)).toEqual([25000, 15000]);
  });

  it("converts fractional packs to kg without float drift", () => {
    const order = priceLines([line(3, 0.1, 15000)], terms);
    expect(order.lines[0].qtyKg).toBe(0.3);
    expect(order.lines[0].lineTotal).toBe(Math.round(0.3 * 18800));
  });

  it("follows a markup change into retail prices", () => {
    expect(priceLines([line(1, 1)], { ...terms, retailMarkupPct: 10 }).total).toBe(27500);
  });
});

describe("packPrice", () => {
  it("is kg per unit × per-kg price", () => {
    expect(packPrice(25, 31300)).toBe(782_500);
    expect(packPrice(0.5, 31300)).toBe(15650);
  });
});
