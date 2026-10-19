"use server";

import { z } from "zod";
import { check, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Each product's kg goes to the factory it belongs to (Cài đặt → Sản phẩm). */
export async function closeDay(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const date = isoDate.parse(fd.get("date"));
    check(await db().rpc("close_production_day", { p_date: date }));
    return "Đã chốt ngày và gửi lệnh sản xuất cho xưởng";
  });
}
