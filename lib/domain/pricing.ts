import type { Database } from "../database.types";

/** The single pricing rule. Server actions price every order with it; the UI uses it only to preview. */

export type PriceTier = Database["public"]["Enums"]["price_tier"];

export const TIER_LABEL: Record<PriceTier, string> = { si: "Giá sỉ", le: "Giá lẻ" };

export type PricingTerms = {
  retailMarkupPct: number;
  wholesaleMinKg: number;
  wholesaleMinTotal: number;
};

export type LineInput = { packQty: number; kgPerUnit: number; wholesalePerKg: number };

export type PricedLine<L extends LineInput> = L & { qtyKg: number; pricePerKg: number; lineTotal: number };

export type PricedOrder<L extends LineInput> = {
  tier: PriceTier;
  totalKg: number;
  total: number;
  lines: PricedLine<L>[];
  /** What a retail order still lacks to reach wholesale, by either threshold; null once wholesale. */
  toWholesale: { kg: number; vnd: number } | null;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Giá lẻ = Giá sỉ × (1 + markup%), rounded half-up to the nearest 100đ. Integer math keeps .5 cases exact. */
export function retailPerKg(wholesalePerKg: number, markupPct: number): number {
  const basisPoints = Math.round(markupPct * 100);
  return Math.round((wholesalePerKg * (10000 + basisPoints)) / 1_000_000) * 100;
}

export function perKgPrice(tier: PriceTier, wholesalePerKg: number, terms: PricingTerms): number {
  return tier === "si" ? wholesalePerKg : retailPerKg(wholesalePerKg, terms.retailMarkupPct);
}

export function packPrice(kgPerUnit: number, pricePerKg: number): number {
  return Math.round(kgPerUnit * pricePerKg);
}

export const lineKg = (line: LineInput) => round2(line.packQty * line.kgPerUnit);

const totalKgOf = (lines: LineInput[]) => round2(lines.reduce((s, l) => s + lineKg(l), 0));

const totalAt = (lines: LineInput[], tier: PriceTier, terms: PricingTerms) =>
  lines.reduce((s, l) => s + Math.round(lineKg(l) * perKgPrice(tier, l.wholesalePerKg, terms)), 0);

/** Wholesale applies to the whole order once it reaches either threshold; the money threshold is measured at retail prices. */
export function tierFor(lines: LineInput[], terms: PricingTerms): PriceTier {
  return totalKgOf(lines) >= terms.wholesaleMinKg || totalAt(lines, "le", terms) >= terms.wholesaleMinTotal ? "si" : "le";
}

export function priceLines<L extends LineInput>(lines: L[], terms: PricingTerms): PricedOrder<L> {
  const tier = tierFor(lines, terms);
  const priced = lines.map((l) => {
    const qtyKg = lineKg(l);
    const pricePerKg = perKgPrice(tier, l.wholesalePerKg, terms);
    return { ...l, qtyKg, pricePerKg, lineTotal: Math.round(qtyKg * pricePerKg) };
  });
  const totalKg = totalKgOf(lines);
  const total = priced.reduce((s, l) => s + l.lineTotal, 0);
  return {
    tier,
    totalKg,
    total,
    lines: priced,
    toWholesale:
      tier === "si" ? null : { kg: round2(Math.max(0, terms.wholesaleMinKg - totalKg)), vnd: Math.max(0, terms.wholesaleMinTotal - total) },
  };
}
