"use server";

import { z } from "zod";
import { DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { id, parseForm } from "@/lib/form";
import { transition } from "@/lib/transition";

const schema = z.object({
  job_id: id,
  to: z.enum(["accepted", "rejected", "shipped"]),
  reason: z.string().trim().default(""),
});

export async function moveJob(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("factory");
    const { job_id, to, reason } = parseForm(schema, fd);
    if (to === "rejected" && !reason) throw new DomainError("Nhập lý do từ chối");
    await transition("production_jobs", job_id, to, {
      scope: { factory_id: me.factory_id! },
      patch: to === "rejected" ? { rejected_reason: reason } : {},
    });
  });
}
