import { Hono } from "hono";
import { z } from "zod";
import { DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { transition } from "../lib/transition";
import { role, valid } from "../http";

const decision = z.discriminatedUnion("decision", [
  z.object({ decision: z.literal("approved") }),
  z.object({ decision: z.literal("rejected"), note: z.string().trim().min(1, "Nhập lý do không hợp lệ").max(500) }),
]);

/**
 * Checking an order before it goes to the factory. A sale reviews orders of their own customers;
 * admin and manager review any, which covers walk-ins. "Không hợp lệ" cancels the order.
 */
export const reviews = new Hono().use(role("sale", "admin", "manager")).post("/:id", valid("param", z.object({ id })), valid("json", decision), async (c) => {
  const me = c.get("staff");
  const { id: orderId } = c.req.valid("param");
  const body = c.req.valid("json");
  const order = unwrap(await db().from("orders").select("code, status, sale_id").eq("id", orderId).maybeSingle());
  if (!order || (me.role === "sale" && order.sale_id !== me.id)) throw new DomainError("Không tìm thấy hoặc bạn không có quyền");
  if (order.status !== "placed") throw new DomainError(`Đơn ${order.code} đã gửi xưởng hoặc đã hủy, không duyệt lại được`);
  const reviewed = { reviewed_by: me.id, reviewed_at: new Date().toISOString() };
  if (body.decision === "approved") {
    unwrap(await db().from("orders").update({ review_status: "approved", review_note: null, ...reviewed }).eq("id", orderId).eq("status", "placed").select("id"));
    return c.json({ message: `Đã duyệt đơn ${order.code}` });
  }
  await transition("orders", orderId, "cancelled", { patch: { review_status: "rejected", review_note: body.note, ...reviewed } });
  return c.json({ message: `Đơn ${order.code} không hợp lệ, đã hủy` });
});
