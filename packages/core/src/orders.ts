import { z } from "zod";
import { DomainError, unwrap } from "./action";
import { db, type Enums, type Tables } from "./db";
import type { CatalogProduct } from "./domain/catalog";
import type { Destination } from "./domain/destination";
import { priceLines } from "./domain/pricing";
import { productionDate } from "./domain/time";


const packQty = z.number().int("Số lượng phải là số nguyên").positive().max(100000);

export const orderItems = z.array(z.object({ pack_id: z.number().int().positive(), pack_qty: packQty })).min(1, "Giỏ hàng trống");
export type OrderItemInput = z.infer<typeof orderItems>[number];

export async function getSettings() {
  return unwrap(await db().from("settings").select("*").single());
}

/** Products on sale with their packs on sale, smallest pack first. */
export async function loadCatalog(): Promise<CatalogProduct[]> {
  const rows = unwrap(
    await db()
      .from("products")
      .select("id, name, description, image_url, product_packs(id, name, kg_per_unit, price_per_kg, image_url, active)")
      .eq("active", true)
      .order("id"),
  );
  return rows
    .map(({ product_packs, ...p }) => ({
      ...p,
      packs: product_packs
        .filter((pk) => pk.active)
        .map(({ id, name, kg_per_unit, price_per_kg, image_url }) => ({ id, name, kg_per_unit, price_per_kg, image_url }))
        .sort((a, b) => a.kg_per_unit - b.kg_per_unit),
    }))
    .filter((p) => p.packs.length > 0);
}

type PlaceOrderInput = {
  phone: string;
  name: string;
  destination: Destination;
  note: string;
  items: OrderItemInput[];
  createdBy: Enums<"order_creator">;
  createdByStaffId: number | null;
  claimSaleId: number | null;
};

const placedOrder = z.object({
  order_id: z.number(),
  code: z.string(),
  production_date: z.string(),
  total: z.number(),
  sale_id: z.number().nullable(),
  claimed_by_other: z.boolean(),
});
export type PlacedOrder = z.infer<typeof placedOrder>;

/** Prices the order server-side from the catalog; clients only ever send pack ids and quantities. */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const [settings, catalog] = await Promise.all([getSettings(), loadCatalog()]);
  const packs = new Map(catalog.flatMap((product) => product.packs.map((pack) => [pack.id, pack] as const)));
  const qtyByPack = new Map<number, number>();
  for (const i of input.items) qtyByPack.set(i.pack_id, (qtyByPack.get(i.pack_id) ?? 0) + i.pack_qty);
  const lines = [...qtyByPack].map(([packId, qty]) => {
    const pack = packs.get(packId);
    if (!pack) throw new DomainError("Có sản phẩm không còn bán, vui lòng tải lại trang");
    return { packId, packQty: qty, kgPerUnit: pack.kg_per_unit, pricePerKg: pack.price_per_kg };
  });
  const priced = priceLines(lines);

  const result = unwrap(
    await db().rpc("place_order", {
      p_phone: input.phone,
      p_name: input.name,
      p_country: input.destination.country,
      p_region: input.destination.region,
      p_district: input.destination.district,
      p_postcode: input.destination.postcode ?? undefined,
      p_address: input.destination.address,
      p_company: input.destination.company ?? undefined,
      p_note: input.note,
      p_items: priced.lines.map((l) => ({
        pack_id: l.packId,
        pack_qty: l.packQty,
        kg_per_unit: l.kgPerUnit,
        price_per_kg: l.pricePerKg,
        line_total: l.lineTotal,
      })),
      p_production_date: productionDate(new Date(), settings.cutoff_time, settings.timezone),
      p_created_by: input.createdBy,
      p_created_by_staff_id: input.createdByStaffId ?? undefined,
      p_claim_sale_id: input.claimSaleId ?? undefined,
    }),
  );
  return placedOrder.parse(result);
}

export async function saleIdForRefCode(refCode: string | undefined): Promise<number | null> {
  if (!refCode) return null;
  const { data } = await db()
    .from("staff")
    .select("id")
    .eq("ref_code", refCode.toUpperCase())
    .eq("role", "sale")
    .eq("active", true)
    .maybeSingle();
  return data?.id ?? null;
}
