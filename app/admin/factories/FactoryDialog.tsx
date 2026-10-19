"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/lib/action";
import { saveFactory } from "./actions";

type Factory = { id: number; name: string; address: string | null; phone: string | null; active: boolean };

/** Add (no factory) or edit one factory; closes once saved. */
export function FactoryDialog({ factory: f }: { factory?: Factory }) {
  const [open, setOpen] = useState(false);
  const form = `factory-${f?.id ?? "new"}`;
  const save = async (prev: ActionResult, fd: FormData) => {
    const result = await saveFactory(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {f ? (
          <Button size="sm" variant="outline" aria-label={`Sửa ${f.name}`}>
            <Pencil data-icon="inline-start" />
            Sửa
          </Button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" />
            Thêm xưởng
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{f ? `Sửa ${f.name}` : "Thêm xưởng"}</DialogTitle>
          {!f && <DialogDescription>Sau khi thêm, tạo tài khoản xưởng ở trang Nhân viên và gán sản phẩm cho xưởng ở trang Sản phẩm.</DialogDescription>}
        </DialogHeader>
        <ActionForm action={save}>
          <input type="hidden" name="id" value={f?.id ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-name`}>Tên xưởng</FieldLabel>
              <Input id={`${form}-name`} name="name" defaultValue={f?.name} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-address`}>Địa chỉ</FieldLabel>
              <Input id={`${form}-address`} name="address" defaultValue={f?.address ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-phone`}>Số điện thoại</FieldLabel>
              <Input id={`${form}-phone`} name="phone" type="tel" inputMode="tel" defaultValue={f?.phone ?? ""} />
            </Field>
            <Field orientation="horizontal">
              <Checkbox id={`${form}-active`} name="active" defaultChecked={f?.active ?? true} />
              <FieldLabel htmlFor={`${form}-active`}>Đang hoạt động</FieldLabel>
            </Field>
            <FieldDescription className="-mt-2">Xưởng ngừng hoạt động thì không chốt được ngày có sản phẩm của xưởng đó.</FieldDescription>
            <Button type="submit">{f ? "Lưu" : "Thêm xưởng"}</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
