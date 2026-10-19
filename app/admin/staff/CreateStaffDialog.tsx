"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action";
import type { StaffRole } from "@/lib/auth";
import { createStaff } from "./actions";

/** "Thêm nhân viên" button and its pop-up; the pop-up closes once the account is created and the email sent. */
export function CreateStaffDialog({ roles, factories }: { roles: [StaffRole, string][]; factories: { id: number; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<StaffRole>("driver");
  const save = async (prev: ActionResult, fd: FormData) => {
    const result = await createStaff(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  };
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setRole("driver");
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus data-icon="inline-start" />
          Thêm nhân viên
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>Nhân viên nhận email để tự đặt mật khẩu.</DialogDescription>
        </DialogHeader>
        <ActionForm action={save}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="staff-email">Email đăng nhập</FieldLabel>
              <Input id="staff-email" name="email" type="email" required autoComplete="off" />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-role">Vai trò</FieldLabel>
              <NativeSelect id="staff-role" name="role" defaultValue="driver" onChange={(e) => setRole(e.target.value as StaffRole)} className="w-full">
                {roles.map(([value, label]) => (
                  <NativeSelectOption key={value} value={value}>
                    {label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-name">Tên</FieldLabel>
              <Input id="staff-name" name="name" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="staff-phone">Số điện thoại</FieldLabel>
              <Input id="staff-phone" name="phone" type="tel" inputMode="tel" />
            </Field>
            {role === "sale" && (
              <Field>
                <FieldLabel htmlFor="staff-pct">% hoa hồng</FieldLabel>
                <Input id="staff-pct" name="commission_pct" type="number" step="0.1" min={0} max={100} defaultValue={5} />
                <FieldDescription>Mã giới thiệu (NVKD01, NVKD02…) được tạo tự động.</FieldDescription>
              </Field>
            )}
            {role === "factory" && (
              <Field>
                <FieldLabel htmlFor="staff-factory">Xưởng</FieldLabel>
                <NativeSelect id="staff-factory" name="factory_id" required defaultValue="" className="w-full">
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
            <Button type="submit">Tạo tài khoản và gửi email</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
