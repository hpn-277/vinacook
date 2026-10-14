import "server-only";
import { z } from "zod";
import { unwrap } from "@/lib/action";
import { db, type Enums } from "@/lib/db";
import type { District } from "@/lib/domain/districts";
import { productionDate } from "@/lib/domain/time";

export const REF_COOKIE = "ref";

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
  .pipe(
    z
      .array(z.object({ product_id: z.number().int().positive(), qty_kg: z.number().positive().max(100000) }))
      .min(1, "Giỏ hàng trống"),
  );
export type OrderItemInput = z.infer<typeof itemsJson>[number];

export async function getSettings() {
  return unwrap(await db().from("settings").select("*").single());
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
  sale_id: z.number().nullable(),
  claimed_by_other: z.boolean(),
});
export type PlacedOrder = z.infer<typeof placedOrder>;

export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const settings = await getSettings();
  const result = unwrap(
    await db().rpc("place_order", {
      p_phone: input.phone,
      p_name: input.name,
      p_address: input.address,
      p_district: input.district,
      p_note: input.note,
      p_items: input.items,
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
