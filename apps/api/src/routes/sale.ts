import { Hono } from "hono";
import { z } from "zod";
import { orderDetail } from "@noodle/core/queries/order-detail";
import { parseIsoDate } from "@noodle/core/domain/time";
import { today } from "@noodle/core/period";
import { customerLookup, monthParam, normalizePhone, orderForm, saleCustomers, saleDayOrders, saleMonthDays, saleMonthReport, saleToReview } from "@noodle/core/queries/sale";
import { role, valid } from "../http";

/** A sale's own screens (mobile app): dashboard, customers, orders, and what the new-order form needs. */
export const sale = new Hono()
  .use(role("sale"))
  /** One production day's orders (`?date=YYYY-MM-DD`, default today) and every order still waiting for review. */
  .get("/dashboard", valid("query", z.object({ date: z.string().optional() })), async (c) => {
    const me = c.get("staff");
    const date = parseIsoDate(c.req.valid("query").date ?? null) ?? today();
    const [day, toReview] = await Promise.all([saleDayOrders(me.id, date), saleToReview(me.id)]);
    return c.json({ date, day, toReview });
  })
  /** `?month=YYYY-MM` (default this month): orders per production day, and commission. */
  .get("/month", valid("query", z.object({ month: z.string().optional() })), async (c) => {
    const me = c.get("staff");
    const month = monthParam(c.req.valid("query").month);
    const [days, report] = await Promise.all([saleMonthDays(me.id, month), saleMonthReport(me, month)]);
    return c.json({ month, days, report });
  })
  .get("/customers", async (c) => c.json(await saleCustomers(c.get("staff").id)))
  /** Catalog, plus the customer for `?phone=` (null when no phone was given). */
  .get("/order-form", valid("query", z.object({ phone: z.string().optional() })), async (c) => {
    const [form, lookup] = await Promise.all([orderForm(), customerLookup(normalizePhone(c.req.valid("query").phone), c.get("staff").id)]);
    return c.json({ ...form, lookup });
  })
  .get("/orders/:code", valid("param", z.object({ code: z.string() })), async (c) => {
    const detail = await orderDetail(c.req.valid("param").code, { role: "sale", saleId: c.get("staff").id });
    return detail ? c.json(detail) : c.json({ error: "Không tìm thấy đơn hàng" }, 404);
  });
