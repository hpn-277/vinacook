"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { priceLines, TIER_LABEL } from "@/lib/domain/pricing";
import { MANAGER_ORDER_MOVES, ORDER_STATUSES } from "@/lib/domain/status";
import { collectNumbers, district, id, parseForm } from "@/lib/form";
import { pricingTerms } from "@/lib/orders";
import { transition } from "@/lib/transition";

const moveSchema = z.object({ order_id: id, to: z.enum(ORDER_STATUSES) });

export async function moveOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { order_id, to } = parseForm(moveSchema, fd);
    const order = unwrap(await db().from("orders").select("status").eq("id", order_id).single());
    if (!MANAGER_ORDER_MOVES[order.status]?.includes(to)) throw new DomainError("Thao tác không hợp lệ cho đơn này");
    await transition("orders", order_id, to, to === "ready" ? { patch: { driver_id: null } } : {});
  });
}

export async function approveAllPlaced(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const date = z.string().parse(fd.get("date"));
    const placed = unwrap(await db().from("orders").select("id").eq("production_date", date).eq("status", "placed"));
    for (const o of placed) await transition("orders", o.id, "approved");
    return `Đã duyệt ${placed.length} đơn`;
  });
}

export async function setPaid(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { order_id, paid } = parseForm(z.object({ order_id: id, paid: z.enum(["paid", "unpaid"]) }), fd);
    check(await db().from("orders").update({ payment_status: paid }).eq("id", order_id).neq("status", "cancelled"));
  });
}

const editSchema = z.object({
  order_id: id,
  address: z.string().trim().min(1, "Nhập địa chỉ"),
  district,
  note: z.string().trim().default(""),
});

export async function editOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const input = parseForm(editSchema, fd);
    const qtyByLine = new Map(collectNumbers(fd, "qty_", true).map((q) => [q.id, q.value]));
    if ([...qtyByLine.values()].some((q) => !Number.isInteger(q))) throw new DomainError("Số lượng phải là số nguyên");
    const order = unwrap(
      await db()
        .from("orders")
        .select("retail_markup_pct, wholesale_min_kg, wholesale_min_total, order_items(id, pack_qty, kg_per_unit, wholesale_price_per_kg)")
        .eq("id", input.order_id)
        .single(),
    );
    const lines = order.order_items.map((i) => ({
      id: i.id,
      packQty: qtyByLine.get(i.id) ?? i.pack_qty,
      kgPerUnit: i.kg_per_unit,
      wholesalePerKg: i.wholesale_price_per_kg,
    }));
    // Repriced with the order's own snapshot terms, so an edit re-derives the tier but never applies today's prices.
    const priced = priceLines(
      lines.filter((l) => l.packQty > 0),
      pricingTerms(order),
    );
    const repriced = new Map(priced.lines.map((l) => [l.id, l]));
    check(
      await db().rpc("edit_order", {
        p_order_id: input.order_id,
        p_lines: lines.map((l) => ({
          id: l.id,
          pack_qty: l.packQty,
          price_per_kg: repriced.get(l.id)?.pricePerKg ?? 0,
          line_total: repriced.get(l.id)?.lineTotal ?? 0,
        })),
        p_price_tier: priced.tier,
        p_address: input.address,
        p_district: input.district,
        p_note: input.note,
      }),
    );
    return `Đã lưu · ${TIER_LABEL[priced.tier]}`;
  });
}
