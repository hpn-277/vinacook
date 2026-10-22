import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { CONTACT_EDITABLE, MANAGER_ORDER_MOVES, ORDER_STATUS_LABEL, ORDER_STATUSES } from "@noodle/core/domain/status";
import { district, id, phone } from "@noodle/core/form";
import { transition } from "../lib/transition";
import { role, valid } from "../http";

const orderParam = valid("param", z.object({ id }));

export async function logUnassign(staffId: number, codes: string[], driverId: number | null) {
  check(await db().from("admin_events").insert({ staff_id: staffId, action: "unassign", detail: { codes, driver_id: driverId } }));
}

/** Manager moves on single orders and dispatch. */
export const orders = new Hono()
  .use(role("manager"))
  .post("/assign", valid("json", z.object({ driver_id: id, order_ids: z.array(id).min(1, "Chọn ít nhất 1 đơn") })), async (c) => {
    const { driver_id, order_ids } = c.req.valid("json");
    const { data: driver } = await db().from("staff").select("id").eq("id", driver_id).eq("role", "driver").eq("active", true).maybeSingle();
    if (!driver) throw new DomainError("Tài xế không hợp lệ");
    for (const orderId of order_ids) await transition("orders", orderId, "assigned", { patch: { driver_id: driver.id, returned_by: null, return_reason: null } });
    return c.json({ message: `Đã giao ${order_ids.length} đơn cho tài xế` });
  })
  .post("/:id/move", orderParam, valid("json", z.object({ to: z.enum(ORDER_STATUSES) })), async (c) => {
    const me = c.get("staff");
    const { id: orderId } = c.req.valid("param");
    const { to } = c.req.valid("json");
    const order = unwrap(await db().from("orders").select("code, status, driver_id").eq("id", orderId).single());
    if (!MANAGER_ORDER_MOVES[order.status]?.includes(to)) throw new DomainError("Thao tác không hợp lệ cho đơn này");
    await transition("orders", orderId, to, to === "ready" ? { patch: { driver_id: null, departed_at: null } } : {});
    if (order.status === "assigned") await logUnassign(me.id, [order.code], order.driver_id);
    return c.json({});
  })
  /** "Sửa SĐT, địa chỉ": corrects where the order goes, logging old and new values. The customer record is left alone. */
  .patch(
    "/:id/contact",
    orderParam,
    valid("json", z.object({ phone, address: z.string().trim().min(1, "Nhập địa chỉ").max(500), district })),
    async (c) => {
      const me = c.get("staff");
      const { id: orderId } = c.req.valid("param");
      const contact = c.req.valid("json");
      const order = unwrap(await db().from("orders").select("code, status, phone, address, district").eq("id", orderId).single());
      if (!CONTACT_EDITABLE(order.status)) throw new DomainError(`Đơn ${ORDER_STATUS_LABEL[order.status]} không sửa được`);
      const before = { phone: order.phone, address: order.address, district: order.district };
      const after = { phone: contact.phone, address: contact.address, district: contact.district };
      if (JSON.stringify(before) === JSON.stringify(after)) return c.json({ message: "Không có gì thay đổi" });
      check(await db().from("orders").update(after).eq("id", orderId).eq("status", order.status));
      check(await db().from("admin_events").insert({ staff_id: me.id, action: "edit_contact", detail: { code: order.code, before, after } }));
      return c.json({ message: "Đã lưu" });
    },
  );
