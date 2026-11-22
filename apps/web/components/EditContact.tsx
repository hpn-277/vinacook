"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DestinationFields } from "@/components/DestinationFields";
import type { Destination } from "@noodle/core/domain/destination";

export function EditContact({ order }: { order: Destination & { id: number; code: string; phone: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="xs" variant="outline" aria-label={`Sửa SĐT, địa chỉ đơn ${order.code}`}>
          <Pencil data-icon="inline-start" />
          Sửa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa SĐT, địa chỉ đơn {order.code}</DialogTitle>
        </DialogHeader>
        <ActionForm action="editContact" onSuccess={() => setOpen(false)}>
          <input type="hidden" name="order_id" value={order.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="edit-phone">Số điện thoại</FieldLabel>
              <Input id="edit-phone" name="phone" type="tel" inputMode="tel" defaultValue={order.phone} required />
            </Field>
            <DestinationFields id="edit" value={order} />
            <Button type="submit">Lưu</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
