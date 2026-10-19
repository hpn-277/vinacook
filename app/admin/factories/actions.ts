"use server";

import { z } from "zod";
import { check, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseForm } from "@/lib/form";

const optionalText = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(200).nullable());

const factorySchema = z.object({
  id: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().positive().optional()),
  name: z.string().trim().min(1, "Nhập tên xưởng").max(100),
  address: optionalText,
  phone: optionalText,
  active: z.preprocess((v) => v === "on", z.boolean()),
});

export async function saveFactory(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    await requireRole("manager");
    const { id, ...row } = parseForm(factorySchema, fd);
    check(id ? await db().from("factories").update(row).eq("id", id) : await db().from("factories").insert(row));
    return id ? "Đã lưu" : "Đã thêm xưởng";
  });
}
