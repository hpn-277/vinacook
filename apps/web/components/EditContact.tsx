"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { DISTRICTS } from "@noodle/core/domain/districts";

export function EditContact({ order }: { order: { id: number; code: string; phone: string; address: string; district: string } }) {
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
            <Field>
              <FieldLabel htmlFor="edit-address">Địa chỉ</FieldLabel>
              <Input id="edit-address" name="address" defaultValue={order.address} required />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-district">Quận/Huyện</FieldLabel>
              <NativeSelect id="edit-district" name="district" required defaultValue={order.district} className="w-full">
                {DISTRICTS.map((d) => (
                  <NativeSelectOption key={d}>{d}</NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Button type="submit">Lưu</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
