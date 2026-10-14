"use server";

import { z } from "zod";
import { DomainError, run, type ActionResult } from "@/lib/action";
import { requireRole } from "@/lib/auth";
import { formatVnd } from "@/lib/domain/money";
import { TIER_LABEL } from "@/lib/domain/pricing";
import { collectNumbers, district, parseForm, phone } from "@/lib/form";
import { placeOrder } from "@/lib/orders";

const schema = z.object({
  name: z.string().trim().min(1, "Nhập tên khách"),
  phone,
  address: z.string().trim().min(1, "Nhập địa chỉ"),
  district,
  note: z.string().trim().default(""),
});

export async function placeStaffOrder(_prev: ActionResult, fd: FormData): Promise<ActionResult> {
  return run(async () => {
    const me = await requireRole("sale", "manager");
    const input = parseForm(schema, fd);
    const items = collectNumbers(fd, "qty_").map((q) => ({ pack_id: q.id, pack_qty: q.value }));
    if (items.length === 0) throw new DomainError("Nhập số lượng cho ít nhất 1 sản phẩm");
    if (items.some((i) => !Number.isInteger(i.pack_qty))) throw new DomainError("Số lượng phải là số nguyên");
    const order = await placeOrder({
      ...input,
      items,
      createdBy: me.role === "sale" ? "sale" : "manager",
      createdByStaffId: me.id,
      claimSaleId: me.role === "sale" ? me.id : null,
    });
    const base = `Đã tạo đơn ${order.code} · ${TIER_LABEL[order.tier]} · Tổng ${formatVnd(order.total)}, ngày sản xuất ${order.production_date}.`;
    return order.claimed_by_other ? `${base} Lưu ý: khách này thuộc nhân viên khác, đơn tính cho nhân viên đó.` : base;
  });
}
