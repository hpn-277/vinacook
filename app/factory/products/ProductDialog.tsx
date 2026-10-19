"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { ImageFileInput } from "@/components/ImageFileInput";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { submitProduct } from "./actions";

export type FactoryProduct = { id: number; name: string; price_per_kg: number; description: string | null; image_url: string | null };

/** Add (no product) or fix-and-resubmit (pending/rejected product); closes once the server accepts it. */
export function ProductDialog({ product }: { product?: FactoryProduct }) {
  const [open, setOpen] = useState(false);
  const form = `factory-product-${product?.id ?? "new"}`;
  const save = async (prev: ActionResult, fd: FormData) => {
    const result = await submitProduct(prev, fd);
    if (result?.ok) setOpen(false);
    return result;
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button size="sm" variant="outline" aria-label={`Sửa ${product.name}`}>
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? `Sửa ${product.name}` : "Thêm sản phẩm"}</DialogTitle>
          <DialogDescription>Quản lý duyệt xong thì khách mới thấy. Quy cách mặc định: Cây 5 kg, Thùng 5/10/15 kg, Bao 30 kg.</DialogDescription>
        </DialogHeader>
        <ActionForm id={form} action={save}>
          <input type="hidden" name="id" value={product?.id ?? ""} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`${form}-name`}>Tên sản phẩm</FieldLabel>
              <Input id={`${form}-name`} name="name" defaultValue={product?.name} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-price`}>Giá sỉ đề xuất (đ/kg)</FieldLabel>
              <Input id={`${form}-price`} name="price_per_kg" type="number" min={1} defaultValue={product?.price_per_kg} required />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${form}-desc`}>Mô tả</FieldLabel>
              <Textarea
                id={`${form}-desc`}
                name="description"
                defaultValue={product?.description ?? ""}
                placeholder="Nguyên liệu, cách dùng, hạn dùng"
                maxLength={1000}
                rows={3}
              />
            </Field>
            <Field>
              <FieldLabel>Ảnh sản phẩm</FieldLabel>
              {product?.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={`Ảnh hiện tại ${product.name}`} className="size-20 rounded-md border object-cover" />
              )}
              <ImageFileInput form={form} label={`Tải ảnh ${product?.name ?? "sản phẩm mới"}`} />
              <FieldDescription>{product?.image_url ? "Chọn ảnh khác để thay; để trống thì giữ ảnh cũ." : "JPEG, PNG hoặc WebP; ảnh được tự thu nhỏ trước khi tải lên."}</FieldDescription>
            </Field>
            <Button type="submit">{product ? "Lưu và gửi duyệt lại" : "Gửi để duyệt"}</Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
