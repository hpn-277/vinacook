import { Hono } from "hono";
import { z } from "zod";
import { orderDetail } from "@noodle/core/queries/order-detail";
import { customerLookup, monthParam, normalizePhone, orderForm, saleActiveOrders, saleCustomers, saleMonthReport } from "@noodle/core/queries/sale";
import { role, valid } from "../http";

/** A sale's own screens (mobile app): dashboard, customers, orders, and what the new-order form needs. */
export const sale = new Hono()
  .use(role("sale"))
  /** `?month=YYYY-MM`, default this month. */
  .get("/dashboard", valid("query", z.object({ month: z.string().optional() })), async (c) => {
    const me = c.get("staff");
    const month = monthParam(c.req.valid("query").month);
    const [active, report] = await Promise.all([saleActiveOrders(me.id), saleMonthReport(me, month)]);
    return c.json({ month, active, report });
  })
  .get("/customers", async (c) => c.json(await saleCustomers(c.get("staff").id)))
  /** Catalog and pricing terms, plus the customer for `?phone=` (null when no phone was given). */
  .get("/order-form", valid("query", z.object({ phone: z.string().optional() })), async (c) => {
    const [form, lookup] = await Promise.all([orderForm(), customerLookup(normalizePhone(c.req.valid("query").phone), c.get("staff").id)]);
    return c.json({ ...form, lookup });
  })
  .get("/orders/:code", valid("param", z.object({ code: z.string() })), async (c) => {
    const detail = await orderDetail(c.req.valid("param").code, { role: "sale", saleId: c.get("staff").id });
    return detail ? c.json(detail) : c.json({ error: "Không tìm thấy đơn hàng" }, 404);
  });
