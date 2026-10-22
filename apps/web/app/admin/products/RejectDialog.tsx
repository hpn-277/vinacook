"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function RejectDialog({ product }: { product: { id: number; name: string; factory: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label={`Không duyệt ${product.name}`}>
          Không duyệt
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Không duyệt {product.name}</DialogTitle>
          <DialogDescription>{product.factory} sẽ thấy lý do để sửa và gửi lại.</DialogDescription>
        </DialogHeader>
        <ActionForm action="rejectProduct" onSuccess={() => setOpen(false)}>
          <input type="hidden" name="id" value={product.id} />
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`reject-${product.id}`}>Lý do</FieldLabel>
              <Textarea id={`reject-${product.id}`} name="reason" required maxLength={500} rows={3} />
            </Field>
            <Button type="submit" variant="destructive">
              Không duyệt
            </Button>
          </FieldGroup>
        </ActionForm>
      </DialogContent>
    </Dialog>
  );
}
