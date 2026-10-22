import { Hono } from "hono";
import { z } from "zod";
import { check, DomainError, unwrap } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { ORDER_STATUS_LABEL } from "@noodle/core/domain/status";
import { transition } from "../lib/transition";
import { role, valid } from "../http";
import { logUnassign } from "./orders";

const dateParam = valid("param", z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ") }));

/** A production day's lifecycle, all manager-only. */
export const days = new Hono()
  .use(role("manager"))
  /** Each product's kg goes to the factory it belongs to (trang Sản phẩm). */
  .post("/:date/close", dateParam, async (c) => {
    check(await db().rpc("close_production_day", { p_date: c.req.valid("param").date }));
    return c.json({ message: "Đã chốt ngày và gửi lệnh sản xuất cho xưởng" });
  })
  .post("/:date/receive", dateParam, async (c) => {
    const jobs = unwrap(await db().rpc("receive_day", { p_date: c.req.valid("param").date }));
    return c.json({ message: `Đã nhận hàng ${jobs} lệnh; đơn chuyển sang ${ORDER_STATUS_LABEL.ready}` });
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
  /** "Mở lại ngày": deletes the day's factory jobs and sends its orders back to Chờ xử lý (refused once any order has a driver). */
  .post("/:date/reopen", dateParam, async (c) => {
    const { date } = c.req.valid("param");
    const orders = unwrap(await db().rpc("reopen_production_day", { p_date: date, p_staff_id: c.get("staff").id }));
    return c.json({ message: `Đã mở lại ngày ${date}: ${orders} đơn quay về Chờ xử lý` });
  });
