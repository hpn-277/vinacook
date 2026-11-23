import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { CONTACT_EDITABLE, ORDER_STATUS_LABEL, ORDER_STATUSES, orderMoves } from "@noodle/core/domain/status";
import { destination, id, phone } from "@noodle/core/form";
import { transition } from "../lib/transition";
import { role, valid } from "../http";

const orderParam = valid("param", z.object({ id }));

export async function logUnassign(staffId: number, codes: string[], driverId: number | null) {
  check(await db().from("admin_events").insert({ staff_id: staffId, action: "unassign", detail: { codes, driver_id: driverId } }));
}

/** Dispatch and single-order moves (admin and manager, see orderMoves); editing an order is admin-only. */
export const orders = new Hono()
  .post("/assign", role("admin", "manager"), valid("json", z.object({ driver_id: id, order_ids: z.array(id).min(1, "Chọn ít nhất 1 đơn") })), async (c) => {
    const { driver_id, order_ids } = c.req.valid("json");
    const { data: driver } = await db().from("staff").select("id").eq("id", driver_id).eq("role", "driver").eq("active", true).maybeSingle();
    if (!driver) throw new DomainError("Tài xế không hợp lệ");
    for (const orderId of order_ids) await transition("orders", orderId, "assigned", { patch: { driver_id: driver.id, returned_by: null, return_reason: null } });
    return c.json({ message: `Đã giao ${order_ids.length} đơn cho tài xế` });
  })
  .post("/:id/move", role("admin", "manager"), orderParam, valid("json", z.object({ to: z.enum(ORDER_STATUSES) })), async (c) => {
    const me = c.get("staff");
    const { id: orderId } = c.req.valid("param");
    const { to } = c.req.valid("json");
    const order = unwrap(await db().from("orders").select("code, status, driver_id").eq("id", orderId).single());
    if (!orderMoves(me.role, order.status).includes(to)) throw new DomainError("Thao tác không hợp lệ cho đơn này");
    // Back to Đã nhận hàng drops the driver or the outside carrier, so the order can be dispatched afresh.
    const redispatch = { driver_id: null, departed_at: null, ship_carrier: null, ship_fee: null, ship_note: null, ship_booking_photo_path: null };
    await transition("orders", orderId, to, to === "ready" ? { patch: redispatch } : {});
    if (order.status === "assigned") await logUnassign(me.id, [order.code], order.driver_id);
    return c.json({});
  })
  .use(role("admin"))
  /** "Sửa SĐT, địa chỉ": corrects where the order goes, logging old and new values. The customer record is left alone. */
  .patch(
    "/:id/contact",
    orderParam,
    valid("json", z.object({ phone, destination })),
    async (c) => {
      const me = c.get("staff");
      const { id: orderId } = c.req.valid("param");
      const { phone: newPhone, destination: d } = c.req.valid("json");
      const order = unwrap(
        await db().from("orders").select("code, status, phone, country, region, district, postcode, address, company").eq("id", orderId).single(),
      );
      if (!CONTACT_EDITABLE(order.status)) throw new DomainError(`Đơn ${ORDER_STATUS_LABEL[order.status]} không sửa được`);
      const { code: _code, status: _status, ...before } = order;
      const after = { phone: newPhone, country: d.country, region: d.region, district: d.district, postcode: d.postcode, address: d.address, company: d.company };
      if (JSON.stringify(before) === JSON.stringify(after)) return c.json({ message: "Không có gì thay đổi" });
      check(await db().from("orders").update(after).eq("id", orderId).eq("status", order.status));
      check(await db().from("admin_events").insert({ staff_id: me.id, action: "edit_contact", detail: { code: order.code, before, after } }));
      return c.json({ message: "Đã lưu" });
    },
  )
  /** B/L number and port/airport of loading, once the admin has booked the shipment. Blank clears. */
  .patch(
    "/:id/shipping",
    orderParam,
    valid("json", z.object({ bl_no: z.string().trim().max(100), loading_port: z.string().trim().max(200) })),
    async (c) => {
      const { bl_no, loading_port } = c.req.valid("json");
      check(await db().from("orders").update({ bl_no: bl_no || null, loading_port: loading_port || null }).eq("id", c.req.valid("param").id));
      return c.json({ message: "Đã lưu thông tin vận chuyển" });
    },
  );
