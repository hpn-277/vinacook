import { formatKg } from "./money";
import type { LineInput } from "./pricing";

export type CatalogPack = { id: number; name: string; kg_per_unit: number };
export type CatalogProduct = { id: number; name: string; image_url: string | null; price_per_kg: number; packs: CatalogPack[] };

/** Pack id -> pack quantity. */
export type Cart = Record<string, number>;

export type CartLine = LineInput & { product: CatalogProduct; pack: CatalogPack };

/** Resolves a cart against the live catalog; packs no longer on sale drop out. */
export function cartLines(catalog: CatalogProduct[], cart: Cart): CartLine[] {
  return catalog.flatMap((product) =>
    product.packs
      .filter((pack) => (cart[pack.id] ?? 0) > 0)
      .map((pack) => ({ product, pack, packQty: cart[pack.id], kgPerUnit: pack.kg_per_unit, wholesalePerKg: product.price_per_kg })),
  );
}

export function packSize(pack: { name: string; kg_per_unit: number }): string {
  return `${pack.name} ${formatKg(pack.kg_per_unit)}`;
}

/** "Mì trứng · 2 Bao (50 kg)"; a plain Kg pack reads "Mì trứng · 3 kg". */
export function lineLabel(productName: string, packName: string, packQty: number, qtyKg: number): string {
  const qty = new Intl.NumberFormat("vi-VN").format(packQty);
  const amount = packName.toLowerCase() === "kg" ? formatKg(qtyKg) : `${qty} ${packName} (${formatKg(qtyKg)})`;
  return `${productName} · ${amount}`;
}

export type OrderItemView = { pack_name: string; pack_qty: number; qty_kg: number; products: { name: string } | null };

export const itemLabel = (i: OrderItemView) => lineLabel(i.products?.name ?? "?", i.pack_name, i.pack_qty, i.qty_kg);
