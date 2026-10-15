"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
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
    await transition("orders", order_id, to, to === "ready" ? { patch: { driver_id: null } } : {});
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

export async function setPaid(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { order_id, paid } = parseForm(z.object({ order_id: id, paid: z.enum(["paid", "unpaid"]) }), fd);
    check(await db().from("orders").update({ payment_status: paid }).eq("id", order_id).neq("status", "cancelled"));
  });
}
