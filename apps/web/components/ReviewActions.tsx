"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

/** "Duyệt" or "Không hợp lệ" (with a reason, which cancels the order) for an order still waiting to be checked. */
export function ReviewActions({ order, size = "sm" }: { order: { id: number; code: string }; size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <ActionForm action="reviewOrder" confirm={`Duyệt đơn ${order.code}? Đơn sẽ được gửi xưởng khi chốt ngày.`}>
        <input type="hidden" name="order_id" value={order.id} />
        <input type="hidden" name="decision" value="approved" />
        <Button size={size} aria-label={`Duyệt ${order.code}`}>
          Duyệt
        </Button>
      </ActionForm>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size={size} variant="outline" className="text-destructive" aria-label={`Không hợp lệ ${order.code}`}>
            Không hợp lệ
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Đơn {order.code} không hợp lệ</DialogTitle>
            <DialogDescription>Đơn sẽ bị hủy và không gửi xưởng. Quản trị có thể khôi phục nếu cần.</DialogDescription>
          </DialogHeader>
          <ActionForm action="reviewOrder" onSuccess={() => setOpen(false)}>
            <input type="hidden" name="order_id" value={order.id} />
            <input type="hidden" name="decision" value="rejected" />
            <Field>
              <FieldLabel htmlFor={`review-note-${order.id}`}>Lý do</FieldLabel>
              <Textarea id={`review-note-${order.id}`} name="note" required maxLength={500} rows={2} placeholder="Số điện thoại không liên lạc được, đơn đặt nhầm…" />
            </Field>
            <Button type="submit" variant="destructive" className="mt-3">
              Xác nhận không hợp lệ
            </Button>
          </ActionForm>
        </DialogContent>
      </Dialog>
    </div>
  );
}
