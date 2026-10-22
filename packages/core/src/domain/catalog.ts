import { formatKg } from "./money";
import type { LineInput } from "./pricing";

export type CatalogPack = { id: number; name: string; kg_per_unit: number; image_url: string | null };
export type CatalogProduct = {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  price_per_kg: number;
  packs: CatalogPack[];
};

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

const PACK_IMAGE: Record<string, string> = { cây: "/packs/cay.svg", thùng: "/packs/thung.svg", bao: "/packs/bao.svg", túi: "/packs/tui.svg", kg: "/packs/kg.svg" };

/** The stock picture for a pack name ("Thùng" -> /packs/thung.svg); null for names without one. */
export const defaultPackImage = (name: string): string | null => PACK_IMAGE[name.trim().toLowerCase()] ?? null;

/** Packs a new product can start with; the manager picks which ones each product is sold in. */
export const STANDARD_PACKS = [
  { name: "Cây", kg_per_unit: 5, image_url: "/packs/cay.svg" },
  { name: "Thùng", kg_per_unit: 5, image_url: "/packs/thung.svg" },
  { name: "Thùng", kg_per_unit: 10, image_url: "/packs/thung.svg" },
  { name: "Thùng", kg_per_unit: 15, image_url: "/packs/thung.svg" },
  { name: "Bao", kg_per_unit: 30, image_url: "/packs/bao.svg" },
];

export function packSize(pack: { name: string; kg_per_unit: number }): string {
  return `${pack.name} ${formatKg(pack.kg_per_unit)}`;
}

/** One label per pack name, sizes merged and smallest first: ["Cây 5 kg", "Thùng 5/10/15 kg", "Bao 30 kg"]. */
export function packGroupLabels(packs: { name: string; kg_per_unit: number }[]): string[] {
  const sorted = [...packs].sort((a, b) => a.kg_per_unit - b.kg_per_unit);
  return [...Map.groupBy(sorted, (p) => p.name)].map(([name, sizes]) => {
    const kg = sizes.map((p) => new Intl.NumberFormat("vi-VN").format(p.kg_per_unit)).join("/");
    return name.toLowerCase() === "kg" ? "Kg" : `${name} ${kg} kg`;
  });
}

/** What one unit of a pack holds: "1 Thùng = 10 kg"; a plain Kg pack reads "1 kg". */
export function packCaption(pack: { name: string; kg_per_unit: number }): string {
  return pack.name.toLowerCase() === "kg" ? formatKg(pack.kg_per_unit) : `1 ${pack.name} = ${formatKg(pack.kg_per_unit)}`;
}

export const IMAGE_REF_MAX = 500;

/** An image the shop can show: a site path ("/packs/kg.svg") or an http(s) URL. */
export function isImageRef(ref: string): boolean {
  if (ref.length > IMAGE_REF_MAX || /\s/.test(ref)) return false;
  if (ref.startsWith("/")) return !ref.startsWith("//");
  try {
    return ["http:", "https:"].includes(new URL(ref).protocol);
  } catch {
    return false;
  }
}

/** "Mì trứng · 2 Bao (50 kg)"; a plain Kg pack reads "Mì trứng · 3 kg". */
export function lineLabel(productName: string, packName: string, packQty: number, qtyKg: number): string {
  const qty = new Intl.NumberFormat("vi-VN").format(packQty);
  const amount = packName.toLowerCase() === "kg" ? formatKg(qtyKg) : `${qty} ${packName} (${formatKg(qtyKg)})`;
  return `${productName} · ${amount}`;
}

export type OrderItemView = { pack_name: string; pack_qty: number; qty_kg: number; products: { name: string } | null };

export const itemLabel = (i: OrderItemView) => lineLabel(i.products?.name ?? "?", i.pack_name, i.pack_qty, i.qty_kg);

export type LoadLine = { product: string; kg: number; packs: string[] };

/** What goes on the truck: per product, pack counts ("2 Thùng 15 kg") and kg, biggest product first. */
export function loadList(items: OrderItemView[]): LoadLine[] {
  const products = new Map<string, { kg: number; packs: Map<string, { name: string; unitKg: number; qty: number }> }>();
  for (const i of items) {
    const name = i.products?.name ?? "?";
    const product = products.get(name) ?? { kg: 0, packs: new Map() };
    const unitKg = i.qty_kg / i.pack_qty;
    const key = `${i.pack_name}|${unitKg}`;
    const pack = product.packs.get(key) ?? { name: i.pack_name, unitKg, qty: 0 };
    pack.qty += i.pack_qty;
    product.kg += i.qty_kg;
    product.packs.set(key, pack);
    products.set(name, product);
  }
  return [...products]
    .map(([product, { kg, packs }]) => ({
      product,
      kg,
      packs: [...packs.values()]
        .sort((a, b) => b.unitKg - a.unitKg)
        .map((p) => (p.name.toLowerCase() === "kg" ? formatKg(p.qty) : `${p.qty} ${packSize({ name: p.name, kg_per_unit: p.unitKg })}`)),
    }))
    .sort((a, b) => b.kg - a.kg || a.product.localeCompare(b.product, "vi"));
}
