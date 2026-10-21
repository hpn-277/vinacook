"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { rememberContact, setCart, useCart, useContact } from "@/components/shop/cart";
import { TierHint } from "@/components/PricingSummary";
import { TierBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/action";
import { cartLines, lineLabel, type CartLine, type CatalogProduct } from "@/lib/domain/catalog";
import { DISTRICTS } from "@/lib/domain/districts";
import { formatVnd } from "@/lib/domain/money";
import { priceLines, type PricedOrder, type PricingTerms } from "@/lib/domain/pricing";

type Reorder = { code: string; skipped: string[] } | null;

export function CheckoutForm({
  catalog,
  terms,
  reorder,
  action,
}: {
  catalog: CatalogProduct[];
  terms: PricingTerms;
  reorder: Reorder;
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
}) {
  const cart = useCart();
  const contact = useContact();
  const order = priceLines(cartLines(catalog, cart), terms);
  const [placed, setPlaced] = useState<PricedOrder<CartLine> | null>(null);
  const [state, formAction, pending] = useActionState(async (prev: ActionResult, fd: FormData) => {
    const result = await action(prev, fd);
    if (result?.ok) {
      setPlaced(order);
      rememberContact({
        name: String(fd.get("name")).trim(),
        phone: String(fd.get("phone")).replace(/[\s.-]/g, ""),
        address: String(fd.get("address")).trim(),
        district: DISTRICTS.find((d) => d === fd.get("district")) ?? "",
      });
    }
    return result;
  }, null);
  useEffect(() => {
    if (state?.ok) setCart({});
  }, [state]);

  if (state?.ok) {
    return (
      <div className="space-y-4">
        <Alert role="status" className="border-green-200 bg-green-50 p-4 text-green-800">
          <AlertTitle className="font-semibold">{state.message}</AlertTitle>
          <AlertDescription className="flex flex-wrap gap-x-4">
            <Link href={`/orders?phone=${contact?.phone ?? ""}`}>Tra cứu đơn hàng</Link>
            <Link href="/">Tiếp tục mua</Link>
          </AlertDescription>
        </Alert>
        {placed && <OrderLines order={placed} />}
      </div>
    );
  }

  if (order.lines.length === 0) {
    return (
      <div className="space-y-3">
        {reorder && <ReorderNotice reorder={reorder} />}
        <p>
          Giỏ hàng trống.{" "}
          <Link href="/" className="text-primary underline underline-offset-4">
            Chọn sản phẩm
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {reorder && <ReorderNotice reorder={reorder} />}
      <OrderLines order={order} />
      <div className="text-sm">
        <TierHint order={order} terms={terms} />
      </div>
      <input type="hidden" name="items" value={JSON.stringify(order.lines.map((l) => ({ pack_id: l.pack.id, pack_qty: l.packQty })))} />
      <fieldset disabled={pending} key={contact ? JSON.stringify(contact) : "new"}>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="checkout-name">Họ tên</FieldLabel>
            <Input id="checkout-name" name="name" required defaultValue={contact?.name} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-phone">Số điện thoại</FieldLabel>
            <Input id="checkout-phone" name="phone" type="tel" inputMode="tel" required defaultValue={contact?.phone} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-address">Địa chỉ</FieldLabel>
            <Input id="checkout-address" name="address" required defaultValue={contact?.address} />
          </Field>
          <Field>
            <FieldLabel htmlFor="checkout-district">Quận/Huyện</FieldLabel>
            <NativeSelect id="checkout-district" name="district" required defaultValue={contact?.district ?? ""} className="w-full">
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

function ReorderNotice({ reorder }: { reorder: NonNullable<Reorder> }) {
  return (
    <Alert className="border-primary/30 bg-primary/5" data-testid="reorder-notice">
      <AlertTitle>Đặt lại đơn {reorder.code}</AlertTitle>
      <AlertDescription>
        <p>Số lượng như đơn cũ, tính theo giá hôm nay. Bạn có thể sửa giỏ hàng trước khi xác nhận.</p>
        {reorder.skipped.length > 0 && <p className="font-medium text-amber-800">Đã bỏ qua vì ngừng bán: {reorder.skipped.join(", ")}</p>}
      </AlertDescription>
    </Alert>
  );
}

function OrderLines({ order }: { order: PricedOrder<CartLine> }) {
  return (
    <Card size="sm">
      <CardContent>
        <ul className="divide-y">
          {order.lines.map((l) => (
            <li key={l.pack.id} className="flex justify-between gap-3 py-2">
              <span>
                {lineLabel(l.product.name, l.pack.name, l.packQty, l.qtyKg)}
                <span className="block text-xs text-muted-foreground">{formatVnd(l.pricePerKg)}/kg</span>
              </span>
              <span className="shrink-0">{formatVnd(l.lineTotal)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 pt-2 text-base font-semibold">
            <span className="flex items-center gap-2">
              Tổng <TierBadge tier={order.tier} />
            </span>
            <span data-testid="checkout-total">{formatVnd(order.total)}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
