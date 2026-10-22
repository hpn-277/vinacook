import { Hono } from "hono";
import { z } from "zod";
import { check } from "@noodle/core/action";
import { db } from "@noodle/core/db";
import { id } from "@noodle/core/form";
import { role, valid } from "../http";

const optionalText = z.preprocess((v) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null), z.string().max(200).nullable());
const factorySchema = z.object({
  name: z.string().trim().min(1, "Nhập tên xưởng").max(100),
  address: optionalText,
  phone: optionalText,
  active: z.boolean(),
});

export const factories = new Hono()
  .use(role("manager"))
  .post("/", valid("json", factorySchema), async (c) => {
    check(await db().from("factories").insert(c.req.valid("json")));
    return c.json({ message: "Đã thêm xưởng" });
  })
  .patch("/:id", valid("param", z.object({ id })), valid("json", factorySchema), async (c) => {
    check(await db().from("factories").update(c.req.valid("json")).eq("id", c.req.valid("param").id));
    return c.json({ message: "Đã lưu" });
  });
