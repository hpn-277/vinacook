"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { run, type ActionResult } from "@/lib/action";
import { district, parseForm, phone } from "@/lib/form";
import { itemsJson, placeOrder, REF_COOKIE, saleIdForRefCode } from "@/lib/orders";

const checkoutSchema = z.object({
  name: z.string().trim().min(1, "Nhập tên"),
  phone,
  address: z.string().trim().min(1, "Nhập địa chỉ"),
  district,
  note: z.string().trim().default(""),
  items: itemsJson,
});

export async function placeCustomerOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const input = parseForm(checkoutSchema, fd);
    const order = await placeOrder({
      ...input,
      createdBy: "customer",
      createdByStaffId: null,
      claimSaleId: await saleIdForRefCode((await cookies()).get(REF_COOKIE)?.value),
    });
    return `Đã đặt đơn ${order.code}. Ngày sản xuất: ${order.production_date}.`;
  });
}
