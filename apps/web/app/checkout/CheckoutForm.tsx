"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { rememberContact, setCart, useCart, useContact } from "@/components/shop/cart";
import { destination, submit, type MutationResult } from "@/lib/mutations";
import { DestinationFields, type DestinationErrors } from "@/components/DestinationFields";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cartLines, lineLabel, type CartLine, type CatalogProduct } from "@noodle/core/domain/catalog";
import { formatVnd } from "@noodle/core/domain/money";
import { priceLines, type PricedOrder } from "@noodle/core/domain/pricing";

type Reorder = { code: string; skipped: string[] } | null;

export function CheckoutForm({ catalog, reorder }: { catalog: CatalogProduct[]; reorder: Reorder }) {
  const cart = useCart();
  const contact = useContact();
  // Only "Đặt lại" fills in the customer; a fresh checkout starts blank. The contact is still remembered for the shop's last-order card.
  const prefill = reorder ? contact : null;
  const order = priceLines(cartLines(catalog, cart));
  const [placed, setPlaced] = useState<PricedOrder<CartLine> | null>(null);
  const [state, formAction, pending] = useActionState(async (_prev: MutationResult, fd: FormData): Promise<MutationResult> => {
    const result = await submit("placeCustomerOrder", fd);
    if (result?.ok) {
      setPlaced(order);
      rememberContact({
        name: String(fd.get("name")).trim(),
        phone: String(fd.get("phone")).replace(/[\s.-]/g, ""),
        destination: destination(fd),
      });
    }
    return result;
  }, null);
  useEffect(() => {
    if (state?.ok) setCart({});
  }, [state]);

  const errors = (state && !state.ok && state.fields) || {};
  const destinationErrors = Object.fromEntries(
    Object.entries(errors).flatMap(([k, v]) => (k.startsWith("destination.") ? [[k.slice(12), v]] : [])),
  ) as DestinationErrors;

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
    <form
      className="space-y-4"
      // Not `action=`: React resets a form after its action runs, wiping what the customer typed when the API rejects it.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => formAction(fd));
      }}
    >
      {reorder && <ReorderNotice reorder={reorder} />}
      <OrderLines order={order} />
      <input type="hidden" name="items" value={JSON.stringify(order.lines.map((l) => ({ pack_id: l.pack.id, pack_qty: l.packQty })))} />
      <fieldset disabled={pending} key={prefill ? JSON.stringify(prefill) : "new"}>
        <FieldGroup className="gap-4">
          <Field data-invalid={!!errors.name}>
            <FieldLabel htmlFor="checkout-name">Họ tên</FieldLabel>
            <Input id="checkout-name" name="name" required defaultValue={prefill?.name} aria-invalid={!!errors.name || undefined} />
            <FieldError>{errors.name}</FieldError>
          </Field>
          <Field data-invalid={!!errors.phone}>
            <FieldLabel htmlFor="checkout-phone">Số điện thoại</FieldLabel>
            <Input
              id="checkout-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              defaultValue={prefill?.phone}
              aria-invalid={!!errors.phone || undefined}
            />
            <FieldError>{errors.phone}</FieldError>
          </Field>
          <DestinationFields id="checkout" value={prefill?.destination} errors={destinationErrors} />
          <Field data-invalid={!!errors.note}>
            <FieldLabel htmlFor="checkout-note">Ghi chú</FieldLabel>
            <Textarea id="checkout-note" name="note" rows={2} aria-invalid={!!errors.note || undefined} />
            <FieldError>{errors.note}</FieldError>
          </Field>
          <Button type="submit" size="lg" className="h-11 w-full text-base">
            Xác nhận đặt hàng
          </Button>
        </FieldGroup>
      </fieldset>
      {state && !state.ok && !errors.name && !errors.phone && !errors.note && Object.keys(destinationErrors).length === 0 && (
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
            <span>Tổng</span>
            <span data-testid="checkout-total">{formatVnd(order.total)}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
