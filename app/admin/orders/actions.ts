"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ORDER_MOVES, ORDER_STATUSES } from "@/lib/domain/status";
import { collectNumbers, district, id, parseForm } from "@/lib/form";
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
    const items = collectNumbers(fd, "qty_", true).map((q) => ({ product_id: q.id, qty_kg: q.value }));
    check(
      await db().rpc("edit_order", {
        p_order_id: input.order_id,
        p_items: items,
        p_address: input.address,
        p_district: input.district,
        p_note: input.note,
      }),
    );
    return "Đã lưu";
  });
}
