"use server";

import { z } from "zod";
import { run, unwrap, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { id, kg, parseForm } from "@/lib/form";

export async function receiveJob(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { job_id, received_kg } = parseForm(z.object({ job_id: id, received_kg: kg }), fd);
    const allIn = unwrap(await db().rpc("receive_job", { p_job_id: job_id, p_received_kg: received_kg }));
    return allIn ? "Đã nhận đủ các lệnh; đơn chuyển sang Sẵn sàng giao" : "Đã nhận hàng";
  });
}
