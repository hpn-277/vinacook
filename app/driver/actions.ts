"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { removeDeliveryPhoto, uploadDeliveryPhoto } from "@/lib/delivery-photos";
import { id, parseForm } from "@/lib/form";
import { transition } from "@/lib/transition";

/**
 * One UPDATE moves exactly the listed orders the driver still has waiting, so it is atomic and
 * re-submitting is a no-op; orders dispatched after the page loaded stay "Chờ lên xe".
 */
export async function departOrders(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("driver");
    const orderIds = fd.getAll("order_id").map((v) => id.parse(v));
    if (orderIds.length === 0) throw new DomainError("Không có đơn chờ lên xe");
    const moved = unwrap(
      await db()
        .from("orders")
        .update({ status: "out_for_delivery", departed_at: new Date().toISOString() })
        .eq("driver_id", me.id)
        .eq("status", "assigned")
        .in("id", orderIds)
        .select("id"),
    );
    return moved.length ? `Đã xác nhận ${moved.length} đơn lên xe` : "Các đơn này đã được xác nhận lên xe";
  });
}

export async function completeDelivery(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("driver");
    const orderId = id.parse(fd.get("order_id"));
    const photoPath = await uploadDeliveryPhoto(orderId, fd.get("photo"));
    try {
      await transition("orders", orderId, "delivered", {
        scope: { driver_id: me.id },
        patch: { delivered_at: new Date().toISOString(), delivery_photo_path: photoPath },
      });
    } catch (e) {
      if (photoPath) await removeDeliveryPhoto(photoPath);
      throw e;
    }
  });
}

const failSchema = z.object({ order_id: id, reason: z.string().trim().min(1, "Nhập lý do giao thất bại") });

export async function failDelivery(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("driver");
    const { order_id, reason } = parseForm(failSchema, fd);
    await transition("orders", order_id, "failed", { scope: { driver_id: me.id }, patch: { fail_reason: reason } });
  });
}

const returnSchema = z.object({ order_id: id, reason: z.string().trim().min(1, "Nhập lý do trả đơn").max(500) });

/** "Trả đơn": before loading, the driver hands the order back to Đã nhận hàng so the manager can assign someone else. */
export async function returnOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("driver");
    const { order_id, reason } = parseForm(returnSchema, fd);
    const { code } = unwrap(await db().from("orders").select("code").eq("id", order_id).eq("driver_id", me.id).single());
    await transition("orders", order_id, "ready", {
      scope: { driver_id: me.id },
      patch: { driver_id: null, departed_at: null, returned_by: me.id, return_reason: reason },
    });
    check(await db().from("admin_events").insert({ staff_id: me.id, action: "driver_return", detail: { code, reason } }));
    return `Đã trả đơn ${code} cho quản lý`;
  });
}
