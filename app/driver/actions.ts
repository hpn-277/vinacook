"use server";

import { z } from "zod";
import { DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { id, parseForm } from "@/lib/form";
import { transition } from "@/lib/transition";

const schema = z.object({ order_id: id, to: z.enum(["delivered", "failed"]), reason: z.string().trim().default("") });

export async function finishDelivery(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("driver");
    const { order_id, to, reason } = parseForm(schema, fd);
    if (to === "failed" && !reason) throw new DomainError("Nhập lý do giao thất bại");
    await transition("orders", order_id, to, {
      scope: { driver_id: me.id },
      patch: to === "delivered" ? { delivered_at: new Date().toISOString() } : { fail_reason: reason },
    });
  });
}
