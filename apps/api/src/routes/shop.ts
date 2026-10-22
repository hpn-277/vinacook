import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod";
import { db } from "@noodle/core/db";
import { formatVnd } from "@noodle/core/domain/money";
import { TIER_LABEL } from "@noodle/core/domain/pricing";
import { district, phone } from "@noodle/core/form";
import { orderItems, placeOrder, saleIdForRefCode } from "@noodle/core/orders";
import { REF_COOKIE } from "@noodle/core/ref";
import { REORDER_FIELDS, toReorderSource } from "@noodle/core/reorder";
import { role, valid } from "../http";

const contact = {
  phone,
  address: z.string().trim().min(1, "Nhập địa chỉ"),
  district,
  note: z.string().trim().default(""),
  items: orderItems,
};

/** Placing orders: customers from the public shop, sales and the manager on a customer's behalf. */
export const shop = new Hono()
  /** Public. A sale's ref link (cookie set by the web app's /r/<code>) claims the customer. */
  .post("/orders", valid("json", z.object({ name: z.string().trim().min(1, "Nhập tên"), ...contact })), async (c) => {
    const order = await placeOrder({
      ...c.req.valid("json"),
      createdBy: "customer",
      createdByStaffId: null,
      claimSaleId: await saleIdForRefCode(getCookie(c, REF_COOKIE)),
    });
    return c.json({ message: `Đã đặt đơn ${order.code} · ${TIER_LABEL[order.tier]} · Tổng ${formatVnd(order.total)}. Ngày sản xuất: ${order.production_date}.` });
  })
  /** Public. The newest order for a phone the browser remembered; same exposure as the /orders lookup. */
  .get("/last-order", valid("query", z.object({ phone: z.string().default("") })), async (c) => {
    const parsed = phone.safeParse(c.req.valid("query").phone);
    if (!parsed.success) return c.json(null);
    const { data, error } = await db()
      .from("orders")
      .select(REORDER_FIELDS)
      .eq("phone", parsed.data)
      .order("created_at", { ascending: false })
      .order("id", { referencedTable: "order_items" })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    c.header("Cache-Control", "no-store");
    return c.json(data ? toReorderSource(data) : null);
  })
  .post("/staff-orders", role("sale", "manager"), valid("json", z.object({ name: z.string().trim().min(1, "Nhập tên khách"), ...contact })), async (c) => {
    const me = c.get("staff");
    const order = await placeOrder({
      ...c.req.valid("json"),
      createdBy: me.role === "sale" ? "sale" : "manager",
      createdByStaffId: me.id,
      claimSaleId: me.role === "sale" ? me.id : null,
    });
    const base = `Đã tạo đơn ${order.code} · ${TIER_LABEL[order.tier]} · Tổng ${formatVnd(order.total)}, ngày sản xuất ${order.production_date}.`;
    return c.json({ message: order.claimed_by_other ? `${base} Lưu ý: khách này thuộc nhân viên khác, đơn tính cho nhân viên đó.` : base });
  });
