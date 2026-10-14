"use server";

import { DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { id } from "@/lib/form";
import { transition } from "@/lib/transition";

export async function assignDriver(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const driverId = id.parse(fd.get("driver_id"));
    const { data: driver } = await db().from("staff").select("id").eq("id", driverId).eq("role", "driver").eq("active", true).maybeSingle();
    if (!driver) throw new DomainError("Tài xế không hợp lệ");
    const orderIds = fd.getAll("order_id").map((v) => id.parse(v));
    if (orderIds.length === 0) throw new DomainError("Chọn ít nhất 1 đơn");
    for (const orderId of orderIds) await transition("orders", orderId, "assigned", { patch: { driver_id: driver.id } });
    return `Đã giao ${orderIds.length} đơn cho tài xế`;
  });
}
