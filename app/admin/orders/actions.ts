"use server";

import { z } from "zod";
import { DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { MANAGER_ORDER_MOVES, ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/lib/domain/status";
import { id, parseForm } from "@/lib/form";
import { transition } from "@/lib/transition";

const moveSchema = z.object({ order_id: id, to: z.enum(ORDER_STATUSES) });

export async function moveOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { order_id, to } = parseForm(moveSchema, fd);
    const order = unwrap(await db().from("orders").select("status").eq("id", order_id).single());
    if (!MANAGER_ORDER_MOVES[order.status]?.includes(to)) throw new DomainError("Thao tác không hợp lệ cho đơn này");
    await transition("orders", order_id, to, to === "ready" ? { patch: { driver_id: null, departed_at: null } } : {});
  });
}

export async function receiveDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const date = z.string().parse(fd.get("date"));
    const jobs = unwrap(await db().rpc("receive_day", { p_date: date }));
    return `Đã nhận hàng ${jobs} lệnh; đơn chuyển sang ${ORDER_STATUS_LABEL.ready}`;
  });
}

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
