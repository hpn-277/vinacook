/** The single pricing rule: each pack has its own đ/kg. The API prices every order with it; the UI uses it only to preview. */

export type LineInput = { packQty: number; kgPerUnit: number; pricePerKg: number };

export type PricedLine<L extends LineInput> = L & { qtyKg: number; lineTotal: number };

export type PricedOrder<L extends LineInput> = { totalKg: number; total: number; lines: PricedLine<L>[] };

const round2 = (n: number) => Math.round(n * 100) / 100;

export function packPrice(kgPerUnit: number, pricePerKg: number): number {
  return Math.round(kgPerUnit * pricePerKg);
}

export const lineKg = (line: Pick<LineInput, "packQty" | "kgPerUnit">) => round2(line.packQty * line.kgPerUnit);

export function priceLines<L extends LineInput>(lines: L[]): PricedOrder<L> {
  const priced = lines.map((l) => {
    const qtyKg = lineKg(l);
    return { ...l, qtyKg, lineTotal: Math.round(qtyKg * l.pricePerKg) };
  });
  return {
    totalKg: round2(priced.reduce((s, l) => s + l.qtyKg, 0)),
    total: priced.reduce((s, l) => s + l.lineTotal, 0),
    lines: priced,
  };
}
