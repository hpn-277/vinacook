"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { ImageFileInput } from "@/components/ImageFileInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import type { ProductStatus } from "@/lib/domain/status";
import { STANDARD_PACKS, packSize } from "@/lib/domain/catalog";
import { saveProduct, savePacks } from "./actions";

export type ManagedProduct = {
  id: number;
  name: string;
  price_per_kg: number;
  factory_id: number;
  description: string | null;
  image_url: string | null;
  active: boolean;
  status: ProductStatus;
  packs: { id: number; label: string; image_url: string | null; active: boolean }[];
};

/** Add (no product) or edit one product, including the picture of each of its packs. */
export function ProductDialog({ product: p, factories }: { product?: ManagedProduct; factories: { id: number; name: string; active: boolean }[] }) {
  const [open, setOpen] = useState(false);
  const form = `product-${p?.id ?? "new"}`;
  // Both forms close the dialog on success: reopening renders fresh from the server, so ticks never show stale state.
  const closingOnSuccess = (action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>) => async (prev: ActionResult, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {p ? (
          <Button size="sm" variant="outline" aria-label={`Sửa ${p.name}`}>
            <Pencil data-icon="inline-start" />
            Sửa
          </Button>
        ) : (
          <Button>
            <Plus data-icon="inline-start" />
            Thêm sản phẩm
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{p ? `Sửa ${p.name}` : "Thêm sản phẩm"}</DialogTitle>
          {!p && <DialogDescription>Quản lý thêm thì sản phẩm được duyệt ngay.</DialogDescription>}
        </DialogHeader>
        <ActionForm id={form} action={closingOnSuccess(saveProduct)}>
          <input type="hidden" name="id" value={p?.id ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-name`}>Tên sản phẩm</FieldLabel>
              <Input id={`${form}-name`} name="name" defaultValue={p?.name} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${form}-price`}>Giá sỉ (đ/kg)</FieldLabel>
                <Input id={`${form}-price`} name="price_per_kg" type="number" min={1} defaultValue={p?.price_per_kg} required />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${form}-factory`}>Xưởng</FieldLabel>
                <NativeSelect id={`${form}-factory`} name="factory_id" required defaultValue={p?.factory_id ?? ""} className="w-full">
                  <NativeSelectOption value="" disabled>
                    Chọn xưởng
                  </NativeSelectOption>
                  {factories.map((f) => (
                    <NativeSelectOption key={f.id} value={f.id}>
                      {f.name}
                      {f.active ? "" : " (ngừng)"}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${form}-desc`}>Mô tả</FieldLabel>
              <Textarea id={`${form}-desc`} name="description" defaultValue={p?.description ?? ""} placeholder="Nguyên liệu, cách dùng, hạn dùng" maxLength={1000} rows={2} />
            </Field>
            <Field>
              <FieldLabel>Ảnh sản phẩm</FieldLabel>
              <div className="flex items-center gap-3">
                {p?.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt={`Ảnh ${p.name}`} className="size-14 shrink-0 rounded-md border object-cover" />
                )}
                <ImageFileInput form={form} label={`Tải ảnh ${p?.name ?? "sản phẩm mới"}`} />
              </div>
              {p?.image_url && <FieldDescription>Chọn ảnh khác để thay; để trống thì giữ ảnh cũ.</FieldDescription>}
            </Field>
            {!p && (
              <Field>
                <FieldLabel>Quy cách bán</FieldLabel>
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                  {STANDARD_PACKS.map((pk, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Checkbox id={`${form}-std-${i}`} name={`std_${i}`} defaultChecked />
                      <label htmlFor={`${form}-std-${i}`} className="text-sm">
                        {packSize(pk)}
                      </label>
                    </div>
                  ))}
                </div>
                <FieldDescription>Thêm quy cách khác sau khi tạo, trong nút Sửa.</FieldDescription>
              </Field>
            )}
            {(!p || p.status === "approved") && (
              <Field orientation="horizontal">
                <Checkbox id={`${form}-active`} name="active" defaultChecked={p?.active ?? true} />
                <FieldLabel htmlFor={`${form}-active`}>Đang bán</FieldLabel>
              </Field>
            )}
            <Button type="submit">{p ? "Lưu" : "Thêm sản phẩm"}</Button>
          </FieldGroup>
        </ActionForm>

        {p && (
          <>
            <FieldSeparator />
            <ActionForm id={`packs-${p.id}`} action={closingOnSuccess(savePacks)}>
              <input type="hidden" name="product_id" value={p.id} />
              <FieldGroup className="gap-3">
                <div>
                  <h3 className="text-sm font-medium">Quy cách bán</h3>
                  <p className="text-xs text-muted-foreground">Tick quy cách khách được chọn. Bỏ tick thì quy cách ẩn khỏi trang đặt hàng; đơn cũ không đổi.</p>
                </div>
                {p.packs.map((pk) => (
                  <div key={pk.id} className="flex flex-wrap items-center gap-2">
                    <Checkbox id={`active-${pk.id}`} name={`active_${pk.id}`} defaultChecked={pk.active} aria-label={`Bán ${p.name} - ${pk.label}`} />
                    {pk.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pk.image_url} alt={`Ảnh ${p.name} - ${pk.label}`} className="size-9 shrink-0 rounded-md border bg-muted object-cover" />
                    ) : (
                      <div className="size-9 shrink-0 rounded-md border border-dashed" />
                    )}
                    <label htmlFor={`active-${pk.id}`} className="w-28 text-sm">
                      {pk.label}
                    </label>
                    <div className="min-w-0 flex-1">
                      <ImageFileInput form={`packs-${p.id}`} name={`image_${pk.id}`} label={`Tải ảnh ${p.name} - ${pk.label}`} />
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-end gap-2">
                  <Field className="w-36">
                    <FieldLabel htmlFor={`new-name-${p.id}`}>Thêm quy cách</FieldLabel>
                    <Input id={`new-name-${p.id}`} name="new_name" list="pack-names" placeholder="Thùng, Bao…" />
                  </Field>
                  <Field className="w-24">
                    <FieldLabel htmlFor={`new-kg-${p.id}`}>Kg</FieldLabel>
                    <Input id={`new-kg-${p.id}`} name="new_kg" type="number" step="0.1" min={0.1} placeholder="20" />
                  </Field>
                  <datalist id="pack-names">
                    {["Cây", "Thùng", "Bao", "Túi"].map((n) => (
                      <option key={n} value={n} />
                    ))}
                  </datalist>
                </div>
                <Button type="submit" variant="outline">
                  Lưu quy cách
                </Button>
              </FieldGroup>
            </ActionForm>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
