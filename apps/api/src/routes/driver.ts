import { Hono } from "hono";
import { z } from "zod";
import { check, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { role, valid, type ApiEnv } from "../http";
import { removeDeliveryPhoto, uploadDeliveryPhoto } from "../lib/delivery-photos";
import { transition } from "../lib/transition";

const orderParam = valid("param", z.object({ id }));

/** A driver's own orders: load, deliver (with an optional proof photo), fail, or hand back. */
export const driver = new Hono<ApiEnv>()
  .use(role("driver"))
  /**
   * One UPDATE moves exactly the listed orders the driver still has waiting, so it is atomic and
   * re-submitting is a no-op; orders dispatched after the page loaded stay "Chờ lên xe".
   */
  .post("/orders/depart", valid("json", z.object({ order_ids: z.array(id).min(1, "Không có đơn chờ lên xe") })), async (c) => {
    const moved = unwrap(
      await db()
        .from("orders")
        .update({ status: "out_for_delivery", departed_at: new Date().toISOString() })
        .eq("driver_id", c.get("staff").id)
        .eq("status", "assigned")
        .in("id", c.req.valid("json").order_ids)
        .select("id"),
    );
    return c.json({ message: moved.length ? `Đã xác nhận ${moved.length} đơn lên xe` : "Các đơn này đã được xác nhận lên xe" });
  })
  /** multipart/form-data with an optional `photo` file. */
  .post("/orders/:id/complete", orderParam, valid("form", z.object({ photo: z.instanceof(File).or(z.literal("")).optional() })), async (c) => {
    const { id: orderId } = c.req.valid("param");
    const photoPath = await uploadDeliveryPhoto(c.env.FILES, orderId, c.req.valid("form").photo ?? null);
    try {
      await transition("orders", orderId, "delivered", {
        scope: { driver_id: c.get("staff").id },
        patch: { delivered_at: new Date().toISOString(), delivery_photo_path: photoPath },
      });
    } catch (e) {
      if (photoPath) await removeDeliveryPhoto(c.env.FILES, photoPath);
      throw e;
    }
    return c.json({});
  })
  .post("/orders/:id/fail", orderParam, valid("json", z.object({ reason: z.string().trim().min(1, "Nhập lý do giao thất bại") })), async (c) => {
    const { id: orderId } = c.req.valid("param");
    await transition("orders", orderId, "failed", { scope: { driver_id: c.get("staff").id }, patch: { fail_reason: c.req.valid("json").reason } });
    return c.json({});
  })
  /** "Trả đơn": before loading, the driver hands the order back to Đã nhận hàng so the manager can assign someone else. */
  .post("/orders/:id/return", orderParam, valid("json", z.object({ reason: z.string().trim().min(1, "Nhập lý do trả đơn").max(500) })), async (c) => {
    const me = c.get("staff");
    const { id: orderId } = c.req.valid("param");
    const { reason } = c.req.valid("json");
    const { code } = unwrap(await db().from("orders").select("code").eq("id", orderId).eq("driver_id", me.id).single());
    await transition("orders", orderId, "ready", {
      scope: { driver_id: me.id },
      patch: { driver_id: null, departed_at: null, returned_by: me.id, return_reason: reason },
    });
    check(await db().from("admin_events").insert({ staff_id: me.id, action: "driver_return", detail: { code, reason } }));
    return c.json({ message: `Đã trả đơn ${code} cho quản lý` });
  });
