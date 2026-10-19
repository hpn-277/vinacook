"use client";

import { Pencil } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action";
import type { StaffRole } from "@/lib/auth";
import { updateStaff } from "./actions";

type EditableStaff = {
  id: number;
  name: string;
  phone: string | null;
  role: StaffRole;
  commission_pct: number | null;
  factory_id: number | null;
  ref_code: string | null;
  active: boolean;
};

export function EditStaffDialog({
  staff: s,
  roles,
  factories,
  email,
  isSelf,
}: {
  staff: EditableStaff;
  isSelf: boolean;
  roles: [StaffRole, string][];
  factories: { id: number; name: string }[];
  email?: string;
}) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(s.role);
  const form = `staff-${s.id}`;
  const save = async (prev: ActionResult, fd: FormData) => {
    const result = await updateStaff(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRole(s.role);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Sửa ${s.name}`}>
          <Pencil data-icon="inline-start" />
          Sửa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sửa {s.name}</DialogTitle>
          {email && <DialogDescription>{email}</DialogDescription>}
        </DialogHeader>
        <ActionForm action={save}>
          <input type="hidden" name="id" value={s.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-name`}>Tên</FieldLabel>
              <Input id={`${form}-name`} name="name" defaultValue={s.name} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-phone`}>Số điện thoại</FieldLabel>
              <Input id={`${form}-phone`} name="phone" type="tel" inputMode="tel" defaultValue={s.phone ?? ""} />
            </Field>
            {isSelf ? (
              <Field>
                <FieldLabel>Vai trò</FieldLabel>
                <input type="hidden" name="role" value={s.role} />
                <p className="text-sm">{roles.find(([value]) => value === s.role)?.[1]}</p>
                <FieldDescription>Không thể tự đổi vai trò của mình.</FieldDescription>
              </Field>
            ) : (
              <Field>
                <FieldLabel htmlFor={`${form}-role`}>Vai trò</FieldLabel>
                <NativeSelect id={`${form}-role`} name="role" defaultValue={s.role} onChange={(e) => setRole(e.target.value as StaffRole)} className="w-full">
                  {roles.map(([value, label]) => (
                    <NativeSelectOption key={value} value={value}>
                      {label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {role === "sale" && (
              <Field>
                <FieldLabel htmlFor={`${form}-pct`}>% hoa hồng</FieldLabel>
                <Input id={`${form}-pct`} name="commission_pct" type="number" step="0.1" min={0} max={100} defaultValue={s.commission_pct ?? 5} />
                <FieldDescription>{s.ref_code ? `Mã giới thiệu ${s.ref_code}` : "Mã giới thiệu được tạo tự động khi lưu."}</FieldDescription>
              </Field>
            )}
            {role === "factory" && (
              <Field>
                <FieldLabel htmlFor={`${form}-factory`}>Xưởng</FieldLabel>
                <NativeSelect id={`${form}-factory`} name="factory_id" required defaultValue={s.factory_id ?? ""} className="w-full">
                  <NativeSelectOption value="" disabled>
                    Chọn xưởng
                  </NativeSelectOption>
                  {factories.map((f) => (
                    <NativeSelectOption key={f.id} value={f.id}>
                      {f.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            )}
            {s.role === "sale" && role !== "sale" && (
              <FieldDescription className="text-amber-700">Bỏ vai trò NVKD sẽ xóa mã giới thiệu {s.ref_code}; link giới thiệu cũ ngừng hoạt động.</FieldDescription>
            )}
            <Field orientation="horizontal">
              <Checkbox id={`${form}-active`} name="active" defaultChecked={s.active} />
              <FieldLabel htmlFor={`${form}-active`}>Đang làm việc</FieldLabel>
            </Field>
            <FieldDescription className="-mt-2">Bỏ chọn để khóa tài khoản: nhân viên không đăng nhập được nữa.</FieldDescription>
            <Button type="submit">Lưu</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
