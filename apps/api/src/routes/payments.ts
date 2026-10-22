import { Hono } from "hono";
import { z } from "zod";
import { unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { role, valid } from "../http";

const paymentSchema = z.object({
  order_ids: z.array(id).min(1, "Chọn ít nhất 1 đơn"),
  paid: z.boolean(),
  note: z.string().trim().max(500, "Ghi chú tối đa 500 ký tự").optional(),
});

/** Gạch nợ: the cashier or the manager (never the accountant). Orders already in the target state are skipped. */
export const payments = new Hono().post("/", role("cashier", "manager"), valid("json", paymentSchema), async (c) => {
  const { order_ids, paid, note } = c.req.valid("json");
  const changed = unwrap(await db().rpc("set_payment", { p_order_ids: order_ids, p_paid: paid, p_staff_id: c.get("staff").id, p_note: note ?? "" }));
  if (changed === 0) return c.json({ message: "Không có đơn nào thay đổi" });
  return c.json({ message: paid ? `Đã gạch nợ ${changed} đơn` : `Đã bỏ đánh dấu đã thu ${changed} đơn` });
});
