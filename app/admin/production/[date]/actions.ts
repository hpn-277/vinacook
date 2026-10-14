"use server";

import { z } from "zod";
import { check, DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { id, parseForm } from "@/lib/form";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function closeDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const date = isoDate.parse(fd.get("date"));
    const alloc: { product_id: number; factory_id: number; qty_kg: number }[] = [];
    for (const [key, raw] of fd.entries()) {
      const m = /^alloc_(\d+)_(\d+)$/.exec(key);
      if (!m || typeof raw !== "string" || raw.trim() === "") continue;
      const qty = Number(raw);
      if (!Number.isFinite(qty) || qty < 0) throw new DomainError("Số kg phân bổ không hợp lệ");
      if (qty > 0) alloc.push({ product_id: Number(m[1]), factory_id: Number(m[2]), qty_kg: qty });
    }
    check(await db().rpc("close_production_day", { p_date: date, p_alloc: alloc }));
    return "Đã chốt ngày và gửi lệnh sản xuất cho xưởng";
  });
}

export async function reassignJob(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { job_id, factory_id } = parseForm(z.object({ job_id: id, factory_id: id }), fd);
    check(await db().rpc("reassign_job", { p_job_id: job_id, p_factory_id: factory_id }));
    return "Đã giao lại cho xưởng khác";
  });
}
