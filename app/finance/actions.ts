"use server";

import { z } from "zod";
import { DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { id, parseForm } from "@/lib/form";

const paymentSchema = z.object({
  paid: z.enum(["paid", "unpaid"]),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

/** Gạch nợ: the cashier or the manager (never the accountant). Takes one or many `order_id` fields; orders already in the target state are skipped. */
export async function setPayment(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("cashier", "manager");
    const orderIds = fd.getAll("order_id").map((v) => id.parse(v));
    if (orderIds.length === 0) throw new DomainError("Chọn ít nhất 1 đơn");
    const { paid, note } = parseForm(paymentSchema, fd);
    const changed = unwrap(await db().rpc("set_payment", { p_order_ids: orderIds, p_paid: paid === "paid", p_staff_id: me.id, p_note: note ?? "" }));
    if (changed === 0) return "Không có đơn nào thay đổi";
    return paid === "paid" ? `Đã gạch nợ ${changed} đơn` : `Đã bỏ đánh dấu đã thu ${changed} đơn`;
  });
}
