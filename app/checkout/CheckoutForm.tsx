"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { setCart, useCart } from "@/components/cart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatKg, formatVnd, lineTotal } from "@/lib/domain/money";

type Product = { id: number; name: string; price_per_kg: number };

export function CheckoutForm({
  products,
  action,
}: {
  products: Product[];
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const cart = useCart();
  const [state, formAction, pending] = useActionState(action, null);
  useEffect(() => {
    if (state?.ok) setCart({});
  }, [state]);

  if (state?.ok) {
    return (
      <Alert role="status" className="border-green-200 bg-green-50 p-4 text-green-800">
        <AlertTitle className="font-semibold">{state.message}</AlertTitle>
        <AlertDescription>
          <Link href="/orders">Tra cứu đơn hàng</Link>
        </AlertDescription>
      </Alert>
    );
  }

  const lines = products.filter((p) => (cart[p.id] ?? 0) > 0);
  const total = lines.reduce((s, p) => s + lineTotal(cart[p.id], p.price_per_kg), 0);
  if (lines.length === 0) {
    return (
      <p>
        Giỏ hàng trống.{" "}
        <Link href="/" className="text-primary underline underline-offset-4">
          Chọn sản phẩm
        </Link>
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <Card size="sm">
        <CardContent>
          <ul className="divide-y">
            {lines.map((p) => (
              <li key={p.id} className="flex justify-between py-2">
                <span>
                  {p.name} × {formatKg(cart[p.id])}
                </span>
                <span>{formatVnd(lineTotal(cart[p.id], p.price_per_kg))}</span>
              </li>
            ))}
            <li className="flex justify-between pt-2 text-base font-semibold">
              <span>Tổng</span>
              <span>{formatVnd(total)}</span>
            </li>
          </ul>
        </CardContent>
      </Card>
      <input type="hidden" name="items" value={JSON.stringify(lines.map((p) => ({ product_id: p.id, qty_kg: cart[p.id] })))} />
      <fieldset disabled={pending}>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="checkout-name">Họ tên</FieldLabel>
            <Input id="checkout-name" name="name" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-phone">Số điện thoại</FieldLabel>
            <Input id="checkout-phone" name="phone" type="tel" inputMode="tel" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-address">Địa chỉ</FieldLabel>
            <Input id="checkout-address" name="address" required />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-district">Quận/Huyện</FieldLabel>
            <NativeSelect id="checkout-district" name="district" required defaultValue="" className="w-full">
              <NativeSelectOption value="" disabled>
                Chọn quận/huyện
              </NativeSelectOption>
              {DISTRICTS.map((d) => (
                <NativeSelectOption key={d}>{d}</NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-note">Ghi chú</FieldLabel>
            <Textarea id="checkout-note" name="note" rows={2} />
          </Field>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            Xác nhận đặt hàng
          </Button>
        </FieldGroup>
      </fieldset>
      {state && !state.ok && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}
