import "server-only";
import { z } from "zod";
import { DomainError, unwrap } from "@/lib/action";
import { db, type Enums, type Tables } from "@/lib/db";
import type { CatalogProduct } from "@/lib/domain/catalog";
import type { District } from "@/lib/domain/districts";
import { priceLines, type PriceTier, type PricingTerms } from "@/lib/domain/pricing";
import { productionDate } from "@/lib/domain/time";


const packQty = z.number().int("Số lượng phải là số nguyên").positive().max(100000);

export const itemsJson = z
  .string()
  .transform((s, ctx) => {
    try {
      return JSON.parse(s) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Giỏ hàng không hợp lệ" });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.object({ pack_id: z.number().int().positive(), pack_qty: packQty })).min(1, "Giỏ hàng trống"));
export type OrderItemInput = z.infer<typeof itemsJson>[number];

export async function getSettings() {
  return unwrap(await db().from("settings").select("*").single());
}

export function pricingTerms(s: Pick<Tables<"settings">, "retail_markup_pct" | "wholesale_min_kg" | "wholesale_min_total">): PricingTerms {
  return { retailMarkupPct: s.retail_markup_pct, wholesaleMinKg: s.wholesale_min_kg, wholesaleMinTotal: s.wholesale_min_total };
}

/** Products on sale with their packs on sale, smallest pack first. */
export async function loadCatalog(): Promise<CatalogProduct[]> {
  const rows = unwrap(
    await db()
      .from("products")
      .select("id, name, description, image_url, price_per_kg, product_packs(id, name, kg_per_unit, image_url, active)")
      .eq("active", true)
      .order("id"),
  );
  return rows
    .map(({ product_packs, ...p }) => ({
      ...p,
      packs: product_packs
        .filter((pk) => pk.active)
        .map(({ id, name, kg_per_unit, image_url }) => ({ id, name, kg_per_unit, image_url }))
        .sort((a, b) => a.kg_per_unit - b.kg_per_unit),
    }))
    .filter((p) => p.packs.length > 0);
}

type PlaceOrderInput = {
  phone: string;
  name: string;
  address: string;
  district: District;
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
export type PlacedOrder = z.infer<typeof placedOrder> & { tier: PriceTier };

/** Prices the order server-side from the catalog; clients only ever send pack ids and quantities. */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const [settings, catalog] = await Promise.all([getSettings(), loadCatalog()]);
  const packs = new Map(catalog.flatMap((product) => product.packs.map((pack) => [pack.id, { product, pack }] as const)));
  const qtyByPack = new Map<number, number>();
  for (const i of input.items) qtyByPack.set(i.pack_id, (qtyByPack.get(i.pack_id) ?? 0) + i.pack_qty);
  const lines = [...qtyByPack].map(([packId, qty]) => {
    const found = packs.get(packId);
    if (!found) throw new DomainError("Có sản phẩm không còn bán, vui lòng tải lại trang");
    return { packId, packQty: qty, kgPerUnit: found.pack.kg_per_unit, wholesalePerKg: found.product.price_per_kg };
  });
  const terms = pricingTerms(settings);
  const priced = priceLines(lines, terms);

  const result = unwrap(
    await db().rpc("place_order", {
      p_phone: input.phone,
      p_name: input.name,
      p_address: input.address,
      p_district: input.district,
      p_note: input.note,
      p_items: priced.lines.map((l) => ({
        pack_id: l.packId,
        pack_qty: l.packQty,
        kg_per_unit: l.kgPerUnit,
        wholesale_price_per_kg: l.wholesalePerKg,
        price_per_kg: l.pricePerKg,
        line_total: l.lineTotal,
      })),
      p_price_tier: priced.tier,
      p_retail_markup_pct: terms.retailMarkupPct,
      p_wholesale_min_kg: terms.wholesaleMinKg,
      p_wholesale_min_total: terms.wholesaleMinTotal,
      p_production_date: productionDate(new Date(), settings.cutoff_time, settings.timezone),
      p_created_by: input.createdBy,
      p_created_by_staff_id: input.createdByStaffId ?? undefined,
      p_claim_sale_id: input.claimSaleId ?? undefined,
    }),
  );
  return { ...placedOrder.parse(result), tier: priced.tier };
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
