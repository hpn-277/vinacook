import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { ORDER_STATUS_LABEL } from "@noodle/core/domain/status";
import { transition } from "../lib/transition";
import { role, valid } from "../http";
import { logUnassign } from "./orders";

const dateParam = valid("param", z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ") }));

/** A production day's lifecycle, all admin-only. */
export const days = new Hono()
  .use(role("admin"))
  /** Each product's kg goes to the factory it belongs to (trang Sản phẩm). */
  .post("/:date/close", dateParam, async (c) => {
    check(await db().rpc("close_production_day", { p_date: c.req.valid("param").date }));
    return c.json({ message: "Đã gửi đơn cho các xưởng" });
  })
  /** Goods from one or more factories arrived; orders turn Đã nhận hàng once every factory in them has delivered. */
  .post("/:date/receive", dateParam, valid("json", z.object({ factory_ids: z.array(id).min(1, "Chọn ít nhất 1 xưởng") })), async (c) => {
    const { date } = c.req.valid("param");
    const { factory_ids } = c.req.valid("json");
    const ready = unwrap(await db().rpc("receive_factories", { p_date: date, p_factory_ids: factory_ids }));
    return c.json({ message: `Đã nhận hàng ${factory_ids.length} xưởng; ${ready} đơn chuyển sang ${ORDER_STATUS_LABEL.ready}` });
  })
  /** "Hủy phân công tất cả": every order of the day still waiting to be loaded goes back to Đã nhận hàng. */
  .post("/:date/unassign", dateParam, async (c) => {
    const me = c.get("staff");
    const waiting = unwrap(await db().from("orders").select("id, code, driver_id").eq("production_date", c.req.valid("param").date).eq("status", "assigned"));
    if (waiting.length === 0) throw new DomainError("Không có đơn nào đang chờ lên xe");
    for (const o of waiting) await transition("orders", o.id, "ready", { patch: { driver_id: null, departed_at: null } });
    await logUnassign(me.id, waiting.map((o) => o.code), null);
    return c.json({ message: `Đã hủy phân công ${waiting.length} đơn` });
  })
  /** "Rút lại đơn xưởng": deletes the day's factory jobs and sends its orders back to Chờ xử lý (refused once any order has a driver). */
  .post("/:date/reopen", dateParam, async (c) => {
    const { date } = c.req.valid("param");
    const orders = unwrap(await db().rpc("reopen_production_day", { p_date: date, p_staff_id: c.get("staff").id }));
    return c.json({ message: `Đã rút lại đơn xưởng ngày ${date}: ${orders} đơn quay về Chờ xử lý` });
  });
