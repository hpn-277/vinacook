"use server";

import { z } from "zod";
import { check, DomainError, run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { CONTACT_EDITABLE, MANAGER_ORDER_MOVES, ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/lib/domain/status";
import { district, id, parseForm, phone } from "@/lib/form";
import { transition } from "@/lib/transition";

const moveSchema = z.object({ order_id: id, to: z.enum(ORDER_STATUSES) });

export async function moveOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const { order_id, to } = parseForm(moveSchema, fd);
    const order = unwrap(await db().from("orders").select("code, status, driver_id").eq("id", order_id).single());
    if (!MANAGER_ORDER_MOVES[order.status]?.includes(to)) throw new DomainError("Thao tác không hợp lệ cho đơn này");
    await transition("orders", order_id, to, to === "ready" ? { patch: { driver_id: null, departed_at: null } } : {});
    if (order.status === "assigned") await logUnassign(me.id, [order.code], order.driver_id);
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
    for (const orderId of orderIds) await transition("orders", orderId, "assigned", { patch: { driver_id: driver.id, returned_by: null, return_reason: null } });
    return `Đã giao ${orderIds.length} đơn cho tài xế`;
  });
}

async function logUnassign(staffId: number, codes: string[], driverId: number | null) {
  check(await db().from("admin_events").insert({ staff_id: staffId, action: "unassign", detail: { codes, driver_id: driverId } }));
}

/** "Hủy phân công tất cả": every order of the day still waiting to be loaded goes back to Đã nhận hàng. */
export async function unassignDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const date = z.string().parse(fd.get("date"));
    const waiting = unwrap(await db().from("orders").select("id, code, driver_id").eq("production_date", date).eq("status", "assigned"));
    if (waiting.length === 0) throw new DomainError("Không có đơn nào đang chờ lên xe");
    for (const o of waiting) await transition("orders", o.id, "ready", { patch: { driver_id: null, departed_at: null } });
    await logUnassign(me.id, waiting.map((o) => o.code), null);
    return `Đã hủy phân công ${waiting.length} đơn`;
  });
}

/** "Mở lại ngày": deletes the day's factory jobs and sends its orders back to Chờ xử lý (refused once any order has a driver). */
export async function reopenDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const date = z.string().parse(fd.get("date"));
    const orders = unwrap(await db().rpc("reopen_production_day", { p_date: date, p_staff_id: me.id }));
    return `Đã mở lại ngày ${date}: ${orders} đơn quay về Chờ xử lý`;
  });
}

const contactSchema = z.object({ order_id: id, phone, address: z.string().trim().min(1, "Nhập địa chỉ").max(500), district });

/** "Sửa SĐT, địa chỉ": corrects where the order goes, logging old and new values. The customer record is left alone. */
export async function editContact(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("manager");
    const { order_id, ...contact } = parseForm(contactSchema, fd);
    const order = unwrap(await db().from("orders").select("code, status, phone, address, district").eq("id", order_id).single());
    if (!CONTACT_EDITABLE(order.status)) throw new DomainError(`Đơn ${ORDER_STATUS_LABEL[order.status]} không sửa được`);
    const before = { phone: order.phone, address: order.address, district: order.district };
    if (JSON.stringify(before) === JSON.stringify(contact)) return "Không có gì thay đổi";
    check(await db().from("orders").update(contact).eq("id", order_id).eq("status", order.status));
    check(await db().from("admin_events").insert({ staff_id: me.id, action: "edit_contact", detail: { code: order.code, before, after: contact } }));
    return "Đã lưu";
  });
}
